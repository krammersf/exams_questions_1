import json
import random
import re
import time
import urllib.request
import urllib.error
from pathlib import Path

BASE_URLS = {
    "ServiceNow": "https://www.examtopics.com/exams/servicenow/",
    "SAP": "https://www.examtopics.com/exams/sap/",
    "Scrum": "https://www.examtopics.com/exams/scrum/",
    "AWS": "https://www.examtopics.com/exams/amazon/",
    "Microsoft": "https://www.examtopics.com/exams/microsoft/",
    "Cisco": "https://www.examtopics.com/exams/cisco/",
}
USER_AGENT = "Mozilla/5.0"
MIN_REQUEST_INTERVAL = 2.5
MAX_REQUEST_INTERVAL = 6.0
last_request_at = 0.0


def wait_before_request() -> None:
    global last_request_at
    elapsed = time.monotonic() - last_request_at
    wait_seconds = max(0, MIN_REQUEST_INTERVAL - elapsed)
    wait_seconds += random.uniform(0, MAX_REQUEST_INTERVAL - MIN_REQUEST_INTERVAL)
    if wait_seconds > 0:
        print(f"  Waiting {wait_seconds:.1f}s before next request...", flush=True)
        time.sleep(wait_seconds)
    last_request_at = time.monotonic()


def fetch_text(url: str, attempts: int = 3) -> str:
    for attempt in range(1, attempts + 1):
        try:
            wait_before_request()
            request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(request, timeout=45) as response:
                return response.read().decode("utf-8", errors="ignore")
        except urllib.error.HTTPError as error:
            retry_after = error.headers.get("Retry-After")
            if error.code == 429 and attempt < attempts:
                wait_seconds = max(int(retry_after or 30), attempt * 15)
                print(f"  ExamTopics rate limit (429); waiting {wait_seconds}s...", flush=True)
                time.sleep(wait_seconds)
                continue
            raise
        except (TimeoutError, ConnectionResetError, urllib.error.URLError) as error:
            if attempt == attempts:
                raise
            wait_seconds = attempt * 10 + random.uniform(0, 5)
            print(
                f"  Request failed ({type(error).__name__}); retrying in {wait_seconds:.1f}s...",
                flush=True,
            )
            time.sleep(wait_seconds)


def normalize_label(raw_label: str) -> str:
    cleaned = re.sub(r"<.*?>", "", raw_label)
    return " ".join(cleaned.split())


def extract_exam_list(base_url: str, existing_exams: list[dict] | None = None) -> list[dict]:
    provider_slug = base_url.split("/exams/")[1].split("/")[0]
    print(f"  Fetching exam list: {base_url}", flush=True)
    list_html = fetch_text(base_url)
    links = re.findall(
        rf'<a[^>]+href="(/exams/{re.escape(provider_slug)}/[^"]+/?)"[^>]*>(.*?)</a>',
        list_html,
        re.S,
    )
    print(f"  Found {len(links)} exam links", flush=True)

    exams = []
    seen_values = set()
    existing_by_value = {
        exam.get("value"): exam
        for exam in (existing_exams or [])
        if exam.get("value")
    }
    for href, raw_label in links:
        label = normalize_label(raw_label)
        value = href.rstrip("/").split("/")[-1]
        if not label or value in seen_values:
            continue
        seen_values.add(value)
        print(f"  Reading {value}...", flush=True)
        try:
            page_html = fetch_text("https://www.examtopics.com" + href)
        except (TimeoutError, ConnectionResetError, urllib.error.URLError) as error:
            previous_exam = existing_by_value.get(value)
            if previous_exam:
                print(f"  Could not read {value}; keeping previous value", flush=True)
                exams.append(previous_exam)
                continue
            print(f"  Could not read {value}; skipping ({error})", flush=True)
            continue
        match = re.search(r"Browse\s*([0-9,]+)\s*Questions", page_html, re.I)
        questions = match.group(1).replace(",", "") if match else "0"
        exams.append({"questions": questions, "label": label, "value": value})

    return exams


def update_json() -> None:
    print("Starting exam questions refresh...", flush=True)
    file_path = Path(__file__).resolve().with_name("subopcoes.json")
    data = json.loads(file_path.read_text(encoding="utf-8"))

    updated_providers = []
    for provider in data:
        provider_name = provider.get("provider")
        if provider_name in BASE_URLS:
            print(f"Updating {provider_name}...", flush=True)
            try:
                exams = extract_exam_list(BASE_URLS[provider_name], provider.get("exams", []))
            except (TimeoutError, ConnectionResetError, urllib.error.URLError) as error:
                print(f"  Could not load {provider_name}; keeping existing data ({error})", flush=True)
                continue
            if exams:
                provider["exams"] = exams
                updated_providers.append(f"{provider_name} ({len(exams)} exams)")
                file_path.write_text(
                    json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                    encoding="utf-8",
                )
                print(f"  Checkpoint saved after {provider_name}", flush=True)
            else:
                print(f"  No exams found for {provider_name}; keeping existing data", flush=True)

    file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated exam questions for: {', '.join(updated_providers) if updated_providers else 'none'}")
    print(f"Saved updated data to {file_path.name}", flush=True)
    print("Refresh completed.", flush=True)


if __name__ == "__main__":
    update_json()

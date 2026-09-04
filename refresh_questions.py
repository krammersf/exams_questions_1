import json
import re
import urllib.request
from pathlib import Path

BASE_URLS = {
    "ServiceNow": "https://www.examtopics.com/exams/servicenow/",
    "SAP": "https://www.examtopics.com/exams/sap/",
    "Scrum": "https://www.examtopics.com/exams/scrum/",
    "AWS": "https://www.examtopics.com/exams/amazon/",
}
USER_AGENT = "Mozilla/5.0"


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def normalize_label(raw_label: str) -> str:
    cleaned = re.sub(r"<.*?>", "", raw_label)
    return " ".join(cleaned.split())


def extract_exam_list(base_url: str) -> list[dict]:
    provider_slug = base_url.split("/exams/")[1].split("/")[0]
    list_html = fetch_text(base_url)
    links = re.findall(
        rf'<a[^>]+href="(/exams/{re.escape(provider_slug)}/[^"]+/?)"[^>]*>(.*?)</a>',
        list_html,
        re.S,
    )

    exams = []
    seen_values = set()
    for href, raw_label in links:
        label = normalize_label(raw_label)
        value = href.rstrip("/").split("/")[-1]
        if not label or value in seen_values:
            continue
        seen_values.add(value)
        print(f"  Reading {value}...", flush=True)
        page_html = fetch_text("https://www.examtopics.com" + href)
        match = re.search(r"Browse\s*([0-9,]+)\s*Questions", page_html, re.I)
        questions = match.group(1).replace(",", "") if match else "0"
        exams.append({"questions": questions, "label": label, "value": value})

    return exams


def update_json() -> None:
    file_path = Path(__file__).resolve().with_name("subopcoes.json")
    data = json.loads(file_path.read_text(encoding="utf-8"))

    updated_providers = []
    for provider in data:
        provider_name = provider.get("provider")
        if provider_name in BASE_URLS:
            print(f"Updating {provider_name}...", flush=True)
            exams = extract_exam_list(BASE_URLS[provider_name])
            if exams:
                provider["exams"] = exams
                updated_providers.append(f"{provider_name} ({len(exams)} exams)")
            else:
                print(f"  No exams found for {provider_name}; keeping existing data", flush=True)

    file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated exam questions for: {', '.join(updated_providers) if updated_providers else 'none'}")


if __name__ == "__main__":
    update_json()

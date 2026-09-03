import json
import re
import urllib.request
from pathlib import Path

BASE_URLS = {
    "ServiceNow": "https://www.examtopics.com/exams/servicenow/",
    "SAP": "https://www.examtopics.com/exams/sap/",
    "Scrum": "https://www.examtopics.com/exams/scrum/",
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
    list_html = fetch_text(base_url)
    links = re.findall(
        rf'href="(/exams/{re.escape(base_url.split("/exams/")[1].split("/")[0])}/[^"]+)"[^>]*class="popular-exam-link"[^>]*>\s*(.*?)\s*</a>',
        list_html,
        re.S,
    )

    exams = []
    for href, raw_label in links:
        label = normalize_label(raw_label)
        value = href.rstrip("/").split("/")[-1]
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
            provider["exams"] = extract_exam_list(BASE_URLS[provider_name])
            updated_providers.append(provider_name)

    file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated exam questions for: {', '.join(updated_providers) if updated_providers else 'none'}")


if __name__ == "__main__":
    update_json()

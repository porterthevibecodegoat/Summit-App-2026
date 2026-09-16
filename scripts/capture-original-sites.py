"""Capture structured, inert content from the original ICF pages (BeautifulSoup 4).

Input HTML is kept in ignored work/. No scripts, forms or embedded code are copied.
The live source now mixes 2026 dates with historical rosters; dates are deliberately
not imported into the archive's event metadata.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urljoin
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


def text(node):
    return " ".join(node.get_text(" ", strip=True).split())


def image_source(image):
    source = image.get("data-src") or image.get("src")
    if source:
        return source
    # One original portrait has malformed src markup but a valid srcset.
    candidates = image.get("srcset", "").split(",")
    return candidates[-1].strip().split()[0] if candidates[-1].strip() else ""


def capture(kind):
    raw = (ROOT / f"work/original-{kind}-20260916.html").read_bytes()
    soup = BeautifulSoup(raw, "html.parser")
    sections = []
    for section in soup.select("main section.page-section"):
        cards = []
        for card in section.select(".hover-card"):
            name = card.select_one("strong") or card.select_one(".name-line")
            info = card.select_one(".info-box")
            image = card.select_one("img")
            if not name or not image or not info:
                continue
            label = text(name)
            cards.append({"name": label, "role": text(info).removeprefix(label).strip(),
                          "image": image_source(image),
                          "href": urljoin(f"https://www.inspiringchildren.org/{kind}", card.get("href", ""))})
        blocks = []
        for block in section.select(".sqs-html-content"):
            for node in block.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
                if text(node):
                    blocks.append({"tag": node.name, "text": text(node)})
        images = [{"src": image_source(i), "alt": i.get("alt", "")}
                  for i in section.select("img")]
        heading = section.select_one("h1,h2,h3,h4")
        sections.append({"id": section.get("data-section-id"), "title": text(heading) if heading else "",
                         "blocks": blocks, "images": images, "people": cards})
    footer = soup.select_one("footer")
    return {"source": f"https://www.inspiringchildren.org/{kind}", "capturedAt": "2026-09-16",
            "sourceSha256": hashlib.sha256(raw).hexdigest(), "sections": sections,
            "footer": [text(p) for p in footer.select(".sqs-html-content p, .sqs-html-content h4")] if footer else []}


if __name__ == "__main__":
    output = ROOT / "apps/web/lib/original-sites.json"
    output.write_text(json.dumps({kind: capture(kind) for kind in ["summit", "awards"]}, indent=2, ensure_ascii=False) + "\n")
    print(output)

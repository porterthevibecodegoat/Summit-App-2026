"""Vendor the original ICF image assets so archive rendering is owner-controlled."""
import hashlib
import json
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "apps/web/lib/original-sites.json").read_text())
urls = sorted({image["src"] for page in data.values() for section in page["sections"] for image in section["images"]})
output = ROOT / "apps/web/public/original-2025"
output.mkdir(exist_ok=True)
manifest = {}
for index, url in enumerate(urls):
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"images.squarespace-cdn.com", "static1.squarespace.com"}:
        raise ValueError(f"Unexpected original asset origin: {url}")
    name = hashlib.sha256(url.encode()).hexdigest()[:20] + Path(parsed.path).suffix.lower()
    path = output / name
    if not path.exists():
        for attempt in range(3):
            try:
                with urlopen(Request(parsed.geturl(), headers={"User-Agent": "Mozilla/5.0"}), timeout=30) as response:
                    if not response.headers.get("Content-Type", "").startswith("image/"):
                        raise ValueError(f"Not an image: {url}")
                    path.write_bytes(response.read())
                break
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(2)
    manifest[url] = f"/original-2025/{name}"
    print(f"Pinned {index + 1}/{len(urls)}", flush=True)
(ROOT / "apps/web/lib/original-assets.json").write_text(json.dumps(manifest, indent=2) + "\n")

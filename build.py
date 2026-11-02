"""يبني ملف index.html واحد من مجلد src (التصميم + الكود + الصور داخله)."""
import base64
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"


def data_uri(name: str) -> str:
    return "data:image/png;base64," + base64.b64encode((SRC / "assets" / name).read_bytes()).decode()


html = (SRC / "index.html").read_text(encoding="utf-8")
html = (
    html.replace("{{STYLE}}", (SRC / "styles.css").read_text(encoding="utf-8"))
    .replace("{{SCRIPT}}", (SRC / "app.js").read_text(encoding="utf-8"))
    .replace("{{LOGO}}", data_uri("logo.png"))
    .replace("{{ICON}}", data_uri("icon.png"))
)
(ROOT / "index.html").write_text(html, encoding="utf-8")
print(f"index.html: {len(html) // 1024} KB")

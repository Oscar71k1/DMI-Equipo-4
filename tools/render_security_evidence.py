"""Renderiza extractos de salidas Jest reales; no fabrica capturas de terminal.

Uso: python tools/render_security_evidence.py (requiere Pillow).
Las fuentes completas se conservan en docs/evidence/auditoria-{antes,despues}.txt.
"""

from pathlib import Path
import re
import textwrap

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "docs" / "evidence"
FONT_PATHS = [
    Path("C:/Windows/Fonts/consola.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
]


def font(size):
    for candidate in FONT_PATHS:
        if candidate.is_file():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default(size=size)


def section(source, number):
    lines = source.read_text(encoding="utf-8-sig").splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith(f"  Hallazgo {number}"))
    result = []
    for line in lines[start + 1:]:
        if not line.strip() or line.startswith("  Hallazgo"):
            break
        line = re.sub(r"\s+\(\d+ ms\)$", "", line.strip())
        line = line.replace("√", "PASS").replace("✓", "PASS").replace("×", "FAIL").replace("✕", "FAIL")
        result.extend(textwrap.wrap(line, width=98, subsequent_indent="     "))
    return result


def render(number, title, filename):
    before = section(EVIDENCE / "auditoria-antes.txt", number)
    after = section(EVIDENCE / "auditoria-despues.txt", number)
    before_height = 108 + len(before) * 30
    after_height = 108 + len(after) * 30
    image = Image.new("RGB", (1500, 290 + before_height + after_height), "#f0f4f8")
    draw = ImageDraw.Draw(image)
    draw.text((45, 28), "AUDITORÍA DE SEGURIDAD · SEMANA 4", fill="#52647a", font=font(22))
    draw.text((45, 68), f"Hallazgo {number} — {title}", fill="#142d4b", font=font(32))
    draw.text((45, 117), "Oscar Flores Cerqueda · 24 de septiembre de 2026", fill="#52647a", font=font(22))
    y = 170
    for heading, lines, height, color, background, source in [
        ("ANTES · base 6f16715", before, before_height, "#9c2637", "#fff4f4", "auditoria-antes.txt"),
        ("DESPUÉS · rama individual de Semana 4", after, after_height, "#116047", "#edf9f3", "auditoria-despues.txt"),
    ]:
        draw.rounded_rectangle((35, y, 1465, y + height), radius=16, fill=background)
        draw.text((58, y + 18), heading, fill=color, font=font(24))
        draw.text((58, y + 55), f"Fuente: docs/evidence/{source}", fill="#52647a", font=font(18))
        for index, line in enumerate(lines):
            draw.text((58, y + 88 + index * 30), line, fill="#142d4b", font=font(22))
        y += height + 20
    draw.text((45, y + 7), "Extracto de ejecución real; marcas normalizadas a PASS / FAIL.", fill="#52647a", font=font(19))
    draw.text((45, y + 34), "No es una captura de pantalla. Salida íntegra y comandos en security-audit.md.", fill="#52647a", font=font(19))
    image.save(EVIDENCE / filename)


if __name__ == "__main__":
    render(1, "Archivos de entorno", "gitignore-env.png")
    render(2, "Datos mínimos en memoria", "datos-minimos.png")
    render(3, "Autorización en la app", "consultas-autorizadas.png")

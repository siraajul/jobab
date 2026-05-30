"""
Generate the Jobab one-pager as a PDF with brand styling.

Run:
    python3 scripts/build_one_pager.py

Output:
    docs/business/dist/jobab-one-pager.pdf
"""

from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


REPO_ROOT = Path(__file__).resolve().parent.parent
OUT = REPO_ROOT / "docs" / "business" / "dist" / "jobab-one-pager.pdf"
LOGO_PNG = REPO_ROOT / "docs" / "public" / "icons" / "logo-512.png"

GREEN = HexColor("#1F6E47")
GREEN_DARK = HexColor("#154D31")
CREAM = HexColor("#FAF7F2")
CREAM_2 = HexColor("#F4EFE6")
INK = HexColor("#2A2722")
INK_2 = HexColor("#6C645A")
AMBER = HexColor("#9A6B0E")


def draw():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=A4)
    W, H = A4

    # Background cream
    c.setFillColor(CREAM)
    c.rect(0, 0, W, H, fill=1, stroke=0)

    # Top accent bar
    c.setFillColor(GREEN)
    c.rect(0, H - 6 * mm, W, 6 * mm, fill=1, stroke=0)

    # Header — logo + title
    if LOGO_PNG.exists():
        c.drawImage(str(LOGO_PNG), 20 * mm, H - 38 * mm, width=22 * mm, height=22 * mm,
                    preserveAspectRatio=True, mask='auto')

    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 28)
    c.drawString(48 * mm, H - 24 * mm, "Jobab")
    c.setFillColor(INK_2)
    c.setFont("Helvetica", 11)
    c.drawString(48 * mm, H - 31 * mm, "AI shop assistant for Bangladeshi merchants")

    c.setFillColor(INK_2)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 20 * mm, H - 24 * mm, "Pre-seed · 2026")
    c.drawRightString(W - 20 * mm, H - 30 * mm, "siraajul.github.io/jobab")

    # Body content
    y = H - 50 * mm

    def section(title):
        nonlocal y
        c.setFillColor(GREEN)
        c.rect(20 * mm, y, 4 * mm, 4 * mm, fill=1, stroke=0)
        c.setFillColor(GREEN_DARK)
        c.setFont("Helvetica-Bold", 11)
        c.drawString(26 * mm, y + 0.5 * mm, title.upper())
        y -= 6 * mm

    def body(text, indent=20):
        nonlocal y
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        for line in text.split("\n"):
            c.drawString(indent * mm, y, line)
            y -= 4.5 * mm
        y -= 1 * mm

    def bullets(items, indent=22):
        nonlocal y
        c.setFillColor(INK)
        c.setFont("Helvetica", 9.5)
        for item in items:
            c.setFillColor(GREEN)
            c.circle((indent - 1.5) * mm, y + 1.2 * mm, 0.8 * mm, fill=1, stroke=0)
            c.setFillColor(INK)
            c.drawString(indent * mm + 1 * mm, y, item)
            y -= 4.5 * mm
        y -= 1 * mm

    # The problem
    section("The problem")
    body("60% of Bangladeshi small retail runs on Facebook DMs.\n"
         "The average shop owner gets 200+ DMs a day, spends 6+ hours\n"
         "replying, and loses ৳15,000+/month in missed sales while sleeping.")
    y -= 2 * mm

    # Solution
    section("The solution")
    body("An AI that answers DMs in Bangla, recognises products from\n"
         "photos, takes orders, sends bKash payment links, and hands\n"
         "off to a human when there's a complaint. The merchant connects\n"
         "their Facebook page in one click and watches everything live.")
    y -= 2 * mm

    # Why now
    section("Why now")
    bullets([
        "LLM cost dropped 10x in 18 months — economics finally work.",
        "Bangla AI got good in 2025 (Llama 4, Jina v3).",
        "F-commerce is dominant in BD — Lazychat raised $1M, market validated.",
    ])

    # Product
    section("Product (real, shippable today)")
    bullets([
        "Multi-channel inbox (Facebook, Instagram, WhatsApp)",
        "AI agent loop with tool calling + vision",
        "Vision-based product matching (photo → catalog)",
        "Live order assembly + bKash link generation",
        "Per-conversation cost telemetry",
        "Documented codebase + book at siraajul.github.io/jobab",
    ])

    # Traction
    section("Traction")
    bullets([
        "[N] merchant interviews completed",
        "[N] pilot merchants committed",
        "Meta Business Verification: submitted [date]",
        "App Review: [submitted / pending / approved]",
    ])

    # Two-column footer: Market + Ask
    y_split = y - 4 * mm
    c.setFillColor(CREAM_2)
    c.rect(20 * mm, 35 * mm, W - 40 * mm, y_split - 35 * mm, fill=1, stroke=0)

    # Market column (left)
    col_y = y_split - 8 * mm
    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(25 * mm, col_y, "MARKET")
    col_y -= 5 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    for line in [
        "TAM  $180M ARR  (500K BD shops × $30)",
        "SAM  $30M ARR   (50K with 100+ DMs/day)",
        "SOM  $2.4M ARR  by year 3",
    ]:
        c.drawString(25 * mm, col_y, line)
        col_y -= 4.5 * mm

    # Business model
    col_y -= 2 * mm
    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(25 * mm, col_y, "BUSINESS MODEL")
    col_y -= 5 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    for line in [
        "SaaS  ৳999 / ৳2,999 / ৳7,999 per month",
        "Blended ARPU ~৳3,000   COGS ~৳500/mo",
        "Gross margin ~85%",
    ]:
        c.drawString(25 * mm, col_y, line)
        col_y -= 4.5 * mm

    # Ask column (right)
    col_y = y_split - 8 * mm
    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(110 * mm, col_y, "THE ASK")
    col_y -= 5 * mm
    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(110 * mm, col_y - 1 * mm, "$400K seed")
    col_y -= 9 * mm
    c.setFillColor(INK_2)
    c.setFont("Helvetica", 9)
    c.drawString(110 * mm, col_y, "18 months runway")
    col_y -= 6 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    for line in [
        "100 paying merchants by M12",
        "$50K MRR by M18",
        "App Review + WhatsApp Cloud live by M3",
        "Series A ready by M18",
    ]:
        c.drawString(110 * mm, col_y, "•  " + line)
        col_y -= 4.5 * mm

    # Team
    col_y -= 2 * mm
    c.setFillColor(GREEN_DARK)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(110 * mm, col_y, "TEAM")
    col_y -= 5 * mm
    c.setFillColor(INK)
    c.setFont("Helvetica", 9.5)
    c.drawString(110 * mm, col_y, "[Your name], founder.")
    col_y -= 4.5 * mm
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(INK_2)
    c.drawString(110 * mm, col_y, "Built Jobab end-to-end. Speaks Bangla + English.")

    # Contact footer
    c.setFillColor(GREEN_DARK)
    c.rect(0, 0, W, 28 * mm, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, 18 * mm, "[Your name]")
    c.setFillColor(CREAM_2)
    c.setFont("Helvetica", 9.5)
    c.drawString(20 * mm, 12 * mm, "hello@jobab.com   ·   +880 1XXX-XXXXXX")
    c.drawString(20 * mm, 7 * mm, "Deck on request   ·   Demo: 3-min Loom at [link]")

    c.setFillColor(CREAM_2)
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 20 * mm, 18 * mm, "siraajul.github.io/jobab")
    c.drawRightString(W - 20 * mm, 12 * mm, "github.com/siraajul/jobab")

    c.showPage()
    c.save()
    print(f"✓ wrote {OUT.relative_to(REPO_ROOT)} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    draw()

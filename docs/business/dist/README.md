# Investor-ready deliverables

Generated office files (PPTX, XLSX, PDF) branded with Jobab's palette.

## Files in this folder

| File | Format | Size | What it is |
|---|---|---|---|
| [`jobab-pitch-deck.pptx`](./jobab-pitch-deck.pptx) | PowerPoint | ~410 KB | The 12-slide deck. Open in Keynote, PowerPoint, or upload to Google Slides. |
| [`jobab-financial-model.xlsx`](./jobab-financial-model.xlsx) | Excel | ~17 KB | 36-month projection with live formulas. Tweak `Assumptions` sheet — P&L recalculates. |
| [`jobab-one-pager.pdf`](./jobab-one-pager.pdf) | PDF | ~520 KB | Single-page teaser for cold investor emails. |
| [`jobab-cap-table.xlsx`](./jobab-cap-table.xlsx) | Excel | ~10 KB | Pre-seed cap table template. 3 sheets: Current · Post-seed scenario · Notes (vocab + red flags). |

## How to regenerate

These files come from Python scripts in `scripts/`. To rebuild after editing
any content:

```bash
# from repo root
python3 scripts/build_pitch_deck.py
python3 scripts/build_financial_model.py
python3 scripts/build_one_pager.py
python3 scripts/build_cap_table.py
```

Each script writes back to this folder.

## Before sending

The files have `[Your name]`, `[date]`, `[N]` placeholders. Open and replace:

**Pitch deck (`jobab-pitch-deck.pptx`):**
- Slide 1: `[Your name]`, contact email
- Slide 9: `[N]` merchant interview / pilot numbers, App Review status
- Slide 10: replace `[photo]` placeholder, fill in `[Your name]` + `[Your background]`
- Slide 12: `[Your name]`, phone number

**One-pager (`jobab-one-pager.pdf`):**
- `[N]` traction numbers
- `[Your name]`, phone, Loom link
- Edit `scripts/build_one_pager.py` and re-run

**Financial model (`jobab-financial-model.xlsx`):**
- Open `Assumptions` sheet
- Adjust pricing, COGS, churn, salaries to match your reality
- Everything else recalculates automatically

## Brand details (for any extra docs you create)

| Element | Value |
|---|---|
| Brand green | `#1F6E47` |
| Dark green | `#154D31` |
| Background cream | `#FAF7F2` |
| Cream surface | `#F4EFE6` |
| Ink (body text) | `#2A2722` |
| Ink secondary | `#6C645A` |
| Amber accent | `#9A6B0E` |
| Logo | `docs/public/icons/logo-512.png` (PNG, 512×512) |
| Logo SVG | `docs/public/logo.svg` (transparent vector) |
| Font | Hind Siliguri (Latin + Bangla) |
| Code font | JetBrains Mono |

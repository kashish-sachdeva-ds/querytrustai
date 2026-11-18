import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P0_DIR = os.path.join(BASE_DIR, "docs", "design", "screenshots", "phase0")
P2_DIR = os.path.join(BASE_DIR, "docs", "design", "screenshots", "phase2")
OUT_DIR = os.path.join(P2_DIR, "contact_sheets")
os.makedirs(OUT_DIR, exist_ok=True)

PAIRS = [
    ("fleet-overview-dark-1440", "fleet-overview-dark-1440.png", "fleet-overview-dark-1440px.png", "Fleet Overview — Dark Mode (1440px)"),
    ("fleet-overview-dark-390", "fleet-overview-dark-390.png", "fleet-overview-dark-390px.png", "Fleet Overview — Dark Mode (390px)"),
    ("fleet-overview-light-1440", "fleet-overview-light-1440.png", "fleet-overview-light-1440px.png", "Fleet Overview — Light Mode (1440px)"),
    ("fleet-overview-light-390", "fleet-overview-light-390.png", "fleet-overview-light-390px.png", "Fleet Overview — Light Mode (390px)"),
    ("query-studio-dark-1440", "query-studio-dark-1440.png", "query-studio-dark-1440px.png", "Query Studio — Dark Mode (1440px)"),
    ("query-studio-dark-390", "query-studio-dark-390.png", "query-studio-dark-390px.png", "Query Studio — Dark Mode (390px)"),
    ("query-studio-light-1440", "query-studio-light-1440.png", "query-studio-light-1440px.png", "Query Studio — Light Mode (1440px)"),
    ("query-studio-light-390", "query-studio-light-390.png", "query-studio-light-390px.png", "Query Studio — Light Mode (390px)"),
]

def create_contact_sheet(slug, p0_file, p2_file, title):
    p0_path = os.path.join(P0_DIR, p0_file)
    p2_path = os.path.join(P2_DIR, p2_file)

    if not os.path.exists(p0_path) or not os.path.exists(p2_path):
        return None

    img0 = Image.open(p0_path).convert("RGB")
    img2 = Image.open(p2_path).convert("RGB")

    target_height = max(img0.height, img2.height)
    if img0.height != target_height:
        scale = target_height / img0.height
        img0 = img0.resize((int(img0.width * scale), target_height), Image.Resampling.LANCZOS)
    if img2.height != target_height:
        scale = target_height / img2.height
        img2 = img2.resize((int(img2.width * scale), target_height), Image.Resampling.LANCZOS)

    header_height = 80
    total_width = img0.width + img2.width + 20
    total_height = target_height + header_height

    sheet = Image.new("RGB", (total_width, total_height), "#0D0E11")
    draw = ImageDraw.Draw(sheet)

    # Header labels
    draw.rectangle([(0, 0), (total_width, header_height)], fill="#141518")
    draw.text((24, 18), f"{title}", fill="#EDEDEE")
    draw.text((24, 46), "BEFORE (Phase 0 Baseline)", fill="#A2A5AD")

    right_offset = img0.width + 20
    draw.text((right_offset + 24, 46), "AFTER (Phase 2 Redesign)", fill="#9B9EF5")

    # Paste images
    sheet.paste(img0, (0, header_height))
    # Separator
    draw.rectangle([(img0.width, header_height), (img0.width + 20, total_height)], fill="#141518")
    sheet.paste(img2, (right_offset, header_height))

    out_file = os.path.join(OUT_DIR, f"contact-sheet-{slug}.png")
    sheet.save(out_file, "PNG")
    print(f"Created: {out_file} ({sheet.width}x{sheet.height})")
    return out_file

def main():
    generated = []
    for slug, p0, p2, title in PAIRS:
        f = create_contact_sheet(slug, p0, p2, title)
        if f:
            generated.append(f)
    print(f"\nGenerated {len(generated)} contact sheets in {OUT_DIR}")

if __name__ == "__main__":
    main()

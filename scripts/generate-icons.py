import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ASSETS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(ASSETS_DIR, exist_ok=True)

# Farver
BG_COLOR = "#0f172a"      # Mørk slate baggrund
ACCENT = "#38bdf8"        # Turkis/cyan tekst
ACCENT_DARK = "#0ea5e9"   # Mørkere accent
WHITE = "#ffffff"

def rounded_rectangle(draw, xy, radius, fill):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=radius, fill=fill)

def create_app_icon(size=1024):
    img = Image.new("RGBA", (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # Runde hjørner (clip via mask)
    radius = size // 8
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)

    # Baggrund med gradient-effekt (cirkel i midten)
    center = size // 2
    for r in range(size // 2, 0, -1):
        ratio = r / (size // 2)
        # Fade fra accent mørk til baggrund
        color = (
            int(15 + (14 - 15) * ratio),
            int(23 + (165 - 23) * ratio * 0.15),
            int(42 + (233 - 42) * ratio * 0.15),
            255,
        )
        draw.ellipse([center - r, center - r, center + r, center + r], fill=color)

    # DC tekst
    font_size = size // 3
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    text = "DC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 40

    draw.text((x, y), text, font=font, fill=ACCENT)

    # Lille prik under tekst som "capture" indikator
    dot_radius = size // 40
    draw.ellipse(
        [center - dot_radius, size * 0.72 - dot_radius,
         center + dot_radius, size * 0.72 + dot_radius],
        fill=ACCENT_DARK
    )

    img.putalpha(mask)
    return img

def create_splash_icon(size=400):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    center = size // 2

    font_size = size // 2
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except Exception:
            font = ImageFont.load_default()

    text = "DC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 50

    draw.text((x, y), text, font=font, fill=ACCENT)

    dot_radius = size // 25
    draw.ellipse(
        [center - dot_radius, size * 0.72 - dot_radius,
         center + dot_radius, size * 0.72 + dot_radius],
        fill=ACCENT_DARK
    )

    return img

def create_favicon(size=64):
    img = Image.new("RGBA", (size, size), BG_COLOR)
    draw = ImageDraw.Draw(img)
    radius = size // 6
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, size, size], radius=radius, fill=255)

    font_size = size // 2
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "DC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2

    draw.text((x, y), text, font=font, fill=ACCENT)
    img.putalpha(mask)
    return img

def create_android_foreground(size=108):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_size = size // 2
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "DC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 40

    draw.text((x, y), text, font=font, fill=ACCENT)

    center = size // 2
    dot_radius = size // 18
    draw.ellipse(
        [center - dot_radius, size * 0.72 - dot_radius,
         center + dot_radius, size * 0.72 + dot_radius],
        fill=ACCENT_DARK
    )

    return img

def create_android_background(size=108):
    return Image.new("RGBA", (size, size), BG_COLOR)

def create_android_monochrome(size=108):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    font_size = size // 2
    try:
        font = ImageFont.truetype("arialbd.ttf", font_size)
    except Exception:
        font = ImageFont.load_default()

    text = "DC"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - size // 40

    draw.text((x, y), text, font=font, fill=WHITE)

    center = size // 2
    dot_radius = size // 18
    draw.ellipse(
        [center - dot_radius, size * 0.72 - dot_radius,
         center + dot_radius, size * 0.72 + dot_radius],
        fill=WHITE
    )

    return img

if __name__ == "__main__":
    print("Generating Data Capture icons...")

    create_app_icon(1024).save(os.path.join(ASSETS_DIR, "icon.png"), "PNG")
    create_splash_icon(400).save(os.path.join(ASSETS_DIR, "splash-icon.png"), "PNG")
    create_favicon(64).save(os.path.join(ASSETS_DIR, "favicon.png"), "PNG")
    create_android_foreground(108).save(os.path.join(ASSETS_DIR, "android-icon-foreground.png"), "PNG")
    create_android_background(108).save(os.path.join(ASSETS_DIR, "android-icon-background.png"), "PNG")
    create_android_monochrome(108).save(os.path.join(ASSETS_DIR, "android-icon-monochrome.png"), "PNG")

    print("Icons generated successfully in assets/")

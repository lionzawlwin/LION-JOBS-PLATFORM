#!/usr/bin/env python3
"""
Lion Jobs Agency — Auto-post script
====================================
Triggered by GitHub Actions when a new job is posted on the platform.

Flow:
  1. Parse job data from the JOB_DATA environment variable (JSON from Vercel)
  2. Generate an AI image via Pollinations.ai (free, no API key)
  3. Composite the image with a gradient overlay, logo, and job text using Pillow
  4. Post to Telegram channel via Bot API
  5. Post to Facebook page via Graph API

Environment variables required:
  JOB_DATA              JSON string forwarded from Vercel webhook
  TELEGRAM_BOT_TOKEN    Bot token from @BotFather
  TELEGRAM_CHANNEL_ID   Channel username (e.g. @lionjobsagency) or numeric ID
  FB_PAGE_ID            Numeric Facebook Page ID
  FB_ACCESS_TOKEN       Never-expiring System User token from Meta Business Manager
  LOGO_URL              (optional) Public HTTPS URL to the agency logo PNG
"""

import io
import json
import os
import sys
import textwrap
import urllib.parse
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont

# ── Constants ─────────────────────────────────────────────────────────────────

OUTPUT_PATH = Path("/tmp/lion_jobs_post.jpg")
CANVAS_W, CANVAS_H = 1080, 1080   # square — works for both Telegram and Facebook
BRAND_BLUE   = (37, 99, 235)      # #2563EB — matches --brand-600
BRAND_DARK   = (30, 58, 138)      # #1E3A8A — matches --brand-900
ACCENT       = (251, 191, 36)     # #FBBF24 — amber for urgency badge
WHITE        = (255, 255, 255)
SEMI_BLACK   = (0, 0, 0, 200)     # RGBA overlay

FONT_PATH_BOLD   = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_PATH_NORMAL = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

FB_API_VERSION = "v21.0"

# ── Helpers ───────────────────────────────────────────────────────────────────

def env(name: str, required: bool = True) -> str:
    val = os.environ.get(name, "").strip()
    if required and not val:
        print(f"[ERROR] Required environment variable '{name}' is not set.", file=sys.stderr)
        sys.exit(1)
    return val


def load_font(path: str, size: int) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        print(f"[WARN] Font not found at {path}, using default.", file=sys.stderr)
        return ImageFont.load_default()


def wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int, draw: ImageDraw.ImageDraw) -> list[str]:
    """Wrap text so each line fits within max_width pixels."""
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        test = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), test, font=font)
        if bbox[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


# ── Step 1: Parse job data ─────────────────────────────────────────────────────

def parse_job() -> dict:
    raw = env("JOB_DATA")
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        print(f"[ERROR] JOB_DATA is not valid JSON: {exc}", file=sys.stderr)
        sys.exit(1)
    print(f"[INFO] Job: {data.get('title', '?')} @ {data.get('company', '?')}")
    return data


# ── Step 2: Generate AI image via Pollinations.ai ─────────────────────────────

def generate_background(job: dict) -> Image.Image:
    prompt = (
        f"Professional corporate office background for a job advertisement, "
        f"modern minimalist style, deep blue and white color palette, "
        f"soft bokeh lighting, clean and elegant, high resolution, "
        f"category: {job.get('category', 'business')}, "
        f"no text no people no faces"
    )
    encoded = urllib.parse.quote(prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width={CANVAS_W}&height={CANVAS_H}&nologo=true&seed=42"

    print(f"[INFO] Requesting AI image from Pollinations.ai …")
    try:
        resp = requests.get(url, timeout=90)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGBA")
        img = img.resize((CANVAS_W, CANVAS_H), Image.LANCZOS)
        print("[INFO] AI image received.")
        return img
    except Exception as exc:
        print(f"[WARN] Pollinations failed ({exc}). Using solid gradient fallback.", file=sys.stderr)
        return _gradient_fallback()


def _gradient_fallback() -> Image.Image:
    """Simple top-to-bottom blue gradient if Pollinations is unavailable."""
    img = Image.new("RGBA", (CANVAS_W, CANVAS_H))
    draw = ImageDraw.Draw(img)
    for y in range(CANVAS_H):
        t = y / CANVAS_H
        r = int(BRAND_DARK[0] + (BRAND_BLUE[0] - BRAND_DARK[0]) * t)
        g = int(BRAND_DARK[1] + (BRAND_BLUE[1] - BRAND_DARK[1]) * t)
        b = int(BRAND_DARK[2] + (BRAND_BLUE[2] - BRAND_DARK[2]) * t)
        draw.line([(0, y), (CANVAS_W, y)], fill=(r, g, b, 255))
    return img


# ── Step 3: Composite image ────────────────────────────────────────────────────

def build_image(job: dict, bg: Image.Image) -> Image.Image:
    canvas = bg.copy()
    draw = ImageDraw.Draw(canvas, "RGBA")

    # Dark gradient overlay — bottom 65% of canvas for text legibility
    overlay_top = int(CANVAS_H * 0.35)
    for y in range(overlay_top, CANVAS_H):
        alpha = int(210 * (y - overlay_top) / (CANVAS_H - overlay_top))
        draw.line([(0, y), (CANVAS_W, y)], fill=(0, 0, 0, alpha))

    # Thin brand-color bar at the very top
    draw.rectangle([(0, 0), (CANVAS_W, 8)], fill=(*BRAND_BLUE, 255))

    # ── Logo ──────────────────────────────────────────────────────
    logo_url = os.environ.get("LOGO_URL", "").strip()
    if logo_url:
        try:
            resp = requests.get(logo_url, timeout=15)
            resp.raise_for_status()
            logo = Image.open(io.BytesIO(resp.content)).convert("RGBA")
            logo_h = 90
            ratio = logo_h / logo.height
            logo = logo.resize((int(logo.width * ratio), logo_h), Image.LANCZOS)
            x = (CANVAS_W - logo.width) // 2
            canvas.paste(logo, (x, 28), logo)   # third arg = alpha mask
        except Exception as exc:
            print(f"[WARN] Logo download failed: {exc}", file=sys.stderr)

    # ── URGENT badge ──────────────────────────────────────────────
    y_cursor = int(CANVAS_H * 0.42)
    if job.get("isUrgent"):
        badge_font = load_font(FONT_PATH_BOLD, 26)
        badge_text = "  🔥 URGENT HIRING  "
        bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
        bw = bbox[2] - bbox[0] + 24
        bh = bbox[3] - bbox[1] + 16
        bx = (CANVAS_W - bw) // 2
        draw.rounded_rectangle([(bx, y_cursor), (bx + bw, y_cursor + bh)], radius=10, fill=(*ACCENT, 240))
        draw.text((bx + 12, y_cursor + 8), badge_text.strip(), font=badge_font, fill=(30, 20, 0))
        y_cursor += bh + 18

    # ── Job title ─────────────────────────────────────────────────
    title_font = load_font(FONT_PATH_BOLD, 62)
    title_lines = wrap_text(job.get("title", "Open Position"), title_font, CANVAS_W - 100, draw)
    for line in title_lines[:2]:   # max 2 lines
        bbox = draw.textbbox((0, 0), line, font=title_font)
        x = (CANVAS_W - (bbox[2] - bbox[0])) // 2
        # Shadow
        draw.text((x + 2, y_cursor + 2), line, font=title_font, fill=(0, 0, 0, 180))
        draw.text((x, y_cursor), line, font=title_font, fill=WHITE)
        y_cursor += bbox[3] - bbox[1] + 10
    y_cursor += 16

    # ── Company name ──────────────────────────────────────────────
    company_font = load_font(FONT_PATH_BOLD, 34)
    company = f"🏢  {job.get('company', '')}"
    bbox = draw.textbbox((0, 0), company, font=company_font)
    x = (CANVAS_W - (bbox[2] - bbox[0])) // 2
    draw.text((x, y_cursor), company, font=company_font, fill=(200, 225, 255))
    y_cursor += bbox[3] - bbox[1] + 20

    # ── Info row: location | type | salary ────────────────────────
    info_font = load_font(FONT_PATH_NORMAL, 30)
    location = job.get("location", "")
    job_type = job.get("type", "")
    salary   = job.get("salary", "Negotiable")
    info_line = f"📍 {location}   •   {job_type}   •   💰 {salary}"
    bbox = draw.textbbox((0, 0), info_line, font=info_font)
    x = (CANVAS_W - (bbox[2] - bbox[0])) // 2
    draw.text((x, y_cursor), info_line, font=info_font, fill=(200, 220, 255))
    y_cursor += bbox[3] - bbox[1] + 32

    # ── Description excerpt ───────────────────────────────────────
    desc_font = load_font(FONT_PATH_NORMAL, 26)
    desc_raw  = job.get("description", "")
    desc_raw  = desc_raw[:280].rstrip() + ("…" if len(desc_raw) > 280 else "")
    desc_lines = wrap_text(desc_raw, desc_font, CANVAS_W - 160, draw)
    for line in desc_lines[:4]:   # max 4 lines
        bbox = draw.textbbox((0, 0), line, font=desc_font)
        x = (CANVAS_W - (bbox[2] - bbox[0])) // 2
        draw.text((x, y_cursor), line, font=desc_font, fill=(180, 200, 240))
        y_cursor += bbox[3] - bbox[1] + 8
    y_cursor += 24

    # ── APPLY NOW button ──────────────────────────────────────────
    btn_font = load_font(FONT_PATH_BOLD, 32)
    btn_text = "  APPLY NOW — Lion Jobs Agency  "
    bbox = draw.textbbox((0, 0), btn_text, font=btn_font)
    bw = bbox[2] - bbox[0] + 48
    bh = bbox[3] - bbox[1] + 24
    bx = (CANVAS_W - bw) // 2
    # Ensure button fits on canvas
    by = min(y_cursor, CANVAS_H - bh - 30)
    draw.rounded_rectangle([(bx, by), (bx + bw, by + bh)], radius=14, fill=(*BRAND_BLUE, 240))
    draw.text((bx + 24, by + 12), btn_text.strip(), font=btn_font, fill=WHITE)

    # Convert RGBA → RGB for JPEG output
    result = Image.new("RGB", canvas.size, (255, 255, 255))
    result.paste(canvas, mask=canvas.split()[3])
    return result


# ── Step 4: Post to Telegram ──────────────────────────────────────────────────

def post_telegram(image_path: Path, job: dict) -> bool:
    bot_token  = env("TELEGRAM_BOT_TOKEN")
    channel_id = env("TELEGRAM_CHANNEL_ID")

    title    = job.get("title", "New Position")
    company  = job.get("company", "")
    location = job.get("location", "")
    job_type = job.get("type", "")
    salary   = job.get("salary", "Negotiable")
    apply_url = job.get("applyUrl", job.get("url", ""))
    urgent_tag = "#Urgent " if job.get("isUrgent") else ""

    caption = (
        f"{'🔥 ' if job.get('isUrgent') else '✨ '}{'URGENT — ' if job.get('isUrgent') else ''}<b>{title}</b>\n\n"
        f"🏢 <b>{company}</b>\n"
        f"📍 {location}  |  {job_type}\n"
        f"💰 {salary}\n\n"
        f"👉 <a href=\"{apply_url}\">Apply Now</a>\n\n"
        f"#LionJobsAgency {urgent_tag}#Jobs #Myanmar #Hiring"
    )

    url = f"https://api.telegram.org/bot{bot_token}/sendPhoto"
    try:
        with open(image_path, "rb") as f:
            resp = requests.post(
                url,
                data={"chat_id": channel_id, "caption": caption, "parse_mode": "HTML"},
                files={"photo": ("job_post.jpg", f, "image/jpeg")},
                timeout=60,
            )
        if resp.ok:
            print("[INFO] Telegram: posted successfully.")
            return True
        else:
            print(f"[ERROR] Telegram API {resp.status_code}: {resp.text}", file=sys.stderr)
            return False
    except Exception as exc:
        print(f"[ERROR] Telegram request failed: {exc}", file=sys.stderr)
        return False


# ── Step 5: Post to Facebook ──────────────────────────────────────────────────

def post_facebook(image_path: Path, job: dict) -> bool:
    page_id      = env("FB_PAGE_ID")
    access_token = env("FB_ACCESS_TOKEN")

    title    = job.get("title", "New Position")
    company  = job.get("company", "")
    location = job.get("location", "")
    job_type = job.get("type", "")
    salary   = job.get("salary", "Negotiable")
    apply_url = job.get("applyUrl", job.get("url", ""))

    message = (
        f"{'🔥 URGENT HIRING: ' if job.get('isUrgent') else '✨ NEW JOB: '}{title}\n\n"
        f"🏢 Company: {company}\n"
        f"📍 Location: {location}\n"
        f"⏰ Type: {job_type}\n"
        f"💰 Salary: {salary}\n\n"
        f"👉 Apply here: {apply_url}\n\n"
        f"Follow our page for daily job updates!\n"
        f"#LionJobsAgency #Jobs #Myanmar #Hiring #JobVacancy"
    )

    url = f"https://graph.facebook.com/{FB_API_VERSION}/{page_id}/photos"
    try:
        with open(image_path, "rb") as f:
            resp = requests.post(
                url,
                data={"caption": message, "access_token": access_token},
                files={"source": ("job_post.jpg", f, "image/jpeg")},
                timeout=60,
            )
        if resp.ok:
            print("[INFO] Facebook: posted successfully.")
            return True
        else:
            print(f"[ERROR] Facebook API {resp.status_code}: {resp.text}", file=sys.stderr)
            return False
    except Exception as exc:
        print(f"[ERROR] Facebook request failed: {exc}", file=sys.stderr)
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print("=" * 60)
    print("Lion Jobs Agency — Auto Post Script")
    print("=" * 60)

    job = parse_job()

    print("[INFO] Generating AI background image …")
    bg = generate_background(job)

    print("[INFO] Compositing job card …")
    final_image = build_image(job, bg)
    final_image.save(OUTPUT_PATH, "JPEG", quality=92, optimize=True)
    print(f"[INFO] Image saved to {OUTPUT_PATH} ({OUTPUT_PATH.stat().st_size // 1024} KB)")

    telegram_ok = post_telegram(OUTPUT_PATH, job)
    facebook_ok = post_facebook(OUTPUT_PATH, job)

    print("=" * 60)
    if telegram_ok and facebook_ok:
        print("[SUCCESS] Posted to Telegram and Facebook.")
    elif telegram_ok or facebook_ok:
        platform = "Telegram" if telegram_ok else "Facebook"
        print(f"[PARTIAL] Posted to {platform} only. Check errors above.")
        sys.exit(1)
    else:
        print("[FAILURE] Both Telegram and Facebook failed.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

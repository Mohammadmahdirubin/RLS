#!/usr/bin/env python3
"""Create each approved RLS membership certificate once and store it in GitHub.

The public member view is read with the site's public publishable key. No private
member data, credentials, or evidence documents are requested or stored.
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import tempfile
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import arabic_reshaper
import jdatetime
import qrcode
import requests
from bidi.algorithm import get_display
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "assets" / "member-certificates"
TEMPLATE = ROOT / "Bilingual Russian Language Membership Certificate.png"
CONFIG = ROOT / "assets" / "supabase-config.js"
PROFILE_BASE = "https://rlsj.ir/community.html?member="
FA_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")
NAVY = "#102f5b"
GROUPS = {
    "student": "دانشجو",
    "graduate": "دانش‌آموخته",
    "faculty": "استاد و عضو هیئت علمی",
    "researcher": "پژوهشگر",
    "translator": "مترجم",
    "culture": "ادبیات و فرهنگ",
    "honorary": "عضو افتخاری",
}

def config_values() -> tuple[str, str]:
    source = CONFIG.read_text(encoding="utf-8")
    url_match = re.search(r'url\s*:\s*["\']([^"\']+)["\']', source)
    key_match = re.search(r'publishableKey\s*:\s*["\']([^"\']+)["\']', source)
    if not url_match or not key_match:
        raise RuntimeError("Could not read the public Supabase configuration.")
    return url_match.group(1).rstrip("/"), key_match.group(1)

def fa_text(value: str) -> str:
    return get_display(arabic_reshaper.reshape(str(value or "")))

def load_font(size: int, bold: bool) -> ImageFont.FreeTypeFont:
    filename = "NotoNaskhArabic-Bold.ttf" if bold else "NotoNaskhArabic-Regular.ttf"
    candidates = [
        Path("/usr/share/fonts/truetype/noto") / filename,
        Path("/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf" if bold else "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf"),
    ]
    for path in candidates:
        if path.exists():
            return ImageFont.truetype(str(path), size=size)
    raise RuntimeError(f"Persian font not found: {filename}")

def membership_date(value: str) -> str:
    dt = datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(ZoneInfo("Asia/Tehran"))
    persian = jdatetime.datetime.fromgregorian(datetime=dt)
    return f"{persian.day} {persian.strftime('%B')} {persian.year}".translate(FA_DIGITS)

def make_qr(url: str, side: int) -> Image.Image:
    code = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    code.add_data(url)
    code.make(fit=True)
    matrix = code.get_matrix()
    modules = len(matrix)
    pixels_per_module = max(1, side // modules)
    actual = modules * pixels_per_module
    pad = (side - actual) // 2
    qr_image = Image.new("RGB", (side, side), "white")
    draw = ImageDraw.Draw(qr_image)
    for row, values in enumerate(matrix):
        y0 = pad + row * pixels_per_module
        for col, dark in enumerate(values):
            if dark:
                x0 = pad + col * pixels_per_module
                draw.rectangle(
                    (x0, y0, x0 + pixels_per_module - 1, y0 + pixels_per_module - 1),
                    fill="black",
                )
    # Verify the encoded payload before it is embedded in the certificate.
    decoded_payload = "".join(code.data_list[0].data.decode("utf-8") for _ in [0])
    if decoded_payload != url:
        raise RuntimeError("QR payload verification failed.")
    return qr_image

def render_certificate(member: dict, output_png: Path, output_webp: Path) -> None:
    user_id = str(uuid.UUID(str(member["user_id"])))
    if not TEMPLATE.is_file():
        raise RuntimeError("The original certificate template is missing.")

    with Image.open(TEMPLATE) as source:
        image = source.convert("RGB")
    width, height = image.size
    # The coordinates are the approved layout coordinates from the former
    # certificate renderer, scaled safely if the source template is larger.
    scale = width / 1500.0
    if height < int(900 * scale):
        raise RuntimeError(f"Unexpected certificate template dimensions: {width}x{height}")

    draw = ImageDraw.Draw(image)
    name = str(member.get("display_name") or member.get("full_name") or "RLS Member").strip()
    name = re.sub(r"^\s*(?:آقای|خانم|جناب آقای|سرکار خانم)\s*", "", name)
    number = str(int(member["member_number"])).zfill(6).translate(FA_DIGITS)
    group = GROUPS.get(str(member.get("category") or ""), str(member.get("category") or "—"))
    date = membership_date(str(member["created_at"]))

    title_font = load_font(max(12, round(46 * scale)), True)
    detail_font = load_font(max(12, round(29 * scale)), True)

    draw.text(
        (round(746 * scale), round(535 * scale)),
        fa_text(name),
        font=title_font,
        fill=NAVY,
        anchor="mm",
        stroke_width=0,
    )
    for text, y in [(number, 770), (group, 826), (date, 882)]:
        draw.text(
            (round(350 * scale), round(y * scale)),
            fa_text(text),
            font=detail_font,
            fill=NAVY,
            anchor="rm",
            stroke_width=0,
        )

    qr_side = max(150, round(150 * scale))
    qr = make_qr(PROFILE_BASE + user_id, qr_side)
    left = round(1265 * scale)
    top = round(735 * scale)
    box = round(156 * scale)
    inset = round(3 * scale)
    draw.rectangle((left, top, left + box, top + box), fill="white")
    image.paste(qr, (left + inset, top + inset))

    output_png.parent.mkdir(parents=True, exist_ok=True)
    output_png.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=output_png.parent, suffix=".png", delete=False) as tmp:
        tmp_png = Path(tmp.name)
    with tempfile.NamedTemporaryFile(dir=output_webp.parent, suffix=".webp", delete=False) as tmp:
        tmp_webp = Path(tmp.name)
    try:
        image.save(tmp_png, format="PNG", optimize=True, dpi=(300, 300))
        image.save(tmp_webp, format="WEBP", quality=94, method=6)
        tmp_png.replace(output_png)
        tmp_webp.replace(output_webp)
    finally:
        tmp_png.unlink(missing_ok=True)
        tmp_webp.unlink(missing_ok=True)

    print(
        f"Created member #{number}: {output_webp.name} "
        f"(WebP {output_webp.stat().st_size:,} B; PNG {output_png.stat().st_size:,} B)"
    )

def main() -> None:
    if not TEMPLATE.exists():
        raise RuntimeError(f"Template not found: {TEMPLATE}")
    supabase_url, public_key = config_values()
    response = requests.get(
        supabase_url + "/rest/v1/rls_public_members",
        params={
            "select": "user_id,display_name,category,created_at,member_number,membership_status",
            "membership_status": "eq.approved",
            "order": "member_number.asc",
            "limit": "500",
        },
        headers={
            "apikey": public_key,
            "Authorization": "Bearer " + public_key,
            "Accept": "application/json",
        },
        timeout=30,
    )
    response.raise_for_status()
    members = response.json()
    if not isinstance(members, list):
        raise RuntimeError("Supabase public member response was not a list.")

    created = 0
    skipped = 0
    for member in members:
        if not member.get("user_id") or not member.get("member_number") or not member.get("created_at"):
            continue
        user_id = str(uuid.UUID(str(member["user_id"])))
        png = OUTPUT / f"{user_id}.png"
        webp = OUTPUT / f"{user_id}.webp"
        if png.exists() and webp.exists():
            skipped += 1
            continue
        render_certificate(member, png, webp)
        created += 1

    print(f"Approved members: {len(members)} | generated: {created} | already stored: {skipped}")
    if created:
        subprocess.run(["git", "config", "user.name", "RLS Membership Certificate Bot"], cwd=ROOT, check=True)
        subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], cwd=ROOT, check=True)
        subprocess.run(["git", "add", "assets/member-certificates/"], cwd=ROOT, check=True)
        subprocess.run(
            ["git", "commit", "-m", f"Store {created} pre-generated membership certificate(s)"],
            cwd=ROOT,
            check=True,
        )
        # Use the workflow's built-in token; no personal access token is needed.
        subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=ROOT, check=True)
        subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=ROOT, check=True)

if __name__ == "__main__":
    main()

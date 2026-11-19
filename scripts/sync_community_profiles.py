#!/usr/bin/env python3
"""Mirror approved public RLS member profiles and avatar images to GitHub Pages."""
from __future__ import annotations

import json
import mimetypes
import re
from pathlib import Path
from urllib.parse import quote, urljoin

import requests

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / "assets" / "supabase-config.js"
OUT_JSON = ROOT / "assets" / "community-members.json"
AVATAR_DIR = ROOT / "assets" / "community-profiles" / "avatars"
FIELDS = [
    "user_id", "display_name", "category", "country", "city", "institution",
    "degree", "specialty", "bio", "avatar_path", "website_url", "blog_url",
    "orcid", "researchgate_url", "google_scholar_url", "instagram_url",
    "telegram_url", "linkedin_url", "x_url", "articles_count", "books_count",
    "created_at", "profile_headline", "memberships", "activities", "publications",
    "full_name",
    "research_interests", "languages", "full_name_en",
    "full_name_ru", "display_name_en", "display_name_ru", "profile_headline_en",
    "profile_headline_ru", "country_en", "country_ru", "city_en", "city_ru",
    "institution_en", "institution_ru", "degree_en", "degree_ru", "specialty_en",
    "specialty_ru", "bio_en", "bio_ru", "memberships_en", "memberships_ru",
    "activities_en", "activities_ru", "publications_en", "publications_ru",
    "research_interests_en", "research_interests_ru", "languages_en",
    "languages_ru", "salutation", "reviewed_at", "member_number",
    "membership_status",
]
IMAGE_EXTENSIONS = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
    "image/gif": ".gif", "image/avif": ".avif",
}

def read_config() -> tuple[str, str]:
    content = CONFIG.read_text(encoding="utf-8")
    url = re.search(r'url\s*:\s*["\']([^"\']+)["\']', content)
    key = re.search(r'(?:publishableKey|anonKey)\s*:\s*["\']([^"\']+)["\']', content)
    if not url or not key:
        raise RuntimeError("Public Supabase configuration was not found.")
    return url.group(1).rstrip("/") + "/", key.group(1)

def fetch_members(base: str, key: str) -> list[dict]:
    endpoint = urljoin(base, "rest/v1/rls_public_members")
    headers = {"apikey": key, "Authorization": f"Bearer {key}", "Accept": "application/json"}
    params = {"select": "*", "membership_status": "eq.approved", "order": "member_number.asc"}
    members, offset = [], 0
    while True:
        response = requests.get(endpoint, headers={**headers, "Range": f"{offset}-{offset+499}"}, params=params, timeout=30)
        if not response.ok:
            raise RuntimeError(f"Public member view returned HTTP {response.status_code}: {response.text[:500]}")
        batch = response.json()
        if not isinstance(batch, list):
            raise RuntimeError("Unexpected response from public member view.")
        members.extend(batch)
        if len(batch) < 500:
            break
        offset += 500
    return [m for m in members if m.get("membership_status") == "approved" and m.get("user_id")]

def mirror_avatar(base: str, key: str, member: dict) -> str:
    path = str(member.get("avatar_path") or "").strip()
    uid = str(member.get("user_id") or "").strip()
    if not path or not uid:
        return ""
    # Keep the original object path in the source record; copy only public images.
    url = urljoin(base, "storage/v1/object/public/rls-member-avatars/" + quote(path, safe="/"))
    response = requests.get(url, headers={"apikey": key}, timeout=30)
    if not response.ok or not response.headers.get("content-type", "").lower().startswith("image/"):
        print(f"Avatar mirror skipped for {uid}: HTTP {response.status_code}")
        return ""
    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
    extension = IMAGE_EXTENSIONS.get(content_type) or mimetypes.guess_extension(content_type) or ".img"
    if extension == ".jpe":
        extension = ".jpg"
    AVATAR_DIR.mkdir(parents=True, exist_ok=True)
    target = AVATAR_DIR / (uid + extension)
    target.write_bytes(response.content)
    return "/" + target.relative_to(ROOT).as_posix()

def read_existing_translations() -> dict[str, dict]:
    if not OUT_JSON.exists():
        return {}
    try:
        payload = json.loads(OUT_JSON.read_text(encoding="utf-8"))
        return {str(m.get("user_id")): m for m in payload.get("members", []) if m.get("user_id")}
    except Exception:
        return {}

def main() -> None:
    previous = read_existing_translations()
    base, key = read_config()
    members = fetch_members(base, key)
    output = []
    for source in members:
        member = {field: source.get(field) for field in FIELDS}
        old = previous.get(str(member.get("user_id")), {})
        # Preserve translations and fingerprints across periodic source syncs.
        for field in FIELDS:
            for lang in ("en", "ru"):
                translated_key = f"{field}_{lang}"
                if translated_key in old:
                    member[translated_key] = old[translated_key]
        if isinstance(old.get("_translation_hashes"), dict):
            member["_translation_hashes"] = old["_translation_hashes"]
        member["avatar_url"] = mirror_avatar(base, key, source)
        output.append(member)
    payload = {
        "schema": 1,
        "source": "rls_public_members",
        "updated_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "count": len(output),
        "members": output,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Mirrored {len(output)} approved public profiles to {OUT_JSON.relative_to(ROOT)}.")

if __name__ == "__main__":
    main()

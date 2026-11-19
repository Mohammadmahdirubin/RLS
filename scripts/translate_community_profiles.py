#!/usr/bin/env python3
"""Translate approved public member profiles into English and Russian.

Triggered for a verification pass on 2026-11-19.
"""
from __future__ import annotations
import hashlib, json, os, sys, time
from pathlib import Path
import requests

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"assets"/"community-members.json"
MODEL=os.getenv("OPENAI_TRANSLATION_MODEL","gpt-4.1-mini")
API_KEY=os.getenv("OPENAI_API_KEY","").strip()
FIELDS=[
 "display_name","full_name","profile_headline","country","city","institution",
 "degree","specialty","bio","memberships","activities","publications",
 "research_interests","languages"
]
LANGS={"en":"English","ru":"Russian"}
def digest(member):
 values={field:str(member.get(field) or "").strip() for field in FIELDS}
 return hashlib.sha256(json.dumps(values,ensure_ascii=False,sort_keys=True).encode()).hexdigest()
def api_translate(source, target):
 prompt=(
  "You are a professional academic translator. Translate the supplied public member-profile fields "
  "faithfully and completely into "+LANGS[target]+". Preserve meaning, line breaks, bullets, dates, "
  "numbers, URLs, and academic terminology. For personal names, transliterate naturally; do not "
  "invent credentials or facts. Return a JSON object with exactly the same keys and string values. "
  "Translate every non-empty value; empty values remain empty. Use polished academic English or "
  "standard academic Russian."
 )
 for attempt in range(4):
  try:
   response=requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={"Authorization":"Bearer "+API_KEY,"Content-Type":"application/json"},
    json={"model":MODEL,"temperature":0.2,"response_format":{"type":"json_object"},
          "messages":[{"role":"system","content":prompt},
                     {"role":"user","content":json.dumps(source,ensure_ascii=False)}]},
    timeout=90
   )
   if response.status_code==429 or response.status_code>=500:
    if attempt<3: time.sleep(3*(attempt+1)); continue
   response.raise_for_status()
   content=response.json()["choices"][0]["message"]["content"]
   result=json.loads(content)
   return {k:str(result.get(k,"") or "") for k in source}
  except Exception:
   if attempt<3: time.sleep(3*(attempt+1)); continue
   raise
 raise RuntimeError("Translation failed")
def main():
 payload=json.loads(DATA.read_text(encoding="utf-8"))
 if not API_KEY:
  print("WARNING: OPENAI_API_KEY is missing; automatic translation skipped.",file=sys.stderr)
  return 0
 translated_count=0; failures=[]
 for member in payload.get("members",[]):
  uid=member.get("user_id")
  src={field:str(member.get(field) or "").strip() for field in FIELDS}
  if not any(src.values()): continue
  fingerprint=digest(member)
  hashes=member.setdefault("_translation_hashes",{})
  for lang in LANGS:
   if hashes.get(lang)==fingerprint and all(
    not src[field] or member.get(field+"_"+lang) for field in FIELDS
   ): continue
   try:
    output=api_translate(src,lang)
    for field,value in output.items():
     member[field+"_"+lang]=value
    hashes[lang]=fingerprint
    translated_count+=1
    print(f"Translated member {uid} ({lang})")
   except Exception as exc:
    failures.append(f"{uid}/{lang}: {exc}")
    print(f"ERROR translating {uid}/{lang}: {exc}",file=sys.stderr)
 DATA.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print(f"Translation passes completed: {translated_count}; errors: {len(failures)}")
 return 1 if failures else 0
if __name__=="__main__":
 sys.exit(main())

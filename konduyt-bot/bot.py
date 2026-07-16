import hashlib, json, asyncio, os
from pathlib import Path
from datetime import datetime
import httpx

SNAPSHOTS_DIR = Path("snapshots")
SNAPSHOTS_DIR.mkdir(exist_ok=True)

WATCH_LIST = {
    "KE": {"urls": ["https://www.kra.go.ke/individual/filing-paying/types-of-taxes/value-added-tax"], "country": "Kenya"},
    "NG": {"urls": ["https://www.firs.gov.ng/vat"], "country": "Nigeria"},
    "GH": {"urls": ["https://www.gra.gov.gh/vat"], "country": "Ghana"},
}

def snapshot_path(code, i=0):
    return SNAPSHOTS_DIR / f"{code}_{i}.json"

def load_snapshot(code, i=0):
    p = snapshot_path(code, i)
    return json.loads(p.read_text()) if p.exists() else None

def save_snapshot(code, i, text, h):
    snapshot_path(code, i).write_text(json.dumps({
        "hash": h, "text": text[:5000],
        "last_checked": datetime.utcnow().isoformat()
    }))

def sha256(text):
    return hashlib.sha256(text.encode()).hexdigest()

def alert(code, country, url, changed, diff=""):
    msg = f"\n{'='*60}\n{'CHANGE DETECTED' if changed else 'STALE WARNING'} — {country} ({code})\nURL: {url}\nTime: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}"
    if diff: msg += f"\n\nDiff preview:\n{diff[:500]}"
    msg += f"\n\nACTION: Review {code}.json in konduyt-api/tax/jurisdictions/\n{'='*60}"
    print(msg)

async def check(code, info):
    print(f"\nChecking {info['country']} ({code})...")
    for i, url in enumerate(info["urls"]):
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
                res = await c.get(url, headers={"User-Agent": "Konduyt-TaxBot/1.0"})
                text = res.text
        except Exception as e:
            print(f"  Fetch failed: {e}"); continue

        h = sha256(text)
        snap = load_snapshot(code, i)

        if snap is None:
            save_snapshot(code, i, text, h)
            print("  First snapshot saved")
            continue

        days = (datetime.utcnow() - datetime.fromisoformat(snap["last_checked"])).days

        if h != snap["hash"]:
            import difflib
            diff = "".join(list(difflib.unified_diff(
                snap.get("text","").splitlines(keepends=True),
                text.splitlines(keepends=True), n=2
            ))[:30])
            print(f"  CHANGE DETECTED")
            alert(code, info["country"], url, True, diff)
            save_snapshot(code, i, text, h)
        else:
            print(f"  No change ({days}d ago)")
            if days > 90:
                alert(code, info["country"], url, False)
            save_snapshot(code, i, text, h)

async def main():
    print(f"Konduyt Tax Bot — {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 50)
    for code, info in WATCH_LIST.items():
        await check(code, info)
    print("\nAll checks complete.")

if __name__ == "__main__":
    asyncio.run(main())

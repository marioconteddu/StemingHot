"""Run separation multiple times to verify reliability."""
import os
import requests
import time
import sys
from pathlib import Path

BASE = "http://localhost:8000"
DEFAULT_FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "audio" / "smoke_test.wav"
TEST_FILE = Path(os.environ.get("STEMINGHOT_TEST_FILE", str(DEFAULT_FIXTURE)))
RUNS = 3


def run_separation(run_num):
    print(f"\n{'='*50}")
    print(f"RUN {run_num}/{RUNS}")
    print(f"{'='*50}")

    print("  Uploading...")
    with open(TEST_FILE, "rb") as f:
        resp = requests.post(f"{BASE}/api/upload", files={"file": (TEST_FILE.name, f, "audio/wav")})
    assert resp.status_code == 200, f"Upload failed: {resp.status_code}"
    job_id = resp.json()["jobId"]

    print("  Starting separation...")
    resp = requests.post(f"{BASE}/api/separate", json={
        "jobId": job_id,
        "stemConfig": "4stems",
    })
    assert resp.status_code == 200, f"Separate failed: {resp.status_code}"

    start = time.time()
    while True:
        time.sleep(15)
        resp = requests.get(f"{BASE}/api/job/{job_id}/status")
        d = resp.json()
        s, p = d["status"], d["progress"]
        elapsed = time.time() - start
        print(f"  [{elapsed:5.0f}s] {s} | {p:.1f}%")

        if s == "completed":
            stems = [st["name"] for st in d.get("stems", [])]
            print(f"  SUCCESS: {stems}")

            for st in d["stems"]:
                r = requests.get(f"{BASE}{st['url']}", stream=True)
                size = int(r.headers.get("content-length", 0))
                assert r.status_code == 200 and size > 1000, f"Stem {st['name']} bad: {r.status_code}, {size}B"

            print(f"  All stems downloadable. Time: {elapsed:.0f}s")
            return True
        elif s == "failed":
            print(f"  FAILED: {d.get('error')}")
            return False


if __name__ == "__main__":
    results = []
    for i in range(1, RUNS + 1):
        ok = run_separation(i)
        results.append(ok)
        if not ok:
            print(f"\nFailed on run {i}. Check server logs.")
            sys.exit(1)

    print(f"\n{'='*50}")
    print(f"ALL {RUNS} RUNS PASSED")
    print(f"{'='*50}")

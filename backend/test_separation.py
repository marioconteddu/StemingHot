"""End-to-end separation test."""
import os
import requests
import time
import sys
from pathlib import Path

BASE = "http://localhost:8000"
DEFAULT_FIXTURE = Path(__file__).resolve().parents[1] / "fixtures" / "audio" / "smoke_test.wav"
TEST_FILE = Path(os.environ.get("STEMINGHOT_TEST_FILE", str(DEFAULT_FIXTURE)))


def test_upload():
    print("=== TEST 1: UPLOAD ===")
    with open(TEST_FILE, "rb") as f:
        resp = requests.post(f"{BASE}/api/upload", files={"file": (TEST_FILE.name, f, "audio/wav")})
    assert resp.status_code == 200, f"Upload failed: {resp.status_code} {resp.text}"
    data = resp.json()
    job_id = data["jobId"]
    meta = data.get("metadata", {})
    print(f"  Job ID: {job_id}")
    print(f"  Duration: {meta.get('duration', 0):.1f}s | SR: {meta.get('sampleRate')} | Format: {meta.get('format')}")
    print("  PASS")
    return job_id


def test_separate_and_poll(job_id):
    print("\n=== TEST 2: SEPARATE (4stems) ===")
    resp = requests.post(f"{BASE}/api/separate", json={
        "jobId": job_id,
        "stemConfig": "4stems",
    })
    assert resp.status_code == 200, f"Separate failed: {resp.status_code} {resp.text}"
    print(f"  Started: {resp.json()['status']}")

    start = time.time()
    while True:
        time.sleep(10)
        resp = requests.get(f"{BASE}/api/job/{job_id}/status")
        d = resp.json()
        s, p = d["status"], d["progress"]
        elapsed = time.time() - start
        print(f"  [{elapsed:5.0f}s] {s} | {p:.1f}%")

        if s == "completed":
            stems = d.get("stems", [])
            print(f"  Stems produced: {[st['name'] for st in stems]}")
            print("  PASS")
            return stems
        elif s == "failed":
            print(f"  FAIL: {d.get('error')}")
            sys.exit(1)


def test_stem_downloads(job_id, stems):
    print("\n=== TEST 3: STEM DOWNLOADS ===")
    for st in stems:
        url = f"{BASE}{st['url']}"
        r = requests.get(url, stream=True)
        size = int(r.headers.get("content-length", 0))
        assert r.status_code == 200, f"  {st['name']}: GET returned {r.status_code}"
        assert size > 1000, f"  {st['name']}: file too small ({size} bytes)"
        print(f"  {st['name']}: OK ({size / 1024 / 1024:.1f} MB)")
    print("  PASS")


def test_export_wav(job_id, stems):
    print("\n=== TEST 4: EXPORT INDIVIDUAL (WAV) ===")
    for st in stems:
        r = requests.get(f"{BASE}/api/export/{job_id}", params={"format": "wav", "stem": st["name"]}, stream=True)
        size = int(r.headers.get("content-length", 0))
        assert r.status_code == 200, f"  {st['name']} export WAV failed: {r.status_code}"
        assert size > 1000, f"  {st['name']} export WAV too small ({size} bytes)"
        print(f"  {st['name']}.wav: OK ({size / 1024 / 1024:.1f} MB)")
    print("  PASS")


def test_export_flac(job_id, stems):
    print("\n=== TEST 5: EXPORT INDIVIDUAL (FLAC) ===")
    stem = stems[0]
    r = requests.get(f"{BASE}/api/export/{job_id}", params={"format": "flac", "stem": stem["name"]}, stream=True)
    size = int(r.headers.get("content-length", 0))
    assert r.status_code == 200, f"  FLAC export failed: {r.status_code}"
    assert size > 1000, f"  FLAC too small ({size} bytes)"
    print(f"  {stem['name']}.flac: OK ({size / 1024 / 1024:.1f} MB)")
    print("  PASS")


def test_export_mp3(job_id, stems):
    print("\n=== TEST 6: EXPORT INDIVIDUAL (MP3) ===")
    stem = stems[0]
    r = requests.get(f"{BASE}/api/export/{job_id}", params={"format": "mp3", "stem": stem["name"]}, stream=True)
    size = int(r.headers.get("content-length", 0))
    assert r.status_code == 200, f"  MP3 export failed: {r.status_code}"
    assert size > 1000, f"  MP3 too small ({size} bytes)"
    print(f"  {stem['name']}.mp3: OK ({size / 1024 / 1024:.1f} MB)")
    print("  PASS")


def test_export_all_zip(job_id):
    print("\n=== TEST 7: EXPORT ALL (ZIP) ===")
    r = requests.get(f"{BASE}/api/export/{job_id}/all", params={"format": "wav"}, stream=True)
    size = int(r.headers.get("content-length", 0))
    assert r.status_code == 200, f"  ZIP export failed: {r.status_code}"
    assert size > 1000, f"  ZIP too small ({size} bytes)"
    print(f"  stems.zip: OK ({size / 1024 / 1024:.1f} MB)")
    print("  PASS")


if __name__ == "__main__":
    job_id = test_upload()
    stems = test_separate_and_poll(job_id)
    test_stem_downloads(job_id, stems)
    test_export_wav(job_id, stems)
    test_export_flac(job_id, stems)
    test_export_mp3(job_id, stems)
    test_export_all_zip(job_id)
    print("\n" + "=" * 50)
    print("ALL TESTS PASSED")
    print("=" * 50)

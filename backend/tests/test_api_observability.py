import asyncio

from fastapi.testclient import TestClient

import api.routes as routes
from main import app, job_manager


client = TestClient(app)


def test_health_endpoint_reports_status():
    response = client.get("/api/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["device"] in {"cpu", "cuda"}


def test_job_status_persists_error_and_diagnostics():
    job = job_manager.create_job()
    job_manager.update_diagnostics(
        job.job_id,
        device="cuda",
        modelName="htdemucs_ft",
        stemConfig="4stems",
        settings={"shifts": 0, "segment": 39},
        inputPath="fixtures/audio/smoke_test.wav",
    )

    asyncio.run(
        job_manager.update_progress(
            job.job_id,
            41,
            "Separating stems...",
            detail="Synthetic separation failure for regression test",
            level="error",
            data={"phase": "inference"},
        )
    )

    response = client.get(f"/api/job/{job.job_id}/status")

    assert response.status_code == 200
    data = response.json()
    assert data["error"] == "Synthetic separation failure for regression test"
    assert data["stage"] == "Separating stems..."
    assert data["diagnostics"]["requestId"] == job.request_id
    assert data["diagnostics"]["modelName"] == "htdemucs_ft"
    assert data["diagnostics"]["device"] == "cuda"
    assert data["diagnostics"]["events"]
    assert data["diagnostics"]["events"][-1]["detail"] == data["error"]


def test_separate_request_quality_modes_resolve_settings(monkeypatch):
    async def fake_run(**_kwargs):
        return None

    monkeypatch.setattr(routes._separator, "run", fake_run)

    stable_job = job_manager.create_job()
    stable_response = client.post(
        "/api/separate",
        json={
            "jobId": stable_job.job_id,
            "stemConfig": "4stems",
            "qualityMode": "stable-local",
            "settings": {
                "segment": 3.2,
                "overlap": 0.1,
                "shifts": 4,
                "precision": "float16",
            },
        },
    )

    assert stable_response.status_code == 200
    stable_data = stable_response.json()
    assert stable_data["diagnostics"]["qualityMode"] == "stable-local"
    assert stable_data["diagnostics"]["settings"] == {
        "segment": 7.8,
        "overlap": 0.25,
        "shifts": 0,
        "precision": "float32",
    }

    custom_job = job_manager.create_job()
    custom_response = client.post(
        "/api/separate",
        json={
            "jobId": custom_job.job_id,
            "stemConfig": "4stems",
            "qualityMode": "custom",
            "settings": {
                "segment": 3.2,
                "overlap": 0.1,
                "shifts": 4,
                "precision": "float16",
            },
        },
    )

    assert custom_response.status_code == 200
    custom_data = custom_response.json()
    assert custom_data["diagnostics"]["qualityMode"] == "custom"
    assert custom_data["diagnostics"]["settings"] == {
        "segment": 3.2,
        "overlap": 0.1,
        "shifts": 4,
        "precision": "float16",
    }


def test_upload_metadata_includes_bpm_and_key(monkeypatch):
    monkeypatch.setattr(
        routes,
        "get_audio_metadata",
        lambda _path: {
            "duration": 123.4,
            "sampleRate": 44100,
            "channels": 2,
            "format": "wav",
            "bpm": 128.4,
            "musicalKey": "F# minor",
        },
    )

    response = client.post(
        "/api/upload",
        files={"file": ("detected.wav", b"RIFFdemo", "audio/wav")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["bpm"] == 128.4
    assert data["metadata"]["musicalKey"] == "F# minor"

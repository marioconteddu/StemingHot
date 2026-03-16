import asyncio
from fastapi import WebSocket, WebSocketDisconnect

from services.job_manager import JobManager


async def progress_websocket(
    websocket: WebSocket,
    job_id: str,
    job_manager: JobManager,
):
    """WebSocket endpoint that streams job progress updates."""
    await websocket.accept()

    queue = job_manager.subscribe(job_id)
    if not queue:
        await websocket.close(code=4004, reason="Job not found")
        return

    try:
        while True:
            msg = await asyncio.wait_for(queue.get(), timeout=120)
            await websocket.send_json(msg.model_dump())

            if msg.status in ("completed", "failed"):
                break
    except asyncio.TimeoutError:
        pass
    except WebSocketDisconnect:
        pass
    finally:
        job_manager.unsubscribe(job_id, queue)
        try:
            await websocket.close()
        except Exception:
            pass

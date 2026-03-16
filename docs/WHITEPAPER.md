# StemingHot: Stem Separation Studio  
## Technical White Paper

**Version 1.0**  
**Document type:** Technical white paper  
**Application:** StemingHot — local web application for music stem separation

---

## 1. Executive Summary

StemingHot is a professional-grade, local-first web application for **music stem separation**. It enables producers and engineers to upload a mixed track and isolate individual stems—vocals, drums, bass, and other instruments—using state-of-the-art Hybrid Transformer Demucs (HTDemucs) models. The system runs entirely on the user’s machine: no audio is sent to the cloud, and the UI is built for a guided, studio-style workflow from source intake through separation, mixing, and export.

This white paper describes the application’s purpose, architecture, feature set, technology stack, and design decisions for stakeholders and developers.

---

## 2. Problem Statement

Music producers and audio engineers often need to:

- **Remix or re-edit** existing tracks without access to multitrack sessions  
- **Extract vocals or instrumentals** for sampling, covers, or learning  
- **Clean up mixes** by isolating and processing individual elements  
- **Analyze** tempo and key of source material before or after processing  

Cloud-based stem separation services raise concerns about **privacy**, **latency**, and **cost** for long or high-quality files. Offline tools exist but often lack a unified workflow that combines intake, analysis, separation, mixing, and export in one place. StemingHot addresses these needs with a single local web app that keeps all processing on the user’s hardware and provides a clear, stage-based interface.

---

## 3. Solution Overview

StemingHot delivers:

1. **Source intake** — Upload via drag-and-drop or URL (e.g. YouTube) with support for WAV, MP3, FLAC, AIFF, M4A, AAC, and OGG.  
2. **Automatic analysis** — Estimated BPM and musical key are computed on upload using librosa and surfaced in the left panel.  
3. **Configurable separation** — Users choose stem count (2, 4, or 5 stems) and quality mode (Stable Local, Max Quality, or Custom). Advanced parameters (segment length, overlap, shifts, precision) are available in a collapsible section.  
4. **Transparent progress** — Separation progress is estimated from track length and device (CPU/GPU), with incremental updates during inference and stem saving, and real-time updates via WebSocket.  
5. **Timeline and mixing** — A stacked waveform timeline shows each stem with inline per-track controls (mute, solo, volume) beside each stem row.  
6. **Export** — Stems can be downloaded individually or as a zip, with format selection (WAV, FLAC, MP3) and optional per-stem naming. Export controls live in the left panel once separation is complete.  
7. **Layout behavior** — The right rail is removed; the left panel can auto-collapse after completion to maximize space for the waveform, with a compact summary (track name, BPM, key, New Track) and an expand control to reopen full setup.

All processing is **local**: the backend runs on the same machine as the browser, and no audio or metadata is transmitted to third-party servers.

---

## 4. Architecture

### 4.1 High-Level Topology

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + Vite)                                          │
│  • Single-page app                                               │
│  • REST API client (axios) + WebSocket for progress               │
│  • Zustand store; wavesurfer.js for waveform rendering           │
└───────────────────────────┬─────────────────────────────────────┘
                             │ HTTP / WebSocket
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend (FastAPI + Uvicorn)                                     │
│  • REST: /api/upload, /api/url/download, /api/separate,          │
│    /api/job/{id}/status, /api/stems/{id}/{stem}, /api/export      │
│  • WebSocket: /ws/progress/{job_id}                               │
│  • In-memory job manager; temp directory for audio and stems     │
└───────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  Processing & Models                                              │
│  • Demucs (HTDemucs fine-tuned, HTDemucs 6-source)               │
│  • PyTorch / torchaudio; optional CUDA                             │
│  • Chunked overlap-add inference; soundfile/librosa for I/O      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Backend Structure

| Layer        | Responsibility |
|-------------|-----------------|
| **API**     | Routes (upload, URL download, separate, job status, stems, export), WebSocket progress, Pydantic schemas. |
| **Services**| Job lifecycle and progress broadcasting; URL download (yt-dlp); export (format conversion, zip). |
| **Processing** | Separation pipeline (load audio → load model → chunked inference → normalize → save stems); duration-aware progress estimation; BPM/key not in separator (handled at metadata stage). |
| **Models**  | Model registry; HTDemucs 4-stem and 6-stem wrappers implementing a common interface; GPU/CPU device selection. |
| **Utils**   | Audio metadata (ffprobe fallback to soundfile); BPM/key analysis (librosa); safe temp filenames. |

Jobs are **ephemeral**: state is kept in memory and in a temp directory; no database. Each job has a unique ID, an audio path, metadata (including optional BPM/key), and after completion a set of stem paths and stem info for the client.

### 4.3 Frontend Structure

| Area           | Responsibility |
|----------------|-----------------|
| **Layout**     | Left panel (source, setup, advanced, export when complete, track analysis, New Track); collapsible left rail when results exist; center (waveform timeline or progress/empty states); no right panel. |
| **Upload**     | Drag-and-drop zone, URL input, file metadata display. |
| **Waveform**   | Per-stem waveform rows with **inline** mixer controls (M, S, volume) to the left of each track; shared playback bar; seek and play/pause. |
| **Export**     | Rendered inside the left panel when the job is completed (format, per-stem labels, download links, Download All). |
| **State**      | Zustand store: file, metadata, jobId, jobStatus, progress, stems, stemStates (volume, mute, solo), export options; sync with backend via REST and WebSocket. |
| **Hooks**      | useSeparation (upload, URL download, start separation, polling fallback); useProgressSocket (WebSocket progress); useAudioPlayer (multi-stem playback with gains from stemStates). |

The UI is **stage-aware**: it emphasizes the primary action at each step (e.g. upload → setup → Separate Stems → review and export) and hides or collapses secondary controls until they are relevant.

---

## 5. Technology Stack

### 5.1 Backend

| Component    | Choice |
|-------------|--------|
| Runtime     | Python 3.10+ |
| Web framework | FastAPI |
| ASGI server | Uvicorn |
| Separation  | Demucs (HTDemucs); PyTorch, torchaudio |
| Audio I/O   | soundfile; librosa (BPM/key, resampling) |
| Metadata    | ffprobe when available; soundfile + librosa as fallback |
| URL intake  | yt-dlp |
| Export      | soundfile (and backend conversion) for WAV/FLAC/MP3 and zip |
| Validation  | Pydantic |

### 5.2 Frontend

| Component    | Choice |
|-------------|--------|
| Language    | TypeScript |
| Framework   | React 19 |
| Build       | Vite 8 |
| State       | Zustand |
| HTTP        | Axios |
| Waveforms   | wavesurfer.js v7 (@wavesurfer/react) |
| Styling     | Tailwind CSS v4 |
| Testing     | Vitest (unit), Playwright (e2e) |

### 5.3 Deployment Model

- **Local only**: Backend and frontend run on the same host (e.g. backend on port 8000, frontend dev server proxying to it, or static build served with backend).
- **No auth**: Designed for single-user, trusted environment.
- **Temp storage**: All uploaded and generated files under a temp directory (e.g. `steminghot_jobs/`); no persistent DB.

---

## 6. User Workflow (End-to-End)

1. **Source** — User drops a file or pastes a URL; backend creates a job, stores the file, and computes metadata (duration, sample rate, format) and optional BPM/key.  
2. **Setup** — User sees metadata and track analysis (BPM/key) in the left panel; optionally opens Advanced for quality mode, stem count, and expert parameters; clicks **Separate Stems**.  
3. **Processing** — Backend runs the separation pipeline; progress is reported via WebSocket (and optional polling) with a duration-aware estimate and stage messages (e.g. loading, inference, saving stems). Center UI shows progress and short guidance.  
4. **Review** — When separation completes, the center shows the waveform timeline; each stem row has inline M/S/volume to the left of the waveform. Left panel can auto-collapse to a narrow strip (track, BPM, key, New Track) with an expand button.  
5. **Export** — In the left panel (when expanded and job is completed), user selects format (WAV/FLAC/MP3), optionally renames stems, and downloads individual stems or **Download All** zip.  
6. **Reset** — User clicks **New Track** to clear state and return to the source step.

---

## 7. Data and Privacy

- **Audio**: Processed only on the machine where the backend runs; not sent to any external service except when the user explicitly uses “paste URL” (content is fetched by the backend via yt-dlp).  
- **Metadata**: BPM/key and technical metadata are derived locally (librosa, ffprobe/soundfile).  
- **Persistence**: No persistent database; job state and files are temporary and can be cleared on server restart or by design of the temp directory.  
- **Export**: Generated stems and zips are served by the backend to the browser for download; no off-device storage.

---

## 8. Design Decisions (Summary)

| Decision | Rationale |
|----------|-----------|
| **Local-first** | Privacy, no subscription, full control over quality and length. |
| **Single-page app + REST + WebSocket** | Simple integration with existing backend; real-time progress without constant polling. |
| **No right panel; export in left** | Reduces clutter and keeps “refine and export” in one place after completion. |
| **Inline mixer per stem row** | Aligns controls with each stem in the timeline for faster workflow. |
| **Collapsible left rail** | More space for waveform when not editing setup; BPM/key and New Track remain visible when collapsed. |
| **Duration-aware progress** | Avoids long flat stretches and a sudden jump to 100%; builds trust during long runs. |
| **Optional BPM/key** | Adds value for producers without blocking the core path if analysis fails or is unavailable. |
| **Model abstraction** | Easier to plug in new separation models (e.g. BSRNN, BandIt) without changing the UI. |

---

## 9. Limitations and Future Work

- **No authentication** — Suitable for personal or single-tenant use only.  
- **In-memory jobs** — Restart clears state; no history or project save.  
- **Single job focus** — One active job per backend instance; no queue or multi-job UI.  
- **BPM/key** — Estimates only; may be wrong on ambiguous or non-tonal material.  
- **Future possibilities** — Optional project/session save; batch jobs; additional separation models; optional cloud backup or sharing.

---

## 10. Conclusion

StemingHot provides a complete, local-first stem separation workflow: from file or URL intake and automatic BPM/key analysis, through configurable HTDemucs-based separation with transparent progress, to an integrated timeline with per-stem mixing and export from the left panel. The removal of the right rail and the placement of mixer controls beside each track are intended to keep the interface focused and efficient. This white paper summarizes the application’s goals, architecture, stack, and main design choices for technical and product reference.

---

*StemingHot — Stem Separation Studio. Technical white paper v1.0. For the latest setup and usage, see the project README.*

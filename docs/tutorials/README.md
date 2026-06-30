# Tutorial Capture System

Tutorials are scripted Playwright workflows that generate user-facing training
artifacts from one source of truth.

Each tutorial can produce:

- A recorded browser video (`videos/*.webm`, and `*.mp4` when `ffmpeg` is installed)
- Step screenshots (`screenshots/*.png`)
- Markdown documentation
- `manifest.json` with steps, selectors, source URLs, screenshots, and video paths

Run a tutorial:

```bash
npx tsx scripts/tutorials/run-tutorial.ts docs/tutorials/commitments/create-commitment.workflow.ts \
  --base-url http://localhost:3001 \
  --storage-state frontend/config/.auth/user.json
```

Use `--headed` to watch the run and `--no-video` when only screenshots and
Markdown are needed.

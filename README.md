# MP4 to JPG Frame Extractor

A small browser-based React app that extracts JPG frames from MP4 files.

## What it does

- Accepts an MP4 video file upload
- Extracts frames in the browser
- Packages output images for download
- Uses a Vite + React frontend

## Project structure

- `src/App.jsx` — main UI container
- `src/hooks/useFrameExtraction.js` — extraction and app state logic
- `src/lib/frame-extraction-service.js` — frame capture implementation
- `src/lib/logger.js` — logging helper
- `src/components/` — shared UI components

## Getting started

```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal.

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## Notes

- The app is built as a browser-native extractor and does not require a backend.
- If the sample MP4 file is present, you can use it to test upload behavior.

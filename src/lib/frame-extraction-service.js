import JSZip from "jszip";
import { saveAs } from "file-saver";

const FRAME_PREFIX = "frame_";

let outputSink = () => {};
let initializePromise;

const extractedFrameBlobs = new Map();
const extractedFrameTimestamps = new Map();

function emit(message, details) {
  if (details !== undefined) {
    console.log("[frame-service]", message, details);
  } else {
    console.log("[frame-service]", message);
  }

  outputSink(message);
}

function clearExtractedFrames() {
  extractedFrameBlobs.clear();
  extractedFrameTimestamps.clear();
}

function frameNameForIndex(frameIndex) {
  return `${FRAME_PREFIX}${String(frameIndex).padStart(6, "0")}.jpg`;
}

function shouldLogCapturedFrame(frameIndex) {
  return frameIndex < 5 || (frameIndex + 1) % 25 === 0;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Failed to encode canvas frame as JPG."));
        return;
      }

      resolve(blob);
    }, type, quality);
  });
}

function createHiddenVideo(file) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");

  video.preload = "auto";
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.controls = false;
  video.disablePictureInPicture = true;
  video.style.position = "fixed";
  video.style.left = "-9999px";
  video.style.top = "0";
  video.style.width = "1px";
  video.style.height = "1px";
  video.style.opacity = "0";
  video.style.pointerEvents = "none";
  video.src = objectUrl;

  document.body.appendChild(video);

  return {
    video,
    cleanup() {
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(objectUrl);
    },
  };
}

function waitForEvent(target, successEvent, errorMessage) {
  return new Promise((resolve, reject) => {
    const handleSuccess = () => {
      cleanup();
      resolve();
    };

    const handleError = () => {
      cleanup();
      reject(new Error(errorMessage));
    };

    const cleanup = () => {
      target.removeEventListener(successEvent, handleSuccess);
      target.removeEventListener("error", handleError);
    };

    target.addEventListener(successEvent, handleSuccess, { once: true });
    target.addEventListener("error", handleError, { once: true });
  });
}

export async function initializeFrameService({ onOutput, onProgress } = {}) {
  outputSink = onOutput ?? (() => {});

  if (!initializePromise) {
    initializePromise = Promise.resolve().then(() => {
      emit("Initializing browser-native extraction engine");
      onProgress?.(1);
      return true;
    });
  } else {
    emit("Reusing initialized extraction engine");
  }

  return initializePromise;
}

export async function extractFramesFromMp4(file, { onOutput, onProgress } = {}) {
  outputSink = onOutput ?? (() => {});
  emit("Starting extraction", { fileName: file.name, size: file.size, type: file.type });

  await initializeFrameService({ onOutput, onProgress });
  clearExtractedFrames();
  emit("Cleared previous extracted frames");

  if (typeof document === "undefined") {
    throw new Error("Browser-native frame extraction requires a DOM environment.");
  }

  const { video, cleanup } = createHiddenVideo(file);

  try {
    await waitForEvent(video, "loadeddata", "Failed to load MP4 data for extraction.");
    emit("Hidden video element loaded", {
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    });

    if (typeof video.requestVideoFrameCallback !== "function") {
      throw new Error("This browser does not support requestVideoFrameCallback for reliable frame extraction.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Failed to create a 2D canvas context for frame extraction.");
    }

    let captureCount = 0;
    let lastCapturedTime = -1;
    const captureTasks = [];

    const completionPromise = new Promise((resolve, reject) => {
      video.addEventListener("ended", resolve, { once: true });
      video.addEventListener("error", () => reject(new Error("Video playback failed during extraction.")), { once: true });
    });

    const captureFrame = (_now, metadata) => {
      const mediaTime = metadata?.mediaTime ?? video.currentTime;

      if (mediaTime <= lastCapturedTime + 0.000001) {
        if (!video.ended) {
          video.requestVideoFrameCallback(captureFrame);
        }
        return;
      }

      lastCapturedTime = mediaTime;
      const frameIndex = captureCount;
      const frameName = frameNameForIndex(frameIndex);
      captureCount += 1;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const captureTask = canvasToBlob(canvas, "image/jpeg", 0.92).then((blob) => {
        extractedFrameBlobs.set(frameName, blob);
        extractedFrameTimestamps.set(frameName, mediaTime);

        const progress = video.duration > 0 ? Math.min(mediaTime / video.duration, 0.999) : 0;
        onProgress?.(progress);

        if (shouldLogCapturedFrame(frameIndex)) {
          emit(`Captured ${frameName}`, { mediaTime, progress });
        }
      });

      captureTasks.push(captureTask);

      if (!video.ended) {
        video.requestVideoFrameCallback(captureFrame);
      }
    };

    video.requestVideoFrameCallback(captureFrame);
    emit("Starting hidden video playback");
    await video.play();
    await completionPromise;
    await Promise.all(captureTasks);

    const frameNames = Array.from(extractedFrameBlobs.keys()).sort((left, right) =>
      left.localeCompare(right, undefined, { numeric: true }),
    );

    emit("Frame extraction completed", { frameCount: frameNames.length });
    onProgress?.(1);

    if (!frameNames.length) {
      throw new Error("The video finished playing but no JPG frames were captured.");
    }

    return frameNames;
  } finally {
    cleanup();
  }
}

export function getExtractedFrameTimestamp(frameName) {
  return extractedFrameTimestamps.get(frameName) ?? 0;
}

export async function readExtractedFrameBlob(frameName, { onOutput } = {}) {
  outputSink = onOutput ?? outputSink;
  emit(`Reading frame blob ${frameName}`);

  const blob = extractedFrameBlobs.get(frameName);

  if (!blob) {
    throw new Error(`Frame ${frameName} is not available in memory.`);
  }

  return blob;
}

export async function exportFrameArchive(frameNames, archiveName, { onOutput, onProgress } = {}) {
  outputSink = onOutput ?? outputSink;
  emit("Preparing ZIP export", { archiveName, frameCount: frameNames.length });

  const zip = new JSZip();

  for (let index = 0; index < frameNames.length; index += 1) {
    const frameName = frameNames[index];
    const frameBlob = extractedFrameBlobs.get(frameName);

    if (!frameBlob) {
      throw new Error(`Frame ${frameName} is not available for ZIP export.`);
    }

    zip.file(frameName, frameBlob);
    const progress = (index + 1) / frameNames.length;
    onProgress?.(progress);
    emit(`Added ${frameName} to ZIP`, { progress });
  }

  const archiveBlob = await zip.generateAsync(
    { type: "blob", compression: "STORE" },
    (metadata) => {
      const progress = metadata.percent / 100;
      onProgress?.(progress);
      emit("ZIP generation progress", { progress: metadata.percent });
    },
  );

  saveAs(archiveBlob, archiveName);
  emit("ZIP saved to browser download", { archiveName });
}
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDuration(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return "00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  }

  return [minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const size = bytes / 1024 ** unitIndex;
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getFileStem(filename) {
  return filename.replace(/\.[^/.]+$/, "");
}

export function buildSampleIndices(total, desiredCount) {
  if (!total) {
    return [];
  }

  if (total <= desiredCount) {
    return Array.from({ length: total }, (_, index) => index);
  }

  const indices = new Set([0, total - 1]);

  for (let index = 1; index < desiredCount - 1; index += 1) {
    indices.add(Math.round((index / (desiredCount - 1)) * (total - 1)));
  }

  return Array.from(indices).sort((left, right) => left - right);
}

export function getFrameTimestamp(frameIndex, frameRate) {
  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    return 0;
  }

  return frameIndex / frameRate;
}

export function getRangeSelection(frameNames, frameRate, startSeconds, endSeconds) {
  if (!frameNames.length) {
    return [];
  }

  if (!Number.isFinite(frameRate) || frameRate <= 0) {
    return frameNames;
  }

  return frameNames.filter((_, index) => {
    const timestamp = getFrameTimestamp(index, frameRate);
    return timestamp >= startSeconds && timestamp <= endSeconds;
  });
}

export function readVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      video.load();
    };

    video.preload = "metadata";
    video.src = url;

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      cleanup();
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Unable to read MP4 metadata."));
    };
  });
}
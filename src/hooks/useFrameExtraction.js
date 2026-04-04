import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  exportFrameArchive,
  extractFramesFromMp4,
  getExtractedFrameTimestamp,
  initializeFrameService,
  readExtractedFrameBlob,
} from "@/lib/frame-extraction-service";
import { createLogger } from "@/lib/logger";
import {
  buildSampleIndices,
  clamp,
  getFileStem,
  getFrameTimestamp,
  readVideoMetadata,
} from "@/lib/utils";

const PAGE_SIZE = 24;
const TIMELINE_SAMPLE_COUNT = 16;

export function useFrameExtraction() {
  const [engineReady, setEngineReady] = useState(false);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const [sourceFile, setSourceFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [frameNames, setFrameNames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);
  const [frameRate, setFrameRate] = useState(0);
  const [rangeStart, setRangeStart] = useState("0");
  const [rangeEnd, setRangeEnd] = useState("0");
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [, setFrameVersion] = useState(0);

  const frameUrlCache = useRef(new Map());
  const frameUrlPromises = useRef(new Map());

  const pushLog = useCallback((line) => {
    if (!line) {
      return;
    }

    setLogs((current) => [...current.slice(-23), line]);
  }, []);

  const log = useMemo(() => createLogger("useFrameExtraction", pushLog), [pushLog]);

  const clearFrameCache = useCallback(() => {
    log("Clearing in-memory frame URL cache");
    frameUrlCache.current.forEach((url) => URL.revokeObjectURL(url));
    frameUrlCache.current.clear();
    frameUrlPromises.current.clear();
    setFrameVersion((value) => value + 1);
  }, [log]);

  useEffect(() => clearFrameCache, [clearFrameCache]);

  const resolveFrameUrl = useCallback(async (frameName) => {
    if (frameUrlCache.current.has(frameName)) {
      return frameUrlCache.current.get(frameName);
    }

    if (frameUrlPromises.current.has(frameName)) {
      return frameUrlPromises.current.get(frameName);
    }

    log("Creating object URL for frame", { frameName });

    const pending = readExtractedFrameBlob(frameName, { onOutput: pushLog })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        frameUrlCache.current.set(frameName, url);
        setFrameVersion((value) => value + 1);
        log("Frame object URL cached", { frameName });
        return url;
      })
      .finally(() => {
        frameUrlPromises.current.delete(frameName);
      });

    frameUrlPromises.current.set(frameName, pending);
    return pending;
  }, [log, pushLog]);

  const resetStateForNewFile = () => {
    clearFrameCache();
    setError("");
    setSourceFile(null);
    setMetadata(null);
    setFrameNames([]);
    setCurrentPage(1);
    setSelectedFrameIndex(0);
    setFrameRate(0);
    setLogs([]);
    setActivity(null);
  };

  const handleFileChange = async (file) => {
    log("Handling file change", { fileName: file?.name ?? null, fileType: file?.type ?? null });
    resetStateForNewFile();

    if (!file) {
      setRangeStart("0");
      setRangeEnd("0");
      return;
    }

    if (file.type !== "video/mp4") {
      log("Rejected non-MP4 file", { fileType: file.type });
      setError("Please select an MP4 file.");
      return;
    }

    try {
      const nextMetadata = await readVideoMetadata(file);
      log("Video metadata loaded", nextMetadata);
      setSourceFile(file);
      setMetadata(nextMetadata);
      setRangeStart("0");
      setRangeEnd(nextMetadata.duration.toFixed(2));
    } catch (metadataError) {
      log("Metadata read failed", { message: metadataError.message });
      setError(metadataError.message);
    }
  };

  const getTimestampForFrame = useCallback(
    (frameName, fallbackIndex) => getExtractedFrameTimestamp(frameName) || getFrameTimestamp(fallbackIndex, frameRate),
    [frameRate],
  );

  const ensureEngine = async (label) => {
    log("Ensuring extraction engine", { label });
    setActivity({ label, progress: 2 });

    await initializeFrameService({
      onOutput: pushLog,
      onProgress: (progress) => {
        const percent = progress * 100;
        log("Engine progress update", { percent });
        setActivity((current) => ({
          label: current?.label ?? label,
          progress: Math.max(current?.progress ?? 0, percent),
        }));
      },
    });

    setEngineReady(true);
    log("Extraction engine is ready");
  };

  const handleExtract = async () => {
    log("Extract action requested");

    if (!sourceFile || !metadata) {
      setError("Upload an MP4 file first.");
      return;
    }

    clearFrameCache();
    setError("");
    setIsExtracting(true);
    setFrameNames([]);
    setCurrentPage(1);
    setSelectedFrameIndex(0);

    try {
      await ensureEngine("Loading extraction engine");
      setActivity({ label: "Extracting JPG frames", progress: 4 });

      const names = await extractFramesFromMp4(sourceFile, {
        onOutput: pushLog,
        onProgress: (progress) => {
          const percent = progress * 100;
          log("Extraction progress callback", { percent });
          setActivity({ label: "Extracting JPG frames", progress: Math.max(4, percent) });
        },
      });

      const estimatedRate = metadata.duration > 0 ? names.length / metadata.duration : 0;

      log("Extraction completed", { frameCount: names.length, estimatedRate });
      setFrameNames(names);
      setFrameRate(estimatedRate);
      setSelectedFrameIndex(0);
      setCurrentPage(1);
      setActivity({ label: "Frames ready", progress: 100 });
    } catch (processingError) {
      log("Extraction failed", { message: processingError.message });
      setError(processingError.message || "Frame extraction failed.");
      setActivity(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleExportAll = async () => {
    log("Full export requested");

    if (!frameNames.length || !sourceFile) {
      return;
    }

    setError("");
    setIsExporting(true);

    try {
      await ensureEngine("Preparing export");
      await exportFrameArchive(frameNames, `${getFileStem(sourceFile.name)}-all-frames.zip`, {
        onOutput: pushLog,
        onProgress: (progress) => {
          log("Full ZIP export progress", { progress });
          setActivity({ label: "Building full ZIP", progress: progress * 100 });
        },
      });
      setActivity({ label: "ZIP downloaded", progress: 100 });
    } catch (exportError) {
      log("Full export failed", { message: exportError.message });
      setError(exportError.message || "ZIP export failed.");
      setActivity(null);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportRange = async () => {
    log("Range export requested", { rangeStart, rangeEnd });

    if (!frameNames.length || !sourceFile) {
      return;
    }

    const start = Number(rangeStart);
    const end = Number(rangeEnd);

    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < 0 || end < start) {
      setError("Enter a valid export time range.");
      return;
    }

    const boundedStart = clamp(start, 0, metadata?.duration ?? end);
    const boundedEnd = clamp(end, boundedStart, metadata?.duration ?? end);
    const selectedFrames = frameNames.filter((frameName, index) => {
      const timestamp = getTimestampForFrame(frameName, index);
      return timestamp >= boundedStart && timestamp <= boundedEnd;
    });

    if (!selectedFrames.length) {
      setError("The selected time range did not match any extracted frames.");
      return;
    }

    setError("");
    setIsExporting(true);

    try {
      await ensureEngine("Preparing ranged export");
      await exportFrameArchive(
        selectedFrames,
        `${getFileStem(sourceFile.name)}-${boundedStart.toFixed(2)}s-${boundedEnd.toFixed(2)}s.zip`,
        {
          onOutput: pushLog,
          onProgress: (progress) => {
            log("Range ZIP export progress", { progress });
            setActivity({ label: "Building range ZIP", progress: progress * 100 });
          },
        },
      );
      setActivity({ label: "Range ZIP downloaded", progress: 100 });
    } catch (exportError) {
      log("Range export failed", { message: exportError.message });
      setError(exportError.message || "Range ZIP export failed.");
      setActivity(null);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(frameNames.length / PAGE_SIZE));
  const boundedSelectedIndex = clamp(selectedFrameIndex, 0, Math.max(0, frameNames.length - 1));
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const visibleNames = useMemo(
    () => frameNames.slice(pageStart, pageStart + PAGE_SIZE),
    [frameNames, pageStart],
  );
  const sampleIndices = useMemo(
    () => buildSampleIndices(frameNames.length, TIMELINE_SAMPLE_COUNT),
    [frameNames.length],
  );

  const visibleFrames = visibleNames.map((name, offset) => {
    const index = pageStart + offset;
    return {
      index,
      name,
      url: frameUrlCache.current.get(name) ?? "",
      timestamp: getTimestampForFrame(name, index),
    };
  });

  const sampleFrames = sampleIndices.map((index) => ({
    index,
    name: frameNames[index],
    url: frameUrlCache.current.get(frameNames[index]) ?? "",
    timestamp: getTimestampForFrame(frameNames[index], index),
  }));

  const selectedFrame = frameNames[boundedSelectedIndex]
    ? {
        index: boundedSelectedIndex,
        name: frameNames[boundedSelectedIndex],
        url: frameUrlCache.current.get(frameNames[boundedSelectedIndex]) ?? "",
        timestamp: getTimestampForFrame(frameNames[boundedSelectedIndex], boundedSelectedIndex),
      }
    : null;

  useEffect(() => {
    if (!visibleNames.length) {
      return;
    }

    log("Prefetching visible frame URLs", { count: visibleNames.length, currentPage });
    visibleNames.forEach((name) => {
      void resolveFrameUrl(name);
    });
  }, [currentPage, frameNames, log, resolveFrameUrl, visibleNames]);

  useEffect(() => {
    if (!frameNames.length) {
      return;
    }

    const sampleNames = buildSampleIndices(frameNames.length, TIMELINE_SAMPLE_COUNT).map(
      (index) => frameNames[index],
    );

    log("Prefetching timeline sample URLs", { count: sampleNames.length });

    sampleNames.forEach((name) => {
      if (name) {
        void resolveFrameUrl(name);
      }
    });

    if (frameNames[boundedSelectedIndex]) {
      void resolveFrameUrl(frameNames[boundedSelectedIndex]);
    }
  }, [boundedSelectedIndex, frameNames, log, resolveFrameUrl]);

  const handleSelectFrame = (index) => {
    const nextIndex = clamp(index, 0, Math.max(0, frameNames.length - 1));
    log("Frame selected", { requestedIndex: index, nextIndex });
    setSelectedFrameIndex(nextIndex);
    setCurrentPage(Math.floor(nextIndex / PAGE_SIZE) + 1);
  };

  return {
    activity,
    currentPage,
    engineReady,
    error,
    frameCount: frameNames.length,
    frameRate,
    handleExportAll,
    handleExportRange,
    handleExtract,
    handleFileChange,
    handleSelectFrame,
    isExporting,
    isExtracting,
    logs,
    metadata,
    rangeEnd,
    rangeStart,
    sampleFrames,
    selectedFrame,
    selectedFrameIndex: boundedSelectedIndex,
    setCurrentPage,
    setRangeEnd,
    setRangeStart,
    sourceFile,
    totalPages,
    visibleFrames,
  };
}
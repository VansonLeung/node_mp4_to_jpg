import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";

function TimelineThumb({ frame, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(frame.index)}
      className={`min-w-28 overflow-hidden rounded-[22px] border transition-all ${
        isSelected ? "border-[var(--primary)] shadow-md shadow-orange-100" : "border-[color:var(--border)]"
      }`}
    >
      <div className="aspect-video bg-stone-100">
        {frame.url ? (
          <img src={frame.url} alt={frame.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <ImageIcon className="size-4" />
          </div>
        )}
      </div>
      <div className="px-3 py-2 text-left">
        <div className="text-xs font-medium text-[var(--foreground)]">#{frame.index + 1}</div>
        <div className="text-[11px] text-[var(--muted)]">{formatDuration(frame.timestamp)}</div>
      </div>
    </button>
  );
}

export function TimelineViewer({ frameCount, onSelectFrame, sampleFrames, selectedFrame, selectedFrameIndex }) {
  return (
    <Card className="border-none bg-white/55 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Timeline Viewer</CardTitle>
        <CardDescription>Scrub the extracted sequence with a large active preview and sampled timeline thumbnails.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="overflow-hidden rounded-[28px] border border-[color:var(--border)] bg-stone-100">
            <div className="aspect-video">
              {selectedFrame?.url ? (
                <img src={selectedFrame.url} alt={selectedFrame.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-[var(--muted)]">
                  <ImageIcon className="size-7" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[28px] border border-[color:var(--border)] bg-white/72 p-5">
            <div className="flex items-center gap-2">
              <Badge variant="accent">Selected</Badge>
              <div className="text-sm font-medium">{selectedFrame ? selectedFrame.name : "No frame selected"}</div>
            </div>
            <div className="text-sm leading-6 text-[var(--muted-foreground)]">
              {selectedFrame
                ? `Frame ${selectedFrame.index + 1} of ${frameCount.toLocaleString()} at ${formatDuration(selectedFrame.timestamp)}.`
                : "Choose a frame from the grid or timeline to inspect it here."}
            </div>
            <input
              type="range"
              min="0"
              max={Math.max(0, frameCount - 1)}
              value={Math.min(selectedFrameIndex, Math.max(0, frameCount - 1))}
              onChange={(event) => onSelectFrame(Number(event.target.value))}
              className="w-full accent-[var(--primary)]"
              disabled={!frameCount}
            />
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              <span>Start</span>
              <span>End</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="flex gap-3">
            {sampleFrames.length ? (
              sampleFrames.map((frame) => (
                <TimelineThumb
                  key={frame.name}
                  frame={frame}
                  isSelected={frame.index === selectedFrameIndex}
                  onSelect={onSelectFrame}
                />
              ))
            ) : (
              <div className="flex min-h-28 min-w-full items-center justify-center rounded-[24px] border border-dashed border-[color:var(--border)] bg-white/45 text-sm text-[var(--muted)]">
                Timeline samples will appear after extraction.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
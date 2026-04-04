import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";

function FrameTile({ frame, isSelected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(frame.index)}
      className={`group overflow-hidden rounded-[24px] border text-left transition-all duration-200 ${
        isSelected
          ? "border-[var(--primary)] bg-orange-50 shadow-lg shadow-orange-100"
          : "border-[color:var(--border)] bg-white/72 hover:-translate-y-0.5 hover:bg-white"
      }`}
    >
      <div className="aspect-video bg-stone-100">
        {frame.url ? (
          <img src={frame.url} alt={frame.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--muted)]">
            <ImageIcon className="size-5" />
          </div>
        )}
      </div>
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <Badge variant={isSelected ? "accent" : "outline"}>#{frame.index + 1}</Badge>
          <span className="text-xs text-[var(--muted)]">{formatDuration(frame.timestamp)}</span>
        </div>
        <div className="truncate text-sm font-medium text-[var(--foreground)]">{frame.name}</div>
      </div>
    </button>
  );
}

export function PreviewGrid({ currentPage, frames, onPageChange, onSelectFrame, selectedFrameIndex, totalPages }) {
  return (
    <Card className="h-full border-none bg-white/55 shadow-none">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-2xl">Paginated JPG Frames</CardTitle>
          <CardDescription>Browse extracted frames in pages and jump directly to any JPG.</CardDescription>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="icon" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1}>
            <ChevronLeft className="size-4" />
          </Button>
          <div className="rounded-full border border-[color:var(--border)] bg-white/75 px-4 py-2 text-sm font-medium">
            Page {currentPage} / {totalPages || 1}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {frames.length ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {frames.map((frame) => (
              <FrameTile
                key={frame.name}
                frame={frame}
                isSelected={frame.index === selectedFrameIndex}
                onSelect={onSelectFrame}
              />
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 items-center justify-center rounded-[28px] border border-dashed border-[color:var(--border)] bg-white/45 text-sm text-[var(--muted)]">
            Extract frames to populate the JPG grid.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
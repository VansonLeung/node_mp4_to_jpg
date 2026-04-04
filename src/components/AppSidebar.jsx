import { Download, Film, LoaderCircle, Scissors, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { formatDuration, formatFileSize } from "@/lib/utils";

function StatItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-[color:var(--border)] bg-white/55 p-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  );
}

export function AppSidebar({
  activity,
  engineReady,
  error,
  file,
  frameCount,
  frameRate,
  isExtracting,
  isExporting,
  logs,
  metadata,
  onExportAll,
  onExportRange,
  onFileChange,
  onExtract,
  rangeEnd,
  rangeStart,
  setRangeEnd,
  setRangeStart,
}) {
  return (
    <aside className="glass-panel flex w-full flex-col overflow-hidden rounded-[32px] border border-[color:var(--border)] lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:max-w-[360px]">
      <div className="dot-grid relative overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/30 via-transparent to-sky-100/30" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <Badge variant="accent">Frame Forge</Badge>
            <h1 className="mt-4 text-4xl font-semibold">MP4 to JPG, frame by frame.</h1>
            <p className="mt-3 max-w-xs text-sm leading-6 text-[var(--muted-foreground)]">
              Upload a single MP4, extract every frame as JPG, preview the sequence, and export full or ranged ZIP bundles.
            </p>
          </div>
          <div className="rounded-full border border-white/80 bg-white/70 p-3 text-[var(--accent)] shadow-sm">
            <Film className="size-6" />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto p-6 pt-0">
        <Card className="border-none bg-white/65 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Source Video</CardTitle>
            <CardDescription>MP4 only. Extraction runs fully in the browser with the native video pipeline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mp4-input">Upload MP4</Label>
              <Input
                id="mp4-input"
                type="file"
                accept="video/mp4"
                onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatItem label="File" value={file ? file.name : "No file selected"} />
              <StatItem label="Size" value={file ? formatFileSize(file.size) : "0 B"} />
              <StatItem label="Duration" value={metadata ? formatDuration(metadata.duration) : "00:00"} />
              <StatItem
                label="Resolution"
                value={metadata ? `${metadata.width} x ${metadata.height}` : "Unknown"}
              />
            </div>

            <Button className="w-full" size="lg" onClick={onExtract} disabled={!file || isExtracting || isExporting}>
              {isExtracting ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {isExtracting ? "Extracting JPG Frames" : "Extract JPG Frames"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none bg-white/65 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Output Controls</CardTitle>
            <CardDescription>Export every frame or a time-bounded subset as ZIP.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatItem label="Frames" value={frameCount ? frameCount.toLocaleString() : "0"} />
              <StatItem
                label="Est. FPS"
                value={frameRate ? `${frameRate.toFixed(frameRate >= 100 ? 0 : 2)}` : "0"}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="range-start">Range Start (s)</Label>
                <Input
                  id="range-start"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rangeStart}
                  onChange={(event) => setRangeStart(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="range-end">Range End (s)</Label>
                <Input
                  id="range-end"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rangeEnd}
                  onChange={(event) => setRangeEnd(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button variant="secondary" className="w-full" onClick={onExportAll} disabled={!frameCount || isExtracting || isExporting}>
                <Download className="size-4" />
                Download All Frames ZIP
              </Button>
              <Button variant="outline" className="w-full" onClick={onExportRange} disabled={!frameCount || isExtracting || isExporting}>
                <Scissors className="size-4" />
                Download Range ZIP
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none bg-[#103643] text-white shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-lg">Engine Status</CardTitle>
                <CardDescription className="text-white/70">
                  {engineReady ? "The browser extraction engine is ready for processing and export." : "The extraction engine initializes on first use."}
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-white/20 bg-white/10 text-white">
                {engineReady ? "Ready" : "Cold"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.18em] text-white/65">
                <span>{activity?.label ?? "Idle"}</span>
                <span>{activity?.progress != null ? `${Math.round(activity.progress)}%` : "--"}</span>
              </div>
              <Progress value={activity?.progress ?? 0} className="bg-white/12" />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/65">Recent Logs</div>
              <div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-black/12 p-3 text-xs text-white/78">
                {logs.length ? logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div>Waiting for a file.</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </div>
    </aside>
  );
}
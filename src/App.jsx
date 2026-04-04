import { HardDriveUpload, Images, Sparkles } from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { PreviewGrid } from "@/components/PreviewGrid";
import { TimelineViewer } from "@/components/TimelineViewer";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFrameExtraction } from "@/hooks/useFrameExtraction";
import { clamp, formatDuration, formatFileSize } from "@/lib/utils";

function App() {
  const {
    activity,
    currentPage,
    engineReady,
    error,
    frameCount,
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
    selectedFrameIndex,
    setCurrentPage,
    setRangeEnd,
    setRangeStart,
    sourceFile,
    totalPages,
    visibleFrames,
  } = useFrameExtraction();

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-4 px-4 py-4 lg:flex-row lg:gap-6 lg:px-6 lg:py-6">
        <AppSidebar
          activity={activity}
          engineReady={engineReady}
          error={error}
          file={sourceFile}
          frameCount={frameCount}
          frameRate={frameRate}
          isExtracting={isExtracting}
          isExporting={isExporting}
          logs={logs}
          metadata={metadata}
          onExportAll={handleExportAll}
          onExportRange={handleExportRange}
          onExtract={handleExtract}
          onFileChange={handleFileChange}
          rangeEnd={rangeEnd}
          rangeStart={rangeStart}
          setRangeEnd={setRangeEnd}
          setRangeStart={setRangeStart}
        />

        <main className="flex min-w-0 flex-1 flex-col gap-4 lg:h-[calc(100vh-3rem)] lg:overflow-hidden">
          <Card className="border-none bg-[#f8f3ea]/80 shadow-none">
            <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge>Fullscreen Workspace</Badge>
                  <Badge variant="outline">Desktop + Mobile</Badge>
                </div>
                <CardTitle className="mt-3 text-3xl sm:text-4xl">Review the extracted frame sequence in two ways.</CardTitle>
                <CardDescription className="mt-2 max-w-3xl text-base leading-7">
                  The right panel combines a paginated JPG grid and a timeline viewer so you can inspect discrete frames or scrub the broader motion arc.
                </CardDescription>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-auto lg:min-w-[460px]">
                <div className="rounded-[24px] border border-[color:var(--border)] bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <HardDriveUpload className="size-4" />
                    Source
                  </div>
                  <div className="mt-2 text-lg font-semibold">{sourceFile ? sourceFile.name : "Awaiting MP4"}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {sourceFile ? formatFileSize(sourceFile.size) : "Upload to begin"}
                  </div>
                </div>
                <div className="rounded-[24px] border border-[color:var(--border)] bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <Images className="size-4" />
                    Frames
                  </div>
                  <div className="mt-2 text-lg font-semibold">{frameCount.toLocaleString()}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {metadata ? formatDuration(metadata.duration) : "00:00"}
                  </div>
                </div>
                <div className="rounded-[24px] border border-[color:var(--border)] bg-white/72 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <Sparkles className="size-4" />
                    Active Frame
                  </div>
                  <div className="mt-2 text-lg font-semibold">#{selectedFrame ? selectedFrame.index + 1 : 0}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {selectedFrame ? formatDuration(selectedFrame.timestamp) : "No preview yet"}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-rows-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
            <div className="min-h-0 lg:overflow-auto">
              <PreviewGrid
                currentPage={currentPage}
                frames={visibleFrames}
                onPageChange={(page) => setCurrentPage(clamp(page, 1, totalPages))}
                onSelectFrame={handleSelectFrame}
                selectedFrameIndex={selectedFrameIndex}
                totalPages={totalPages}
              />
            </div>

            <div className="min-h-0 lg:overflow-auto">
              <TimelineViewer
                frameCount={frameCount}
                onSelectFrame={handleSelectFrame}
                sampleFrames={sampleFrames}
                selectedFrame={selectedFrame}
                selectedFrameIndex={selectedFrameIndex}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;

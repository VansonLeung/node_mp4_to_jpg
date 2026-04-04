import { cn } from "@/lib/utils";

function Progress({ className, value = 0 }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-black/8", className)}>
      <div
        className="h-full rounded-full bg-[var(--primary)] transition-all duration-300"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export { Progress };
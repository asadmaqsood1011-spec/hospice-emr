import { cn } from "@/lib/utils";

export function SkeletonLines({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="skeleton-line h-3"
          style={{ width: `${Math.max(42, 94 - index * 14)}%` }}
        />
      ))}
    </div>
  );
}

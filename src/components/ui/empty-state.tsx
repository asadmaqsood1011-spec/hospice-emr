import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  hint,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-32 flex-col items-center justify-center rounded-lg border border-dashed hairline px-5 py-8 text-center">
      <Icon className="h-8 w-8 soft" aria-hidden="true" />
      <div className="mt-3 text-sm font-semibold">{title}</div>
      {hint && <div className="mt-1 max-w-sm text-sm muted">{hint}</div>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

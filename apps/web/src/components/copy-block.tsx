import { CopyButton } from "@/components/copy-button";

export function CopyBlock({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <pre className="overflow-x-auto rounded-lg border bg-muted/50 px-4 py-3 text-[0.84rem] leading-relaxed">
        <code>{value}</code>
      </pre>
    </div>
  );
}

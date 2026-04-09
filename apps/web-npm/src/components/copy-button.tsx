"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  const icon =
    status === "done" ? (
      <Check className="size-3.5" />
    ) : status === "error" ? (
      <X className="size-3.5" />
    ) : (
      <Copy className="size-3.5" />
    );

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setStatus("done");
          globalThis.setTimeout(() => setStatus("idle"), 1400);
        } catch {
          setStatus("error");
          globalThis.setTimeout(() => setStatus("idle"), 1800);
        }
      }}
      type="button"
    >
      {icon}
      {status === "idle" ? label : status === "done" ? "Copied" : "Failed"}
    </Button>
  );
}

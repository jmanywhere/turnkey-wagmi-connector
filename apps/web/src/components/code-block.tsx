import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";

export async function CodeBlock({
  code,
  lang = "tsx",
  label,
  filename,
}: {
  code: string;
  lang?: string;
  label?: string;
  filename?: string;
}) {
  const html = await codeToHtml(code.trim(), {
    lang,
    themes: {
      light: "github-light-default",
      dark: "github-dark-default",
    },
  });

  const heading = filename ?? label;

  return (
    <div className="group relative grid gap-1.5">
      {heading ? (
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {heading}
          </span>
          <CopyButton text={code.trim()} />
        </div>
      ) : null}

      <div
        className="overflow-x-auto rounded-lg border text-[0.84rem] leading-relaxed [&_pre]:m-0 [&_pre]:rounded-lg [&_pre]:px-4 [&_pre]:py-3 [&_code]:block [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit [&_code]:text-[length:inherit] [&_.line]:block"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {!heading ? (
        <div className="absolute right-2 top-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <CopyButton text={code.trim()} />
        </div>
      ) : null}
    </div>
  );
}


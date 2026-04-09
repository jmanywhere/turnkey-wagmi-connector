"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { sections } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { SectionsMenuProvider } from "@/components/sections-menu-context";

const lgNavMq = "(min-width: 1024px)";
const sourceRepoUrl = "https://github.com/jmanywhere/turnkey-wagmi-connector";

function GitHubMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <title>GitHub</title>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function MobileMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={ref} className="relative lg:hidden">
      <button
        type="button"
        className="inline-flex shrink-0 touch-manipulation items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-accent-foreground"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Sections
        <ChevronDown
          className={cn(
            "size-3.5 transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 min-w-36 rounded-lg border bg-popover p-1 shadow-lg"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              role="menuitem"
              className="flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors duration-100 hover:bg-accent hover:text-accent-foreground"
              onClick={() => onOpenChange(false)}
            >
              {s.label}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DemoShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(lgNavMq);
    const onChange = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener("change", onChange);
    onChange();
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const ctx = { menuOpen, setMenuOpen };

  return (
    <SectionsMenuProvider value={ctx}>
      <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground focus:text-sm"
        >
          Skip to content
        </a>

        <header className="sticky top-0 z-40 -mx-4 bg-background/80 px-4 py-3 backdrop-blur-lg sm:-mx-6 sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="inline-flex shrink-0 items-center gap-2.5 transition-opacity duration-150 hover:opacity-80"
            >
              <Image
                alt=""
                className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                height={28}
                priority
                src="/favicon.ico"
                width={28}
              />
              <strong className="hidden min-w-0 truncate text-sm font-semibold leading-tight sm:block">
                turnkey-wagmi-connector
              </strong>
            </Link>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <nav
                aria-label="Page sections"
                className={cn(
                  "hidden min-h-9 min-w-0 max-w-full flex-1 items-center justify-end gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] lg:flex [&::-webkit-scrollbar]:hidden",
                  menuOpen && "lg:hidden",
                )}
              >
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-100 hover:bg-accent hover:text-accent-foreground"
                  >
                    {s.label}
                  </a>
                ))}
              </nav>

              <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
                <Button variant="ghost" size="icon" asChild>
                  <a
                    href={sourceRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="touch-manipulation"
                    aria-label="turnkey-wagmi-connector source on GitHub"
                  >
                    <GitHubMark className="size-4" />
                  </a>
                </Button>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <main id="main-content" className="pt-8">
          {children}
        </main>
      </div>
    </SectionsMenuProvider>
  );
}

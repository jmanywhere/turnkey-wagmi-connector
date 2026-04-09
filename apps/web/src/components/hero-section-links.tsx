"use client";

import { sections } from "@/lib/sections";
import { cn } from "@/lib/utils";
import { useSectionsMenu } from "@/components/sections-menu-context";

export function HeroSectionLinks() {
  const { menuOpen } = useSectionsMenu();

  return (
    <nav
      aria-label="Jump to sections"
      className={cn(
        "flex flex-wrap gap-2 lg:hidden",
        menuOpen && "max-lg:hidden",
      )}
    >
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-card-foreground transition-colors duration-100 hover:bg-accent hover:text-accent-foreground"
        >
          {s.label}
        </a>
      ))}
    </nav>
  );
}


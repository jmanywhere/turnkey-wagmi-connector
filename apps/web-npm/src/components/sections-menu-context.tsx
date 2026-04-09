"use client";

import { createContext, useContext, type ReactNode } from "react";

type SectionsMenuContextValue = {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
};

const SectionsMenuContext = createContext<SectionsMenuContextValue | null>(
  null,
);

export function useSectionsMenu() {
  const ctx = useContext(SectionsMenuContext);
  if (!ctx) {
    throw new Error("useSectionsMenu must be used within DemoShell");
  }
  return ctx;
}

export function SectionsMenuProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: SectionsMenuContextValue;
}) {
  return (
    <SectionsMenuContext.Provider value={value}>
      {children}
    </SectionsMenuContext.Provider>
  );
}

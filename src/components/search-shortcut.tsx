"use client";

import { useEffect } from "react";

export function SearchShortcut({ inputId }: { inputId: string }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (event.key !== "/" || editing || event.ctrlKey || event.metaKey || event.altKey) return;
      const input = document.getElementById(inputId) as HTMLInputElement | null;
      if (!input) return;
      event.preventDefault();
      input.focus();
      input.select();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inputId]);

  return null;
}

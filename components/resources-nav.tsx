"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { isResourcePath, resourceLinks } from "@/lib/content/nav";

export function ResourcesNav({ variant }: { variant: "desktop" | "mobile" }) {
  const pathname = usePathname();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const active = isResourcePath(pathname);
  const desktop = variant === "desktop";

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      if (rootRef.current && rootRef.current.getClientRects().length > 0) {
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onButtonKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => {
        rootRef.current?.querySelector<HTMLAnchorElement>("a")?.focus();
      });
    }
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const links = [...(rootRef.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (links.length === 0 || index < 0) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      event.preventDefault();
    }
    if (event.key === "ArrowDown") links[(index + 1) % links.length]?.focus();
    if (event.key === "ArrowUp") links[(index - 1 + links.length) % links.length]?.focus();
    if (event.key === "Home") links[0]?.focus();
    if (event.key === "End") links[links.length - 1]?.focus();
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={desktop ? "relative" : undefined} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        className={
          desktop
            ? `inline-flex items-center gap-1 hover:opacity-80 ${active ? "font-semibold" : ""}`
            : `flex w-full items-center justify-between px-3 py-2.5 text-left text-sm hover:bg-stone ${active ? "font-semibold" : ""}`
        }
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={onButtonKeyDown}
      >
        Resources
        <ChevronDown
          aria-hidden="true"
          className={`size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          strokeWidth={1.75}
        />
      </button>
      <div
        id={menuId}
        hidden={!open}
        onKeyDown={onMenuKeyDown}
        className={
          desktop
            ? "absolute top-full left-0 z-30 mt-3 w-64 border border-line bg-surface py-1 text-ink"
            : "pb-1"
        }
      >
        {resourceLinks.map((link) => {
          const current = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={current ? "page" : undefined}
              className={
                desktop
                  ? `block px-4 py-2.5 text-sm hover:bg-stone ${current ? "font-semibold" : ""}`
                  : `block px-3 py-2 pl-6 text-sm hover:bg-stone ${current ? "font-semibold" : ""}`
              }
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

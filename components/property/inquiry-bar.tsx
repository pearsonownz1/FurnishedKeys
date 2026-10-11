"use client";

import { useEffect, useState } from "react";

export function InquiryBar({ rentLabel }: { rentLabel: string }) {
  const [formVisible, setFormVisible] = useState(false);

  useEffect(() => {
    const node = document.getElementById("inquiry");
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      setFormVisible(Boolean(entry?.isIntersecting));
    }, { threshold: 0.2 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (formVisible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface px-5 py-3 shadow-[0_-1px_2px_rgba(27,30,28,0.06)] lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-baseline gap-1.5">
          <span className="text-xl font-semibold">{rentLabel}</span>
          <span className="text-xs text-muted">/ month</span>
        </p>
        <a href="#inquiry" className="rounded-[2px] bg-pine px-4 py-3 text-sm font-semibold text-white">
          Send inquiry
        </a>
      </div>
    </div>
  );
}

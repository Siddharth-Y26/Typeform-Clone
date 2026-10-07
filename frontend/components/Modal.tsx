"use client";

// A centred dialog over a dark backdrop. Closes on the X, a click outside, or the Escape key.

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
};

export default function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-neutral-900/50 p-4"
      onClick={onClose}
    >
      {/* stopPropagation: a click inside the dialog must not count as a click on the backdrop */}
      <div
        role="dialog"
        aria-label={title}
        className={`w-full rounded-xl bg-white p-6 shadow-xl ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">{title}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-neutral-100">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

"use client";
import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !document.querySelector('[role="alertdialog"]')
      )
        onClose();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);
  return (
    <div
      className="modal-backdrop fixed inset-[0] z-[70] [background:rgba(9,_21,_48,_.67)] [backdrop-filter:blur(5px)] flex items-center justify-center p-[20px]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={`dialog ${wide ? "dialog-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="dialog-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="icon-button w-[35px] h-[35px] inline-flex items-center justify-center rounded-[10px] bg-transparent text-[#7c8da8]"
          >
            <X size={21} />
          </button>
        </div>
        <div className="dialog-content">{children}</div>
      </section>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";

interface NavDropdownProps {
  label: string;
  items: Array<{ href: string; label: string }>;
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-40 rounded-md border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-900 z-50">
          {items.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              onClick={() => setOpen(false)}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

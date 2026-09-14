"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Icon } from "@/components/landing/Icon";

interface ComboboxProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Returns suggestions for the query (case-insensitive), max items. */
  suggestions: (query: string, max?: number) => string[];
  placeholder?: string;
  hint?: string;
  error?: string;
  maxSuggestions?: number;
  emptyMessage?: string;
  /** Whether the user may save a value not present in the suggestions. */
  freeform?: boolean;
}

/**
 * Accessible, searchable combobox with type-to-filter suggestions and optional
 * freeform custom entry. Used for Occupation, Genotype, and Country fields so
 * users can pick from a large list OR type + save their own value.
 */
export function Combobox({
  id, label, value, onChange, suggestions, placeholder, hint, error,
  maxSuggestions = 8, emptyMessage, freeform = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const updateResults = useCallback(
    (query: string) => {
      setResults(suggestions(query, maxSuggestions).slice(0, maxSuggestions));
      setActiveIndex(-1);
    },
    [suggestions, maxSuggestions]
  );

  // Close the dropdown when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleChange = (next: string) => {
    onChange(next);
    updateResults(next);
    setOpen(true);
  };

  const commit = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      if (results.length > 0) setActiveIndex((activeIndex + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length > 0)
        setActiveIndex((activeIndex - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && activeIndex >= 0 && activeIndex < results.length) {
        commit(results[activeIndex]);
      } else {
        commit(e.currentTarget.value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          autoComplete="off"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            setOpen(true);
            updateResults(value);
          }}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          maxLength={100}
          className="h-10 w-full rounded-xl border border-ink-200 bg-surface px-4 pr-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-400 focus:outline-none"
        />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-ink-500">
          <Icon name="search" className="h-4 w-4" />
        </span>

        {open ? (
          <ul id={`${id}-listbox`} role="listbox" aria-label={`${label} suggestions`}
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-ink-200 bg-surface shadow-card">
            {results.length > 0 ? (
              results.map((option, i) => (
                <li
                  key={`${option}-${i}`}
                  id={`${id}-option-${i}`}
                  role="option"
                  aria-selected={i === activeIndex}
                  onMouseDown={(e) => { e.preventDefault(); commit(option); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={[
                    "flex w-full cursor-pointer items-center px-4 py-2.5 text-sm",
                    i === activeIndex ? "bg-brand-100 text-ink-900" : "text-ink-700 hover:bg-ink-100",
                  ].join(" ")}
                >
                  {option}
                </li>
              ))
            ) : (
              <li role="option" aria-selected={false} className="flex w-full items-center px-4 py-2.5 text-sm text-ink-600">
                {freeform ? (emptyMessage ?? "No matching option - press Enter to use your own.") : "No matching option."}
              </li>
            )}
          </ul>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-0.5 text-xs text-danger-700">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-0.5 text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}
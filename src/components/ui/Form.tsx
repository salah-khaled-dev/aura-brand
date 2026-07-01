import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function LuxuryInput({ label, error, className = "", id, ...props }: InputProps) {
  const generatedId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 6)}` : undefined);
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={generatedId} className="text-[10px] uppercase-letter-spacing font-bold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={generatedId}
          aria-required={props.required}
          aria-invalid={!!error}
          className="peer w-full bg-transparent border-b border-brand-border py-2 px-1 text-sm font-light text-text-primary outline-none transition-colors duration-300 placeholder:text-text-secondary/40"
          {...props}
        />
        <span className="pointer-events-none absolute bottom-0 start-0 h-[1.5px] w-0 bg-accent transition-all duration-300 ease-out peer-focus:w-full" />
      </div>
      {error && <span className="text-[10px] text-red-500 font-light mt-1">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  error?: string;
}

export function LuxurySelect({ label, options, error, className = "", id, ...props }: SelectProps) {
  const generatedId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 6)}` : undefined);
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={generatedId} className="text-[10px] uppercase-letter-spacing font-bold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={generatedId}
          aria-required={props.required}
          aria-invalid={!!error}
          className="peer w-full bg-transparent border-b border-brand-border py-2 px-1 text-sm font-light text-text-primary outline-none transition-colors duration-300 appearance-none cursor-pointer"
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-background-secondary text-text-primary">
              {opt.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute bottom-0 start-0 h-[1.5px] w-0 bg-accent transition-all duration-300 ease-out peer-focus:w-full" />
        <div className="absolute start-2 top-1/2 -translate-y-1/2 pointer-events-none text-accent">
          {/* Custom SVG arrow down */}
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {error && <span className="text-[10px] text-red-500 font-light mt-1">{error}</span>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function LuxuryTextarea({ label, error, className = "", id, ...props }: TextareaProps) {
  const generatedId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substring(2, 6)}` : undefined);
  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <label htmlFor={generatedId} className="text-[10px] uppercase-letter-spacing font-bold text-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        <textarea
          id={generatedId}
          aria-required={props.required}
          aria-invalid={!!error}
          className="peer w-full bg-transparent border-b border-brand-border py-2 px-1 text-sm font-light text-text-primary outline-none transition-colors duration-300 placeholder:text-text-secondary/40 resize-y min-h-[80px]"
          {...props}
        />
        <span className="pointer-events-none absolute bottom-0 start-0 h-[1.5px] w-0 bg-accent transition-all duration-300 ease-out peer-focus:w-full" />
      </div>
      {error && <span className="text-[10px] text-red-500 font-light mt-1">{error}</span>}
    </div>
  );
}

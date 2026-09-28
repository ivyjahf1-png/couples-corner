/**
 * Small stroke icons shared by the real-time surfaces (the call screen and the
 * Go Live room).
 *
 * WHY LOCAL INSTEAD OF lucide-react: the app already depends on lucide-react
 * and the rest of the UI uses it, but these are the phone-control glyphs of a
 * native call UI (hang-up, flip, mic-off) and are used in a surface that must
 * stay dependency-light and render identically offline. They are inlined here
 * so both screens share one definition instead of two drifting copies.
 */

/** Same transition used by every auto-hiding control surface. */
export const CHROME_FADE = "transition-opacity duration-300";

export function MicIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
    </svg>
  );
}

export function MicOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M9 9v3.75a3 3 0 0 0 4.86 2.24M15 12.75V4.5a3 3 0 0 0-5.85-.75M18.75 12.75a6.75 6.75 0 0 1-1.2 3.83M5.25 12.75a6.75 6.75 0 0 0 10.6 5.54M12 18.75v3.75" />
    </svg>
  );
}

export function VideoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15 10 4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M5 6h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    </svg>
  );
}

export function VideoOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M15 10l4.55-2.28A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.9L15 14M15 14v-2M5 6h5M3 8v8a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

export function FlipIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8.5A8.5 8.5 0 0 1 20.3 6M20 15.5A8.5 8.5 0 0 1 3.7 18M4 4v4.5h4.5M20 20v-4.5h-4.5" />
    </svg>
  );
}

export function GiftIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12v8.25A1.5 1.5 0 0 1 19.5 21h-15A1.5 1.5 0 0 1 3 20.25V12m18 0H3m18 0-1.5-4.5A2.25 2.25 0 0 0 17.25 6h-2.62a2.25 2.25 0 0 0-1.63.94L12 8.25 10.99 6.94A2.25 2.25 0 0 0 9.37 6H6.75A2.25 2.25 0 0 0 4.5 7.5L3 12m9-3.75V21" />
    </svg>
  );
}

export function PhoneOffIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.72 15.06a10.9 10.9 0 0 1-2.35-1.86m-2.2-.83a2.25 2.25 0 0 0-2.13 1.9c-.19.86-.28 1.74-.24 2.62a2.25 2.25 0 0 0 2.24 2.1 16.9 16.9 0 0 0 4.3.4 16.9 16.9 0 0 0 4.3-.4m4.3-.4a10.9 10.9 0 0 0 2.35-1.86m2.2-.83a2.25 2.25 0 0 1 2.13 1.9c.19.86.28 1.74.24 2.62a2.25 2.25 0 0 1-2.24 2.1 16.9 16.9 0 0 1-4.3.4m-4.3-.4a10.9 10.9 0 0 1-2.35-1.86" />
    </svg>
  );
}

export function CloseIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

import type { CSSProperties } from "react";

const actionStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  minHeight: 44, padding: "10px 20px", borderRadius: 12,
  border: "1px solid #64748b", color: "#fff", background: "#1e293b",
  font: "inherit", fontWeight: 600, textDecoration: "none", cursor: "pointer",
};

/** Inline styles keep recovery usable even when the root layout/CSS fails. */
export function RecoveryScreen({ notFound = false, onRetry, homeHref = "/", dashboardHref = "/dashboard" }: {
  notFound?: boolean;
  onRetry?: () => void;
  homeHref?: string;
  dashboardHref?: string;
}) {
  return (
    <section aria-labelledby="recovery-title" style={{ minHeight: "70dvh", display: "grid", placeItems: "center", padding: "48px 24px", boxSizing: "border-box", background: "#0F172A", color: "#fff", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
      <div style={{ maxWidth: 480 }}>
        <p style={{ color: "#fdba74", fontWeight: 700, letterSpacing: "0.08em" }}>COUPLE&apos;S CORNER</p>
        <svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#fdba74" strokeWidth="1.5" style={{ margin: "16px auto" }}>
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
        </svg>
        <h1 id="recovery-title" style={{ fontSize: 30, lineHeight: 1.2 }}>{notFound ? "404 — This page wandered off" : "Let’s get you back to your corner"}</h1>
        <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: "20px 0 28px" }}>
          {notFound ? "This link may have moved or no longer exists. Your next connection is still waiting." : "We couldn’t load this page right now. Please try again, or head home and come back in a moment."}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12 }}>
          {onRetry && <button type="button" onClick={onRetry} style={{ ...actionStyle, background: "#9a3412" }}>Try Again</button>}
          {notFound && <a href={dashboardHref} style={{ ...actionStyle, background: "#9a3412" }}>Back to dashboard</a>}
          <a href={homeHref} style={actionStyle}>Back to home</a>
        </div>
      </div>
    </section>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
  "transition duration-150 disabled:pointer-events-none disabled:opacity-60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
  "focus-visible:ring-offset-[#0B1120] ";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
};

/**
 * 3D soft-neumorphic surfaces. Every variant paints its own depth model in
 * `app/globals.css` (`.nm-btn--*`): a bright top rim, a deep drop shadow and
 * a pressed state that sinks into the page. An accent-blue focus ring keeps
 * the controls keyboard-accessible over the dark navy canvas.
 */
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "nm-btn nm-btn--primary border border-orange-400/40 focus-visible:ring-orange-400/70",
  secondary:
    "nm-btn nm-btn--secondary border border-white/12 bg-gradient-to-b from-[#1E293B] to-[#0F172A] hover:from-[#263449] focus-visible:ring-sky-400/70",
  ghost:
    "nm-btn nm-btn--ghost border bg-[#0F172A]/40 hover:bg-[#0F172A]/70 focus-visible:ring-sky-400/60",
  danger:
    "nm-btn nm-btn--danger border hover:bg-danger-500/15 focus-visible:ring-danger-400/70",
};

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  /** Native tooltip text (title attribute) — works on disabled buttons too. */
  title?: string;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string & {};
}

interface ButtonButtonProps extends BaseButtonProps {
  href?: undefined;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  /** Associate a submit button with a form elsewhere on the page. */
  form?: string;
}

export type ButtonProps = LinkButtonProps | ButtonButtonProps;

/**
 * Couples Corner Button primitive.
 *
 * Renders a semantic <button> (or <a> via Next <Link> when `href` is set)
 * with a consistent elevated surface, radii, and interactive states pulled
 * from the design tokens. Keyboard focus styling is applied globally via
 * `:focus-visible` in `app/globals.css`.
 */
export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    fullWidth = false,
    disabled = false,
    className,
    children,
    "aria-label": ariaLabel,
    title,
  } = props;

  const classes = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .join(" ")
    .trim();

  if (props.href !== undefined) {
    return (
      <Link href={props.href as never} className={classes} aria-label={ariaLabel} title={title}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={props.type ?? "button"}
      disabled={disabled}
      onClick={props.onClick}
      form={props.form}
      className={classes}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
}
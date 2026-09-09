import type { ReactNode } from "react";
import Link from "next/link";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium " +
  "transition duration-150 disabled:pointer-events-none disabled:opacity-60";

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white shadow-subtle hover:bg-brand-800 active:bg-brand-900",
  secondary:
    "border border-ink-200 bg-surface text-ink-800 hover:border-ink-300 hover:bg-surface-muted active:bg-ink-100",
  ghost:
    "border border-brand-300 bg-transparent text-brand-700 hover:border-brand-400 hover:bg-brand-50 active:bg-brand-100",
  danger:
    "border border-danger-300 bg-danger-100 text-danger-700 hover:border-danger-400 hover:bg-danger-200 active:bg-danger-300",
};

interface BaseButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}

interface LinkButtonProps extends BaseButtonProps {
  href: string;
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
      <Link href={props.href} className={classes} aria-label={ariaLabel}>
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
    >
      {children}
    </button>
  );
}
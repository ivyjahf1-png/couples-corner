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
    "bg-[#FF5722] text-white shadow-lg shadow-orange-500/20 transition-colors hover:bg-[#F4511E] active:bg-[#E64A19]",
  secondary:
    "border border-orange-500/30 bg-slate-900/90 text-slate-200 hover:bg-slate-800 hover:text-white active:bg-slate-800",
  ghost:
    "border border-orange-500/30 bg-transparent text-orange-300 hover:border-orange-400 hover:bg-orange-500/10 active:bg-orange-500/20",
  danger:
    "border border-danger-500/40 bg-danger-500/15 text-danger-300 hover:border-danger-400 hover:bg-danger-500/20 active:bg-danger-500/25",
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
  form?: string;
}

export type ButtonProps = LinkButtonProps | ButtonButtonProps;

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



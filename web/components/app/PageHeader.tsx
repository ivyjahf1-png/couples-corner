import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/** Standard page heading block for authenticated-app pages. */
export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex max-w-2xl flex-col gap-2">
        {eyebrow ? <Chip tone="brand">{eyebrow}</Chip> : null}
        <h1 className="text-2xl font-semibold tracking-display text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle ? <p className="text-base leading-relaxed text-ink-600">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

"use client";

import { Component, ReactNode, ErrorInfo } from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

interface Props {
  /** Optional label for what feature failed (e.g. "Messaging", "Payments"). */
  feature?: string;
  /** Content to wrap with the error boundary. */
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Reusable client-side error boundary.
 *
 * Wrap any feature section, server-action call, or suspense boundary that might
 * fail (e.g. an unbuilt or serverless-only feature) and this component will
 * catch the render error and display a clean "Coming Soon" fallback instead
 * of crashing the whole app.
 *
 * Usage:
 *   <ErrorBoundary feature="Admin dashboard">
 *     <AdminPanel />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.feature ?? "App"}] Render error:`, error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const feature = this.props.feature ?? "this feature";
      return (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-ink-200 bg-surface-muted p-8 text-center">
          <Logo as="div" />
          <h3 className="text-lg font-semibold text-foreground">
            {feature} is still loading
          </h3>
          <p className="max-w-sm text-sm text-ink-500">
            This feature is either under construction or temporarily unavailable.
            Check back soon — or contact support if the problem persists.
          </p>
          {process.env.NODE_ENV === "development" && this.state.error ? (
            <pre className="max-w-full overflow-x-auto text-left text-xs text-danger-600">
              {this.state.error.message}
            </pre>
          ) : null}
          <div className="flex gap-3">
            <button
              onClick={this.reset}
              className="rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Retry
            </button>
            <Link
              href="/"
              className="rounded-xl border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 transition hover:bg-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

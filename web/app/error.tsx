"use client";

import { RecoveryScreen } from "@/components/error/RecoveryScreen";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <RecoveryScreen onRetry={reset} />;
}

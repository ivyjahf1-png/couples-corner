"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { CallScreen } from "@/components/app/CallScreen";

/* Deferred 1:1 call surface (~18KB WebRTC stack: peer connection, realtime
   signaling, media devices). The route's server-rendered peer summary still
   resolves first, so the shell paints while the call UI streams in. */
export const LazyCallScreen = dynamic(
  () => import("@/components/app/CallScreen").then((m) => m.CallScreen),
  { ssr: false }
) as (props: ComponentProps<typeof CallScreen>) => React.JSX.Element;

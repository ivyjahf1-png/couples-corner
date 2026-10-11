"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { GoLiveRoom } from "@/components/app/GoLiveRoom";

/* Deferred live-broadcast surface (~16KB: realtime room, media tracks, gift
   channel). Keeps the route's first paint to the shell while the broadcast
   UI streams in. */
export const LazyGoLiveRoom = dynamic(
  () => import("@/components/app/GoLiveRoom").then((m) => m.GoLiveRoom),
  { ssr: false }
) as (props: ComponentProps<typeof GoLiveRoom>) => React.JSX.Element;

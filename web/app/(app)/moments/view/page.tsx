import { ImmersiveFeed } from "@/components/app/ImmersiveFeed";
import { requireUser } from "@/lib/auth/authorization";

export default async function MomentsViewPage({
  searchParams,
}: {
  searchParams: Promise<{ moment?: string }>;
}) {
  const session = await requireUser();
  const { moment } = await searchParams;
  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-black/40">
      <ImmersiveFeed
        viewerId={session.uid}
        deepLinkMomentId={moment?.trim().slice(0, 64) || null}
      />
    </div>
  );
}

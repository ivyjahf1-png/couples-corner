import {
  getBlockedUsersAction,
  getUserProfileAction,
  getUserMfaFactorsAction,
  getUserSessionsAction,
  sendPasswordResetAction,
  setPasswordAction,
  unenrollMfaFactorAction,
  revokeSessionAction,
  revokeAllSessionsAction,
  unblockUserAction,
  searchUsersAction,
} from "@/lib/actions/security";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/landing/Icon";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AdminUserSelector } from "@/components/admin/security/AdminUserSelector";
import { AdminMfaPanel } from "@/components/admin/security/AdminMfaPanel";
import { AdminSessionsPanel } from "@/components/admin/security/AdminSessionsPanel";
import { AdminPasswordPanel } from "@/components/admin/security/AdminPasswordPanel";
import { AdminBlockedUsers } from "@/components/admin/security/AdminBlockedUsers";
import { Suspense } from "react";

export default async function AdminSecurityPage({
  searchParams,
}: {
  searchParams?: Promise<{ uid?: string }>;
}) {
  const params = searchParams ? await searchParams : { uid: undefined };
  const targetUid = params.uid ?? "";

  const blockedUsers = await getBlockedUsersAction();

  return (
    <ErrorBoundary feature="Security">
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Security"
          title="User Account Security"
          subtitle="Inspect and manage MFA, sessions, password resets, and blocked accounts for platform users."
        />

        <AdminUserSelector
          selectedUid={targetUid}
          onSearch={searchUsersAction}
        />

        {targetUid ? (
          <Suspense fallback={<Card className="p-6"><p>Loading profile…</p></Card>}>
            <AdminUserProfile uid={targetUid} />
          </Suspense>
        ) : (
          <Card className="p-8 text-center">
            <Icon name="lock" className="mx-auto h-10 w-10 text-ink-400" />
            <h3 className="mt-3 text-lg font-semibold text-ink-900">Select a user</h3>
            <p className="mt-1 text-sm text-ink-600">
              Pick a user from the dropdown above to view their security settings.
            </p>
          </Card>
        )}

        <AdminBlockedUsers
          initialBlocked={blockedUsers}
          onUnblock={unblockUserAction}
        />
      </div>
    </ErrorBoundary>
  );
}

async function AdminUserProfile({ uid }: { uid: string }) {
  const profile = await getUserProfileAction(uid);

  if (!profile) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-500">User not found or you don&apos;t have permission.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-lg font-bold text-brand-700">
            {profile.displayName?.charAt(0).toUpperCase() ?? profile.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900">
              {profile.displayName ?? profile.email}
            </p>
            <p className="text-sm text-ink-500">{profile.email}</p>
            <p className="text-xs text-ink-500">
              Role: {profile.role} · Status: {profile.status} · Joined: {new Date(profile.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </Card>

      <AdminMfaPanel uid={uid} />
      <AdminSessionsPanel uid={uid} />
      <AdminPasswordPanel uid={uid} email={profile.email} />
    </div>
  );
}
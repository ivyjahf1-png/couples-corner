import { requireGuest } from "@/lib/auth/authorization";

/**
 * Authentication zone shell (login, register, recovery, verify-email).
 *
 * Accessible only when signed OUT; signed-in users are redirected to the app.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireGuest();
  return (
    <section data-zone="auth" className="flex min-h-full flex-1 flex-col">
      {children}
    </section>
  );
}
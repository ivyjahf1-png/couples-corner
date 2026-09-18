/** UUIDs are required before passing profile ownership IDs to PostgREST filters. */
export function isDiscoveryUserId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Normalize discovery display data without inventing identities or exposing account details. */
export function hydrateDiscoveryProfile(
  row: Record<string, unknown>,
  account: Record<string, unknown> | undefined,
): Record<string, unknown> | null {
  const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
  const uid = text(row.user_id);
  if (!uid || !account || account.id !== uid || account.status !== "active") return null;
  const name = text(row.display_name) || text(account.display_name) || text(account.username);
  if (!name) return null;

  const photos = (Array.isArray(row.photos) ? row.photos : []).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const photo = value as Record<string, unknown>;
    const storagePath = text(photo.storagePath);
    const publicUrl = text(photo.publicUrl);
    if (!storagePath && !/^https?:\/\//i.test(publicUrl)) return [];
    return [{ storagePath, publicUrl, isPrimary: photo.isPrimary === true }];
  });
  const avatar = text(account.avatar_url);
  if (!photos.length && /^https?:\/\//i.test(avatar)) {
    photos.push({ storagePath: "", publicUrl: avatar, isPrimary: true });
  }
  const interests = Array.isArray(row.interests)
    ? [...new Set(row.interests.map(text).filter(Boolean))]
    : [];
  return {
    ...row,
    display_name: name,
    bio: text(row.bio) || null,
    location: text(row.location) || text(row.country) || text(account.country) || null,
    interests,
    photos,
  };
}

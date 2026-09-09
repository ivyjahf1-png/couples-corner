import "server-only";

import { getAdminFirestore } from "@/lib/firebase/admin";
import type { ContentItem, ContentPlacement, ContentStatus } from "@/lib/models";

/**
 * Couples Corner — server-side content management service.
 *
 * All writes go through the Admin SDK (bypass rules) inside a transaction
 * that also writes an audit-log entry. Clients never touch `content` directly;
 * Firestore rules deny all client writes.
 */

export interface ContentFilters {
  category?: string;
  status?: ContentStatus;
  placement?: ContentPlacement;
  search?: string;
}

export async function listContent(filters: ContentFilters = {}): Promise<ContentItem[]> {
  const db = getAdminFirestore();
  let query: FirebaseFirestore.Query = db.collection("content").orderBy("createdAt", "desc");

  if (filters.category) query = query.where("category", "==", filters.category);
  if (filters.status) query = query.where("status", "==", filters.status);
  if (filters.placement) query = query.where("placement", "==", filters.placement);

  const snap = await query.get();
  return snap.docs.map((doc) => doc.data() as ContentItem);
}

export async function getContent(id: string): Promise<ContentItem | null> {
  const db = getAdminFirestore();
  const snap = await db.collection("content").doc(id).get();
  return snap.exists ? (snap.data() as ContentItem) : null;
}

export async function createContent(
  data: Omit<ContentItem, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">,
  adminUid: string
): Promise<string> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();
  const docRef = db.collection("content").doc();

  await db.runTransaction(async (tx) => {
    tx.set(docRef, {
      ...data,
      id: docRef.id,
      createdAt: now,
      updatedAt: now,
      createdBy: adminUid,
      updatedBy: adminUid,
    });

    tx.set(db.collection("auditLogs").doc(), {
      action: "content.create",
      adminId: adminUid,
      targetId: docRef.id,
      targetType: "content",
      details: { title: data.title, category: data.category, status: data.status },
      createdAt: now,
    });
  });

  return docRef.id;
}

export async function updateContent(
  id: string,
  data: Partial<ContentItem>,
  adminUid: string
): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const ref = db.collection("content").doc(id);
    tx.update(ref, { ...data, updatedAt: now, updatedBy: adminUid });

    tx.set(db.collection("auditLogs").doc(), {
      action: "content.update",
      adminId: adminUid,
      targetId: id,
      targetType: "content",
      details: { changes: Object.keys(data) },
      createdAt: now,
    });
  });
}

export async function deleteContent(id: string, adminUid: string): Promise<void> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  await db.runTransaction(async (tx) => {
    const ref = db.collection("content").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Content not found");

    tx.delete(ref);
    tx.set(db.collection("auditLogs").doc(), {
      action: "content.delete",
      adminId: adminUid,
      targetId: id,
      targetType: "content",
      details: { title: snap.data()?.title },
      createdAt: now,
    });
  });
}

export async function publishContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "published" }, adminUid);
}

export async function unpublishContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "draft" }, adminUid);
}

export async function archiveContent(id: string, adminUid: string): Promise<void> {
  await updateContent(id, { status: "archived" }, adminUid);
}

/** Get published, in-date content for a placement (server-side for display). */
export async function getPublishedForPlacement(
  placement: ContentPlacement
): Promise<ContentItem[]> {
  const db = getAdminFirestore();
  const now = new Date().toISOString();

  const snap = await db
    .collection("content")
    .where("placement", "==", placement)
    .where("status", "==", "published")
    .where("startAt", "<=", now)
    .where("endAt", ">=", now)
    .orderBy("priority", "asc")
    .get();

  return snap.docs.map((doc) => doc.data() as ContentItem);
}

export interface ContentStats {
  total: number;
  published: number;
  scheduled: number;
  draft: number;
  archived: number;
}

export async function getContentStats(): Promise<ContentStats> {
  const db = getAdminFirestore();
  const snap = await db.collection("content").get();

  const stats: ContentStats = { total: 0, published: 0, scheduled: 0, draft: 0, archived: 0 };
  snap.docs.forEach((doc) => {
    const item = doc.data() as ContentItem;
    stats.total++;
    if (item.status === "published") stats.published++;
    else if (item.status === "scheduled") stats.scheduled++;
    else if (item.status === "draft") stats.draft++;
    else if (item.status === "archived") stats.archived++;
  });
  return stats;
}

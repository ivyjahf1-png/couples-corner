/**
 * Couples Corner — message insert payload builder (isomorphic).
 *
 * `public.messages` carries a legacy `content` column that was created NOT NULL
 * with no default. Every application write path stores the message text in
 * `body` (the column all read paths use), so on a database where the repair
 * migration has not run, inserts failed with:
 *
 *   23502  null value in column "content" of relation "messages"
 *          violates not-null constraint
 *
 * `017_messages_content_legacy_repair.sql` drops that constraint, and
 * `016_conversations_and_messages_schema.sql` guarantees the column exists
 * (nullable). This builder additionally mirrors `body` into `content` on every
 * write, so messages send successfully even on an environment where 017 has not
 * been applied yet — and anything that still reads `content` never sees blank.
 *
 * Isomorphic on purpose: used by the browser chat page and both server
 * messaging services. Never add a `server-only` import here.
 */

export interface MessageInsertInput {
  conversationId: string;
  senderId: string;
  /** Message text — written to `body` and mirrored into legacy `content`. */
  body: string;
  type?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Build the canonical `messages` insert row (body + legacy content mirror). */
export function buildMessageInsert(input: MessageInsertInput): Record<string, unknown> {
  const body = input.body;
  return {
    conversation_id: input.conversationId,
    sender_id: input.senderId,
    type: input.type ?? "text",
    body,
    // Legacy NOT NULL column: keep in sync so un-migrated DBs still accept the
    // insert and older readers keep working.
    content: body,
    ...(input.status ? { status: input.status } : {}),
    ...(input.createdAt ? { created_at: input.createdAt } : {}),
    ...(input.updatedAt ? { updated_at: input.updatedAt } : {}),
  };
}
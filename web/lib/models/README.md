# Couples Corner — Content Model

Logical data model for the platform. These types are **Firebase-agnostic** by
design; they are the single source of truth for entity shapes and will map onto
Cloud Firestore collections (and Firebase Auth / Storage) when that is wired up.

This phase defines **structure and types only** — no Firebase, no persistence,
no page UI.

## Entities and relationships

```
User 1────1 UserProfile
User *────* CoupleProfile      (via CoupleMember; a user belongs to 0..1 couple,
                                 each couple has exactly 2 members)
User *────* ConnectionRequest  (fromUserId -> toUserId)
User *────* Connection         (accepted, normalized user1Id < user2Id)
User *────* Conversation       (via ConversationParticipant, many-to-many)
Conversation 1──* Message      (Message.senderId -> User)
User 1──* Post                 (Post.coupleId -> CoupleProfile, optional)
Post 1──* Like                 (keyed by postId + userId)
Post 1──* Comment              (Comment.parentId for replies)
User 1──* Notification         (recipientId)
Block  / Report / ModerationAction   (safety & moderation)
```

## Key invariants

- A `User` binds to a Firebase Auth UID (`authUid`). App role is duplicated into
  Auth **custom claims** and enforced server-side — never trusted from the client.
- A `CoupleProfile.memberIds` is exactly 2 users, and both must approve joining.
- `Connection` / `ConversationParticipant` / `Block` must all be enforced
  **in both directions**: if A blocks B, neither can connect, message, or appear
  in the other's discover/feed.
- Authored entities always record the originating user (`authorUserId`,
  `senderId`, etc.) so child reads (likes, comments, messages) can never bypass
  a parent's visibility or block list.

## Planned Firestore mapping (not implemented)

| Collection            | Document shape                                  |
| --------------------- | ----------------------------------------------- |
| `users`               | `User`                                          |
| `profiles`            | `UserProfile` (1:1 with users)                 |
| `coupleProfiles`      | `CoupleProfile`                                 |
| `coupleMembers`       | `CoupleMember`                                  |
| `connectionRequests`  | `ConnectionRequest`                             |
| `connections`         | `Connection`                                    |
| `conversations`       | `Conversation`                                  |
| `conversationParticipants` | `ConversationParticipant`                   |
| `messages`            | `Message` (subcollection of conversations)      |
| `posts`               | `Post` (media refs into Storage)                |
| `likes`               | `Like`                                          |
| `comments`            | `Comment`                                       |
| `notifications`       | `Notification`                                  |
| `blocks`              | `Block`                                         |
| `reports`             | `Report`                                        |
| `moderationActions`   | `ModerationAction` (audit log)                  |

Firestore **security rules** are the enforcement layer for privacy, blocking,
and admin-only reads/writes; Cloud Functions/triggers handle notification fan-out
and moderation alerts later.
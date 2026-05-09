import { sendPushToEmails } from "@/lib/push-notifications";
import { supabaseServer } from "@/lib/supabase/server";
import { webPushEnabled } from "@/lib/web-push";

const STATE_ROW_ID = "crumbz-app-state";
const ACCOUNTS_ROW_ID = "crumbz-accounts-state";

type JsonRecord = Record<string, unknown>;

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.toLowerCase() : "";
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeObjectArray(value: unknown): JsonRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is JsonRecord => Boolean(item && typeof item === "object"))
    : [];
}

function getAccountEmail(account: JsonRecord) {
  const googleProfile = account.googleProfile && typeof account.googleProfile === "object" ? (account.googleProfile as JsonRecord) : null;
  return normalizeEmail(googleProfile?.email);
}

function getAccountUsername(account: JsonRecord) {
  const profile = account.profile && typeof account.profile === "object" ? (account.profile as JsonRecord) : null;
  return normalizeText(profile?.username).toLowerCase();
}

function getAccountPreferredLanguage(account: JsonRecord | null | undefined) {
  const profile = account?.profile && typeof account.profile === "object" ? (account.profile as JsonRecord) : null;
  return profile?.preferredLanguage === "pl" ? "pl" : "en";
}

function getPostOwnerEmail(post: JsonRecord) {
  return normalizeEmail(post.authorEmail);
}

function getPostTitle(post: JsonRecord | null | undefined) {
  return normalizeText(post?.title) || normalizeText(post?.placeName);
}

function getPreview(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 90);
}

function extractMentionUsernames(text: string) {
  return [...text.matchAll(/(^|[^\w.])@([a-z0-9._-]{2,32})/gi)]
    .map((match) => normalizeText(match[2]).toLowerCase())
    .filter(Boolean);
}

function getReplyKey(reply: JsonRecord) {
  return normalizeText(reply.id) || [normalizeEmail(reply.authorEmail), normalizeText(reply.createdAt)].join(":");
}

async function loadNotificationContext() {
  const [stateRow, accountsRow] = await Promise.all([
    supabaseServer.from("app_state").select("posts").eq("id", STATE_ROW_ID).maybeSingle(),
    supabaseServer.from("app_state").select("accounts").eq("id", ACCOUNTS_ROW_ID).maybeSingle(),
  ]);

  const accounts = normalizeObjectArray(accountsRow.data?.accounts);
  const posts = normalizeObjectArray(stateRow.data?.posts);
  const accountByEmail = new Map(accounts.map((account) => [getAccountEmail(account), account] as const).filter(([email]) => Boolean(email)));
  const emailByUsername = new Map(accounts.map((account) => [getAccountUsername(account), getAccountEmail(account)] as const).filter(([username, email]) => Boolean(username && email)));
  const postById = new Map(posts.map((post) => [normalizeText(post.id), post] as const).filter(([postId]) => Boolean(postId)));

  return { accountByEmail, emailByUsername, postById };
}

type NotificationContext = Awaited<ReturnType<typeof loadNotificationContext>>;

async function sendMentionPushes(params: {
  postId: string;
  commentId: string;
  sourceId: string;
  text: string;
  actorEmail: string;
  actorName: string;
  context: NotificationContext;
  skipEmails?: string[];
}) {
  const mentions = [...new Set(extractMentionUsernames(params.text))];
  if (!mentions.length) return;

  const { accountByEmail, emailByUsername } = params.context;
  const skipEmails = new Set((params.skipEmails ?? []).map(normalizeEmail).filter(Boolean));
  skipEmails.add(normalizeEmail(params.actorEmail));

  await Promise.all(
    mentions.map(async (username) => {
      const email = emailByUsername.get(username) ?? "";
      if (!email || skipEmails.has(email)) return;

      const account = accountByEmail.get(email);
      const language = getAccountPreferredLanguage(account);
      const actor = normalizeText(params.actorName) || "someone";
      const preview = getPreview(params.text);
      const title = language === "pl" ? `${actor} wspomniał_a o tobie` : `${actor} mentioned you`;
      const body = preview || (language === "pl" ? "otwórz crumbz, żeby zobaczyć komentarz." : "open crumbz to see the comment.");

      await sendPushToEmails([email], {
        title,
        body,
        url: `/?post=${encodeURIComponent(params.postId)}`,
        tag: `comment-mention-${params.postId}-${params.commentId}-${params.sourceId}-${email}`,
      });
    }),
  );
}

export async function sendNewCommentNotifications(params: {
  postId: string;
  commentId: string;
  text: string;
  actorEmail: string;
  actorName: string;
}) {
  if (!webPushEnabled) return;

  const context = await loadNotificationContext();
  const { accountByEmail, postById } = context;
  const post = postById.get(params.postId) ?? null;
  const postOwnerEmail = getPostOwnerEmail(post ?? {});
  const actorEmail = normalizeEmail(params.actorEmail);
  const actor = normalizeText(params.actorName) || "someone";
  const notifiedEmails: string[] = [];

  if (postOwnerEmail && postOwnerEmail !== actorEmail) {
    const ownerAccount = accountByEmail.get(postOwnerEmail);
    const language = getAccountPreferredLanguage(ownerAccount);
    const preview = getPreview(params.text);
    const postTitle = getPostTitle(post);
    const title = language === "pl" ? `${actor} skomentował_a twój post` : `${actor} commented on your post`;
    const body = preview || postTitle || (language === "pl" ? "otwórz crumbz, żeby zobaczyć komentarz." : "open crumbz to see the comment.");

    notifiedEmails.push(postOwnerEmail);
    await sendPushToEmails([postOwnerEmail], {
      title,
      body,
      url: `/?post=${encodeURIComponent(params.postId)}`,
      tag: `new-comment-${params.postId}-${params.commentId}`,
    });
  }

  await sendMentionPushes({
    postId: params.postId,
    commentId: params.commentId,
    sourceId: "root",
    text: params.text,
    actorEmail,
    actorName: actor,
    context,
    skipEmails: notifiedEmails,
  });
}

export async function sendCommentReplyNotifications(params: {
  postId: string;
  commentId: string;
  commentText: string;
  commentOwnerEmail: string;
  actorEmail: string;
  previousReplies: JsonRecord[];
  nextReplies: JsonRecord[];
}) {
  if (!webPushEnabled) return;

  const actorEmail = normalizeEmail(params.actorEmail);
  const commentOwnerEmail = normalizeEmail(params.commentOwnerEmail);
  const previousReplyKeys = new Set(params.previousReplies.map(getReplyKey));
  const newReplies = params.nextReplies.filter((reply) => {
    const actorMatches = normalizeEmail(reply.authorEmail) === actorEmail;
    const replyKey = getReplyKey(reply);
    return actorMatches && Boolean(replyKey) && !previousReplyKeys.has(replyKey);
  });

  if (!newReplies.length) return;

  const context = await loadNotificationContext();
  const { accountByEmail } = context;

  await Promise.all(
    newReplies.map(async (reply) => {
      const replyText = normalizeText(reply.text);
      const actorName = normalizeText(reply.authorName) || "someone";
      const notifiedEmails: string[] = [];

      if (commentOwnerEmail && commentOwnerEmail !== actorEmail) {
        const ownerAccount = accountByEmail.get(commentOwnerEmail);
        const language = getAccountPreferredLanguage(ownerAccount);
        const title = language === "pl" ? `${actorName} odpowiedział_a na twój komentarz` : `${actorName} replied to your comment`;
        const body = getPreview(replyText) || getPreview(params.commentText) || (language === "pl" ? "otwórz crumbz, żeby zobaczyć wątek." : "open crumbz to see the thread.");

        notifiedEmails.push(commentOwnerEmail);
        await sendPushToEmails([commentOwnerEmail], {
          title,
          body,
          url: `/?post=${encodeURIComponent(params.postId)}`,
          tag: `comment-reply-${params.postId}-${params.commentId}-${getReplyKey(reply)}`,
        });
      }

      await sendMentionPushes({
        postId: params.postId,
        commentId: params.commentId,
        sourceId: getReplyKey(reply),
        text: replyText,
        actorEmail,
        actorName,
        context,
        skipEmails: notifiedEmails,
      });
    }),
  );
}

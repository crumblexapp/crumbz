import { supabaseServer } from "@/lib/supabase/server";
import { sendWebPushNotification, webPushEnabled } from "@/lib/web-push";

type PushSubscriptionRow = {
  endpoint: string;
  author_email: string;
  subscription: unknown;
};

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export async function sendPushToEmails(emails: string[], payload: PushPayload) {
  if (!webPushEnabled || !emails.length) return;

  const normalizedEmails = [...new Set(emails.map((email) => email.toLowerCase()).filter(Boolean))];
  if (!normalizedEmails.length) return;

  const { data, error } = await supabaseServer
    .from("push_subscriptions")
    .select("endpoint, author_email, subscription")
    .in("author_email", normalizedEmails);

  if (error) return;

  const expiredEndpoints: string[] = [];
  const rows = (data ?? []) as PushSubscriptionRow[];

  await Promise.all(
    rows.map(async (row) => {
      const result = await sendWebPushNotification(row.subscription as never, payload);
      if (!result.ok && result.reason === "expired") {
        expiredEndpoints.push(row.endpoint);
      }
    }),
  );

  if (expiredEndpoints.length) {
    await supabaseServer.from("push_subscriptions").delete().in("endpoint", expiredEndpoints);
  }
}

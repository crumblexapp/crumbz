type CopyPair = {
  title: string;
  body: string;
};

function clean(value: string | null | undefined, fallback = "") {
  return (value ?? "").trim() || fallback;
}

function slugToDisplay(value: string | null | undefined, fallback = "live now") {
  const normalized = clean(value, fallback);
  return normalized.replace(/[-_]+/g, " ");
}

function pickVariant<T>(seed: string, variants: T[]): T {
  const hash = Array.from(seed).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return variants[Math.abs(hash) % variants.length];
}

export function buildFriendRequestNotification(senderName: string, username: string, seed: string): CopyPair {
  const name = clean(senderName, "someone");
  const handle = clean(username, "someone");
  return pickVariant(seed, [
    {
      title: "hey, you got a new friend request",
      body: `${name} wants in on your circle.`,
    },
    {
      title: "someone's looking to friend you",
      body: `${handle} just found you on crumbz.`,
    },
    {
      title: "new circle request just landed",
      body: `${name} wants to connect.`,
    },
  ]);
}

export function buildFriendPostNotification(params: {
  authorName: string;
  username: string;
  placeName?: string;
  isWeeklyDump: boolean;
  seed: string;
}): CopyPair {
  const name = clean(params.authorName, "your friend");
  const handle = clean(params.username, "@yourfriend");
  const place = clean(params.placeName);

  if (params.isWeeklyDump) {
    return pickVariant(params.seed, [
      {
        title: `it's sunday. ${handle} just dropped their week 📸`,
        body: "7 spots. open now.",
      },
      {
        title: "sunday dump just landed ⭕",
        body: `${handle} ate a lot this week.`,
      },
      {
        title: "your friend's week in 7 photos 🍴",
        body: `${handle} sunday dump is live.`,
      },
      {
        title: "the weekly drop is here 📸",
        body: `see where ${handle} has been.`,
      },
      {
        title: `sunday ritual 🔴 ${handle} posted their dump`,
        body: `${name}'s week is live now.`,
      },
    ]);
  }

  return pickVariant(params.seed, [
    {
      title: "your friend just found something good 👀",
      body: "open before everyone else does.",
    },
    {
      title: `${handle} was hungry. you should see what they found.`,
      body: place ? `${place} just landed in your feed.` : "something new just landed in your feed.",
    },
    {
      title: "a spot just landed in your feed 🍴",
      body: "your friend saved it. now you know.",
    },
    {
      title: `${handle} ate something you need to know about`,
      body: place ? `${place} is waiting in your feed.` : "open crumbz before the group chat catches up.",
    },
    {
      title: "new crumb dropped 🍞",
      body: `${handle} just added a spot.`,
    },
    {
      title: "your circle is eating well tonight 🍴",
      body: `${name} posted something fresh.`,
    },
    {
      title: `${handle} left a trail 🍞 follow it`,
      body: place ? `${place} is on their feed now.` : "open crumbz and see where they went.",
    },
  ]);
}

export function buildFriendFavoriteNotification(params: {
  username: string;
  placeName: string;
  seed: string;
}): CopyPair {
  const handle = clean(params.username, "@yourfriend");
  const place = clean(params.placeName, "a new spot");
  return pickVariant(params.seed, [
    {
      title: "a spot just landed in your feed 🍴",
      body: `${handle} saved ${place}. now you know.`,
    },
    {
      title: "new crumb dropped 🍞",
      body: `${handle} just added ${place}.`,
    },
    {
      title: `${handle} left a trail 🍞 follow it`,
      body: `${place} just got saved.`,
    },
  ]);
}

export function buildTaggedPostNotification(params: {
  authorName: string;
  username: string;
  placeName?: string;
  seed: string;
}): CopyPair {
  const name = clean(params.authorName, "someone");
  const handle = clean(params.username, "@someone");
  const place = clean(params.placeName);

  return pickVariant(params.seed, [
    {
      title: `${handle} tagged you in a post`,
      body: place ? `${name} tagged you at ${place}.` : `${name} tagged you in something new.`,
    },
    {
      title: "you just got tagged 👀",
      body: `${handle} mentioned you on crumbz.`,
    },
    {
      title: `${name} added you to the caption`,
      body: place ? `${place} is in the post too.` : "open the post and see what they said.",
    },
  ]);
}

export function buildAdminPostNotification(params: {
  postType: string;
  title: string;
  body: string;
  cta: string;
  seed: string;
}): CopyPair {
  const title = clean(params.title, "something new is live");
  const body = clean(params.body);
  const cta = slugToDisplay(params.cta, "live now");
  const postType = clean(params.postType, "drop");

  return pickVariant(params.seed, [
    {
      title,
      body: body || `${cta}. open crumbz now.`,
    },
    {
      title: `${title} is live`,
      body: body || `${postType} is up. tap in now.`,
    },
    {
      title: `don't miss ${title.toLowerCase()}`,
      body: body || `${cta}. it's waiting in crumbz.`,
    },
    {
      title: `${cta}. ${title}`,
      body: body || `open crumbz and catch the new ${postType}.`,
    },
  ]);
}

export function buildAnnouncementNotification(params: { title: string; body: string; seed: string }): CopyPair {
  const title = clean(params.title, "forget google. open crumbz.");
  const body = clean(params.body, "something worth opening just landed.");

  return pickVariant(params.seed, [
    {
      title,
      body,
    },
    {
      title: "forget google. open crumbz.",
      body,
    },
    {
      title: title === "forget google. open crumbz." ? title : `${title} is live`,
      body,
    },
  ]);
}

type CopyPair = {
  title: string;
  body: string;
};

export type NotificationLanguage = "en" | "pl";

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

export function buildFriendRequestNotification(senderName: string, username: string, seed: string, language: NotificationLanguage = "en"): CopyPair {
  const name = clean(senderName, "someone");
  const handle = clean(username, "someone");
  if (language === "pl") {
    return pickVariant(seed, [
      {
        title: "hej, masz nowe zaproszenie",
        body: `${name} chce dołączyć do twojego circle.`,
      },
      {
        title: "ktoś chce dodać cię do znajomych",
        body: `${handle} właśnie znalazł_cię na crumbz.`,
      },
      {
        title: "wpadło nowe zaproszenie do circle",
        body: `${name} chce się połączyć.`,
      },
    ]);
  }
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
  language?: NotificationLanguage;
}): CopyPair {
  const name = clean(params.authorName, "your friend");
  const handle = clean(params.username, "@yourfriend");
  const place = clean(params.placeName);
  const language = params.language ?? "en";

  if (params.isWeeklyDump) {
    if (language === "pl") {
      return pickVariant(params.seed, [
        {
          title: `jest niedziela. ${handle} właśnie wrzucił_a swój tydzień 📸`,
          body: "7 miejsc. otwórz teraz.",
        },
        {
          title: "wpadł sunday dump ⭕",
          body: `${handle} sporo zjadł_a w tym tygodniu.`,
        },
        {
          title: "tydzień twojego znajomego w 7 zdjęciach 🍴",
          body: `${handle} sunday dump jest już live.`,
        },
        {
          title: "cotygodniowy drop już jest 📸",
          body: `zobacz, gdzie był_a ${handle}.`,
        },
        {
          title: `niedzielny rytuał 🔴 ${handle} wrzucił_a dump`,
          body: `tydzień ${name} jest już live.`,
        },
      ]);
    }
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

  if (language === "pl") {
    return pickVariant(params.seed, [
      {
        title: "twój znajomy właśnie znalazł coś dobrego 👀",
        body: "otwórz, zanim zrobią to wszyscy inni.",
      },
      {
        title: `${handle} był_a głodny_a. musisz zobaczyć, co znalazł_a.`,
        body: place ? `${place} właśnie wpadło do twojego feedu.` : "coś nowego właśnie wpadło do twojego feedu.",
      },
      {
        title: "nowe miejsce właśnie wpadło do twojego feedu 🍴",
        body: "twój znajomy je zapisał. teraz ty też wiesz.",
      },
      {
        title: `${handle} zjadł_a coś, o czym musisz wiedzieć`,
        body: place ? `${place} czeka już w twoim feedzie.` : "otwórz crumbz zanim ogarnie to group chat.",
      },
      {
        title: "wpadł nowy crumb 🍞",
        body: `${handle} właśnie dodał_a nowe miejsce.`,
      },
      {
        title: "twoje circle dobrze dziś je 🍴",
        body: `${name} wrzucił_a coś świeżego.`,
      },
      {
        title: `${handle} zostawił_a ślad 🍞 idź za nim`,
        body: place ? `${place} jest już na jego_jej feedzie.` : "otwórz crumbz i zobacz, gdzie był_a.",
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
  language?: NotificationLanguage;
}): CopyPair {
  const handle = clean(params.username, "@yourfriend");
  const place = clean(params.placeName, "a new spot");
  if (params.language === "pl") {
    return pickVariant(params.seed, [
      {
        title: "nowe miejsce właśnie wpadło do twojego feedu 🍴",
        body: `${handle} zapisał_a ${place}. teraz już wiesz.`,
      },
      {
        title: "wpadł nowy crumb 🍞",
        body: `${handle} właśnie dodał_a ${place}.`,
      },
      {
        title: `${handle} zostawił_a ślad 🍞 idź za nim`,
        body: `${place} właśnie zostało zapisane.`,
      },
    ]);
  }
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
  language?: NotificationLanguage;
}): CopyPair {
  const name = clean(params.authorName, "someone");
  const handle = clean(params.username, "@someone");
  const place = clean(params.placeName);
  if (params.language === "pl") {
    return pickVariant(params.seed, [
      {
        title: `${handle} oznaczył_cię w poście`,
        body: place ? `${name} oznaczył_cię w ${place}.` : `${name} oznaczył_cię w czymś nowym.`,
      },
      {
        title: "właśnie ktoś cię oznaczył 👀",
        body: `${handle} wspomniał_cię na crumbz.`,
      },
      {
        title: `${name} dodał_cię do opisu`,
        body: place ? `${place} też jest w tym poście.` : "otwórz post i zobacz, co napisał_a.",
      },
    ]);
  }

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
  language?: NotificationLanguage;
}): CopyPair {
  const title = clean(params.title, "something new is live");
  const body = clean(params.body);
  const cta = slugToDisplay(params.cta, "live now");
  const postType = clean(params.postType, "drop");
  if (params.language === "pl") {
    return pickVariant(params.seed, [
      {
        title,
        body: body || `${cta}. otwórz teraz crumbz.`,
      },
      {
        title: `${title} jest już live`,
        body: body || `${postType} już jest. wpadaj teraz.`,
      },
      {
        title: `nie przegap ${title.toLowerCase()}`,
        body: body || `${cta}. czeka w crumbz.`,
      },
      {
        title: `${cta}. ${title}`,
        body: body || `otwórz crumbz i zobacz nowy ${postType}.`,
      },
    ]);
  }

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

export function buildFriendAcceptedNotification(acceptorName: string, username: string, seed: string, language: NotificationLanguage = "en"): CopyPair {
  const name = clean(acceptorName, "someone");
  const handle = clean(username, "someone");
  if (language === "pl") {
    return pickVariant(seed, [
      {
        title: "jesteście teraz znajomymi 🎉",
        body: `${name} zaakceptował_a twoje zaproszenie do circle.`,
      },
      {
        title: `${handle} dołączył_a do twojego circle`,
        body: "możecie teraz zobaczyć swoje miejsca.",
      },
      {
        title: "zaproszenie zaakceptowane",
        body: `${name} jest teraz w twoim circle.`,
      },
    ]);
  }
  return pickVariant(seed, [
    {
      title: "you're now friends 🎉",
      body: `${name} accepted your friend request.`,
    },
    {
      title: `${handle} joined your circle`,
      body: "you can now see each other's spots.",
    },
    {
      title: "friend request accepted",
      body: `${name} is now in your circle.`,
    },
  ]);
}

export function buildAnnouncementNotification(params: { title: string; body: string; seed: string; language?: NotificationLanguage }): CopyPair {
  const title = clean(params.title, "forget google. open crumbz.");
  const body = clean(params.body, "something worth opening just landed.");
  if (params.language === "pl") {
    const defaultTitle = "zapomnij o google. otwórz crumbz.";
    return pickVariant(params.seed, [
      {
        title: clean(params.title, defaultTitle),
        body: clean(params.body, "właśnie wpadło coś, co warto otworzyć."),
      },
      {
        title: defaultTitle,
        body: clean(params.body, "właśnie wpadło coś, co warto otworzyć."),
      },
      {
        title: clean(params.title, defaultTitle) === defaultTitle ? defaultTitle : `${clean(params.title, defaultTitle)} jest już live`,
        body: clean(params.body, "właśnie wpadło coś, co warto otworzyć."),
      },
    ]);
  }

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

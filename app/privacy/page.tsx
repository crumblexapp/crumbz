"use client";

const sections = [
  {
    title: "1. who we are",
    body: [
      "crumbz is operated by crumble app co. this policy explains how we collect, use, store, share, and protect personal data when you use the crumbz app and website.",
      "for privacy questions, account deletion, or data requests, contact us at crumbleappco@gmail.com.",
    ],
  },
  {
    title: "2. data we collect",
    body: [
      "account and profile data: name, username, email address, login provider, profile photo, city, university or school, language, account settings, and notification preferences.",
      "content data: posts, captions, comments, likes, saves, shares, ratings, uploaded photos or videos, tagged places, and other information you choose to add.",
      "location and map data: approximate city, chosen map city, saved food spots, place searches, venue details, and location data if you give device permission.",
      "social data: friends, followers, following, friend overlap, referrals, creator status, and interactions with other users.",
      "device and usage data: device type, browser or app version, operating system, IP address, crash logs, performance data, app events, notification tokens, and security logs.",
    ],
  },
  {
    title: "3. how we use data",
    body: [
      "we use data to create and secure accounts, show the feed, personalize city and food recommendations, display maps and saved places, process likes and comments, send notifications, improve performance, prevent spam or abuse, provide support, and understand app analytics.",
      "we only request device permissions such as location, photos, camera, or notifications when that feature needs it. you can change those permissions in your device settings.",
    ],
  },
  {
    title: "4. legal bases for gdpr",
    body: [
      "for users in the eu, eea, uk, and poland, we process personal data under gdpr legal bases including contract, consent, legitimate interests, and legal obligations.",
      "examples: account data is needed to provide the service, location/photo/notification permissions depend on your consent, analytics and safety processing may rely on legitimate interests, and records may be kept when required by law.",
    ],
  },
  {
    title: "5. who we share data with",
    body: [
      "we do not sell your personal information.",
      "we may share limited data with service providers that help operate crumbz, including supabase for authentication, database, and storage; google maps and places for maps and venue search; google or apple sign-in if you use those login options; vercel or similar hosting services; push notification services such as apple push notification service and firebase cloud messaging; analytics, monitoring, and security providers; and legal authorities if required by law.",
      "these providers may process data only for the services they provide to us and must protect it appropriately.",
    ],
  },
  {
    title: "6. cookies and tracking",
    body: [
      "crumbz may use local storage, indexeddb, service workers, and similar browser or app storage to keep you signed in, cache feed data, remember language/city preferences, improve loading speed, and support notifications.",
      "we do not use third-party advertising cookies, sell data, or use cross-app tracking for targeted advertising. if this changes, we will update this policy and request consent where required.",
    ],
  },
  {
    title: "7. how long we store data",
    body: [
      "we keep account data while your account is active. posts, photos, comments, likes, saves, and social activity are kept until you delete them, delete your account, or we remove them under our terms.",
      "backup, security, and audit records may remain for a limited period after deletion where needed for safety, legal compliance, fraud prevention, or technical recovery.",
    ],
  },
  {
    title: "8. your rights",
    body: [
      "depending on where you live, you may have the right to access your data, correct it, delete it, restrict or object to processing, withdraw consent, receive a portable copy, and complain to your local data protection authority.",
      "to delete your account or request data deletion, email crumbleappco@gmail.com from the email connected to your crumbz account. we may need to verify your identity before completing the request.",
    ],
  },
  {
    title: "9. children and age limits",
    body: [
      "crumbz is not intended for children under 13. in the eu, eea, uk, or places with higher digital consent rules, you must be at least 16 or have valid parent or guardian consent if local law allows a lower age.",
    ],
  },
  {
    title: "10. security and international transfers",
    body: [
      "we use reasonable technical and organizational safeguards to protect data, but no online service is completely risk-free.",
      "some providers may process data outside your country. when personal data is transferred internationally, we rely on appropriate safeguards where required by law.",
    ],
  },
  {
    title: "11. changes to this policy",
    body: [
      "we may update this privacy policy as crumbz changes. if the changes are important, we will make reasonable efforts to notify users in the app or by email.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 py-8 text-[#2C1A0E]">
      <article className="mx-auto max-w-3xl space-y-7 font-[family-name:var(--font-manrope)]">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-[#B56D19]">crumbz</p>
          <h1 className="font-[family-name:var(--font-young-serif)] text-4xl leading-none sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="text-sm leading-7 text-[#6c7289]">Last updated May 2026. Effective May 2026.</p>
          <p className="leading-7">
            this policy is written for the crumbz mobile app, web app, and app store submission. it is meant to be clear
            about what we collect, why we use it, who helps us process it, and how users can control their data.
          </p>
        </header>

        {sections.map((section) => (
          <section key={section.title} className="space-y-3 border-t border-[#f2dfbd] pt-6">
            <h2 className="text-xl font-extrabold lowercase text-[#2C1A0E]">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="leading-7 text-[#4b4558]">
                {paragraph.includes("crumbleappco@gmail.com") ? (
                  <>
                    {paragraph.split("crumbleappco@gmail.com")[0]}
                    <a className="font-semibold text-[#B56D19] underline" href="mailto:crumbleappco@gmail.com">
                      crumbleappco@gmail.com
                    </a>
                    {paragraph.split("crumbleappco@gmail.com")[1]}
                  </>
                ) : (
                  paragraph
                )}
              </p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}

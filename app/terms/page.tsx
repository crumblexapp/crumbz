"use client";

const sections = [
  {
    title: "1. who can use crumbz",
    body: [
      "you must be at least 13 years old to use crumbz. if you live in the eu, eea, uk, or another place with a higher digital consent age, you must be at least 16 or have valid parent or guardian consent where local law allows it.",
      "you must provide accurate account information and keep your login secure. you are responsible for activity on your account.",
    ],
  },
  {
    title: "2. what you can and cannot post",
    body: [
      "you may post food, cafe, restaurant, bakery, school, city, and social content that you have the right to share.",
      "you may not post illegal content, harassment, hate, threats, sexual content involving minors, private information without permission, spam, scams, fake engagement, malware, copyright-infringing content, or anything that could harm users, venues, or crumbz.",
    ],
  },
  {
    title: "3. who owns user content",
    body: [
      "you keep ownership of the photos, videos, captions, comments, and other content you post.",
      "by posting content, you give crumbz a worldwide, non-exclusive, royalty-free license to host, store, display, reproduce, resize, translate, moderate, promote, and distribute that content inside crumbz and related app marketing. this license ends when your content is deleted, except where copies are needed for backups, safety, legal records, or content already shared by others.",
    ],
  },
  {
    title: "4. social features and public activity",
    body: [
      "your username, profile, posts, likes, comments, saves, city, friend overlap, and creator activity may be visible to other users depending on the feature and your settings.",
      "do not rely on crumbz as private storage. anything you post may be seen, saved, shared, or reported by other people.",
    ],
  },
  {
    title: "5. maps, places, and restaurants",
    body: [
      "crumbz may show venues, maps, recommendations, and user opinions. we do not own or operate the restaurants, cafes, bakeries, or food spots shown in the app.",
      "we are not responsible for restaurant quality, availability, pricing, hygiene, opening hours, menu accuracy, allergies, bookings, travel, or user experiences at third-party venues.",
    ],
  },
  {
    title: "6. notifications",
    body: [
      "if you allow notifications, crumbz may send account, social, feed, friend, creator, reward, safety, and product updates. you can turn notifications off in your device settings or app settings where available.",
    ],
  },
  {
    title: "7. suspension and removal",
    body: [
      "we may remove content, limit features, suspend accounts, ban accounts, or refuse service if we believe someone broke these terms, created risk for other users, abused the app, or caused legal or security concerns.",
      "we may also remove inactive, fake, duplicate, automated, or abusive accounts.",
    ],
  },
  {
    title: "8. third-party services",
    body: [
      "crumbz may use third-party services such as supabase, google maps, google sign-in, apple sign-in, push notification providers, hosting providers, analytics, and app store platforms.",
      "those services may have their own terms and privacy practices. crumbz is not responsible for third-party services we do not control.",
    ],
  },
  {
    title: "9. prohibited technical use",
    body: [
      "you may not scrape, reverse engineer, overload, attack, bypass security, automate fake activity, copy private data, interfere with the app, or use crumbz to build a competing database without permission.",
    ],
  },
  {
    title: "10. disclaimers",
    body: [
      "crumbz is provided as is and as available. we do not promise that the app will always be available, error-free, secure, or that every recommendation will be accurate.",
      "some features may change, pause, or be removed as we improve the app.",
    ],
  },
  {
    title: "11. limitation of liability",
    body: [
      "to the fullest extent allowed by law, crumbz and its operators are not liable for indirect, incidental, special, consequential, punitive, or lost-profit damages, or for issues caused by restaurants, venues, other users, third-party services, network problems, or device/app store platforms.",
      "nothing in these terms limits rights that cannot legally be limited, including mandatory consumer rights under applicable law.",
    ],
  },
  {
    title: "12. changes to these terms",
    body: [
      "we may update these terms as crumbz changes. if changes are important, we will make reasonable efforts to notify users in the app or by email. continuing to use crumbz after updates means you accept the new terms.",
    ],
  },
  {
    title: "13. governing law",
    body: [
      "these terms are governed by the laws of poland, except where mandatory consumer protection laws in your country give you additional rights.",
      "where legally permitted, disputes will be handled by the competent courts in poland.",
    ],
  },
  {
    title: "14. contact",
    body: ["for support, legal, or terms questions, contact crumbleappco@gmail.com."],
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 py-8 text-[#2C1A0E]">
      <article className="mx-auto max-w-3xl space-y-7 font-[family-name:var(--font-manrope)]">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-[#B56D19]">crumbz</p>
          <h1 className="font-[family-name:var(--font-young-serif)] text-4xl leading-none sm:text-5xl">
            Terms of Use
          </h1>
          <p className="text-sm leading-7 text-[#6c7289]">Last updated May 2026. Effective May 2026.</p>
          <p className="leading-7">
            these terms explain the rules for using crumbz. by creating an account, opening the app, or using the service,
            you agree to follow them.
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

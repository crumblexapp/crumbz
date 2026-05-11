"use client";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 py-8 text-[#2C1A0E]">
      <article className="mx-auto max-w-2xl space-y-5 font-[family-name:var(--font-manrope)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#B56D19]">crumbz</p>
        <h1 className="font-[family-name:var(--font-young-serif)] text-4xl leading-none">Privacy Policy</h1>
        <p className="text-sm leading-7 text-[#6c7289]">Last updated May 2026.</p>
        <p className="leading-7">
          Crumbz uses account, profile, post, interaction, location, notification, and device information to run the app,
          show your feed, help friends discover food spots, and keep the service safe.
        </p>
        <p className="leading-7">
          We use trusted service providers for hosting, authentication, maps, storage, analytics, and notifications. We do
          not sell personal information.
        </p>
        <p className="leading-7">
          You can contact us at{" "}
          <a className="font-semibold underline" href="mailto:crumbleappco@gmail.com">
            crumbleappco@gmail.com
          </a>{" "}
          to request access, correction, deletion, or export of your data.
        </p>
      </article>
    </main>
  );
}

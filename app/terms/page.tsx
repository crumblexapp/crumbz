"use client";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 py-8 text-[#2C1A0E]">
      <article className="mx-auto max-w-2xl space-y-5 font-[family-name:var(--font-manrope)]">
        <p className="text-xs uppercase tracking-[0.28em] text-[#B56D19]">crumbz</p>
        <h1 className="font-[family-name:var(--font-young-serif)] text-4xl leading-none">Terms of Use</h1>
        <p className="text-sm leading-7 text-[#6c7289]">Last updated May 2026.</p>
        <p className="leading-7">
          By using Crumbz, you agree to use the app respectfully, keep your account information accurate, and only post
          content you have the right to share.
        </p>
        <p className="leading-7">
          Crumbz may remove content, restrict accounts, or update the service when needed to protect users, partners, or
          the app experience.
        </p>
        <p className="leading-7">
          For support or legal questions, contact{" "}
          <a className="font-semibold underline" href="mailto:crumbleappco@gmail.com">
            crumbleappco@gmail.com
          </a>.
        </p>
      </article>
    </main>
  );
}

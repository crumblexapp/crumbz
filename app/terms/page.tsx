import { readFileSync } from "fs";
import path from "path";

export default function TermsPage() {
  const content = readFileSync(path.join(process.cwd(), "CRUMBZ_TERMS_OF_USE.md"), "utf8");

  return (
    <main className="min-h-screen bg-[#fffaf2] px-5 py-8 text-[#2C1A0E]">
      <article className="mx-auto max-w-4xl space-y-6 font-[family-name:var(--font-manrope)]">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.28em] text-[#B56D19]">crumbz</p>
          <h1 className="font-[family-name:var(--font-young-serif)] text-4xl leading-none sm:text-5xl">
            Terms of Use
          </h1>
          <p className="text-sm leading-7 text-[#6c7289]">
            The full current terms of use for Crumbz.
          </p>
        </header>
        <section className="rounded-[28px] border border-[#f2dfbd] bg-white p-5 shadow-[0_18px_50px_rgba(47,23,20,0.06)] sm:p-8">
          <pre className="whitespace-pre-wrap break-words font-[family-name:var(--font-manrope)] text-sm leading-7 text-[#4b4558]">
            {content}
          </pre>
        </section>
      </article>
    </main>
  );
}

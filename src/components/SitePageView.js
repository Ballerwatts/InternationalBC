import Link from "next/link";
import RichText from "@/components/RichText";
import SponsorStrip from "@/components/SponsorStrip";

/** A carried-over content page: title, text, then anything page-specific. */
export default function SitePageView({ page, breadcrumb, children }) {
  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-14">
        {breadcrumb && (
          <Link href={breadcrumb.href} className="text-xs font-bold uppercase tracking-wide text-ibc-blue hover:underline">
            ← {breadcrumb.label}
          </Link>
        )}
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase text-ibc-blue">{page.title}</h1>
        <RichText text={page.body} className="mt-6" />
        {children}
      </article>
      <SponsorStrip />
    </>
  );
}

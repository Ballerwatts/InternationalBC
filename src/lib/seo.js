// Everything a public page needs to be found and shared: canonical URL,
// description, Open Graph and Twitter cards, and structured data.
//
// The site takes over www.intbbc.org and keeps WordPress's exact URLs
// (trailing slash included), so canonicals point at those same addresses —
// Google keeps the rankings it already gave them instead of re-learning
// new ones. SITE_URL can override the origin, e.g. for a staging copy.

export const SITE_URL = String(process.env.SITE_URL || "https://www.intbbc.org").replace(/\/+$/, "");

// The brand exactly as WordPress titled its pages ("The Club | International
// Geneva Basketball Club (IBBC)"), so migrated titles do not change.
export const BRAND = "International Geneva Basketball Club (IBBC)";

export const DEFAULT_DESCRIPTION =
  "International Geneva Basketball Club (IBBC) — a multi-lingual, multi-cultural basketball club in Geneva since 1951, with men's, women's and youth teams competing in the ACGBA and Swiss leagues.";

export const OG_IMAGE = "/icons/icon-512.png";

/** Absolute URL for a site path. */
export function absolute(path = "/") {
  return new URL(path, SITE_URL + "/").href;
}

/**
 * Metadata for one public page. `path` is the canonical path, with the
 * trailing slash WordPress used.
 */
export function pageMetadata({ title, description = DEFAULT_DESCRIPTION, path, image, type = "website" }) {
  const url = absolute(path);
  const img = absolute(image || OG_IMAGE);
  const fullTitle = title ? `${title} | ${BRAND}` : BRAND;
  return {
    title: title ? { absolute: fullTitle } : { absolute: BRAND },
    description,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title: fullTitle,
      description,
      siteName: BRAND,
      locale: "en_GB",
      images: [{ url: img, alt: title || BRAND }],
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: fullTitle, description, images: [img] },
  };
}

/** Trim free text to a search-snippet length without cutting a word. */
export function snippet(text, max = 155) {
  const clean = String(text || "").replace(/\[img:[^\]]*\]/g, "").replace(/^#+\s*/gm, "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max - 1)).replace(/[,;:.\-–—]+$/, "") + "…";
}

/** <script type="application/ld+json"> props for a structured-data object. */
export function jsonLd(data) {
  return {
    type: "application/ld+json",
    // Escaped so a "</script>" inside club text cannot end the tag early.
    dangerouslySetInnerHTML: { __html: JSON.stringify(data).replace(/</g, "\\u003c") },
  };
}

/** The club as an organisation — used on the home page and as parent elsewhere. */
export function clubJsonLd({ gyms = [] } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsOrganization",
    "@id": absolute("/#club"),
    name: BRAND,
    alternateName: ["IBBC", "International Basketball Club Geneva", "International Geneva BBC"],
    url: absolute("/"),
    logo: absolute("/icons/icon-512.png"),
    sport: "Basketball",
    foundingDate: "1951",
    email: "internationalbbcgeneve@gmail.com",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Chemin Eugène-Rigot 2, Case postale 136",
      postalCode: "1211",
      addressLocality: "Genève",
      addressCountry: "CH",
    },
    location: gyms
      .filter((g) => g.address)
      .map((g) => ({ "@type": "SportsActivityLocation", name: g.name, address: g.address })),
  };
}

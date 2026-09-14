// What to do with an address from the old WordPress site. Plain function, no
// Next.js imports, so it can be tested directly; src/middleware.js acts on it.

// ?page_id=N links are still in Google's index from before WordPress used
// pretty URLs — each goes to the page it always meant.
export const PAGE_IDS = {
  43: "/",
  2: "/theclub/",
  29: "/theclub/clubhistory/",
  34: "/theclub/rulesfees/",
  26: "/committee/",
  11: "/gymnasium/",
  13: "/teams/",
  18: "/teams/ibbc-men/",
  20: "/teams/ibbc-femmes/",
};

// WordPress machinery with no equivalent here.
const GONE = /^\/(feed|comments\/feed|xmlrpc\.php|wp-admin|wp-login\.php|wp-json|wp-includes|wp-sitemap\.xml)(\/|$)/;

/**
 * @returns {{ redirect: string } | { gone: true } | null}
 */
export function resolveLegacyUrl(pathname, searchParams) {
  const pageId = searchParams.get("page_id");
  if (pathname === "/" && pageId) return { redirect: PAGE_IDS[pageId] || "/" };
  if (GONE.test(pathname)) return { gone: true };
  return null;
}

import SitePageView from "@/components/SitePageView";
import { requireSitePage, sitePageMetadata } from "@/lib/site-pages";

export const dynamic = "force-dynamic";
const PATH = "/committee/";

export function generateMetadata() {
  return sitePageMetadata(PATH);
}

export default function Page() {
  return <SitePageView page={requireSitePage(PATH)} breadcrumb={{ href: "/theclub/", label: "The Club" }} />;
}

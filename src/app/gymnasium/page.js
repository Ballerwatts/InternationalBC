import SitePageView from "@/components/SitePageView";
import GymCard from "@/components/GymCard";
import { getGymsWithTeams } from "@/lib/db";
import { requireSitePage, sitePageMetadata } from "@/lib/site-pages";

export const dynamic = "force-dynamic";
const PATH = "/gymnasium/";

export function generateMetadata() {
  return sitePageMetadata(PATH);
}

// The carried-over directions, then every hall live from the gyms table —
// so a new hall added in the admin appears here without editing this page.
export default function Page() {
  const gyms = getGymsWithTeams();
  return (
    <SitePageView page={requireSitePage(PATH)} breadcrumb={{ href: "/theclub/", label: "The Club" }}>
      {gyms.length > 0 && (
        <section className="mt-10 space-y-4">
          <h2 className="font-display text-2xl font-bold uppercase text-ibc-blue">All our gyms</h2>
          {gyms.map((gym) => (
            <GymCard key={gym.id} gym={gym} />
          ))}
        </section>
      )}
    </SitePageView>
  );
}

// Next's native manifest route — serves /manifest.webmanifest, no static
// file to keep in sync with the metadata above it.
//
// This is what makes the site installable: Chrome/Android offers "Install
// app", and iOS Safari's Share → Add to Home Screen gets a real crest
// instead of a screenshot of the page.

export default function manifest() {
  return {
    name: "International Basketball Club Genève",
    short_name: "IBBC",
    description:
      "Teams, calendar, results and team space for International Basketball Club Genève.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    // ≈ PMS 2143 C, the crest blue — this tints the Android status bar and
    // the splash screen, so it has to match globals.css.
    theme_color: "#2d3194",
    lang: "en",
    categories: ["sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops an icon to whatever shape the launcher uses, so the
      // maskable copy carries a blue safe zone around the crest.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Calendar", short_name: "Calendar", url: "/calendrier" },
      { name: "Team space", short_name: "Team", url: "/team" },
    ],
  };
}

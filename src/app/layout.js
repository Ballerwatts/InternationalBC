import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import InstallAppPrompt from "@/components/InstallAppPrompt";
import { headers } from "next/headers";
import { SITE_URL, BRAND, DEFAULT_DESCRIPTION, OG_IMAGE } from "@/lib/seo";

// Note: intentionally using system font stacks (defined in globals.css)
// instead of next/font/google — this keeps the production build fully
// offline-capable (no fetch to fonts.googleapis.com required at build time),
// which matters on locked-down CI/build environments. Swap in next/font or
// self-hosted font files any time; see README "Fonts" section.

// The footer reads the club's social links out of `settings`, so the root
// layout must not be statically generated at build time — otherwise a URL
// pasted in the admin would only appear after the next deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  // The site answers on internationalbc.fly.dev as well as www.intbbc.org.
  // Only the real domain may be indexed — two copies of every page would
  // split the rankings the migration exists to keep.
  const host = headers().get("host") || "";
  const isCanonicalHost = !/\.fly\.dev$|^localhost|^127\./.test(host);
  return {
    ...baseMetadata,
    ...(isCanonicalHost ? {} : { robots: { index: false, follow: false } }),
  };
}

const baseMetadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: BRAND, template: `%s | ${BRAND}` },
  description: DEFAULT_DESCRIPTION,
  openGraph: { siteName: BRAND, locale: "en_GB", type: "website", images: [OG_IMAGE] },
  twitter: { card: "summary" },
  icons: {
    icon: "/favicon.ico",
    apple: "/icons/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  // Installed on an iPhone, the site runs without Safari's chrome and needs
  // its own title and status-bar treatment.
  appleWebApp: {
    capable: true,
    title: "IBBC",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  // Must match theme_color in manifest.js — this is the Android status bar.
  themeColor: "#2d3194",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-ibc-ink">
        <LanguageProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <ServiceWorkerRegistration />
          <InstallAppPrompt />
        </LanguageProvider>
      </body>
    </html>
  );
}

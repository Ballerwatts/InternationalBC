import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/components/LanguageProvider";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

// Note: intentionally using system font stacks (defined in globals.css)
// instead of next/font/google — this keeps the production build fully
// offline-capable (no fetch to fonts.googleapis.com required at build time),
// which matters on locked-down CI/build environments. Swap in next/font or
// self-hosted font files any time; see README "Fonts" section.

// The footer reads the club's social links out of `settings`, so the root
// layout must not be statically generated at build time — otherwise a URL
// pasted in the admin would only appear after the next deploy.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "International Basketball Club Geneva (IBBC)",
  description:
    "Official site of International Basketball Club Geneva (IBBC) — four squads competing across the Geneva basketball leagues (A.C.G.B.A.). Teams, calendar, tactics, and club life.",
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
        </LanguageProvider>
      </body>
    </html>
  );
}

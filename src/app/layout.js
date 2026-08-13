import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

// Note: intentionally using system font stacks (defined in globals.css)
// instead of next/font/google — this keeps the production build fully
// offline-capable (no fetch to fonts.googleapis.com required at build time),
// which matters on locked-down CI/build environments. Swap in next/font or
// self-hosted font files any time; see README "Fonts" section.

export const metadata = {
  title: "International Basketball Club Genève",
  description:
    "Site officiel de l'International Basketball Club Genève — 2ème Ligue Cantonale (A.C.G.B.A.). Équipe, calendrier des entraînements et matches, tactiques, et vie du club.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-white text-ibc-ink">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

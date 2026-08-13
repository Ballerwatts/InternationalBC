import Link from "next/link";
import Image from "next/image";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/equipe", label: "Teams" },
  { href: "/calendrier", label: "Calendar" },
  { href: "/club", label: "The Club" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b-4 border-ibc-accent bg-ibc-blue text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow">
            <Image
              src="/logo.png"
              alt="Logo International Basketball Club Genève"
              width={40}
              height={40}
              className="h-full w-full rounded-full object-cover"
            />
          </span>
          <span className="font-display text-lg font-bold uppercase leading-tight tracking-wide sm:text-xl">
            International Basketball
            <span className="block text-xs font-semibold tracking-[0.2em] text-ibc-accent sm:text-sm">
              Club Genève
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-semibold uppercase tracking-wide md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 transition hover:bg-white/10 hover:text-ibc-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="hidden shrink-0 rounded-full bg-ibc-accent px-4 py-2 text-sm font-bold uppercase tracking-wide text-ibc-ink transition hover:brightness-95 md:inline-block"
        >
          Team Login
        </Link>
      </div>
      <MobileNav />
    </header>
  );
}

function MobileNav() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 border-t border-white/10 px-2 py-2 text-xs font-semibold uppercase tracking-wide md:hidden">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-md px-2.5 py-1.5 transition hover:bg-white/10 hover:text-ibc-accent"
        >
          {item.label}
        </Link>
      ))}
      <Link
        href="/login"
        className="rounded-full bg-ibc-accent px-3 py-1.5 font-bold text-ibc-ink"
      >
        Login
      </Link>
    </div>
  );
}

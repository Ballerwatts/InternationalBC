"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

// Simple auto-rotating 3-slide hero: (1) club headline/team photo, (2) the
// latest announcement (if any), (3) sponsors (if any). Falls back to just
// the headline slide if there's no announcement/sponsor yet.
export default function HeroSlider({ settings, announcement, sponsors, heroPhotos = [] }) {
  const slides = ["hero"];
  if (announcement) slides.push("announcement");
  if (sponsors && sponsors.length > 0) slides.push("sponsors");
  heroPhotos.forEach((p) => slides.push({ type: "photo", photo: p }));

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const current = slides[index] || "hero";
  const currentType = typeof current === "string" ? current : current.type;

  return (
    <section className="bg-court relative overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0">
        <CourtBackground />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ibc-blue-dark/60 via-ibc-blue/70 to-ibc-blue-dark/80" />

      <div className="relative mx-auto min-h-[420px] max-w-6xl px-4 py-16 md:min-h-[480px] md:py-24">
        {currentType === "hero" && <HeroSlide settings={settings} />}
        {currentType === "announcement" && announcement && <AnnouncementSlide announcement={announcement} />}
        {currentType === "sponsors" && sponsors?.length > 0 && <SponsorsSlide sponsors={sponsors} />}
        {currentType === "photo" && <PhotoSlide photo={current.photo} />}
      </div>

      {slides.length > 1 && (
        <div className="relative z-10 flex justify-center gap-2 pb-6">
          {slides.map((s, i) => (
            <button
              key={typeof s === "string" ? s : `photo-${s.photo.id}`}
              onClick={() => setIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-ibc-accent" : "w-2 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function HeroSlide({ settings }) {
  return (
    <div className="flex flex-col-reverse items-center gap-10 md:flex-row">
      <div className="max-w-xl text-center md:text-left">
        <p className="mb-3 inline-block rounded-full bg-ibc-accent px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-ibc-ink">
          {settings.hero_subheadline}
        </p>
        <h1 className="font-display text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-6xl">
          {settings.hero_headline}
        </h1>
        <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">{settings.hero_body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
          <Link
            href="/calendrier"
            className="rounded-full bg-ibc-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-ibc-ink shadow-lg transition hover:brightness-95"
          >
            View calendar
          </Link>
          <Link
            href="/teams/"
            className="rounded-full border-2 border-white/70 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-white hover:text-ibc-blue"
          >
            Meet the teams
          </Link>
        </div>
      </div>
      <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border-4 border-ibc-accent bg-ibc-blue-dark shadow-2xl">
        {settings.team_photo_data_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={settings.team_photo_data_url}
            alt="International Basketball Club Geneva team photo"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
            <Image src="/logo.png" alt="Logo" width={96} height={96} />
            <p className="text-sm">Team photo coming soon — add it from the admin area.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnnouncementSlide({ announcement }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
      <p className="mb-3 inline-block rounded-full bg-ibc-accent px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-ibc-ink">
        Latest announcement
      </p>
      {announcement.image_data_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={announcement.image_data_url}
          alt=""
          className="mb-4 max-h-40 w-auto rounded-lg border-2 border-white/30 object-cover"
        />
      )}
      <h1 className="font-display text-3xl font-extrabold uppercase leading-tight sm:text-4xl">
        {announcement.title}
      </h1>
      <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-white/85 sm:text-lg">
        {announcement.body}
      </p>
    </div>
  );
}

function SponsorsSlide({ sponsors }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center">
      <p className="mb-3 inline-block rounded-full bg-ibc-accent px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-ibc-ink">
        With thanks to our sponsors
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-center gap-8">
        {sponsors.map((s) => {
          const isMain = s.tier === "main";
          return (
            <div key={s.id} className="flex flex-col items-center gap-2">
              {s.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className={
                    isMain
                      ? "h-24 w-auto rounded bg-white/90 object-contain p-2"
                      : "h-8 w-auto rounded bg-white/90 object-contain p-1"
                  }
                />
              ) : (
                <span className={`font-display font-bold ${isMain ? "text-xl" : "text-sm"}`}>{s.name}</span>
              )}
              <span className="text-xs text-white/70">{s.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PhotoSlide({ photo }) {
  return (
    <div className="mx-auto flex h-full max-w-4xl items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.image_data_url}
        alt=""
        className="max-h-[340px] w-full rounded-2xl border-4 border-ibc-accent object-cover shadow-2xl md:max-h-[400px]"
      />
    </div>
  );
}

// Full basketball court background photo-illustration: wood floor tone +
// complete markings (both keys, both three-point arcs, free-throw circles,
// center circle, boundary) — used behind every hero slide. A dark gradient
// (see the sibling div above) sits on top so slide text stays legible.
function CourtBackground() {
  return (
    <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      <defs>
        <linearGradient id="courtWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#b9803f" />
          <stop offset="50%" stopColor="#c99552" />
          <stop offset="100%" stopColor="#a8712f" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="800" height="400" fill="url(#courtWood)" />
      {/* plank lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <line
          key={i}
          x1={i * 40}
          y1="0"
          x2={i * 40}
          y2="400"
          stroke="#00000014"
          strokeWidth="1"
        />
      ))}
      <g fill="none" stroke="white" strokeWidth="4" opacity="0.9">
        <rect x="10" y="10" width="780" height="380" />
        <circle cx="400" cy="200" r="60" />
        <line x1="400" y1="10" x2="400" y2="390" />
        {/* left key + arc */}
        <rect x="10" y="140" width="140" height="120" />
        <circle cx="150" cy="200" r="60" />
        <path d="M 10,60 A 260,260 0 0 0 10,340" />
        {/* right key + arc */}
        <rect x="650" y="140" width="140" height="120" />
        <circle cx="650" cy="200" r="60" />
        <path d="M 790,60 A 260,260 0 0 1 790,340" />
      </g>
    </svg>
  );
}

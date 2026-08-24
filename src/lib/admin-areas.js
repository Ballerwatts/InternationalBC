// Which admin sections exist, what lives in each, and the pure helpers for
// deciding whether a given account may see one.
//
// IMPORTANT: this module must stay free of any `node:sqlite` import — it is
// pulled into client components (AdminNav, the accounts screen). Anything
// that needs the database lives in `src/lib/access.js` instead.

export const AREA_MARKETING = "marketing";
export const AREA_ORGANISATION = "organisation";
export const AREA_SEASON = "season";
export const AREA_FINANCE = "finance";

/** The four groups shown in the admin sidebar, in display order. */
export const ADMIN_GROUPS = [
  {
    key: AREA_MARKETING,
    label: "Marketing",
    hint: "Public-facing content: what a visitor sees on the website.",
    items: [
      { href: "/admin/hero", label: "Hero" },
      { href: "/admin/announcements", label: "Announcements" },
      { href: "/admin/sponsors", label: "Sponsors" },
      { href: "/admin/gym", label: "Gym" },
      { href: "/admin/teams", label: "Teams" },
      { href: "/admin/newsletter", label: "Newsletter" },
      { href: "/admin/emails", label: "Email log" },
      // The Instagram gallery pulls in a third-party embed script, so it
      // stays locked to the super-admin even for a marketing delegate.
      { href: "/admin/social", label: "Social & Instagram", superAdminOnly: true },
    ],
  },
  {
    key: AREA_ORGANISATION,
    label: "Organisation",
    hint: "Who is in the club and when the club is on the floor.",
    items: [
      { href: "/admin/players", label: "Members" },
      { href: "/admin/schedule", label: "Calendar" },
      // Account management is how someone would grant themselves any other
      // area, so it is never delegated — super-admin only, always.
      { href: "/admin/users", label: "Accounts", superAdminOnly: true },
    ],
  },
  {
    key: AREA_SEASON,
    label: "Season planning",
    hint: "The coaching side: availability, tactics, practice board, register.",
    items: [
      // Availability lives here, not under Organisation: it is the squad's
      // week-to-week planning, and it is the one screen every player needs.
      { href: "/team/availability", label: "Availability" },
      { href: "/team/tactiques", label: "Tactics" },
      { href: "/team/practice-board", label: "Practice board" },
      { href: "/team/appel", label: "Match register" },
      { href: "/team/calendar", label: "Team calendar" },
    ],
  },
  {
    key: AREA_FINANCE,
    label: "Finance",
    hint: "Budget, dues and everything with a number in CHF.",
    items: [{ href: "/admin/budget", label: "Budget" }],
  },
];

export const ALL_AREAS = ADMIN_GROUPS.map((g) => g.key);

/**
 * `users.admin_areas` is stored as a comma-separated list ("marketing,finance").
 * Empty / null / garbage all come back as an empty array rather than throwing.
 */
export function parseAreas(value) {
  if (Array.isArray(value)) return value.filter((a) => ALL_AREAS.includes(a));
  if (typeof value !== "string" || !value.trim()) return [];
  return value
    .split(",")
    .map((a) => a.trim())
    .filter((a) => ALL_AREAS.includes(a));
}

export function serializeAreas(areas) {
  return parseAreas(areas).join(",");
}

/**
 * The single source of truth for "may this account open this section?".
 * A super-admin always passes; anyone else needs the area explicitly granted.
 */
export function accountHasArea(account, area) {
  if (!account) return false;
  if (account.role === "admin") return true;
  return parseAreas(account.admin_areas).includes(area);
}

/** May this account reach /admin at all? */
export function accountHasAnyArea(account) {
  if (!account) return false;
  if (account.role === "admin") return true;
  return parseAreas(account.admin_areas).length > 0;
}

/** The groups (with super-admin-only entries filtered out) this account may see. */
export function visibleGroups(account) {
  const isSuper = account?.role === "admin";
  return ADMIN_GROUPS.filter((g) => accountHasArea(account, g.key)).map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.superAdminOnly || isSuper),
  }));
}

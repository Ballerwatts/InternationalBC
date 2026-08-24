// Member contact details and administrative/financial fields must never
// reach a visitor who isn't logged in — not just "not displayed", but not
// serialised into the page at all. A Next.js server component that passes
// a full player row into a "use client" component embeds every column in
// the HTML payload, so hiding a field in JSX is not enough.
//
// Everything that leaves the server for a public page goes through here.

/** Columns a logged-out visitor must never receive. */
export const PRIVATE_PLAYER_FIELDS = [
  "email",
  "phone",
  "license_number",
  "custom_due_amount",
];

/** Returns a copy of a player row with the private columns removed. */
export function stripPrivatePlayerFields(player) {
  if (!player) return player;
  const out = { ...player };
  for (const f of PRIVATE_PLAYER_FIELDS) delete out[f];
  return out;
}

/**
 * @param {object[]} players rows from the players table
 * @param {boolean} canSeeContact true when the viewer is a logged-in member
 */
export function sanitizePlayers(players, canSeeContact) {
  if (canSeeContact) return players;
  return players.map(stripPrivatePlayerFields);
}

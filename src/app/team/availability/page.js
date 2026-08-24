"use client";

import AvailabilityBoard from "@/components/AvailabilityBoard";

// Availability and Team calendar are the same board — see
// components/AvailabilityBoard.js. Keeping two routes is deliberate (the
// club thinks in terms of "am I available" and "what's on"), but they read
// and write exactly the same data through the same component, so a mark
// made on one is the mark shown on the other. This page adds the season
// totals; the calendar doesn't.
export default function AvailabilityPage() {
  return (
    <AvailabilityBoard
      title="Availability"
      intro="Déclarez une absence d'un coup en haut de page, ou répondez séance par séance. Cliquez une séance pour voir qui vient, qui manque et qui est en absence déclarée. Tout ce que vous marquez ici apparaît immédiatement sur le Team calendar — c'est le même tableau."
      showTotals
    />
  );
}

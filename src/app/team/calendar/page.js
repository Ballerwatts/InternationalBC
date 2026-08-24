"use client";

import AvailabilityBoard from "@/components/AvailabilityBoard";

// The same board as /team/availability, by design — see that file and
// components/AvailabilityBoard.js. Two entry points, one set of data: a
// Présent clicked here is the Présent shown there, with no sync step
// because there is nothing to sync.
export default function TeamCalendarPage() {
  return (
    <AvailabilityBoard
      title="Team calendar"
      intro="Les entraînements, matchs et événements de votre équipe. Cliquez une séance pour dérouler l'effectif : qui est présent, qui est absent, qui n'a pas répondu et qui est en absence déclarée. Répondez directement — c'est le même tableau que la page Availability."
    />
  );
}

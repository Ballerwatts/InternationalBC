// Lightweight client-side i18n for the site's persistent chrome and page
// titles/labels (nav, footer, buttons, section headings). English is the
// default language; French is available as a toggle (see LanguageProvider).
//
// Note on scope: admin-entered content (hero text, club description,
// announcements) is stored as free text in the database and is shown as
// entered, in whichever language an admin typed it — this dictionary
// translates the site's built-in interface text, not editor-authored copy.
export const DICTIONARY = {
  "nav.home": { en: "Home", fr: "Accueil" },
  "nav.teams": { en: "Teams", fr: "Équipes" },
  "nav.members": { en: "Members", fr: "Membres" },
  "nav.calendar": { en: "Calendar", fr: "Calendrier" },
  "nav.club": { en: "The Club", fr: "Le Club" },
  "nav.teamLogin": { en: "Team Login", fr: "Connexion" },
  "nav.login": { en: "Login", fr: "Connexion" },

  "home.viewCalendar": { en: "View calendar", fr: "Voir le calendrier" },
  "home.meetTeams": { en: "Meet the teams", fr: "Découvrir les équipes" },
  "home.announcements": { en: "Announcements", fr: "Annonces" },
  "home.upcoming": { en: "Upcoming", fr: "Prochains rendez-vous" },
  "home.noUpcoming": { en: "No upcoming events right now.", fr: "Aucun événement à venir pour le moment." },
  "home.addToCalendar": { en: "+ Add to calendar", fr: "+ Agenda" },
  "home.fullCalendar": { en: "Full calendar", fr: "Calendrier complet" },
  "home.subscribeCalendar": { en: "Subscribe to calendar", fr: "S'abonner au calendrier" },
  "home.practiceLocation": { en: "Practice location", fr: "Lieu d'entraînement" },
  "home.club": { en: "The Club", fr: "Le Club" },
  "home.topScorers": { en: "Top scorers", fr: "Meilleurs marqueurs" },
  "home.seeAllTeams": { en: "See all teams →", fr: "Voir toutes les équipes →" },
  "home.sponsors": { en: "Our Sponsors", fr: "Nos Sponsors" },

  "teams.title": { en: "Teams", fr: "Équipes" },
  "teams.searchMembers": { en: "Search all members →", fr: "Rechercher tous les membres →" },
  "teams.rosterSoon": { en: "Roster coming soon.", fr: "Effectif à venir." },

  "club.title": { en: "The Club", fr: "Le Club" },
  "club.practices": { en: "Practices", fr: "Entraînements" },
  "club.games": { en: "Games", fr: "Matches" },
  "club.contact": { en: "Contact", fr: "Contact" },

  "members.title": { en: "Players & Members", fr: "Joueurs & Membres" },
  "members.subtitle": {
    en: "Browse every player and member across IBBC's four squads. Search by name or team.",
    fr: "Parcourez tous les joueurs et membres des quatre équipes de l'IBBC. Recherchez par nom ou par équipe.",
  },
  "members.searchPlaceholder": { en: "Search by name, team, or position…", fr: "Rechercher par nom, équipe ou poste…" },
  "members.allTeams": { en: "All teams", fr: "Toutes les équipes" },
  "members.noMatch": { en: "No members match your search.", fr: "Aucun membre ne correspond à votre recherche." },

  "profile.back": { en: "← Back to Players & Members", fr: "← Retour aux Joueurs & Membres" },
  "profile.contactRestricted": {
    en: "Contact details are visible to logged-in club members only.",
    fr: "Les coordonnées sont visibles uniquement pour les membres connectés du club.",
  },
  "profile.signIn": { en: "Sign in", fr: "Se connecter" },
  "profile.toView": { en: "to view.", fr: "pour les voir." },

  "footer.practiceLocation": { en: "Practice location", fr: "Lieu d'entraînement" },
  "footer.officialContact": { en: "Official contact", fr: "Contact officiel" },
};

export function translate(lang, key) {
  const entry = DICTIONARY[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

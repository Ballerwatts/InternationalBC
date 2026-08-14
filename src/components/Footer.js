export default function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-ibc-accent bg-ibc-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-wide text-ibc-accent">
            International Basketball Club Geneva
          </p>
          <p className="mt-1 max-w-sm text-white/70">
            IBBC — four squads (U18M, NL1, 3LCM, 2LCM). Practices Monday and Thursday,
            8pm–10pm.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ibc-accent">Practice location</p>
          <p className="text-white/70">Chemin du Domaine-Patry 1</p>
          <p className="text-white/70">1224 Chêne-Bougeries, Genève</p>
        </div>
        <div>
          <p className="font-semibold text-ibc-accent">Official contact</p>
          <p className="text-white/70">International Basketball Club Geneva</p>
          <p className="text-white/70">C/O Souhail BELHADJ, Club President</p>
          <p className="text-white/70">Chemin Eugène-Rigot 2, Case postale 136, 1211 Genève 21</p>
          <a
            href="mailto:internationalbbcgeneve@gmail.com"
            className="text-white/70 hover:text-ibc-accent hover:underline"
          >
            internationalbbcgeneve@gmail.com
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/50">
        © {new Date().getFullYear()} International Basketball Club Geneva (IBBC)
      </div>
    </footer>
  );
}

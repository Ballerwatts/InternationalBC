export default function Footer() {
  return (
    <footer className="mt-auto border-t-4 border-mbc-yellow bg-mbc-ink text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-display text-lg font-bold uppercase tracking-wide text-mbc-yellow">
            Maccabi Basketball Club Genève
          </p>
          <p className="mt-1 max-w-sm text-white/70">
            2ème Ligue Cantonale — A.C.G.B.A. Entraînements le lundi et le jeudi,
            20h–22h, à l&apos;École de commerce Raymond-Uldry.
          </p>
        </div>
        <div>
          <p className="font-semibold text-mbc-yellow">Lieu d&apos;entraînement</p>
          <p className="text-white/70">Chemin du Domaine-Patry 1</p>
          <p className="text-white/70">1224 Chêne-Bougeries, Genève</p>
        </div>
        <div>
          <p className="font-semibold text-mbc-yellow">Contact</p>
          <p className="text-white/70">contact@maccabi-basketball-geneve.ch</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-3 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Maccabi Basketball Club Genève
      </div>
    </footer>
  );
}

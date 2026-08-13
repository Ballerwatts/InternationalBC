import { query } from "@/lib/db";
import PlaysGallery from "@/components/PlaysGallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tactiques — International Basketball Club Genève" };

export default function TacticsPage() {
  const plays = query("SELECT * FROM plays ORDER BY updated_at DESC");

  return (
    <div className="mx-auto max-w-5xl px-4 py-14">
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl font-extrabold uppercase text-ibc-blue">
          Tactiques
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-ibc-ink/70">
          Les schémas d&apos;attaque et de défense de l&apos;équipe — consultez-les avant chaque
          match ou entraînement.
        </p>
      </header>
      <PlaysGallery plays={plays} />
    </div>
  );
}

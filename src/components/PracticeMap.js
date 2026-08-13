export default function PracticeMap({ address }) {
  const q = encodeURIComponent(address);
  return (
    <div className="mt-4 overflow-hidden rounded-xl border-4 border-ibc-accent shadow-md">
      <iframe
        title="Carte — lieu d'entraînement"
        src={`https://www.google.com/maps?q=${q}&output=embed`}
        width="100%"
        height="300"
        style={{ border: 0 }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${q}`}
        target="_blank"
        rel="noreferrer"
        className="block bg-ibc-blue px-4 py-2 text-center text-xs font-bold uppercase tracking-wide text-white hover:brightness-110"
      >
        Ouvrir dans Google Maps
      </a>
    </div>
  );
}

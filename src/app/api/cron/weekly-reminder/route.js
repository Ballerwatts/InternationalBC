import { NextResponse } from "next/server";
import { query, get } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { sendWhatsApp } from "@/lib/whatsapp";
import { buildIcsFeed } from "@/lib/ics";
import { mondayOfISO, addDays as addDaysISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

// Intended to be triggered every Monday morning by a scheduler (a Fly.io
// scheduled machine, or an external pinger like cron-job.org hitting this
// URL with the CRON_SECRET). See README "Monday reminder automation".
// No GET on purpose — a crawler, a link prefetch or someone pasting the URL
// into a browser must not be able to send the week's mail. POST only.
export async function POST(request) {
  return handle(request);
}

async function handle(request) {
  // Fail closed. An unset CRON_SECRET used to mean "no check at all", which
  // made this a public button that mails the whole club — and the mistake was
  // invisible, because the endpoint kept answering 200.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  {
    const auth = request.headers.get("authorization");
    const provided = auth?.replace("Bearer ", "") || new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const monday = mondayOfCurrentWeek();
  const sunday = addDays(monday, 6);

  const board = get("SELECT * FROM practice_board WHERE week_start_date = ?", [monday]);
  const weekEvents = query(
    "SELECT * FROM practices WHERE practice_date >= ? AND practice_date <= ? ORDER BY practice_date ASC, start_time ASC",
    [monday, sunday]
  );

  // Anyone with an email OR a phone number gets a reminder on whichever
  // channel(s) they have on file.
  const players = query(
    `SELECT * FROM players
     WHERE active = 1
       AND ((email IS NOT NULL AND email != '') OR (phone IS NOT NULL AND phone != ''))`
  );

  if (players.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      note: "Aucun joueur n'a d'adresse email ou de numéro de téléphone enregistré — rien n'a été envoyé.",
    });
  }

  const html = buildEmailHtml({ board, weekEvents });
  const whatsappText = buildWhatsAppText({ board, weekEvents, monday });
  const ics = weekEvents.length ? buildIcsFeed(weekEvents) : null;

  let sentEmail = 0;
  let sentWhatsApp = 0;
  const errors = [];

  for (const player of players) {
    if (player.email) {
      try {
        await sendEmail({
          to: player.email,
          subject: `International Basketball — Semaine du ${formatFr(monday)}`,
          html,
          attachments: ics ? [{ filename: "semaine-ibc.ics", content: ics }] : undefined,
          category: "weekly_reminder",
        });
        sentEmail++;
      } catch (e) {
        errors.push({ player: player.email, channel: "email", error: String(e) });
      }
    }
    if (player.phone) {
      try {
        await sendWhatsApp({ to: player.phone, body: whatsappText });
        sentWhatsApp++;
      } catch (e) {
        errors.push({ player: player.phone, channel: "whatsapp", error: String(e) });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sentEmail,
    sentWhatsApp,
    total: players.length,
    errors,
  });
}

function buildEmailHtml({ board, weekEvents }) {
  const eventsHtml = weekEvents
    .map(
      (e) =>
        `<li><strong>${formatFr(e.practice_date)}</strong> ${e.start_time}–${e.end_time} — ${
          e.kind === "game" ? `Match${e.opponent ? " vs " + e.opponent : ""}` : "Entraînement"
        } (${e.location_name || ""})</li>`
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #14173f;">
      <div style="background:#2d3194; padding:16px; border-bottom:4px solid #ffffff;">
        <h1 style="color:#ffffff; margin:0; font-size:20px;">International Basketball Club Genève</h1>
      </div>
      <div style="padding:20px;">
        <h2 style="color:#2d3194;">Programme de la semaine</h2>
        <ul>${eventsHtml || "<li>Aucun événement prévu cette semaine.</li>"}</ul>
        ${
          board
            ? `<h2 style="color:#2d3194;">Focus entraînement</h2>
               <p><strong>${board.focus || ""}</strong></p>
               <p style="white-space:pre-line;">${board.drills || ""}</p>
               ${board.notes ? `<p style="white-space:pre-line;">${board.notes}</p>` : ""}`
            : ""
        }
        <p style="margin-top:24px; font-size:12px; color:#666;">
          Un fichier calendrier (.ics) est joint pour ajouter ces séances directement à votre agenda.
        </p>
      </div>
    </div>
  `;
}

function buildWhatsAppText({ board, weekEvents, monday }) {
  const lines = [`*International Basketball Club Genève* — semaine du ${formatFr(monday)}`, ""];
  if (weekEvents.length) {
    for (const e of weekEvents) {
      const label = e.kind === "game" ? `Match${e.opponent ? " vs " + e.opponent : ""}` : "Entraînement";
      lines.push(`• ${formatFr(e.practice_date)} ${e.start_time}–${e.end_time} — ${label} (${e.location_name || ""})`);
    }
  } else {
    lines.push("Aucun événement prévu cette semaine.");
  }
  if (board?.focus) {
    lines.push("", `Focus entraînement : ${board.focus}`);
  }
  return lines.join("\n");
}

function mondayOfCurrentWeek() {
  return mondayOfISO();
}

const addDays = addDaysISO;

function formatFr(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

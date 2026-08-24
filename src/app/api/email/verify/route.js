import { NextResponse } from "next/server";
import { requireArea } from "@/lib/access";
import { smtpStatus, verifySmtp } from "@/lib/email";

export const dynamic = "force-dynamic";

/** Which SMTP env vars are set — never the password's value. */
export async function GET() {
  const denied = await requireArea("marketing");
  if (denied) return denied;
  return NextResponse.json(smtpStatus());
}

/** Actually open a connection and authenticate. */
export async function POST() {
  const denied = await requireArea("marketing");
  if (denied) return denied;
  return NextResponse.json({ ...(await verifySmtp()), status: smtpStatus() });
}

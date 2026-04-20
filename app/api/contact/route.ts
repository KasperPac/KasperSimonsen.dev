import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // TODO: wire up email delivery (e.g. Resend, Supabase Edge Function)
  console.log("Contact form submission:", { name, email, subject, message });

  return NextResponse.json({ ok: true });
}

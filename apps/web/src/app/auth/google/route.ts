import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const backendUrl = (
    process.env.INTERNAL_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://pixlpresence1.onrender.com"
      : "http://localhost:3001")
  )
    .trim()
    .replace(/\/+$/, "");

  return NextResponse.redirect(`${backendUrl}/auth/google`, 307);
}

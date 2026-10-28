import { NextResponse, type NextRequest } from "next/server";
import { COOKIE } from "@/lib/session-config";

export function GET(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/login"; url.search = "?reason=timeout";
  const res = NextResponse.redirect(url);
  res.cookies.delete(COOKIE);
  return res;
}

import { NextResponse, type NextRequest } from "next/server";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE, COOKIE_SECONDS, ABSOLUTE_SECONDS, cookieOptions } from "@/lib/session-config";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const token = req.cookies.get(COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  const secret = process.env.AUTH_SECRET ? new TextEncoder().encode(process.env.AUTH_SECRET) : null;

  let claims: { sub: string; st: number; iat: number } | null = null;
  if (token && secret) {
    try {
      const { payload } = await jwtVerify(token, secret);
      const st = Number(payload.st);
      if (payload.sub && now - st <= ABSOLUTE_SECONDS) claims = { sub: payload.sub, st, iat: Number(payload.iat) };
    } catch { /* expired or invalid */ }
  }

  if (!claims) {
    if (pathname === "/login") return NextResponse.next();
    if (isApi) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = token ? "?reason=timeout" : "";
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete(COOKIE);
    return res;
  }

  if (pathname === "/login") {
    const url = req.nextUrl.clone(); url.pathname = "/dashboard"; url.search = "";
    return NextResponse.redirect(url);
  }

  const res = NextResponse.next();
  const prefetch = req.headers.get("next-router-prefetch") || req.headers.get("purpose") === "prefetch";
  if (!prefetch && secret && now - claims.iat > 30) { // renew the idle window (sliding session)
    const fresh = await new SignJWT({ sub: claims.sub, st: claims.st })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt(now).setExpirationTime(now + COOKIE_SECONDS).sign(secret);
    res.cookies.set(COOKIE, fresh, cookieOptions());
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|manifest.webmanifest|sw.js|favicon.ico|api/health|api/logout).*)"],
};

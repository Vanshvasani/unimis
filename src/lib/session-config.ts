export const COOKIE = "mis_session";
// Override for testing: NEXT_PUBLIC_IDLE_SECONDS=30 npm run dev
export const IDLE_SECONDS = Number(process.env.NEXT_PUBLIC_IDLE_SECONDS ?? 900);
export const KEEPALIVE_SECONDS = Math.max(5, Math.round(IDLE_SECONDS / 15));
export const COOKIE_SECONDS = IDLE_SECONDS + KEEPALIVE_SECONDS;
export const ABSOLUTE_SECONDS = 8 * 60 * 60;

// COOKIE_SECURE=false is only for testing the Docker stack over plain HTTP.
const secure = () => (process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : process.env.NODE_ENV === "production");
export const cookieOptions = () => ({ httpOnly: true, sameSite: "lax" as const, secure: secure(), path: "/", maxAge: COOKIE_SECONDS });

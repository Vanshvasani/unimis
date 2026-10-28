// Reaching here means middleware verified the session and renewed the cookie.
export function POST() { return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } }); }

"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const denied = /Not allowed|Outside your department|Not your class/.test(error.message);
  return (
    <main className="mx-auto max-w-md space-y-3 p-6" role="alert">
      <h1 className="text-lg font-semibold">{denied ? "Access denied" : "Something went wrong"}</h1>
      <p className="text-sm text-gray-600">{denied ? "You don't have permission for that action." : "Please try again."}</p>
      <button onClick={reset} className="rounded border px-3 py-1 text-sm">Retry</button>
    </main>
  );
}

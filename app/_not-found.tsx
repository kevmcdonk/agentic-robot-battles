import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#FFD700]">404</p>
      <h1 className="mb-4 text-3xl font-black uppercase tracking-wide text-[#e6edf3] sm:text-4xl">
        Arena Page Not Found
      </h1>
      <p className="mb-8 max-w-xl text-sm text-[#9fb0c0] sm:text-base">
        The route you requested does not exist in this arena. Check the URL or return to the dashboard.
      </p>
      <Link
        href="/dashboard"
        className="rounded border border-[#FFD700] bg-[#161616] px-5 py-2 text-sm font-bold uppercase tracking-wide text-[#FFD700] transition-colors hover:bg-[#232323] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]"
      >
        Go to Dashboard
      </Link>
    </main>
  );
}

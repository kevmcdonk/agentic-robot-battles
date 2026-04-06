import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SignInButton from '@/components/SignInButton';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#1a1a1a] px-4 py-12">
      {/* Hazard stripe header bar */}
      <div className="w-full max-w-3xl h-3 hazard-stripe mb-8 rounded" aria-hidden="true" />

      <div className="w-full max-w-3xl">
        <h1 className="arena-heading text-5xl sm:text-7xl text-[#FFD700] mb-2 tracking-widest drop-shadow-lg">
          AGENTIC
        </h1>
        <h1 className="arena-heading text-5xl sm:text-7xl text-white mb-6 tracking-widest drop-shadow-lg">
          ROBOT BATTLES
        </h1>

        <p className="text-[#8a9aa8] text-lg sm:text-xl mb-4 max-w-xl">
          Design a combat robot. Survive the validator. Challenge your rivals. Watch the AI write your legend.
        </p>

        <p className="text-[#8a9aa8] text-sm mb-10 max-w-xl">
          Inspired by UK Robot Wars — build with spinning blades, flippers, and hardened armour. Every robot
          is validated for physical plausibility before it enters the arena. Battles are simulated, results
          are permanent, and the league table doesn&apos;t lie.
        </p>

        {/* Example commentary excerpt */}
        <blockquote className="border-l-4 border-[#FFD700] pl-4 mb-10 italic text-[#e8e8e8] text-sm max-w-xl">
          &ldquo;And it&apos;s CARNAGE in the arena! Titanium Fury catches Shredmaster under the chassis —
          the flipper fires, and Shredmaster is airborne! Four metres at least! Can it self-right?
          The crowd is on their feet — it&apos;s ALL OVER!&rdquo;
          <span className="block not-italic text-[#8a9aa8] mt-2">— AI Commentary excerpt</span>
        </blockquote>

        <SignInButton />
      </div>

      <div className="w-full max-w-3xl h-3 hazard-stripe mt-8 rounded" aria-hidden="true" />
    </main>
  );
}

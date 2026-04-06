import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getRobotsByUser } from '@/lib/cosmos';
import RobotCard from '@/components/RobotCard';

export default async function RobotsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/');

  const userId = (session.user as { id: string }).id;
  const robots = await getRobotsByUser(userId);

  return (
    <main className="min-h-screen bg-[#1a1a1a] p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="arena-heading text-3xl text-[#FFD700]">My Robots</h1>
          <Link
            href="/robots/new"
            className="text-sm bg-[#FFD700] text-[#1a1a1a] px-4 py-2 rounded font-bold uppercase tracking-widest hover:bg-[#FF6B00] transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
          >
            + New Robot
          </Link>
        </div>

        {robots.length === 0 ? (
          <div className="bg-[#242424] border border-dashed border-[#3a3a3a] rounded p-12 text-center">
            <p className="text-[#8a9aa8] mb-4 text-lg">The arena is empty. Build your first combat machine.</p>
            <Link
              href="/robots/new"
              className="text-[#FFD700] font-bold text-lg hover:underline focus:outline-none focus:underline"
            >
              Build a robot →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {robots.map((robot) => (
              <RobotCard key={robot.id} robot={robot} href={`/robots/${robot.id}`} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

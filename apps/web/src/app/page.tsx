import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm flex flex-col space-y-8">
        <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600 pb-4">
          Discord RPC Platform
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl text-center">
          Customize your Discord profile, manage your Rich Presence, and show off your gaming activity like never before.
        </p>

        <div className="flex gap-4 items-center justify-center pt-8">
          <Link
            href="http://localhost:3000/auth/discord"
            className="group rounded-full border border-transparent px-8 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30 bg-purple-600 text-white font-bold text-lg hover:text-white"
          >
            Login with Discord
          </Link>
        </div>
      </div>
    </main>
  );
}

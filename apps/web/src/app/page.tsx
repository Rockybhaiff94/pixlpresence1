export default function Home() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL 
    ? (process.env.NEXT_PUBLIC_API_URL.startsWith('http') ? process.env.NEXT_PUBLIC_API_URL : `https://${process.env.NEXT_PUBLIC_API_URL}`)
    : 'https://pixlpresence-api-production.up.railway.app';
    
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white p-8 md:p-24 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="z-10 max-w-5xl w-full items-center justify-center text-center flex flex-col space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-300 text-xs font-medium tracking-wide">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
          Web-First Discord RPC with PixelsRPC for Vencord
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-500 to-purple-600 tracking-tight pb-2">
          Pixel.gg
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto leading-relaxed">
          The all-in-one web platform for customizable bio profiles and native Discord Rich Presence powered directly through our <strong className="text-purple-400">PixelsRPC Vencord plugin</strong>. No bulky background desktop apps required.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <a
            href={`${apiUrl}/auth/discord`}
            className="rounded-full px-8 py-4 transition-all hover:scale-105 bg-purple-600 hover:bg-purple-700 text-white font-bold text-lg shadow-lg shadow-purple-600/25"
          >
            Login with Discord
          </a>
          <a
            href="#features"
            className="rounded-full px-8 py-4 transition-all hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-medium text-lg"
          >
            Explore Features
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 w-full text-left">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-purple-400 text-2xl mb-2">⚡</div>
            <h3 className="text-lg font-semibold text-white mb-1">Web-First Management</h3>
            <p className="text-sm text-zinc-400">Configure custom games, details, state, timestamps, buttons, and custom images directly in your browser.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-pink-400 text-2xl mb-2">🔌</div>
            <h3 className="text-lg font-semibold text-white mb-1">PixelsRPC Vencord Plugin</h3>
            <p className="text-sm text-zinc-400">Native Vencord integration that sets your Rich Presence inside Discord with zero battery drain and no standalone executables.</p>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
            <div className="text-blue-400 text-2xl mb-2">🎨</div>
            <h3 className="text-lg font-semibold text-white mb-1">Stunning Bio Profiles</h3>
            <p className="text-sm text-zinc-400">Share your custom profile link with themes, glassmorphism, background particles, custom links, and analytics.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

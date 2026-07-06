export default function CustomizePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Customize Profile</h1>
      <p className="text-zinc-400">Personalize your profile's theme, colors, and visual effects.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Theme Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Accent Color</label>
                <div className="flex gap-2">
                  {['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                    <button key={color} title={`Select color ${color}`} aria-label={`Select color ${color}`} className="w-8 h-8 rounded-full border-2 border-transparent hover:border-white transition-all" style={{ backgroundColor: color }}></button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Visual Effects</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="particles" className="block text-sm font-medium text-zinc-400 mb-2">Background Particles</label>
                <select id="particles" name="particles" title="Select Particles" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-white">
                  <option>None</option>
                  <option>Snow</option>
                  <option>Stars</option>
                  <option>Fireflies</option>
                </select>
              </div>
              <div>
                <label htmlFor="blur" className="block text-sm font-medium text-zinc-400 mb-2">Card Blur (Glassmorphism)</label>
                <input id="blur" name="blur" type="range" min="0" max="20" title="Card Blur" className="w-full accent-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="sticky top-8">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 h-[600px] flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-pink-900/20 z-0"></div>
            <div className="relative z-10 text-center">
              <p className="text-zinc-500 mb-2">Live Preview Area</p>
              <div className="w-64 h-80 bg-zinc-950/50 backdrop-blur-md rounded-2xl border border-zinc-800/50 shadow-2xl p-6 flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-zinc-800 mb-4"></div>
                <div className="w-32 h-4 bg-zinc-800 rounded mb-2"></div>
                <div className="w-24 h-3 bg-zinc-800 rounded mb-6"></div>
                
                <div className="w-full space-y-2 mt-auto">
                  <div className="w-full h-10 rounded bg-purple-600/50 border border-purple-500/30"></div>
                  <div className="w-full h-10 rounded bg-zinc-800 border border-zinc-700"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

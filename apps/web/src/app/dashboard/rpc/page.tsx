export default function RpcPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rich Presence</h1>
          <p className="text-zinc-400">Configure what displays on your Discord profile.</p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Save Changes
        </button>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Application Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Application ID (Optional)</label>
                <input type="text" placeholder="123456789012345678" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">State</label>
                <input type="text" placeholder="In a match" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Details</label>
                <input type="text" placeholder="Playing Ranked" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Images</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Large Image URL</label>
                <input type="text" placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Large Image Text</label>
                <input type="text" placeholder="Hover text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Small Image URL</label>
                <input type="text" placeholder="https://..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">Small Image Text</label>
                <input type="text" placeholder="Hover text" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500 transition-colors" />
              </div>
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Buttons (Max 2)</h2>
            <div className="space-y-4">
              <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/50 space-y-3">
                <input type="text" placeholder="Button 1 Label" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white" />
                <input type="text" placeholder="Button 1 URL" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white" />
              </div>
              <div className="p-4 border border-zinc-800 rounded-lg bg-zinc-950/50 space-y-3">
                <input type="text" placeholder="Button 2 Label" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white" />
                <input type="text" placeholder="Button 2 URL" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="sticky top-8">
          <div className="bg-[#1e1f22] rounded-lg shadow-xl overflow-hidden border border-[#111214]">
            <div className="bg-[#111214] px-4 py-3 flex items-center justify-between border-b border-[#1e1f22]">
              <div className="text-[#949ba4] font-semibold text-xs uppercase tracking-wider">Playing a game</div>
            </div>
            <div className="p-4 flex gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-[#2b2d31] overflow-hidden">
                  {/* Large Image Placeholder */}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1e1f22] p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#2b2d31]">
                    {/* Small Image Placeholder */}
                  </div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold truncate">Application Name</h3>
                <p className="text-[#dbdee1] text-sm truncate">Details go here</p>
                <p className="text-[#dbdee1] text-sm truncate">State goes here</p>
                <p className="text-[#dbdee1] text-sm truncate mt-1">00:00 elapsed</p>
              </div>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <div className="w-full py-2 bg-[#2b2d31] hover:bg-[#313338] text-white text-sm font-medium text-center rounded transition-colors cursor-pointer">
                Button 1
              </div>
              <div className="w-full py-2 bg-[#2b2d31] hover:bg-[#313338] text-white text-sm font-medium text-center rounded transition-colors cursor-pointer">
                Button 2
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardOverview() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Overview</h1>
      <p className="text-zinc-400">Welcome to your Discord RPC Platform dashboard.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Total Views</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Profile Clicks</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Followers</h3>
          <p className="text-3xl font-bold text-white">0</p>
        </div>
      </div>

      <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Discord Connection</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-zinc-800 animate-pulse"></div>
          <div>
            <p className="font-medium text-lg">Not connected</p>
            <p className="text-sm text-zinc-400">Please login to sync your data.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

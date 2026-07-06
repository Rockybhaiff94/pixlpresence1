export default function BioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Biography</h1>
        <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
          Save Changes
        </button>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
            <input id="displayName" name="displayName" type="text" placeholder="Your Display Name" title="Display Name" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500" />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-zinc-400 mb-2">Bio (Markdown Supported)</label>
            <textarea id="bio" name="bio" rows={6} placeholder="Write something about yourself..." title="Biography" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"></textarea>
          </div>
        </div>
      </div>
    </div>
  );
}

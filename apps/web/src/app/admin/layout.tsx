import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-[#121212] border-r border-zinc-800 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-xl font-bold text-red-500">Admin Panel</h2>
          <p className="text-xs text-zinc-500 mt-1">Platform Management</p>
        </div>
        
        <nav className="flex-1 space-y-2">
          <Link href="/admin" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white">
            <span>📊</span>
            <span>Overview</span>
          </Link>
          <Link href="/admin/users" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white">
            <span>👥</span>
            <span>Users</span>
          </Link>
          <Link href="/dashboard" className="flex items-center space-x-3 p-3 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-300 hover:text-white mt-10 border-t border-zinc-800 pt-6">
            <span>⬅️</span>
            <span>Exit to Dashboard</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

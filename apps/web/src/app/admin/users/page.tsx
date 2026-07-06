"use client";

import { useEffect, useState } from 'react';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePremium = async (userId: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ premiumStatus: !currentStatus })
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="animate-pulse">Loading users...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">User Management</h1>
      
      <div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Username</th>
              <th className="p-4 font-medium">Discord ID</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Premium Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-white">{u.username}</div>
                  <div className="text-xs text-zinc-500">{u.email}</div>
                </td>
                <td className="p-4 text-zinc-400 font-mono text-sm">{u.discordId}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-300'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${u.premiumStatus ? 'bg-yellow-500/20 text-yellow-400' : 'bg-zinc-800 text-zinc-300'}`}>
                    {u.premiumStatus ? 'Premium' : 'Standard'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => togglePremium(u.id, u.premiumStatus)}
                    className="text-sm bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded transition-colors"
                  >
                    Toggle Premium
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

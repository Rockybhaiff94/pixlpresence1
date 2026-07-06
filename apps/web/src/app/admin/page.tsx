"use client";

import { useEffect, useState } from 'react';

export default function AdminOverview() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  if (!stats) return <div className="animate-pulse">Loading platform metrics...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-white">Platform Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#121212] border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Total Registered Users</h3>
          <p className="text-4xl font-bold text-white">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-[#121212] border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Customized Profiles</h3>
          <p className="text-4xl font-bold text-white">{stats.totalProfiles}</p>
        </div>
        
        <div className="bg-[#121212] border border-zinc-800 p-6 rounded-xl">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Active RPC Configs</h3>
          <p className="text-4xl font-bold text-white">{stats.totalRpcConfigs}</p>
        </div>
      </div>
    </div>
  );
}

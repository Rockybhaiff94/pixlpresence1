"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/rpc/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async (id: string) => {
    try {
      const res = await fetch(`/api/rpc/templates/${id}/apply`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('Template applied successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await fetch(`/api/rpc/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveCurrent = async () => {
    const name = prompt('Enter a name for this template:');
    if (!name) return;

    try {
      // First, get the current config
      const meRes = await fetch('/api/rpc/me');
      const currentConfig = await meRes.json();

      const res = await fetch('/api/rpc/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          category: 'Custom',
          config: currentConfig
        })
      });

      if (res.ok) {
        fetchTemplates();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save template');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-5xl"
    >
      <div className="flex justify-between items-end border-b border-[#333] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Activity Templates</h1>
          <p className="text-gray-400 mt-2 text-sm">Save your favorite Rich Presence setups and switch instantly.</p>
        </div>
        <button
          onClick={handleSaveCurrent}
          className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors shadow-lg shadow-purple-500/20"
        >
          Save Current Config
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-zinc-800 rounded"></div>
              <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map(t => {
            const config = JSON.parse(t.config || '{}');
            return (
              <div key={t.id} className="bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden hover:border-purple-500/50 transition-colors group">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-white text-lg">{t.name}</h3>
                      <span className="text-xs text-purple-400 font-medium px-2 py-1 bg-purple-500/10 rounded-full mt-2 inline-block">
                        {t.isGlobal ? 'Global' : t.category}
                      </span>
                    </div>
                  </div>
                  
                  {/* Discord Mockup Preview */}
                  <div className="bg-[#2b2d31] p-4 rounded-lg mb-6 border border-[#1e1f22]">
                    <p className="text-xs text-[#b5bac1] font-bold mb-2 uppercase tracking-wide">Playing a game</p>
                    <div className="flex space-x-4">
                      {config.largeImage ? (
                        <img src={config.largeImage} className="w-16 h-16 rounded-lg object-cover bg-[#1e1f22]" alt="" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-[#1e1f22] flex items-center justify-center">
                          <span className="text-2xl">🎮</span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-bold text-sm leading-tight">{config.appName || 'Unknown App'}</p>
                        <p className="text-[#dbdee1] text-sm leading-snug">{config.details}</p>
                        <p className="text-[#dbdee1] text-sm leading-snug">{config.state}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3">
                    <button 
                      onClick={() => handleApply(t.id)}
                      className="flex-1 bg-white hover:bg-gray-100 text-black font-medium py-2 rounded-lg transition-colors text-sm"
                    >
                      Apply Template
                    </button>
                    {!t.isGlobal && (
                      <button 
                        onClick={() => handleDelete(t.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition-colors border border-red-500/20"
                        title="Delete Template"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {templates.length === 0 && !loading && (
        <div className="text-center py-20 border border-dashed border-[#333] rounded-2xl">
          <span className="text-4xl mb-4 block">📋</span>
          <h3 className="text-xl font-medium text-white mb-2">No templates found</h3>
          <p className="text-gray-400 text-sm">Save your current configuration to see it here.</p>
        </div>
      )}
    </motion.div>
  );
}

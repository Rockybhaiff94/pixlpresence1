import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await invoke("login", { token });
      await invoke("start_rpc");
      setStatus("Connected and Syncing 🟢");
    } catch (err: any) {
      setError(err.toString());
    }
  }

  async function handleStop() {
    try {
      await invoke("stop_rpc");
      setStatus("Disconnected 🔴");
    } catch (err: any) {
      setError(err.toString());
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center p-8 font-sans">
      <div className="max-w-md w-full bg-[#1e1e1e] rounded-xl shadow-2xl p-8 border border-[#333]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-purple-600 rounded-2xl mb-4 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Z"/>
              <path d="m15 9-6 6"/>
              <path d="m9 9 6 6"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Discord RPC Sync</h1>
          <p className="text-gray-400 text-sm mt-1">Keep your profile synchronized</p>
        </div>

        {status === "Disconnected" || status === "Disconnected 🔴" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">App Token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste your token from the dashboard..."
                className="w-full bg-[#121212] border border-[#333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
              <p className="text-xs text-gray-500 mt-2">You can generate a token in your web dashboard settings.</p>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-lg transition-colors"
            >
              Connect to Discord
            </button>
          </form>
        ) : (
          <div className="space-y-6 flex flex-col items-center">
            <div className="bg-[#121212] px-6 py-4 rounded-lg border border-[#333] w-full text-center">
              <p className="text-lg font-medium">{status}</p>
              <p className="text-sm text-gray-400 mt-1">Your rich presence is being updated every 15 seconds.</p>
            </div>
            <button
              onClick={handleStop}
              className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 rounded-lg transition-colors border border-red-500/20"
            >
              Stop Syncing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

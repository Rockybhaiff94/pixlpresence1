# PixelsRPC — Vencord Plugin for Pixel.gg

Seamlessly syncs your Discord Rich Presence directly with your **Pixel.gg** web profile using Vencord.

---

## ✨ Features
- **Web-First & Native**: No bulky standalone desktop electron/tauri app required. Runs directly inside Discord via Vencord.
- **Profile-Driven**: Configure your presence (game title, state, details, timestamps, buttons, and images) on the Pixel.gg web dashboard, and PixelsRPC mirrors it to your Discord presence.
- **Client-Safe**: Only updates your local client's rich presence; never alters other users' clients or chats.
- **Existing Auth**: Connects using your private Pixel.gg App Token generated in your web dashboard.

---

## 🚀 Installation Guide

### Method A: Install as a Vencord Userplugin (Recommended)
1. Clone or download this directory into your Vencord userplugins folder:
   ```
   src/userplugins/PixelsRPC/
   ```
2. Rebuild Vencord or restart Discord.
3. Open Discord **Settings** -> **Vencord** -> **Plugins**.
4. Enable **PixelsRPC** and click the settings gear ⚙️.
5. Paste your **Pixel.gg App Token** (copied from `https://pixel.gg/dashboard/rpc`).
6. Set the API URL (default: `https://pixlpresence-api-production.up.railway.app` or `http://localhost:3001`).

### Method B: Quick-Load via Discord Console / DevTools
1. Open Discord desktop.
2. Press `Ctrl + Shift + I` (or `Cmd + Option + I` on macOS) to open DevTools.
3. Copy the contents of [`dist/PixelsRPC.vencord.js`](dist/PixelsRPC.vencord.js) and paste it into the **Console** tab.
4. Run:
   ```js
   PixelsRPC.start({
     token: "YOUR_PIXEL_GG_APP_TOKEN",
     apiUrl: "http://localhost:3001" // or production URL
   });
   ```

---

## ⚙️ Configuration Options

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `token` | `string` | `""` | Your unique Pixel.gg App Token. |
| `apiUrl` | `string` | `http://localhost:3001` | The backend API server URL. |
| `refreshInterval` | `number` | `15` | Polling sync interval in seconds. |

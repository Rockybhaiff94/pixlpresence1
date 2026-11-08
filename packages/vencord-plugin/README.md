# PixelsRPC — Native Vencord Plugin

A fully native [Vencord](https://github.com/Vendicated/Vencord) plugin that synchronizes your Discord Rich Presence directly with your [Pixel.gg](https://pixlpresence1-web.vercel.app) web profile.

---

## 🌟 Overview & Architecture

PixelsRPC turns your web profile into your live Discord activity without requiring cumbersome standalone desktop background applications (e.g. Electron, Tauri, or local Python daemons). It communicates directly with your secure Pixel.gg cloud backend and injects your custom activity locally using Discord's internal `FluxDispatcher` (`LOCAL_ACTIVITY_UPDATE`).

### Why Native Vencord Architecture?
- **Zero Remote Code Execution (RCE)**: Completely replaces the legacy dynamic `<script>` loader with 100% pre-compiled TypeScript. No `eval()`, no `new Function()`, and no DOM script tags.
- **Vencord Settings Store Integration**: Uses Vencord's official `definePluginSettings` API. All settings persist across Discord restarts and are synced with Vencord cloud settings.
- **Lifecycle Cleanliness**: Implements proper `start()` and `stop()` lifecycle handlers. Aborts in-flight network requests via `AbortController`, cancels intervals, and clears local activity when disabled.
- **Network Resiliency**: Features exponential backoff with jitter on network drops and gracefully suspends polling on `401 Unauthorized` without spamming your server.
- **Payload Deduplication**: Deep-compares presence states before dispatching to Discord to prevent redundant activity updates and Discord client rate-limiting.

---

## ✨ Features

- **Profile-Driven Rich Presence**: Displays your customized game title, details, state, large/small assets, elapsed timestamps, and party size.
- **Interactive Action Buttons**: Displays up to 2 clickable action buttons linking directly to your Pixel.gg profile, social links, or portfolio.
- **Native Settings UI**: Integrated directly inside Discord's **Settings → Vencord → Plugins → PixelsRPC** with live connection status indicators and action controls.
- **On-Demand Controls**: Includes "Sync Now", "Reconnect", and "Clear Presence" buttons directly within Discord settings.
- **Privacy First**: Only alters your local Discord client's presence. Never sends Discord tokens or private user data to third parties.

---

## 📁 Plugin File Structure

Following official Vencord plugin conventions:

```
src/plugins/pixelsrpc/ (or src/userplugins/pixelsrpc/)
├── index.ts                  # Main plugin entry, start/stop lifecycle, sync engine
├── settings.ts               # definePluginSettings schema and type-safe options
├── types.ts                  # TypeScript interfaces for RPC, DiscordActivity, and State
├── styles.css                # CSS variables matching Discord's native dark/light theme
├── components/
│   ├── StatusCard.tsx        # Live connection status badge and diagnostics
│   ├── ActionControls.tsx    # "Sync Now", "Reconnect", "Clear Presence" buttons
│   └── SettingsAbout.tsx     # Custom panel rendered via settingsAboutComponent
└── README.md                 # Plugin documentation
```

---

## 🚀 Installation & Usage

### Method 1: Install as a Vencord Userplugin (Recommended)
1. Navigate to your local Vencord repository clone:
   ```bash
   cd Vencord
   ```
2. Copy the `dist/pixelsrpc` directory from this package into your Vencord `src/userplugins/` folder:
   ```bash
   # Linux/macOS
   cp -r path/to/pixelsrpc-vencord/dist/pixelsrpc src/userplugins/pixelsrpc

   # Windows PowerShell
   Copy-Item -Recurse path\to\pixelsrpc-vencord\dist\pixelsrpc src\userplugins\pixelsrpc
   ```
3. Build and patch your Vencord installation:
   ```bash
   pnpm build
   pnpm inject
   ```
4. Restart Discord.
5. In Discord, go to **User Settings ⚙️ → Vencord → Plugins**.
6. Search for **PixelsRPC**, enable it, and open its settings gear ⚙️.
7. Paste your **App Token** (copied from [https://pixlpresence1-web.vercel.app/account/rpc](https://pixlpresence1-web.vercel.app/account/rpc)).

### Method 2: Official Vencord Core Plugin
To contribute PixelsRPC to the main Vencord repository:
1. Place the folder into `src/plugins/pixelsrpc`.
2. Follow the submission guidelines outlined in the [Official Submission Readiness Report](#-official-submission-readiness-report) below.

---

## ⚙️ Configuration Reference

| Option | Type | Default | Description |
| :--- | :---: | :---: | :--- |
| `token` | `string` | `""` | Your private Pixel.gg App Token from the web dashboard. |
| `apiUrl` | `string` | `https://pixlpresence1-web.vercel.app` | The backend API server URL. |
| `refreshInterval` | `number` | `15` | Polling sync interval in seconds (minimum 5s). |
| `activityVisibility` | `boolean` | `true` | Toggle your Discord profile Rich Presence on/off. |
| `fallbackAppName` | `string` | `"Pixel.gg"` | Default application title if unspecified in profile. |
| `showButtons` | `boolean` | `true` | Show or hide interactive action buttons on presence. |
| `showTimestamps` | `boolean` | `true` | Show or hide elapsed/start timestamps on presence. |
| `debugLogging` | `boolean` | `false` | Enable verbose debug logs in Discord DevTools console. |

---

## 🔒 Security & Privacy Review

- **No Remote Code Execution**: All executable code is bundled and compiled statically.
- **Client Security**: App tokens are stored locally inside Vencord's sandboxed settings store.
- **Network Boundaries**: Only communicates via standard HTTPS GET requests to `/api/rpc/me`.
- **Authentication**: Uses standard HTTP header `Authorization: Bearer <appToken>`.
- **Error Handling**: `401 Unauthorized` responses immediately clear activity and halt polling, preventing API spam.
- **Rate-Limiting**: Honors HTTP 429 status codes and employs exponential backoff capped at 300 seconds (5 minutes).

---

## 📋 Backend API Contract

PixelsRPC interacts with the following backend endpoint:

### `GET /api/rpc/me`
- **Headers**:
  ```http
  Authorization: Bearer <appToken>
  Accept: application/json
  ```
- **Response Format (`200 OK`)**:
  ```json
  {
    "id": "cuid...",
    "userId": "cuid...",
    "appName": "Playing Cyberpunk 2077",
    "appId": "1523632136878559302",
    "state": "Night City",
    "details": "Act II Story Mission",
    "largeImage": "https://cdn.pixel.gg/cyberpunk.png",
    "largeImageText": "Cyberpunk 2077",
    "smallImage": "https://cdn.pixel.gg/avatar.png",
    "smallImageText": "V",
    "startTimestamp": "2026-11-06T12:00:00.000Z",
    "endTimestamp": null,
    "partySize": 1,
    "partyMax": 4,
    "button1Label": "View Profile",
    "button1Url": "https://pixel.gg/user",
    "button2Label": "Join Discord",
    "button2Url": "https://discord.gg/pixelgg"
  }
  ```

---

## 🛠️ Official Submission Readiness Report

| Vencord Requirement | Status | Notes |
| :--- | :---: | :--- |
| **Plugin API Standards** | ✅ Compliant | Built with `definePlugin`, `definePluginSettings`, and `OptionType`. |
| **No Remote Script / eval** | ✅ Compliant | Zero dynamic scripts or `eval`. |
| **Lifecycle Cleanup** | ✅ Compliant | Cleans timers, aborts requests, and resets presence on `stop()`. |
| **No Global Namespace Pollution** | ✅ Compliant | No global variables leaked into `window`. |
| **TypeScript Strictness** | ✅ Compliant | Strict type checking with 0 compiler errors. |
| **Vencord Inclusion Route** | 💡 Userplugin | Vencord core policy (`CONTRIBUTING.md`) restricts core bundled plugins to universal tools and prohibits plugins requiring external private API tokens for self-hosted/niche third-party backends. Therefore, PixelsRPC is **ideally suited and fully architected as an official Vencord Userplugin (`src/userplugins/pixelsrpc`)**, while retaining complete compatibility for core inclusion if desired. |

---

## 📄 License
MIT © [Pixel.gg](https://pixlpresence1-web.vercel.app)

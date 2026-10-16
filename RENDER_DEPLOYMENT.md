# Deploying Pixel.gg Backend to Render

This guide outlines how to deploy the **Pixel.gg API Backend** and **Discord Bot** on [Render](https://render.com).

---

## 🚀 Option 1: Automatic Deployment using Render Blueprint (Recommended)

The repository includes a ready-to-use [`render.yaml`](render.yaml) blueprint specification.

1. Go to your [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** in the top right and select **Blueprint**.
3. Connect your GitHub repository (`https://github.com/Rockybhaiff94/pixlpresence1.git`).
4. Render will automatically detect [`render.yaml`](render.yaml) and configure:
   - **`pixelgg-api`** (Web Service, Node 20, zero-config SQLite)
   - **`pixelgg-bot`** (Background Worker)
5. Fill in your environment variables:
   - `DISCORD_CLIENT_ID`: Your Discord Developer Application ID.
   - `DISCORD_CLIENT_SECRET`: Your Discord Application Secret.
   - `DISCORD_CALLBACK_URL`: `https://<your-render-api-name>.onrender.com/auth/discord/callback`
   - `FRONTEND_URL`: Your web app URL (e.g. `https://pixelgg.vercel.app` or your frontend domain).
   - `DISCORD_BOT_TOKEN`: Your Discord Bot Token (for the bot worker).
6. Click **Apply**. Render will automatically install dependencies, build the database schema, compile TypeScript, and launch the service!

---

## 🛠️ Option 2: Manual Web Service Setup on Render

If you prefer to create a standalone **Web Service** manually:

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository.
3. Configure the settings:
   - **Name**: `pixelgg-api`
   - **Region**: Select closest region (e.g. Ohio, Frankfurt, Singapore).
   - **Branch**: `master`
   - **Root Directory**: *(Leave blank / repository root)*
   - **Runtime**: `Node`
   - **Build Command**:
     ```bash
     npm install && npm run generate --workspace=@discord-rpc/database && npm run db:push --workspace=@discord-rpc/database && npm run build --workspace=@discord-rpc/database && npm run build --workspace=api
     ```
   - **Start Command**:
     ```bash
     npm start --workspace=api
     ```
   - **Health Check Path**: `/health`
4. Add the following **Environment Variables**:
   | Variable | Value / Description |
   | :--- | :--- |
   | `NODE_VERSION` | `20` |
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | `file:./dev.db` *(or PostgreSQL URL if using cloud DB)* |
   | `SESSION_SECRET` | *(Random 32-character string)* |
   | `DISCORD_CLIENT_ID` | Your Discord App ID |
   | `DISCORD_CLIENT_SECRET` | Your Discord App Secret |
   | `DISCORD_CALLBACK_URL` | `https://<your-app-name>.onrender.com/auth/discord/callback` |
   | `FRONTEND_URL` | Your frontend website URL |
   | `ADMIN_DISCORD_IDS` | Your Discord user ID |
5. Click **Deploy Web Service**.

---

## 🔗 Discord Developer Portal Configuration

Once your Render Web Service is deployed, remember to add your Render redirect URL in the [Discord Developer Portal](https://discord.com/developers/applications):
1. Navigate to your application -> **OAuth2** -> **Redirects**.
2. Add:
   ```
   https://<your-render-app-name>.onrender.com/auth/discord/callback
   ```
3. Save changes.

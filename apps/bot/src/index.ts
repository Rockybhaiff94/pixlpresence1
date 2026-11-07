import http from 'node:http';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Extend the Discord Client to hold commands
declare module 'discord.js' {
  export interface Client {
    commands: Collection<string, any>;
  }
}

export type BotStatus = 'STOPPED' | 'STARTING' | 'READY' | 'ERROR';

let client: Client | null = null;
let status: BotStatus = 'STOPPED';
let standaloneServer: http.Server | null = null;
let initPromise: Promise<Client | null> | null = null;

export function getBotStatus(): BotStatus {
  return status;
}

export function getBotClient(): Client | null {
  return client;
}

/**
 * Initializes and logs in the Discord Bot.
 * Safe against duplicate invocations; logs independently from the host API.
 */
export async function startBot(overrideToken?: string): Promise<Client | null> {
  if (client && (status === 'READY' || status === 'STARTING')) {
    console.log('[PixelBot] Bot instance is already active or starting.');
    return client;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    status = 'STARTING';
    const token = overrideToken || process.env.DISCORD_BOT_TOKEN;

    if (!token || !token.trim()) {
      console.warn('[PixelBot] No DISCORD_BOT_TOKEN provided in environment. Discord bot skipped.');
      status = 'STOPPED';
      initPromise = null;
      return null;
    }

    try {
      client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
        ],
      });

      client.commands = new Collection();

      // Independent Bot Error & Reconnection Listeners to prevent process crashes
      client.on('error', (err) => {
        console.error('[PixelBot Client Error]:', err);
      });
      client.on('shardError', (err, shardId) => {
        console.error(`[PixelBot Shard ${shardId} Error]:`, err);
      });
      client.on('shardDisconnect', (event, shardId) => {
        console.warn(`[PixelBot Shard ${shardId} Disconnected]: Code ${event.code}, reason: ${event.reason}`);
      });
      client.on('shardReconnecting', (shardId) => {
        console.log(`[PixelBot Shard ${shardId} Reconnecting] to Discord Gateway...`);
      });
      client.on('shardResume', (shardId, replayedEvents) => {
        console.log(`[PixelBot Shard ${shardId} Resumed]: Replayed ${replayedEvents} events.`);
      });

      // Load Commands from commands directory
      const commandsPath = path.join(__dirname, 'commands');
      if (fs.existsSync(commandsPath)) {
        const commandFiles = fs.readdirSync(commandsPath).filter(
          (file) => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')
        );
        for (const file of commandFiles) {
          try {
            const filePath = path.join(commandsPath, file);
            const command = require(filePath).default || require(filePath);

            if ('data' in command && 'execute' in command) {
              client.commands.set(command.data.name, command);
            } else {
              console.warn(`[PixelBot Warning] Command at ${filePath} missing required 'data' or 'execute'.`);
            }
          } catch (cmdErr) {
            console.error(`[PixelBot] Failed to load command ${file}:`, cmdErr);
          }
        }
      }

      // Load Events from events directory
      const eventsPath = path.join(__dirname, 'events');
      if (fs.existsSync(eventsPath)) {
        const eventFiles = fs.readdirSync(eventsPath).filter(
          (file) => (file.endsWith('.ts') || file.endsWith('.js')) && !file.endsWith('.d.ts')
        );
        for (const file of eventFiles) {
          try {
            const filePath = path.join(eventsPath, file);
            const event = require(filePath).default || require(filePath);

            if (event.once) {
              client.once(event.name, (...args) => event.execute(...args));
            } else {
              client.on(event.name, (...args) => event.execute(...args));
            }
          } catch (evtErr) {
            console.error(`[PixelBot] Failed to load event ${file}:`, evtErr);
          }
        }
      }

      await client.login(token);
      status = 'READY';
      console.log(`[PixelBot] Logged into Discord Gateway successfully as ${client.user?.tag}`);
      return client;
    } catch (err) {
      status = 'ERROR';
      console.error('[PixelBot Login Error]: Failed to connect to Discord Gateway:', err);
      // Gracefully return null without terminating the host API process
      return null;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Gracefully disconnects and destroys the Discord Bot instance.
 */
export async function stopBot(): Promise<void> {
  if (!client) {
    status = 'STOPPED';
    return;
  }

  try {
    console.log('[PixelBot] Disconnecting from Discord Gateway...');
    await client.destroy();
    console.log('[PixelBot] Disconnected and client destroyed.');
  } catch (err) {
    console.error('[PixelBot Shutdown Error]:', err);
  } finally {
    client = null;
    status = 'STOPPED';
  }

  if (standaloneServer) {
    try {
      standaloneServer.close();
      standaloneServer = null;
    } catch (_) {}
  }
}

// Standalone execution support: if run directly via node dist/index.js
if (require.main === module) {
  console.log('[PixelBot] Starting in standalone mode...');

  // Start lightweight health server only if explicitly running standalone
  const standalonePort = Number(process.env.STANDALONE_PORT || process.env.PORT) || 10000;
  standaloneServer = http.createServer((req, res) => {
    const url = req.url ? req.url.split('?')[0] : '';
    if (req.method === 'GET' && (url === '/health' || url === '/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'pixelgg-bot-standalone', botStatus: status }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  standaloneServer.listen(standalonePort, '0.0.0.0', () => {
    console.log(`[PixelBot] Standalone health server listening on http://0.0.0.0:${standalonePort}`);
  });

  startBot().catch((err) => {
    console.error('[PixelBot Standalone Startup Error]:', err);
  });

  process.on('SIGINT', async () => {
    await stopBot();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await stopBot();
    process.exit(0);
  });
}

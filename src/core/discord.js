// ── Discord Client Manager ──────────────────────────
// Centralized client creation and event management

import { Client } from 'discord.js-selfbot-v13';

let client = null;
let globalPresences = new Map();

export function createClient() {
  client = new Client({
    checkUpdate: false,
    ws: { properties: { browser: 'Discord Client' } },
    intents: []
  });

  // Track presences globally
  client.on('presenceUpdate', (_, newPresence) => {
    if (newPresence?.userId) {
      globalPresences.set(newPresence.userId, newPresence.status);
    }
  });

  return client;
}

export function getClient() {
  return client;
}

export function getPresence(userId) {
  if (!client) return null;
  let status = globalPresences.get(userId);
  if (!status) {
    for (const guild of client.guilds.cache.values()) {
      const presence = guild.presences.cache.get(userId);
      if (presence?.status) {
        status = presence.status;
        globalPresences.set(userId, status);
        break;
      }
    }
  }
  return status;
}

export async function loginClient(token) {
  if (!client) createClient();
  await client.login(token);
  return client;
}

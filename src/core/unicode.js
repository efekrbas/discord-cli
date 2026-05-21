// ── Shared Unicode & Text Utilities ─────────────────
// Single source of truth — imported by all UI modules

/**
 * Normalize text for terminal rendering (Ink / blessed width bugs).
 * Strips invisible/bidi/combining chars and pads wide glyphs.
 */
export function sanitizeTerminalText(text) {
  if (!text) return '';
  let s = String(text)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\u00AD\u034F\u180E]/g, '')
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, '')
    .replace(/[\uFE00-\uFE0F]/g, '')
    .replace(/\p{M}+/gu, '')
    .replace(/(?!\p{Extended_Pictographic})[\u{10000}-\u{10FFFF}]/gu, '');

  s = s
    .replace(/(\p{Extended_Pictographic})/gu, '$1 ')
    .replace(/([\u2100-\u2BFF\u25A0-\u25FF])/gu, '$1 ')
    .replace(/ {3,}/g, '  ');

  // Break very long unbroken runs so wrap cannot spill into the next row
  const maxRun = 48;
  s = s.replace(new RegExp(`[^\\s]{${maxRun + 1},}`, 'g'), (run) => {
    const chunks = [];
    for (let i = 0; i < run.length; i += maxRun) {
      chunks.push(run.slice(i, i + maxRun));
    }
    return chunks.join('\n');
  });

  return s.trim();
}

/**
 * Strip invisible/problematic unicode from display names.
 */
export function cleanName(name) {
  if (!name) return '';
  return sanitizeTerminalText(name);
}

/**
 * Format a Discord user's display name for terminal rendering.
 */
export function formatAuthor(user) {
  if (!user) return 'Unknown';
  const raw = user.globalName || user.global_name || user.displayName || user.username;
  return cleanName(raw) || user.username || 'Unknown';
}

/**
 * Get status emoji for a user's presence.
 */
export function getStatusEmoji(status) {
  if (status === 'online') return '🟢';
  if (status === 'dnd') return '🔴';
  if (status === 'idle') return '🟠';
  return '⚪';
}

/**
 * Format a timestamp into a readable time string.
 */
export function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  const m = date.getMinutes().toString().padStart(2, '0');
  const ampm = date.getHours() >= 12 ? 'PM' : 'AM';
  const h12 = (date.getHours() % 12) || 12;
  return `${h12}:${m} ${ampm}`;
}

/**
 * Clean message content for terminal display.
 */
export function cleanContent(text) {
  if (!text) return '';
  const cleaned = text
    .replace(/<@!?(\d+)>/g, '@user')
    .replace(/<#(\d+)>/g, '#channel')
    .replace(/<@&(\d+)>/g, '@role')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/\|\|(.+?)\|\|/gs, '[spoiler]')
    .trim();
  return sanitizeTerminalText(cleaned);
}

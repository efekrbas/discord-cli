import blessed from 'blessed';
import { Client } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { tmpdir } from 'os';

dotenv.config();

let client = null;
let currentChannel = null;
let currentGuild = null;
let guilds = [];
let channels = [];
let messages = [];
let messageMap = new Map();
let messageFiles = new Map(); // Stores file URLs for all attachments (images and files)
let deletedMessageIds = new Set();
let sentMessageIds = new Set();
let selectedIndex = 0;
let mode = 'guilds'; // 'guilds', 'channels', 'chat'
let replyToMessageId = null;
let channelLastReadMessage = new Map();

// Global fonksiyonlar
async function openFileInBrowser(url, fileName = null) {
  try {
    // Check if file is a text file (js, txt, json, etc.)
    const textExtensions = ['.js', '.txt', '.json', '.html', '.css', '.md', '.xml', '.yaml', '.yml', '.log', '.csv', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.h', '.hpp', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.sh', '.bat', '.ps1'];
    const isTextFile = fileName && textExtensions.some(ext => fileName.toLowerCase().endsWith(ext));

    if (isTextFile) {
      // Fetch file content and create HTML viewer
      const response = await fetch(url);
      const content = await response.text();

      // Create HTML viewer with syntax highlighting
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${fileName || 'File Viewer'}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #1e1e1e;
      color: #d4d4d4;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 14px;
      line-height: 1.6;
    }
    pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    code {
      color: #d4d4d4;
    }
  </style>
</head>
<body>
  <h2 style="color: #4ec9b0; margin-top: 0;">${fileName || 'File'}</h2>
  <pre><code>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/&/g, '&amp;')}</code></pre>
</body>
</html>`;

      // Create temporary HTML file
      const tempFile = join(tmpdir(), `discord-cli-viewer-${Date.now()}.html`);
      writeFileSync(tempFile, html, 'utf8');

      // Open HTML file in browser
      const command = process.platform === 'win32' ? `start "" "${tempFile}"` :
        process.platform === 'darwin' ? `open "${tempFile}"` : `xdg-open "${tempFile}"`;

      exec(command, (error) => {
        if (error) {
          console.error('Error opening file:', error);
        } else {
          // Clean up temp file after 5 seconds
          setTimeout(() => {
            try {
              unlinkSync(tempFile);
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 5000);
        }
      });
    } else {
      // For non-text files, open directly
      const command = process.platform === 'win32' ? `start "" "${url}"` :
        process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;

      exec(command, (error) => {
        if (error) {
          console.error('Error opening file:', error);
        }
      });
    }
  } catch (error) {
    // Fallback: try to open URL directly
    const command = process.platform === 'win32' ? `start "" "${url}"` :
      process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;

    exec(command, (error) => {
      if (error) {
        console.error('Dosya açma hatası:', error);
      }
    });
  }
}

export async function startServer(selectedToken = null) {
  console.log(chalk.cyan('\nStarting Discord Server Browser...\n'));

  const token = selectedToken || process.env.DISCORD_USER_TOKEN;
  if (!token) {
    console.error(chalk.red('HATA: DISCORD_USER_TOKEN environment variable bulunamadı!'));
    console.log(chalk.yellow('\nLütfen .env dosyası oluşturup DISCORD_USER_TOKEN değerini ekleyin.'));
    process.exit(1);
  }

  client = new Client({
    checkUpdate: false,
    ws: {
      properties: {
        browser: "Discord Client"
      }
    },
    intents: []
  });

  const screen = blessed.screen({
    smartCSR: true, // Re-enable smartCSR
    title: 'Discord CLI',
    fullUnicode: true // Emoji desteği için
  });

  const container = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    style: {
      bg: 'black'
    }
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: 'DiscordCLI (• Live) / Server Browser',
    tags: true,
    style: {
      bg: 'black',
      fg: 'white',
      bold: true
    }
  });



  const list = blessed.list({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-3',
    keys: false,
    vi: false,
    mouse: true,
    tags: true,
    invertSelected: false,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      inverse: true
    },
    style: {
      bg: 'black',
      selected: {
        bg: 'black',
        fg: 'white'
      },
      item: {
        bg: 'black',
        fg: 'white'
      }
    }
  });


  const messageList = blessed.box({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-9',
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      inverse: true
    },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    style: {
      bg: 'black',
      fg: 'white'
    }
  });

  const input = blessed.textbox({
    bottom: 3,
    left: 0,
    width: '100%',
    height: 3,
    inputOnFocus: true,
    keys: true,
    style: {
      bg: 'black',
      fg: 'white',
      focus: {
        bg: 'blue',
        fg: 'white'
      }
    }
  });

  const helpText = blessed.text({
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    content: 'j/k: navigate, Enter: select, Esc: back/quit',
    style: {
      bg: 'black',
      fg: 'gray'
    }
  });

  screen.append(container);
  container.append(header);
  container.append(list);
  container.append(messageList);
  container.append(input);
  container.append(helpText);

  function switchMode(newMode) {
    // Hide everything first
    list.hide();
    messageList.hide();
    input.hide();

    mode = newMode;
    if (mode === 'guilds') {
      // Clear content to prevent rendering artifacts
      messageList.setContent('');
      input.setValue('');

      header.setContent('DiscordCLI (• Live) / Server Browser');

      list.show();
      list.focus();
      helpText.setContent('j/k: navigate, Enter: select, Esc: quit');
    } else if (mode === 'channels') {
      // Clear content to prevent rendering artifacts
      messageList.setContent('');
      input.setValue('');

      header.setContent(`DiscordCLI (• Live) / Server Browser | ${currentGuild ? currentGuild.name : 'Unknown'}`);

      list.show();
      list.focus();
      helpText.setContent('j/k: navigate, Enter: select, Esc: back');
    } else if (mode === 'chat') {
      list.hide();
      messageList.show();
      input.show();
      input.focus();
      helpText.setContent('Esc: back, Ctrl+D: clear input, /upload <path>: upload file, /view <id>: open file, /reply <id> <msg>: reply, /edit <id> <msg>: edit, /delete <id>: delete, /help: commands');
    }
    screen.render();
  }

  function cleanMessageContent(text) {
    if (!text) return '';

    // First, strip HTML tags and extract only text content
    let cleaned = text
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&lt;/g, '<') // Unescape HTML entities
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Remove markdown formatting and Discord-specific formatting
    cleaned = cleaned
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold **text**
      .replace(/\*(.*?)\*/g, '$1') // Remove italic *text*
      .replace(/__(.*?)__/g, '$1') // Remove underline __text__
      .replace(/~~(.*?)~~/g, '$1') // Remove strikethrough ~~text~~
      .replace(/`([^`]*)`/g, '$1') // Remove inline code `code`
      .replace(/```[\s\S]*?```/g, '[Code Block]') // Replace code blocks
      .replace(/^> /gm, '') // Remove quote markers at line start
      .replace(/^#{1,6} /gm, '') // Remove heading markers (#, ##, etc.)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/<@!?\d+>/g, '') // Remove user mentions
      .replace(/<#\d+>/g, '') // Remove channel mentions
      .replace(/<@&\d+>/g, '') // Remove role mentions
      .replace(/<:[^:]+:\d+>/g, '') // Remove custom emoji
      .replace(/<a:[^:]+:\d+>/g, '') // Remove animated emoji
      .replace(/<@!?&?\d+>/g, ''); // Remove any remaining mentions

    // Replace multiple newlines with single newline, limit to prevent render issues
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Remove any control characters that might cause rendering issues (except newline and tab)
    cleaned = cleaned.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');

    return cleaned.trim();
  }

  function renderAllMessages() {
    try {
      let content = '';
      for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        let messageContent = '';
        if (msg.isImage) {
          const fileUrl = messageFiles.get(msg.messageId);
          if (msg.fileName) {
            messageContent = `{blue-fg}[File: {/blue-fg}{yellow-fg}${msg.fileName}{/yellow-fg}{blue-fg}]{/blue-fg}`;
          } else if (fileUrl && msg.messageId) {
            messageContent = `{blue-fg}[Image]{/blue-fg}`;
          } else {
            messageContent = `{blue-fg}[File]{/blue-fg}`;
          }
        } else if (msg.content && msg.content.trim()) {
          messageContent = cleanMessageContent(msg.content);
        } else {
          messageContent = '{gray-fg}(empty message){/gray-fg}';
        }

        if (msg.messageId && deletedMessageIds.has(msg.messageId)) {
          messageContent += ` {red-fg}[message deleted]{/red-fg}`;
        }

        let replyInfo = '';
        if (msg.replyTo) {
          const repliedMsg = messageMap.get(msg.replyTo);
          if (repliedMsg) {
            const replyContent = repliedMsg.content ? repliedMsg.content.substring(0, 30) : '[Media]';
            replyInfo = `{yellow-fg}↪ Replying to ${repliedMsg.username}: ${replyContent}${replyContent.length >= 30 ? '...' : ''}{/yellow-fg}\n`;
          }
        }

        const isSystemMessage = msg.username === 'System';
        const prefix = isSystemMessage ? '{red-fg}System{/red-fg}' : (msg.isOwn ? '{green-fg}You{/green-fg}' : `{cyan-fg}${msg.username}{/cyan-fg}`);
        const idInfo = (msg.messageId && !isSystemMessage) ? ` {blue-fg}({/blue-fg}{yellow-fg}${msg.messageId}{/yellow-fg}{blue-fg}){/blue-fg}` : '';

        content += `${replyInfo}${prefix} [${time}]\n${messageContent}${idInfo}\n\n`;
      }

      messageList.setContent(content);
      messageList.setScrollPerc(100);
      screen.render();
    } catch (error) {
      console.error('renderAllMessages error:', error);
    }
  }

  function addMessage(username, content, timestamp, isImage = false, isOwn = false, messageId = null, replyTo = null, imageUrl = null, fileName = null) {
    try {
      const time = new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      let messageContent = '';
      if (isImage && fileName) {
        messageContent = `{blue-fg}[File: {/blue-fg}{yellow-fg}${fileName}{/yellow-fg}{blue-fg}]{/blue-fg}`;
        if (imageUrl) {
          messageFiles.set(messageId, { url: imageUrl, fileName: fileName });
        }
      } else if (isImage && imageUrl) {
        messageContent = `{blue-fg}[Image]{/blue-fg}`;
        messageFiles.set(messageId, { url: imageUrl, fileName: null });
      } else if (isImage) {
        messageContent = `{blue-fg}[File]{/blue-fg}`;
      } else if (content && content.trim()) {
        messageContent = cleanMessageContent(content);
      } else {
        messageContent = '{gray-fg}(empty message){/gray-fg}';
      }

      let replyInfo = '';
      if (replyTo) {
        const repliedMsg = messageMap.get(replyTo);
        if (repliedMsg) {
          const replyContent = repliedMsg.content ? repliedMsg.content.substring(0, 30) : '[Media]';
          replyInfo = `{yellow-fg}↪ Replying to ${repliedMsg.username}: ${replyContent}${replyContent.length >= 30 ? '...' : ''}{/yellow-fg}\n`;
        }
      }

      const isSystemMessage = username === 'System';
      const prefix = isSystemMessage ? '{red-fg}System{/red-fg}' : (isOwn ? '{green-fg}You{/green-fg}' : `{cyan-fg}${username}{/cyan-fg}`);
      const idInfo = (messageId && !isSystemMessage) ? ` {blue-fg}({/blue-fg}{yellow-fg}${messageId}{/yellow-fg}{blue-fg}){/blue-fg}` : '';

      const message = `${replyInfo}${prefix} [${time}]\n${messageContent}${idInfo}\n\n`;

      const msgObj = { username, content: content || '', timestamp, isImage, isOwn, messageId, replyTo, fileName };

      if (messageId && messageMap.has(messageId)) {
        return;
      }

      messages.push(msgObj);

      if (messageId) {
        messageMap.set(messageId, msgObj);
      }

      // Use renderAllMessages instead of appending to prevent render issues
      renderAllMessages();
    } catch (error) {
      console.error('addMessage error:', error);
    }
  }

  async function loadChannelMessages(channel) {
    try {
      messages = [];
      messageMap.clear();
      messageFiles.clear();
      deletedMessageIds.clear();
      messageList.setContent('');

      const fetchedMessages = await channel.messages.fetch({ limit: 50 });
      const sortedMessages = Array.from(fetchedMessages.values()).reverse();

      for (const message of sortedMessages) {
        const hasImage = message.attachments && message.attachments.size > 0;
        const replyTo = message.reference?.messageId || null;

        let imageUrl = null;
        let fileName = null;
        if (hasImage) {
          const attachment = message.attachments.first();
          imageUrl = attachment?.url || null;
          fileName = attachment?.name || null;
        }

        // Handle embed messages
        let messageContent = message.content || '';
        if (message.embeds && message.embeds.size > 0) {
          const embed = message.embeds.first();
          if (embed.title) {
            messageContent += (messageContent ? '\n' : '') + embed.title;
          }
          if (embed.description) {
            messageContent += (messageContent ? '\n' : '') + embed.description;
          }
          if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
              if (field.name) {
                messageContent += (messageContent ? '\n' : '') + field.name + ':';
              }
              if (field.value) {
                messageContent += (messageContent ? '\n' : '') + field.value;
              }
            }
          }
        }

        // Clean the entire message content
        messageContent = cleanMessageContent(messageContent);

        addMessage(
          message.author.username,
          messageContent,
          message.createdTimestamp,
          hasImage,
          message.author.id === client.user.id,
          message.id,
          replyTo,
          imageUrl,
          fileName
        );
      }

      if (sortedMessages.length > 0) {
        const lastMessage = sortedMessages[sortedMessages.length - 1];
        channelLastReadMessage.set(channel.id, lastMessage.id);
      }

      screen.render();
      return true; // Success
    } catch (error) {
      console.error('loadChannelMessages error:', error);
      return false; // Failed
    }
  }

  function updateGuildList(selectedIndexOverride = null) {
    try {
      const currentSelected = selectedIndexOverride !== null ? selectedIndexOverride : (list.selected >= 0 ? list.selected : selectedIndex);
      const targetIdx = currentSelected < guilds.length ? currentSelected : 0;

      // Build items with '>' prefix for selected item
      const items = guilds.map((g, idx) => {
        const prefix = idx === targetIdx ? '{yellow-fg}>{/yellow-fg} ' : '  ';
        const name = g.name || '';
        return prefix + name;
      });

      // Update items directly to preserve scroll state
      list.setItems(items);

      if (items.length > 0) {
        if (targetIdx >= 0 && targetIdx < items.length) {
          if (list.selected !== targetIdx) {
            list.select(targetIdx);
          }
          // Ensure the selected item is visible (autoscroll)
          list.scrollTo(targetIdx);
        }
      }

      screen.render();
    } catch (error) {
      console.error('updateGuildList error:', error);
    }
  }

  function updateChannelList(selectedIndexOverride = null) {
    try {
      const currentSelected = selectedIndexOverride !== null ? selectedIndexOverride : (list.selected >= 0 ? list.selected : selectedIndex);
      const targetIdx = currentSelected < channels.length ? currentSelected : 0;

      // Build items with '>' prefix for selected item
      const items = channels.map((c, idx) => {
        const prefix = idx === targetIdx ? '{yellow-fg}>{/yellow-fg} ' : '  ';
        const name = c.name || '';
        return prefix + name;
      });

      // Update items directly to preserve scroll state
      list.setItems(items);

      if (items.length > 0) {
        if (targetIdx >= 0 && targetIdx < items.length) {
          if (list.selected !== targetIdx) {
            list.select(targetIdx);
          }
          // Ensure the selected item is visible (autoscroll)
          list.scrollTo(targetIdx);
        }
      }

      screen.render();
    } catch (error) {
      console.error('updateChannelList error:', error);
    }
  }

  // Manual navigation to prevent skipping and update '>' prefix
  list.on('keypress', (ch, key) => {
    if (key.name === 'down' || key.name === 'j') {
      if (list.selected < list.items.length - 1) {
        const nextIndex = list.selected + 1;
        if (mode === 'guilds') {
          updateGuildList(nextIndex);
        } else if (mode === 'channels') {
          updateChannelList(nextIndex);
        }
      }
      return false; // Prevent default behavior
    } else if (key.name === 'up' || key.name === 'k') {
      if (list.selected > 0) {
        const prevIndex = list.selected - 1;
        if (mode === 'guilds') {
          updateGuildList(prevIndex);
        } else if (mode === 'channels') {
          updateChannelList(prevIndex);
        }
      }
      return false; // Prevent default behavior
    } else if (key.name === 'enter') {
      const selectedIndex = list.selected;
      const selectedItem = list.items[selectedIndex];
      list.emit('select', selectedItem, selectedIndex);
      return false;
    }
  });

  list.on('select', async (item, index) => {
    selectedIndex = index;

    if (mode === 'guilds') {
      const selectedGuild = guilds[index];
      if (selectedGuild) {
        currentGuild = selectedGuild.guild;
        channels = [];

        try {
          const guildChannels = currentGuild.channels.cache;
          const channelsArray = [];

          // Separate categories and text channels
          const categories = [];
          const textChannels = [];

          for (const channel of guildChannels.values()) {
            const channelType = channel.type;
            const constructorName = channel.constructor?.name || '';

            // Check if channel is viewable (user has permission to see it)
            if (!channel.viewable) {
              continue; // Skip hidden channels
            }

            // Check if it's a category
            if (channelType === 4 ||
              channelType === 'GUILD_CATEGORY' ||
              channelType === 'category' ||
              constructorName === 'CategoryChannel') {
              categories.push(channel);
            }
            // Check if it's a text channel
            else if (channelType === 0 ||
              channelType === 'GUILD_TEXT' ||
              channelType === 'text' ||
              constructorName === 'TextChannel') {
              textChannels.push(channel);
            }
          }

          // Sort categories and channels by position
          categories.sort((a, b) => a.position - b.position);
          textChannels.sort((a, b) => a.position - b.position);

          // Group channels by category
          const channelsByCategory = new Map();
          const uncategorizedChannels = [];

          for (const channel of textChannels) {
            if (channel.parent) {
              const categoryId = channel.parent.id;
              if (!channelsByCategory.has(categoryId)) {
                channelsByCategory.set(categoryId, []);
              }
              channelsByCategory.get(categoryId).push(channel);
            } else {
              uncategorizedChannels.push(channel);
            }
          }

          // Build the list: categories with their channels
          for (const category of categories) {
            // Add category
            channelsArray.push({
              channel: category,
              name: `📁 ${category.name || 'Unnamed Category'}`,
              type: 'category'
            });

            // Add channels in this category
            const categoryChannels = channelsByCategory.get(category.id) || [];
            for (const channel of categoryChannels) {
              channelsArray.push({
                channel,
                name: `  # ${channel.name || 'Unnamed'}`,
                type: 'guild'
              });
            }
          }

          // Add uncategorized channels
          for (const channel of uncategorizedChannels) {
            channelsArray.push({
              channel,
              name: `# ${channel.name || 'Unnamed'}`,
              type: 'guild'
            });
          }

          channels = channelsArray;
          switchMode('channels');
          updateChannelList();
        } catch (error) {
          console.error('Error loading channels:', error);
        }
      }
    } else if (mode === 'channels') {
      const selectedChannel = channels[index];
      if (selectedChannel) {
        // Skip if it's a category
        if (selectedChannel.type === 'category') {
          return;
        }

        currentChannel = selectedChannel.channel;
        const channelName = selectedChannel.name.trim();
        header.setContent(`DiscordCLI (• Live) / Server Browser | ${currentGuild.name} > ${channelName}`);

        const success = await loadChannelMessages(currentChannel);
        if (success) {
          switchMode('chat');
        } else {
          // Failed to load messages (e.g., Missing Access), stay in channels mode
          // Don't switch to chat mode, just stay in channels mode
        }
      }
    }
  });


  input.on('submit', async (value) => {
    const trimmedValue = (value || '').trim();

    input.clearValue();

    if (!trimmedValue || !currentChannel || mode !== 'chat') {
      input.focus();
      screen.render();
      return;
    }

    try {
      if (trimmedValue.startsWith('/')) {
        const parts = trimmedValue.split(' ');
        const command = parts[0].substring(1).toLowerCase();

        if (command === 'upload' && parts.length >= 2) {
          const filePath = parts.slice(1).join(' ').trim().replace(/^["']|["']$/g, '');

          if (!existsSync(filePath)) {
            addMessage('System', `File not found: ${filePath}`, Date.now());
          } else {
            try {
              addMessage('System', 'Uploading file...', Date.now());

              const sentMessage = await currentChannel.send({
                files: [{
                  attachment: filePath,
                  name: basename(filePath)
                }]
              });

              sentMessageIds.add(sentMessage.id);
              const hasImage = sentMessage.attachments && sentMessage.attachments.size > 0;
              let imageUrl = null;
              let fileName = null;
              if (hasImage) {
                const attachment = sentMessage.attachments.first();
                imageUrl = attachment?.url || null;
                fileName = attachment?.name || null;
              }

              addMessage(client.user.username, '', sentMessage.createdTimestamp, hasImage, true, sentMessage.id, null, imageUrl, fileName);
            } catch (error) {
              addMessage('System', `Error uploading file: ${error.message}`, Date.now());
            }
          }
        }
        else if (command === 'upload') {
          addMessage('System', 'Usage: /upload <file_path>', Date.now());
        }
        else if (command === 'view' && parts.length >= 2) {
          const shortId = parts[1];

          let foundFileInfo = null;
          for (const [msgId, fileInfo] of messageFiles.entries()) {
            if (msgId.startsWith(shortId)) {
              foundFileInfo = fileInfo;
              break;
            }
          }

          if (foundFileInfo) {
            const fileUrl = typeof foundFileInfo === 'string' ? foundFileInfo : foundFileInfo.url;
            const fileName = typeof foundFileInfo === 'object' ? foundFileInfo.fileName : null;
            openFileInBrowser(fileUrl, fileName);
            addMessage('System', 'Opening file in browser...', Date.now());
          } else {
            addMessage('System', `File not found. ID: ${shortId}`, Date.now());
          }
        }
        else if (command === 'view') {
          addMessage('System', 'Usage: /view <message_id>', Date.now());
        }
        else if (command === 'reply' && parts.length >= 3) {
          const replyToId = parts[1];
          const replyContent = parts.slice(2).join(' ');

          const sentMessage = await currentChannel.send({
            content: replyContent,
            reply: { messageReference: replyToId }
          });

          sentMessageIds.add(sentMessage.id);
          addMessage(client.user.username, replyContent, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToId);
          replyToMessageId = null;
        }
        else if (command === 'reply') {
          addMessage('System', 'Usage: /reply <message_id> <message>', Date.now());
        }
        else if (command === 'r' && parts.length >= 3) {
          const replyToId = parts[1];
          const replyContent = parts.slice(2).join(' ');

          const sentMessage = await currentChannel.send({
            content: replyContent,
            reply: { messageReference: replyToId }
          });

          sentMessageIds.add(sentMessage.id);
          addMessage(client.user.username, replyContent, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToId);
          replyToMessageId = null;
        }
        else if (command === 'r') {
          addMessage('System', 'Usage: /r <message_id> <message>', Date.now());
        }
        else if (command === 'delete' && parts.length >= 2) {
          const messageId = parts[1];

          try {
            const message = await currentChannel.messages.fetch(messageId);

            if (message.author.id === client.user.id) {
              await message.delete();
              addMessage('System', `Message deleted: ${messageId}`, Date.now());
            } else {
              addMessage('System', 'You can only delete your own messages.', Date.now());
            }
          } catch (error) {
            if (error.code === 10008) {
              addMessage('System', `Message not found: ${messageId}`, Date.now());
            } else {
              addMessage('System', `Error deleting message: ${error.message}`, Date.now());
            }
          }
        }
        else if (command === 'delete') {
          addMessage('System', 'Usage: /delete <message_id>', Date.now());
        }
        else if (command === 'edit' && parts.length >= 3) {
          const messageId = parts[1];
          const newContent = parts.slice(2).join(' ');

          try {
            const message = await currentChannel.messages.fetch(messageId);

            if (message.author.id === client.user.id) {
              await message.edit(newContent);
              addMessage('System', `Message edited: ${messageId}`, Date.now());

              if (messageMap.has(messageId)) {
                const msgObj = messageMap.get(messageId);
                msgObj.content = newContent;
                renderAllMessages();
              }
            } else {
              addMessage('System', 'You can only edit your own messages.', Date.now());
            }
          } catch (error) {
            if (error.code === 10008) {
              addMessage('System', `Message not found: ${messageId}`, Date.now());
            } else {
              addMessage('System', `Error editing message: ${error.message}`, Date.now());
            }
          }
        }
        else if (command === 'edit') {
          addMessage('System', 'Usage: /edit <message_id> <new_message>', Date.now());
        }
        else if (command === 'help') {
          addMessage('System', 'Commands:\n- /upload <file_path>: Upload file\n- /view <message_id>: Open file in browser\n- /reply <message_id> <message>: Reply to message\n- /r <message_id> <message>: Reply to message (short)\n- /delete <message_id>: Delete message\n- /edit <message_id> <new_message>: Edit message', Date.now());
        }
        else {
          addMessage('System', `Unknown command: ${command}. Use /help for help.`, Date.now());
        }
      } else {
        const sentMessage = await currentChannel.send(trimmedValue);

        sentMessageIds.add(sentMessage.id);
        addMessage(client.user.username, trimmedValue, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToMessageId);
        replyToMessageId = null;
      }
    } catch (error) {
      addMessage('System', `Error: ${error.message}`, Date.now());
    }

    setImmediate(() => {
      messageList.setScrollPerc(100);
      input.focus();
      screen.render();
    });
  });

  input.on('keypress', () => {
    screen.render();
  });

  input.key(['C-d'], () => {
    if (mode === 'chat') {
      input.clearValue();
      input.focus();
      screen.render();
    }
  });


  client.on('messageDelete', (deletedMessage) => {
    if (currentChannel && deletedMessage.channel.id === currentChannel.id && mode === 'chat') {
      deletedMessageIds.add(deletedMessage.id);
      renderAllMessages();
    }
  });

  client.on('messageUpdate', (oldMessage, newMessage) => {
    try {
      if (currentChannel && newMessage.channel.id === currentChannel.id && mode === 'chat') {
        if (newMessage.id && messageMap.has(newMessage.id)) {
          const msgObj = messageMap.get(newMessage.id);
          let messageContent = newMessage.content || '';

          // Handle embed messages
          if (newMessage.embeds && newMessage.embeds.size > 0) {
            const embed = newMessage.embeds.first();
            if (embed.title) {
              messageContent += (messageContent ? '\n' : '') + embed.title;
            }
            if (embed.description) {
              messageContent += (messageContent ? '\n' : '') + embed.description;
            }
            if (embed.fields && embed.fields.length > 0) {
              for (const field of embed.fields) {
                if (field.name) {
                  messageContent += (messageContent ? '\n' : '') + field.name + ':';
                }
                if (field.value) {
                  messageContent += (messageContent ? '\n' : '') + field.value;
                }
              }
            }
          }

          msgObj.content = cleanMessageContent(messageContent);
          renderAllMessages();
        }
      }
    } catch (error) {
      console.error('messageUpdate error:', error);
    }
  });

  client.on('messageCreate', (message) => {
    try {
      if (currentChannel && message.channel.id === currentChannel.id && mode === 'chat') {
        const isOwnMessage = message.author.id === client.user.id;

        if (messageMap.has(message.id) || (isOwnMessage && sentMessageIds.has(message.id))) {
          return;
        }

        const hasImage = message.attachments && message.attachments.size > 0;
        const replyTo = message.reference?.messageId || null;

        let imageUrl = null;
        let fileName = null;
        if (hasImage) {
          const attachment = message.attachments.first();
          imageUrl = attachment?.url || null;
          fileName = attachment?.name || null;
        }

        // Handle embed messages
        let messageContent = message.content || '';
        if (message.embeds && message.embeds.size > 0) {
          const embed = message.embeds.first();
          if (embed.title) {
            messageContent += (messageContent ? '\n' : '') + embed.title;
          }
          if (embed.description) {
            messageContent += (messageContent ? '\n' : '') + embed.description;
          }
          if (embed.fields && embed.fields.length > 0) {
            for (const field of embed.fields) {
              if (field.name) {
                messageContent += (messageContent ? '\n' : '') + field.name + ':';
              }
              if (field.value) {
                messageContent += (messageContent ? '\n' : '') + field.value;
              }
            }
          }
        }

        // Clean the entire message content
        messageContent = cleanMessageContent(messageContent);

        addMessage(
          message.author.username,
          messageContent,
          message.createdTimestamp,
          hasImage,
          isOwnMessage,
          message.id,
          replyTo,
          imageUrl,
          fileName
        );

        setImmediate(() => {
          messageList.setScrollPerc(100);
          screen.render();
        });
      }
    } catch (error) {
      console.error('messageCreate error:', error);
    }
  });

  screen.key(['escape'], () => {
    if (mode === 'chat') {
      switchMode('channels');
      updateChannelList();
    } else if (mode === 'channels') {
      switchMode('guilds');
      updateGuildList();
    } else {
      return process.exit(0);
    }
  });


  try {
    await client.login(token);
  } catch (error) {
    console.error(chalk.red('Giriş hatası:'), error);
    process.exit(1);
  }

  client.once('ready', async () => {
    const statusText = `DiscordCLI (• Live) / Server Browser`;
    header.setContent(statusText);

    switchMode('guilds');

    guilds = [];

    try {
      const allGuilds = client.guilds.cache;

      for (const guild of allGuilds.values()) {
        guilds.push({
          guild,
          name: guild.name || 'Unknown Server'
        });
      }

      guilds.sort((a, b) => a.name.localeCompare(b.name));
      updateGuildList();

    } catch (error) {
      console.error('Error loading guilds:', error);
    }
  });
}


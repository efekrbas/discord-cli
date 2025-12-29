import blessed from 'blessed';
import { Client } from 'discord.js-selfbot-v13';
import chalk from 'chalk';
import dotenv from 'dotenv';
import { exec } from 'child_process';

dotenv.config();

let client = null;
let currentChannel = null;
let channels = [];
let messages = [];
let messageMap = new Map();
let messageImages = new Map();
let deletedMessageIds = new Set(); // Track deleted messages
let sentMessageIds = new Set(); // Track messages we've already added manually
let selectedIndex = 0;
let mode = 'threads';
let replyToMessageId = null;

// Global fonksiyonlar
function openImageInBrowser(url) {
  // Windows için özel komut - "" ile URL'yi escape et ve yeni pencere açma
  const command = process.platform === 'win32' ? `start "" "${url}"` :
                  process.platform === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
  
  exec(command, (error) => {
    if (error) {
      console.error('Resim açma hatası:', error);
    }
  });
}

export async function startChat() {
  console.log(chalk.cyan('\nStarting Discord Chat...\n'));

  const token = process.env.DISCORD_USER_TOKEN;
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
    smartCSR: true,
    title: 'discord-cli chat',
    fullUnicode: true
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
    content: 'DiscordCLI (• Live) / Chat with Discord',
    tags: true,
    style: {
      bg: 'black',
      fg: 'white',
      bold: true
    }
  });

  const threadHeader = blessed.text({
    top: 0,
    right: 0,
    width: 15,
    height: 1,
    content: '{green-fg}Threads{/green-fg}',
    tags: true
  });

  const threadList = blessed.list({
    top: 3,
    left: 0,
    width: '100%',
    height: '100%-3',
    keys: true,
    vi: true,
    mouse: true,
    style: {
      selected: {
        bg: 'blue',
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
    content: 'j/k: navigate, Enter: select, Esc: quit, Ctrl+C: quit',
    style: {
      bg: 'black',
      fg: 'gray'
    }
  });

  screen.append(container);
  container.append(header);
  header.append(threadHeader);
  container.append(threadList);
  container.append(messageList);
  container.append(input);
  container.append(helpText);

  function switchMode(newMode) {
    mode = newMode;
    if (mode === 'threads') {
      threadList.show();
      messageList.hide();
      input.hide();
      threadList.focus();
      helpText.setContent('j/k: navigate, Enter: select, Esc: quit, Ctrl+C: quit');
    } else if (mode === 'chat') {
      threadList.hide();
      messageList.show();
      input.show();
      input.focus();
      helpText.setContent('Esc: back, /img <id>: open image, /reply <id> <msg>: reply, /help: commands');
    }
    screen.render();
  }

  function renderAllMessages() {
    try {
      let content = '';
      for (const msg of messages) {
        const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        let messageContent = '';
        if (msg.isImage) {
          const imageUrl = messageImages.get(msg.messageId);
          if (imageUrl && msg.messageId) {
            messageContent = `{blue-fg}[Resim]{/blue-fg} {gray-fg}(Görüntülemek için: /img ${msg.messageId.substring(0, 8)}){/gray-fg}`;
          } else {
            messageContent = `{blue-fg}[Resim]{/blue-fg}`;
          }
        } else if (msg.content && msg.content.trim()) {
          messageContent = msg.content;
        } else {
          messageContent = '{gray-fg}(boş mesaj){/gray-fg}';
        }

        // Add "message deleted" if message was deleted
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
        const idInfo = (msg.messageId && !isSystemMessage) ? `(${msg.messageId})` : '';
        
        content += `${replyInfo}${prefix} [${time}]\n${messageContent}${idInfo ? ' ' + idInfo : ''}\n\n`;
      }
      
      messageList.setContent(content);
      messageList.setScrollPerc(100);
      screen.render();
    } catch (error) {
      console.error('renderAllMessages error:', error);
    }
  }

  function addMessage(username, content, timestamp, isImage = false, isOwn = false, messageId = null, replyTo = null, imageUrl = null) {
    try {
      const time = new Date(timestamp).toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      let messageContent = '';
      if (isImage && imageUrl) {
        messageContent = `{blue-fg}[Resim]{/blue-fg} {gray-fg}(Görüntülemek için: /img ${messageId.substring(0, 8)}){/gray-fg}`;
        messageImages.set(messageId, imageUrl);
      } else if (isImage) {
        messageContent = `{blue-fg}[Resim]{/blue-fg}`;
      } else if (content && content.trim()) {
        messageContent = content;
      } else {
        messageContent = '{gray-fg}(boş mesaj){/gray-fg}';
      }

      let replyInfo = '';
      if (replyTo) {
        const repliedMsg = messageMap.get(replyTo);
        if (repliedMsg) {
          const replyContent = repliedMsg.content ? repliedMsg.content.substring(0, 30) : '[Media]';
          replyInfo = `{yellow-fg}↪ Replying to ${repliedMsg.username}: ${replyContent}${replyContent.length >= 30 ? '...' : ''}{/yellow-fg}\n`;
        }
      }

      // Sistem mesajları için ID gösterme
      const isSystemMessage = username === 'System';
      const prefix = isSystemMessage ? '{red-fg}System{/red-fg}' : (isOwn ? '{green-fg}You{/green-fg}' : `{cyan-fg}${username}{/cyan-fg}`);
      const idInfo = (messageId && !isSystemMessage) ? `(${messageId})` : '';
      
      const message = `${replyInfo}${prefix} [${time}]\n${messageContent}${idInfo ? ' ' + idInfo : ''}\n\n`;
      
      const msgObj = { username, content: content || '', timestamp, isImage, isOwn, messageId, replyTo };
      
      // Check if message already exists to prevent duplicates
      if (messageId && messageMap.has(messageId)) {
        return;
      }
      
      messages.push(msgObj);
      
      if (messageId) {
        messageMap.set(messageId, msgObj);
      }
      
      const currentContent = messageList.getContent() || '';
      messageList.setContent(currentContent + message);
      
      messageList.setScrollPerc(100);
      screen.render();
    } catch (error) {
      console.error('addMessage error:', error);
    }
  }

  async function loadChannelMessages(channel) {
    try {
      const fetched = await channel.messages.fetch({ limit: 50 });
      const sortedMessages = Array.from(fetched.values())
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      messageList.setContent('');
      messages = [];
      messageMap.clear();
      messageImages.clear();
      deletedMessageIds.clear();
      sentMessageIds.clear();

      for (const msg of sortedMessages) {
        const hasImage = msg.attachments && msg.attachments.size > 0;
        const isOwn = msg.author.id === client.user.id;
        const replyTo = msg.reference?.messageId || null;
        
        let imageUrl = null;
        if (hasImage) {
          const attachment = msg.attachments.first();
          imageUrl = attachment?.url || null;
        }
        
        addMessage(
          msg.author.username,
          msg.content || '',
          msg.createdTimestamp,
          hasImage,
          isOwn,
          msg.id,
          replyTo,
          imageUrl
        );
      }
    } catch (error) {
      addMessage('System', `Mesajlar yüklenirken hata: ${error.message}`, Date.now());
    }
  }

  function updateThreadList() {
    const items = channels.map((ch) => {
      let preview = '';
      try {
        const lastMsg = ch.channel.lastMessage;
        if (lastMsg) {
          preview = lastMsg.content ? lastMsg.content.substring(0, 50) : '[Media]';
          if (preview.length < lastMsg.content?.length) preview += '...';
        }
      } catch (e) {
        preview = '';
      }
      
      return `${ch.name}${preview ? ' | ' + preview : ''}`;
    });
    
    threadList.setItems(items);
    threadList.select(selectedIndex);
    screen.render();
  }

  threadList.on('select', async (item, index) => {
    selectedIndex = index;
    const selectedChannel = channels[index];
    if (selectedChannel) {
      currentChannel = selectedChannel.channel;
      const channelName = selectedChannel.name;
      header.setContent(`DiscordCLI (• Live) / Chat with ${client.user.username} | ${channelName}`);
      
      await loadChannelMessages(currentChannel);
      switchMode('chat');
    }
  });

  client.once('ready', async () => {
    const statusText = `DiscordCLI (• Live) / Chat with ${client.user.username}`;
    header.setContent(statusText);
    
    switchMode('threads');

    channels = [];
    
    try {
      const allChannels = client.channels.cache;
      
      for (const channel of allChannels.values()) {
        try {
          const channelType = channel.type;
          const constructorName = channel.constructor?.name || '';
          const hasGuild = !!channel.guild;
          const hasRecipient = !!(channel.recipient || (channel.recipients && channel.recipients.first()));
          
          if (channelType === 0 || 
              channelType === 'GUILD_TEXT' || 
              channelType === 'text' ||
              constructorName === 'TextChannel' ||
              (hasGuild && !hasRecipient && channel.name)) {
            const guild = channel.guild;
            const guildName = guild ? guild.name : 'Unknown';
            const channelName = channel.name || 'Unnamed';
            
            channels.push({ 
              channel, 
              name: `${guildName} > ${channelName}`, 
              type: 'guild' 
            });
          }
          else if (channelType === 1 || 
                   channelType === 'DM' || 
                   channelType === 'dm' ||
                   constructorName === 'DMChannel' ||
                   (hasRecipient && !hasGuild)) {
            let recipientName = 'Unknown';
            const recipient = channel.recipient || (channel.recipients && channel.recipients.first());
            if (recipient) {
              recipientName = recipient.username || recipient.tag || recipient.toString();
            }
            
            channels.push({ 
              channel, 
              name: `DM: ${recipientName}`, 
              type: 'dm' 
            });
          }
          else if (channelType === 3 || 
                   channelType === 'GROUP_DM' || 
                   channelType === 'group' ||
                   constructorName === 'GroupDMChannel') {
            const groupName = channel.name || 'Group DM';
            channels.push({ 
              channel, 
              name: `DM: ${groupName}`, 
              type: 'dm' 
            });
          }
        } catch (error) {
          // Kanal işlenemezse devam et
        }
      }
      
      updateThreadList();
      
    } catch (error) {
      // Hata durumunda
    }
  });

  client.on('messageCreate', (message) => {
    try {
      if (currentChannel && message.channel.id === currentChannel.id && mode === 'chat') {
        const isOwnMessage = message.author.id === client.user.id;
        
        // Skip if we've already added this message manually
        if (messageMap.has(message.id) || (isOwnMessage && sentMessageIds.has(message.id))) {
          return;
        }
        
        const hasImage = message.attachments && message.attachments.size > 0;
        const replyTo = message.reference?.messageId || null;
        
        let imageUrl = null;
        if (hasImage) {
          const attachment = message.attachments.first();
          imageUrl = attachment?.url || null;
        }
        
        addMessage(
          message.author.username,
          message.content || '',
          message.createdTimestamp,
          hasImage,
          isOwnMessage,
          message.id,
          replyTo,
          imageUrl
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

  client.on('messageDelete', (message) => {
    try {
      if (currentChannel && message.channel.id === currentChannel.id && mode === 'chat') {
        if (message.id && messageMap.has(message.id)) {
          deletedMessageIds.add(message.id);
          renderAllMessages();
        }
      }
    } catch (error) {
      console.error('messageDelete error:', error);
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
        
        if (command === 'img' && parts.length >= 2) {
          const shortId = parts[1];
          
          let foundImageUrl = null;
          for (const [msgId, imgUrl] of messageImages.entries()) {
            if (msgId.startsWith(shortId)) {
              foundImageUrl = imgUrl;
              break;
            }
          }
          
          if (foundImageUrl) {
            openImageInBrowser(foundImageUrl);
            addMessage('System', 'Resim tarayıcıda açılıyor...', Date.now());
          } else {
            addMessage('System', `Resim bulunamadı. ID: ${shortId}`, Date.now());
          }
        }
        else if (command === 'reply' && parts.length >= 3) {
          const replyToId = parts[1];
          const replyContent = parts.slice(2).join(' ');
          
          const sentMessage = await currentChannel.send({
            content: replyContent,
            reply: { messageReference: replyToId }
          });
          
          // Mark as sent to prevent duplicate from messageCreate event
          sentMessageIds.add(sentMessage.id);
          addMessage(client.user.username, replyContent, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToId);
          replyToMessageId = null;
        }
        else if (command === 'r' && parts.length >= 3) {
          const replyToId = parts[1];
          const replyContent = parts.slice(2).join(' ');
          
          const sentMessage = await currentChannel.send({
            content: replyContent,
            reply: { messageReference: replyToId }
          });
          
          // Mark as sent to prevent duplicate from messageCreate event
          sentMessageIds.add(sentMessage.id);
          addMessage(client.user.username, replyContent, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToId);
          replyToMessageId = null;
        }
        else if (command === 'delete' && parts.length >= 2) {
          const messageId = parts[1];
          
          try {
            const message = await currentChannel.messages.fetch(messageId);
            
            // Check if message belongs to current user
            if (message.author.id === client.user.id) {
              await message.delete();
              addMessage('System', `Mesaj silindi: ${messageId}`, Date.now());
            } else {
              addMessage('System', 'Sadece kendi mesajlarınızı silebilirsiniz.', Date.now());
            }
          } catch (error) {
            if (error.code === 10008) {
              addMessage('System', `Mesaj bulunamadı: ${messageId}`, Date.now());
            } else {
              addMessage('System', `Mesaj silinirken hata oluştu: ${error.message}`, Date.now());
            }
          }
        }
        else if (command === 'help') {
          addMessage('System', 'Komutlar:\n- /img <mesaj_id>: Resmi tarayıcıda aç\n- /reply <mesaj_id> <mesaj>: Reply at\n- /r <mesaj_id> <mesaj>: Reply at (kısa)\n- /delete <mesaj_id>: Mesajı sil', Date.now());
        }
        else {
          addMessage('System', `Bilinmeyen komut: ${command}. /help ile yardım alın.`, Date.now());
        }
      } else {
        const sentMessage = await currentChannel.send(trimmedValue);
        
        // Mark as sent to prevent duplicate from messageCreate event
        sentMessageIds.add(sentMessage.id);
        addMessage(client.user.username, trimmedValue, sentMessage.createdTimestamp, false, true, sentMessage.id, replyToMessageId);
        replyToMessageId = null;
      }
    } catch (error) {
      addMessage('System', `Hata: ${error.message}`, Date.now());
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

  input.key(['C-c'], () => {
    if (mode === 'chat') {
      input.clearValue();
      input.focus();
      screen.render();
    }
  });

  screen.key(['escape'], () => {
    if (mode === 'chat') {
      switchMode('threads');
      updateThreadList();
    } else {
      return process.exit(0);
    }
  });

  screen.key(['C-c'], () => {
    return process.exit(0);
  });

  try {
    await client.login(token);
  } catch (error) {
    console.error(chalk.red(`Bağlantı hatası: ${error.message}`));
    process.exit(1);
  }

  screen.render();
}
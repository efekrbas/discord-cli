# Discord CLI

A terminal-based Discord chat interface. Allows you to use Discord in the terminal.

## Features

- 🎨 Modern terminal interface
- 💬 Real-time messaging
- 🔔 Real-time notifications for new messages (per-user/channel)
- ⌨️ Vim-style navigation (k, j keys) and arrow keys
- 🖼️ Image, file, and sticker support
- 📎 File upload support
- 📌 Pin messages
- ❤️ React to messages
- ✏️ Edit and delete messages
- 💬 Reply to messages
- 🚀 Fast and lightweight

## Installation

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

3. Add your token to the `.env` file
```
DISCORD_USER_TOKEN=your_user_token_here
```

### How to Get Your Discord User Token?

- https://youtu.be/rcwWex7aqTo (If you don't know how to get it, watch this video.)

**Important Notes:**
- Never share your user token!
- Your token grants full access to your account
- If your token is compromised, change your account immediately
- Using self-bots may be prohibited under Discord's ToS; use at your own risk

## Usage

### Start DM/Chat interface:
```bash
npm run dm
```

or

```bash
node index.js dm
```

### Start server browser (servers, categories, and channels):
```bash
node index.js server
```

### Help:
```bash
node index.js --help
```

## Keyboard Shortcuts

- `Esc`: Exit
- `Ctrl+D`: Clear input box
- `j`, `k` or `Up`, `Down`: Navigate between messages (vim-style or arrow keys)
- `Enter`: Send message

## Commands

- `/upload <file_path>`: Upload a file to the channel
- `/view <message_id>`: Open file/image/sticker in browser
- `/reply <message_id> <message>`: Reply to a message
- `/r <message_id> <message>`: Reply to a message (short form)
- `/edit <message_id> <new_message>`: Edit a message (only your own messages)
- `/delete <message_id>`: Delete a message (only your own messages)
- `/pin <message_id>`: Pin a message
- `/react <message_id> <emoji>`: Add a reaction to a message
- `/help`: Show available commands

### File Upload Examples
```bash
# Upload a single file
/upload C:\Users\username\Desktop\image.png

# Upload file with spaces in path
/upload "C:\Users\username\My Documents\file.pdf"
```

### Message ID Format
- Message IDs are displayed in yellow color within blue parentheses
- File/Sticker names are displayed in yellow within blue brackets
- Example: `[File: filename.png] (1455312755623067821)` 
- Sticker Example: `[Sticker: StickerName] (1455312755623067822)`

## Requirements

- Node.js 18+ 
- Discord User Token

## Notes

- Never share your user token
- You connect via your own account using the user token
- According to Discord's ToS, self-bot usage may be prohibited; use at your own risk

## License

MIT

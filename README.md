# Discord CLI

A terminal-based Discord chat interface. Allows you to use Discord in the terminal.

## Features

- 🎨 Modern terminal interface
- 💬 Real-time messaging
- ⌨️ Vim-style navigation (k, j keys)
- 🖼️ Image support (images are displayed as [Image])
- ✏️ Edit and delete messages
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

**Method 1: Browser Developer Tools (Recommended)**
1. Open Discord in your browser (https://discord.com/app)
2. Press `F12` to open Developer Tools
3. Go to the **Application** tab
4. Select **Local Storage** > **https://discord.com** from the left menu
5. Find the `token` key and copy its value
6. Add the token to your `.env` file

**Method 2: Network Tab**
1. Open Discord in your browser
2. Press `F12` to open Developer Tools
3. Go to the **Network** tab
4. Click on any request
5. Find the `authorization` value in the **Headers** section and copy it

**Important Notes:**
- Never share your user token!
- Your token grants full access to your account
- If your token is compromised, change your account immediately
- Using self-bots may be prohibited under Discord's ToS; use at your own risk

## Usage

### Start chat (DMs and channels):
```bash
npm start chat
```

or

```bash
node index.js chat
```

### Start server browser (servers, categories, and channels):
```bash
npm start server
```

or

```bash
node index.js server
```

### Help:
```bash
node index.js --help
```

## Keyboard Shortcuts

- `Esc`: Exit
- `Ctrl+C`: Clear embedbox
- `k`, `j`: Navigate between messages (vim-style)
- `Enter`: Send message

## Commands

- `/reply <message_id> <message>`: Reply to a message
- `/r <message_id> <message>`: Reply to a message (short form)
- `/img <message_id>`: Open image file in browser
- `/edit <message_id> <new_message>`: Edit a message (only your own messages)
- `/delete <message_id>`: Delete a message (only your own messages)
- `/help`: Show available commands 

## Requirements

- Node.js 18+ 
- Discord User Token

## Notes

- Never share your user token
- You connect via your own account using the user token
- According to Discord's ToS, self-bot usage may be prohibited; use at your own risk

## License

MIT

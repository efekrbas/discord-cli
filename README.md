# Discord CLI

Terminal-based Discord chat interface. Allows you to use Discord in the terminal.

## Features

- 🎨 Modern terminal interface
- 💬 Real-time messaging
- ⌨️ Vim-style navigation (k, j keys)
- 🖼️ Image support (images are displayed as [Image])
- 🚀 Fast and lightweight

## Installation

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file and add your Discord User Token:
```
DISCORD_USER_TOKEN=your_user_token_here
```

### How to Get Discord User Token?

**Method 1: Browser Developer Tools (Recommended)**
1. Open Discord in your browser (https://discord.com/app)
2. Press `F12` to open Developer Tools
3. Go to the **Application** tab
4. Select **Local Storage** > **https://discord.com** from the left menu
5. Find the `token` key and copy its value
6. Add the token to the `.env` file

**Method 2: Network Tab**
1. Open Discord in your browser
2. Open Developer Tools with `F12`
3. Go to the **Network** tab
4. Click on any request
5. Find and copy the `authorization` value in the **Headers** section

**Important Notes:**
- Never share your user token!
- Your token provides full access to your account
- If your token is leaked, change your account immediately
- According to Discord's ToS, self-bot usage may be prohibited, use at your own risk

## Usage

### Start chat:
```bash
npm start chat
```

or

```bash
node index.js chat
```

### Help:
```bash
node index.js --help
```

## Keyboard Shortcuts

- `Esc` or `q`: Exit
- `Ctrl+C`: Exit
- `k`, `j`: Navigate between messages (vim-style)
- `Enter`: Send message

## Requirements

- Node.js 18+ 
- Discord User Token
- Your Discord account

## Notes

- Never share your user token
- Don't add the `.env` file to git (it's already in .gitignore)
- You connect through your own account using a user token
- According to Discord's ToS, self-bot usage may be prohibited, use at your own risk

## License

MIT

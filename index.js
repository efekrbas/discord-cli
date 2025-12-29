#!/usr/bin/env node

import { program } from './src/cli.js';
import { startChat } from './src/chat.js';
import { startServer } from './src/server.js';
import { showLogo } from './src/logo.js';
import chalk from 'chalk';

// Ana CLI programı
const args = process.argv.slice(2);

if (args.length === 0) {
  // Logo ve hoş geldin mesajı göster
  showLogo();
  console.log(chalk.white('\nThe end of brainrot and doomscrolling is here.'));
  console.log(chalk.white("Type 'discord-cli --help' to see available commands."));
  console.log(chalk.white("Pro Tip: Use vim-motion ('k', 'j') to navigate chats and messages."));
  process.exit(0);
}

if (args[0] === 'chat') {
  startChat();
} else if (args[0] === 'server') {
  startServer();
} else if (args[0] === '--help' || args[0] === '-h') {
  program.help();
} else {
  console.log(chalk.red(`Bilinmeyen komut: ${args[0]}`));
  console.log(chalk.yellow("'discord-cli --help' ile yardım alabilirsiniz."));
  process.exit(1);
}


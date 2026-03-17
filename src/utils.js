import { exec } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export async function openFileInBrowser(url, fileName = null) {
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

#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test the MCP server
async function testServer() {
  console.log('Testing MCP Weather Server...');
  
  const serverPath = join(__dirname, 'dist', 'index.js');
  const server = spawn('node', [serverPath], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Send a list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  // Listen for response
  server.stdout.on('data', (data) => {
    console.log('Server response:', data.toString());
  });

  server.stderr.on('data', (data) => {
    console.log('Server stderr:', data.toString());
  });

  // Clean up after 5 seconds
  setTimeout(() => {
    server.kill();
    console.log('Test completed');
  }, 5000);
}

testServer().catch(console.error);

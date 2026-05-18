const { spawn } = require('node:child_process');
const path = require('node:path');

async function startServer({ port, dbPath } = {}) {
  const env = { ...process.env };
  if (port) env.PORT = String(port);
  if (dbPath) env.FILMINHO_DB = dbPath;

  const serverPath = path.join(__dirname, '../../backend/server.js');
  const child = spawn('node', [serverPath], { env });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Server did not start in time'));
    }, 5000);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('FILMINHO ONLINE')) {
        clearTimeout(timer);
        resolve({ child, baseUrl: 'http://localhost:' + (env.PORT || 3000) });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function stopServer(child) {
  if (!child) return;
  child.kill('SIGTERM');
}

module.exports = { startServer, stopServer };

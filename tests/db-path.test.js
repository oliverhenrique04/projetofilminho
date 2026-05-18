const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

test('respects FILMINHO_DB env path', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-test-' + Date.now() + '.json');
  const { child } = await startServer({ port: 3101, dbPath });
  try {
    assert.ok(fs.existsSync(dbPath), 'expected db file at FILMINHO_DB path');
  } finally {
    stopServer(child);
  }
});

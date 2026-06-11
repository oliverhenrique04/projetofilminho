const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('docker deploy files exist for filminho hosting', () => {
  assert.ok(fs.existsSync(path.join(__dirname, '../Dockerfile')));
  assert.ok(fs.existsSync(path.join(__dirname, '../docker-compose.yml')));
});

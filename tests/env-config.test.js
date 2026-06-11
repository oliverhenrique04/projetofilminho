const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('backend env config files and bootstrap are wired', () => {
  const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf-8');
  const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf-8'));
  const serverJs = fs.readFileSync(path.join(__dirname, '../backend/server.js'), 'utf-8');
  const envExamplePath = path.join(__dirname, '../.env.example');
  const envPath = path.join(__dirname, '../.env');

  assert.match(gitignore, /^\.env$/m);
  assert.ok(fs.existsSync(envExamplePath));
  assert.ok(fs.existsSync(envPath));
  assert.match(serverJs, /require\('dotenv'\)\.config\(\)/);
  assert.equal(packageJson.dependencies.dotenv, '^16.6.1');

  const envExample = fs.readFileSync(envExamplePath, 'utf-8');
  assert.match(envExample, /GOOGLE_APPLICATION_CREDENTIALS=/);
  assert.match(envExample, /FILMINHO_DB=/);
});

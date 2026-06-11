const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('auth screen and friends section exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf-8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  assert.ok(document.querySelector('#auth-screen'));
  assert.ok(document.querySelector('#auth-login-form'));
  assert.ok(document.querySelector('#auth-register-form'));
  assert.ok(document.querySelector('#friends-section'));
});

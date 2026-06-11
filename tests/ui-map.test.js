const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('map popup markup and handler exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf-8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  assert.ok(document.querySelector('#map-popup'));
  assert.ok(document.querySelector('#map-container'));
  assert.ok(document.querySelector('#map-fallback'));

  const appJs = fs.readFileSync(path.join(__dirname, '../www/js/app.js'), 'utf-8');
  assert.match(appJs, /function\s+mostrarNoMapa\s*\(/);
  assert.match(appJs, /map-popup/);
  assert.match(appJs, /map-container/);
});

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('notifications tab markup and badge exist', () => {
  const html = fs.readFileSync(path.join(__dirname, '../www/index.html'), 'utf-8');
  const dom = new JSDOM(html);
  const { document } = dom.window;

  assert.ok(document.querySelector('a[href="#tab-notificacoes"]'));
  assert.ok(document.querySelector('#tab-notificacoes'));
  assert.ok(document.querySelector('#notifications-badge'));
  assert.ok(document.querySelector('#notifications-list'));
  assert.ok(document.querySelector('#notifications-empty-state'));
});

test('notifications app logic exists', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../www/js/app.js'), 'utf-8');

  assert.match(appJs, /https:\/\/nuted-ia\.dev\/filminho\/api/);
  assert.doesNotMatch(appJs, /var API_URL = BASE_URL \+ '\/api';/);
  assert.match(appJs, /async function apiFetch\s*\(/);
  assert.match(appJs, /async function carregarNotificacoes\s*\(/);
  assert.match(appJs, /function renderizarNotificacoes\s*\(/);
  assert.match(appJs, /async function inicializarNotificacoesDoDispositivo\s*\(/);
  assert.match(appJs, /function agendarLembreteLocalAvaliacao\s*\(/);
  assert.match(appJs, /async function registrarTokenPush\s*\(/);
});

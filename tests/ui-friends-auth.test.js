const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('friends and requests app logic uses authenticated api helper', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../www/js/app.js'), 'utf-8');

  assert.match(appJs, /async function carregarSolicitacoes\s*\(\)\s*{[\s\S]*await apiFetch\('\/amigos\/pendentes\?usuario_id='/);
  assert.match(appJs, /async function aceitarSolicitacao\s*\(id\)\s*{[\s\S]*await apiFetch\('\/amigos\/aceitar'/);
  assert.match(appJs, /async function recusarSolicitacao\s*\(id\)\s*{[\s\S]*await apiFetch\('\/amigos\/recusar'/);
  assert.match(appJs, /async function carregarAmigos\s*\(\)\s*{[\s\S]*await apiFetch\('\/amigos\?usuario_id='/);
});

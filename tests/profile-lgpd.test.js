const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function del(url) {
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('deletes user and data (LGPD)', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-lgpd-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3128, dbPath });
  try {
    const reg = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'maria_teste',
      email: 'maria@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const id = reg.data.id;
    const { res } = await del(baseUrl + '/api/usuarios/' + id);
    assert.equal(res.status, 200);
  } finally {
    stopServer(child);
  }
});

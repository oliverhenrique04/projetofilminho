const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
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

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('notification endpoints start empty for a new user', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-notifications-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3114, dbPath });

  try {
    const notificacoes = await getJson(baseUrl + '/api/notificacoes?usuario_id=999');
    assert.equal(notificacoes.res.status, 200);
    assert.deepEqual(notificacoes.data, []);

    const total = await getJson(baseUrl + '/api/notificacoes/nao-lidas/total?usuario_id=999');
    assert.equal(total.res.status, 200);
    assert.deepEqual(total.data, { total: 0 });
  } finally {
    stopServer(child);
  }
});

test('push registry upserts a token and unregister deactivates it', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-push-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3115, dbPath });

  try {
    const primeiroRegistro = await postJson(baseUrl + '/api/push/register', {
      usuario_id: 7,
      token: 'token-abc',
      plataforma: 'web',
    });
    assert.equal(primeiroRegistro.res.status, 200);

    const segundoRegistro = await postJson(baseUrl + '/api/push/register', {
      usuario_id: 7,
      token: 'token-abc',
      plataforma: 'web',
    });
    assert.equal(segundoRegistro.res.status, 200);

    const depoisDoRegistro = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(depoisDoRegistro.dispositivos_push.length, 1);
    assert.equal(depoisDoRegistro.dispositivos_push[0].usuario_id, 7);
    assert.equal(depoisDoRegistro.dispositivos_push[0].token, 'token-abc');
    assert.equal(depoisDoRegistro.dispositivos_push[0].plataforma, 'web');
    assert.equal(depoisDoRegistro.dispositivos_push[0].ativo, true);

    const unregister = await postJson(baseUrl + '/api/push/unregister', {
      token: 'token-abc',
    });
    assert.equal(unregister.res.status, 200);

    const depoisDoUnregister = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(depoisDoUnregister.dispositivos_push.length, 1);
    assert.equal(depoisDoUnregister.dispositivos_push[0].ativo, false);
  } finally {
    stopServer(child);
  }
});

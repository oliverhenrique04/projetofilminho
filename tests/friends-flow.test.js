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

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('friend request flow', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-friends-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3109, dbPath });
  try {
    const u1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_a',
      email: 'a@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const u2 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_b',
      email: 'b@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const solicit = await postJson(baseUrl + '/api/amigos/solicitar', { de_id: u1.data.id, para_id: u2.data.id });
    assert.equal(solicit.res.status, 201);

    const pend = await getJson(baseUrl + '/api/amigos/pendentes?usuario_id=' + u2.data.id);
    assert.equal(pend.res.status, 200);
    assert.equal(pend.data.recebidas.length, 1);

    const aceitar = await postJson(baseUrl + '/api/amigos/aceitar', { solicitacao_id: solicit.data.id, usuario_id: u2.data.id });
    assert.equal(aceitar.res.status, 200);

    const amigos = await getJson(baseUrl + '/api/amigos?usuario_id=' + u1.data.id);
    assert.equal(amigos.data.length, 1);
  } finally {
    stopServer(child);
  }
});

test('cannot request self', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-friends2-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3110, dbPath });
  try {
    const u1 = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'user_self',
      email: 'self@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const { res } = await postJson(baseUrl + '/api/amigos/solicitar', { de_id: u1.data.id, para_id: u1.data.id });
    assert.equal(res.status, 400);
  } finally {
    stopServer(child);
  }
});

test('autocomplete search', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-friends3-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3111, dbPath });
  try {
    await postJson(baseUrl + '/api/auth/registro', {
      nome: 'joao_silva',
      email: 'joao3@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const { res, data } = await getJson(baseUrl + '/api/usuarios/buscar?nome=joao&usuario_id=0');
    assert.equal(res.status, 200);
    assert.ok(data.length > 0);
    assert.ok(data.some(u => u.nome === 'joao_silva'));
  } finally {
    stopServer(child);
  }
});

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

async function registrarUsuario(baseUrl, suffix) {
  const registro = await postJson(baseUrl + '/api/auth/registro', {
    nome: 'notif_user_' + suffix,
    email: 'notif_' + suffix + '@test.com',
    senha: '123456',
    cep: '01001000',
    consentimento_lgpd: true,
  });

  assert.equal(registro.res.status, 201);
  return registro.data;
}

test('notification endpoints start empty for a new user', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-notifications-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3114, dbPath });

  try {
    const usuario = await registrarUsuario(baseUrl, 'notifications_' + Date.now());
    const outroUsuario = await registrarUsuario(baseUrl, 'notifications_other_' + Date.now());

    const notificacoes = await getJson(baseUrl + '/api/notificacoes?usuario_id=' + usuario.id);
    assert.equal(notificacoes.res.status, 200);
    assert.deepEqual(notificacoes.data, []);

    const total = await getJson(baseUrl + '/api/notificacoes/nao-lidas/total?usuario_id=' + usuario.id);
    assert.equal(total.res.status, 200);
    assert.deepEqual(total.data, { total: 0 });

    const seedData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    seedData.notificacoes.push({
      id: 1,
      usuario_id: usuario.id,
      titulo: 'Novo convite',
      mensagem: 'Voce recebeu um convite',
      tipo: 'amizade',
      canal: 'in_app',
      dados: { solicitacao_id: 55 },
      lida: false,
      lida_em: null,
      criado_em: '2026-06-10T00:00:00.000Z',
    });
    fs.writeFileSync(dbPath, JSON.stringify(seedData, null, 2));

    const listarComNotificacao = await getJson(baseUrl + '/api/notificacoes?usuario_id=' + usuario.id);
    assert.equal(listarComNotificacao.res.status, 200);
    assert.equal(listarComNotificacao.data.length, 1);
    assert.deepEqual(listarComNotificacao.data[0].dados, { solicitacao_id: 55 });
    assert.equal(listarComNotificacao.data[0].canal, 'in_app');
    assert.equal(listarComNotificacao.data[0].lida_em, null);

    const marcarUma = await postJson(baseUrl + '/api/notificacoes/marcar-lida', {
      notificacao_id: 1,
      usuario_id: usuario.id,
    });
    assert.equal(marcarUma.res.status, 200);

    const aposMarcarUma = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(typeof aposMarcarUma.notificacoes[0].lida_em, 'string');

    aposMarcarUma.notificacoes.push({
      id: 2,
      usuario_id: usuario.id,
      titulo: 'Outro aviso',
      mensagem: 'Outra mensagem',
      tipo: 'geral',
      canal: 'push',
      dados: {},
      lida: false,
      lida_em: null,
      criado_em: '2026-06-10T00:00:01.000Z',
    });
    fs.writeFileSync(dbPath, JSON.stringify(aposMarcarUma, null, 2));

    const marcarTodas = await postJson(baseUrl + '/api/notificacoes/marcar-todas-lidas', {
      usuario_id: usuario.id,
    });
    assert.equal(marcarTodas.res.status, 200);

    const aposMarcarTodas = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(typeof aposMarcarTodas.notificacoes[0].lida_em, 'string');
    assert.equal(typeof aposMarcarTodas.notificacoes[1].lida_em, 'string');

    aposMarcarTodas.notificacoes.push({
      id: 3,
      usuario_id: usuario.id,
      titulo: 'Privada',
      mensagem: 'Nao pode ser lida por outro usuario',
      tipo: 'geral',
      canal: 'in_app',
      dados: {},
      lida: false,
      lida_em: null,
      criado_em: '2026-06-10T00:00:02.000Z',
    });
    fs.writeFileSync(dbPath, JSON.stringify(aposMarcarTodas, null, 2));

    const tentativaCruzarUsuarios = await postJson(baseUrl + '/api/notificacoes/marcar-lida', {
      notificacao_id: 3,
      usuario_id: outroUsuario.id,
    });
    assert.equal(tentativaCruzarUsuarios.res.status, 403);

    const aposTentativaInvalida = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(aposTentativaInvalida.notificacoes[2].lida_em, null);
  } finally {
    stopServer(child);
  }
});

test('push registry upserts a token and unregister deactivates it', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-push-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3115, dbPath });

  try {
    const usuario = await registrarUsuario(baseUrl, 'push_' + Date.now());

    const primeiroRegistro = await postJson(baseUrl + '/api/push/register', {
      usuario_id: usuario.id,
      token: 'token-abc',
      platform: 'web',
      device_label: 'Chrome desktop',
    });
    assert.equal(primeiroRegistro.res.status, 200);

    const segundoRegistro = await postJson(baseUrl + '/api/push/register', {
      usuario_id: usuario.id,
      token: 'token-abc',
      platform: 'web',
      device_label: 'Chrome desktop',
    });
    assert.equal(segundoRegistro.res.status, 200);

    const depoisDoRegistro = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(depoisDoRegistro.dispositivos_push.length, 1);
    assert.equal(depoisDoRegistro.dispositivos_push[0].usuario_id, usuario.id);
    assert.equal(depoisDoRegistro.dispositivos_push[0].token, 'token-abc');
    assert.equal(depoisDoRegistro.dispositivos_push[0].platform, 'web');
    assert.equal(depoisDoRegistro.dispositivos_push[0].device_label, 'Chrome desktop');
    assert.equal(depoisDoRegistro.dispositivos_push[0].ativo, true);

    const unregister = await postJson(baseUrl + '/api/push/unregister', {
      token: 'token-abc',
    });
    assert.equal(unregister.res.status, 200);

    const depoisDoUnregister = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    assert.equal(depoisDoUnregister.dispositivos_push.length, 1);
    assert.equal(depoisDoUnregister.dispositivos_push[0].ativo, false);

    const usuarioInexistente = await postJson(baseUrl + '/api/push/register', {
      usuario_id: 9999,
      token: 'token-9999',
      platform: 'web',
      device_label: 'Ghost browser',
    });
    assert.equal(usuarioInexistente.res.status, 400);

    const usuarioInvalido = await postJson(baseUrl + '/api/push/register', {
      usuario_id: 'abc',
      token: 'token-abc-invalid',
      platform: 'web',
      device_label: 'Broken browser',
    });
    assert.equal(usuarioInvalido.res.status, 400);
  } finally {
    stopServer(child);
  }
});

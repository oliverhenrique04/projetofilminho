# Notificacoes, Robustez e Refinamento Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar notificacoes locais e push com inbox interna, melhorar a robustez da aplicacao mobile, profissionalizar o build Android e gerar o APK do Filminho.

**Architecture:** O backend continua servindo a aplicacao e o JSON local, mas passa a ter uma camada explicita de notificacoes persistidas, dispositivos push e um wrapper isolado para Firebase Admin. No frontend, a UI ganha uma aba de notificacoes, badge de nao lidas, um wrapper de rede com timeout e integracao condicional com plugins Cordova para FCM e notificacoes locais.

**Tech Stack:** Node.js, Express 5, Framework7, Cordova Android, Firebase Admin SDK, `cordova-plugin-firebase-messaging`, `cordova-plugin-local-notifications`, `node:test`, `jsdom`.

---

## File Structure

- **Create:** `backend/firebase-admin.js`
- **Create:** `tests/notifications-backend.test.js`
- **Create:** `tests/push-send.test.js`
- **Create:** `tests/ui-notifications.test.js`
- **Create:** `tests/cordova-notifications-config.test.js`
- **Create:** `docs/firebase-setup.md`
- **Modify:** `backend/server.js:20-142,351-516`
- **Modify:** `www/index.html:15-181,221-446`
- **Modify:** `www/js/app.js:1-893`
- **Modify:** `package.json:27-48`
- **Modify:** `package-lock.json` (autogerado pelo `npm install`)
- **Modify:** `cordova/config.xml:2-87`
- **Modify:** `cordova/package.json:2-36`
- **Modify:** `cordova/package-lock.json` (autogerado pelo `npm install`)
- **Modify:** `README.md`

---

### Task 1: Persistencia de Notificacoes e Endpoints Base

**Files:**
- Create: `tests/notifications-backend.test.js`
- Modify: `backend/server.js:20-142,456-516`

- [ ] **Step 1: Write the failing test**

Create `tests/notifications-backend.test.js`:

```js
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

test('notifications api starts empty for a new user', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-notifs-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3114, dbPath });

  try {
    const user = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'notif_user',
      email: 'notif@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const lista = await getJson(baseUrl + '/api/notificacoes?usuario_id=' + user.data.id);
    const total = await getJson(baseUrl + '/api/notificacoes/nao-lidas/total?usuario_id=' + user.data.id);

    assert.equal(lista.res.status, 200);
    assert.deepEqual(lista.data, []);
    assert.equal(total.res.status, 200);
    assert.equal(total.data.total, 0);
  } finally {
    stopServer(child);
  }
});

test('push register upserts token and unregister deactivates it', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-push-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3115, dbPath });

  try {
    const user = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'push_user',
      email: 'push@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const primeiro = await postJson(baseUrl + '/api/push/register', {
      usuario_id: user.data.id,
      token: 'token-abc',
      platform: 'android',
      device_label: 'pixel-7',
    });
    assert.equal(primeiro.res.status, 200);
    assert.equal(primeiro.data.ativo, true);

    const segundo = await postJson(baseUrl + '/api/push/register', {
      usuario_id: user.data.id,
      token: 'token-abc',
      platform: 'android',
      device_label: 'pixel-7-pro',
    });
    assert.equal(segundo.res.status, 200);
    assert.equal(segundo.data.device_label, 'pixel-7-pro');

    const unregister = await postJson(baseUrl + '/api/push/unregister', {
      usuario_id: user.data.id,
      token: 'token-abc',
    });
    assert.equal(unregister.res.status, 200);
    assert.equal(unregister.data.ok, true);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/notifications-backend.test.js`

Expected: FAIL with missing routes such as `/api/notificacoes` or `/api/push/register`.

- [ ] **Step 3: Write the minimal backend implementation**

In `backend/server.js`, extend the initial DB shape and add notification/device helpers:

```js
if (!fs.existsSync(ARQUIVO_DB)) {
  const dadosIniciais = {
    usuarios: [],
    avaliacoes: [],
    solicitacoes_amizade: [],
    amizades: [],
    notificacoes: [],
    dispositivos_push: [],
  };
  fs.writeFileSync(ARQUIVO_DB, JSON.stringify(dadosIniciais, null, 2));
}

function gerarNovoId(lista, campo = 'id') {
  return lista.reduce((max, item) => Math.max(max, Number(item[campo] || 0)), 0) + 1;
}

function criarNotificacao(banco, payload) {
  const notificacao = {
    id: gerarNovoId(banco.notificacoes, 'id'),
    usuario_id: payload.usuario_id,
    tipo: payload.tipo,
    titulo: payload.titulo,
    mensagem: payload.mensagem,
    dados: payload.dados || {},
    canal: payload.canal || 'push+inbox',
    criado_em: new Date().toISOString(),
    lida_em: null,
  };
  banco.notificacoes.push(notificacao);
  return notificacao;
}

function listarNotificacoesUsuario(banco, usuarioId) {
  return banco.notificacoes
    .filter((n) => n.usuario_id === usuarioId)
    .sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
}

function contarNaoLidas(banco, usuarioId) {
  return banco.notificacoes.filter((n) => n.usuario_id === usuarioId && !n.lida_em).length;
}

function upsertDispositivoPush(banco, payload) {
  const existente = banco.dispositivos_push.find((item) =>
    item.usuario_id === payload.usuario_id &&
    item.token === payload.token
  );

  if (existente) {
    existente.platform = payload.platform;
    existente.device_label = payload.device_label || existente.device_label || 'android-cordova';
    existente.ativo = true;
    existente.atualizado_em = new Date().toISOString();
    return existente;
  }

  const novo = {
    id: gerarNovoId(banco.dispositivos_push, 'id'),
    usuario_id: payload.usuario_id,
    platform: payload.platform,
    token: payload.token,
    device_label: payload.device_label || 'android-cordova',
    ativo: true,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  };
  banco.dispositivos_push.push(novo);
  return novo;
}

function desativarDispositivoPush(banco, payload) {
  const existente = banco.dispositivos_push.find((item) =>
    item.usuario_id === payload.usuario_id &&
    item.token === payload.token
  );

  if (!existente) return false;
  existente.ativo = false;
  existente.atualizado_em = new Date().toISOString();
  return true;
}
```

Still in `backend/server.js`, extend `garantirEstruturaBanco()`:

```js
if (!Array.isArray(banco.notificacoes)) { banco.notificacoes = []; mudou = true; }
if (!Array.isArray(banco.dispositivos_push)) { banco.dispositivos_push = []; mudou = true; }

banco.notificacoes.forEach((n) => {
  if (!n.canal) { n.canal = 'push+inbox'; mudou = true; }
  if (n.dados === undefined) { n.dados = {}; mudou = true; }
  if (n.lida_em === undefined) { n.lida_em = null; mudou = true; }
  if (!n.criado_em) { n.criado_em = new Date().toISOString(); mudou = true; }
});

banco.dispositivos_push.forEach((item) => {
  if (item.ativo === undefined) { item.ativo = true; mudou = true; }
  if (!item.platform) { item.platform = 'android'; mudou = true; }
  if (!item.device_label) { item.device_label = 'android-cordova'; mudou = true; }
  if (!item.criado_em) { item.criado_em = new Date().toISOString(); mudou = true; }
  if (!item.atualizado_em) { item.atualizado_em = new Date().toISOString(); mudou = true; }
});
```

Add the new routes before `app.listen(...)`:

```js
app.get('/api/notificacoes', (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  if (!usuarioId) return res.status(400).json({ erro: 'usuario_id obrigatorio.' });
  const banco = lerBanco();
  res.json(listarNotificacoesUsuario(banco, usuarioId));
});

app.get('/api/notificacoes/nao-lidas/total', (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  if (!usuarioId) return res.status(400).json({ erro: 'usuario_id obrigatorio.' });
  const banco = lerBanco();
  res.json({ total: contarNaoLidas(banco, usuarioId) });
});

app.post('/api/notificacoes/marcar-lida', (req, res) => {
  const usuarioId = parseInt(req.body.usuario_id || '0', 10);
  const notificacaoId = parseInt(req.body.notificacao_id || '0', 10);
  if (!usuarioId || !notificacaoId) {
    return res.status(400).json({ erro: 'usuario_id e notificacao_id obrigatorios.' });
  }

  const banco = lerBanco();
  const notificacao = banco.notificacoes.find((item) =>
    item.id === notificacaoId && item.usuario_id === usuarioId
  );
  if (!notificacao) return res.status(404).json({ erro: 'Notificacao nao encontrada.' });

  notificacao.lida_em = notificacao.lida_em || new Date().toISOString();
  salvarBanco(banco);
  res.json({ ok: true, notificacao });
});

app.post('/api/notificacoes/marcar-todas-lidas', (req, res) => {
  const usuarioId = parseInt(req.body.usuario_id || '0', 10);
  if (!usuarioId) return res.status(400).json({ erro: 'usuario_id obrigatorio.' });

  const banco = lerBanco();
  banco.notificacoes.forEach((item) => {
    if (item.usuario_id === usuarioId && !item.lida_em) {
      item.lida_em = new Date().toISOString();
    }
  });
  salvarBanco(banco);
  res.json({ ok: true });
});

app.post('/api/push/register', (req, res) => {
  const usuarioId = parseInt(req.body.usuario_id || '0', 10);
  const token = String(req.body.token || '').trim();
  const platform = String(req.body.platform || '').trim();
  const deviceLabel = String(req.body.device_label || '').trim();

  if (!usuarioId || !token || !platform) {
    return res.status(400).json({ erro: 'usuario_id, token e platform obrigatorios.' });
  }

  const banco = lerBanco();
  const usuarioExiste = banco.usuarios.some((u) => u.id === usuarioId);
  if (!usuarioExiste) return res.status(404).json({ erro: 'Usuario nao encontrado.' });

  const dispositivo = upsertDispositivoPush(banco, {
    usuario_id: usuarioId,
    token,
    platform,
    device_label: deviceLabel,
  });
  salvarBanco(banco);
  res.json(dispositivo);
});

app.post('/api/push/unregister', (req, res) => {
  const usuarioId = parseInt(req.body.usuario_id || '0', 10);
  const token = String(req.body.token || '').trim();
  if (!usuarioId || !token) {
    return res.status(400).json({ erro: 'usuario_id e token obrigatorios.' });
  }

  const banco = lerBanco();
  const desativado = desativarDispositivoPush(banco, { usuario_id: usuarioId, token });
  if (!desativado) return res.status(404).json({ erro: 'Token nao encontrado.' });

  salvarBanco(banco);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/notifications-backend.test.js`

Expected: PASS for both tests.

- [ ] **Step 5: Commit**

```bash
git add tests/notifications-backend.test.js backend/server.js
git commit -m "feat: add notifications storage and push registry api"
```

---

### Task 2: Eventos Sociais Alimentam a Inbox

**Files:**
- Modify: `tests/notifications-backend.test.js`
- Modify: `backend/server.js:351-454`

- [ ] **Step 1: Extend the failing test**

Append these tests to `tests/notifications-backend.test.js`:

```js
test('friend request creates inbox notification for recipient', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-friend-notif-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3116, dbPath });

  try {
    const remetente = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'cinefilo_a',
      email: 'cinefilo_a@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const destino = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'cinefilo_b',
      email: 'cinefilo_b@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const solicitacao = await postJson(baseUrl + '/api/amigos/solicitar', {
      de_id: remetente.data.id,
      para_id: destino.data.id,
    });
    assert.equal(solicitacao.res.status, 201);

    const inbox = await getJson(baseUrl + '/api/notificacoes?usuario_id=' + destino.data.id);
    const total = await getJson(baseUrl + '/api/notificacoes/nao-lidas/total?usuario_id=' + destino.data.id);

    assert.equal(inbox.data.length, 1);
    assert.equal(inbox.data[0].tipo, 'amizade_solicitada');
    assert.match(inbox.data[0].mensagem, /cinefilo_a/);
    assert.equal(total.data.total, 1);
  } finally {
    stopServer(child);
  }
});

test('friend accept creates notification for requester and read endpoints clear the badge', async () => {
  const dbPath = path.join(os.tmpdir(), 'filminho-accept-notif-' + Date.now() + '.json');
  const { child, baseUrl } = await startServer({ port: 3117, dbPath });

  try {
    const remetente = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'cinefilo_c',
      email: 'cinefilo_c@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const destino = await postJson(baseUrl + '/api/auth/registro', {
      nome: 'cinefilo_d',
      email: 'cinefilo_d@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const solicitacao = await postJson(baseUrl + '/api/amigos/solicitar', {
      de_id: remetente.data.id,
      para_id: destino.data.id,
    });
    await postJson(baseUrl + '/api/amigos/aceitar', {
      solicitacao_id: solicitacao.data.id,
      usuario_id: destino.data.id,
    });

    const inbox = await getJson(baseUrl + '/api/notificacoes?usuario_id=' + remetente.data.id);
    assert.equal(inbox.data[0].tipo, 'amizade_aceita');

    const marcar = await postJson(baseUrl + '/api/notificacoes/marcar-lida', {
      usuario_id: remetente.data.id,
      notificacao_id: inbox.data[0].id,
    });
    assert.equal(marcar.res.status, 200);

    const total = await getJson(baseUrl + '/api/notificacoes/nao-lidas/total?usuario_id=' + remetente.data.id);
    assert.equal(total.data.total, 0);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/notifications-backend.test.js`

Expected: FAIL because friend routes do not create notifications yet.

- [ ] **Step 3: Write the minimal implementation**

In `backend/server.js`, add a small helper near the other DB helpers:

```js
function buscarUsuarioPorId(banco, usuarioId) {
  return banco.usuarios.find((u) => u.id === usuarioId && !u.deletado_em);
}
```

Update the user deletion route so notifications and push devices are also cleaned up:

```js
banco.notificacoes = banco.notificacoes.filter((n) => n.usuario_id !== id);
banco.dispositivos_push = banco.dispositivos_push.filter((item) => item.usuario_id !== id);
```

Update `/api/amigos/solicitar`:

```js
app.post('/api/amigos/solicitar', (req, res) => {
  const { de_id, para_id } = req.body;
  if (!de_id || !para_id) return res.status(400).json({ erro: 'Dados obrigatórios.' });
  if (de_id === para_id) return res.status(400).json({ erro: 'Não pode solicitar a si mesmo.' });
  const banco = lerBanco();

  const remetente = buscarUsuarioPorId(banco, de_id);
  const destino = buscarUsuarioPorId(banco, para_id);
  if (!remetente || !destino) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const jaAmigos = banco.amizades.some((a) => a.usuario_id === de_id && a.amigo_id === para_id);
  if (jaAmigos) return res.status(409).json({ erro: 'Já são amigos.' });

  const pendente = banco.solicitacoes_amizade.find((s) =>
    (s.de_id === de_id && s.para_id === para_id && s.status === 'pendente') ||
    (s.de_id === para_id && s.para_id === de_id && s.status === 'pendente')
  );
  if (pendente) return res.status(409).json({ erro: 'Solicitação já pendente.' });

  const novaId = banco.solicitacoes_amizade.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
  const solicitacao = { id: novaId, de_id, para_id, status: 'pendente', criado_em: new Date().toISOString() };
  banco.solicitacoes_amizade.push(solicitacao);

  criarNotificacao(banco, {
    usuario_id: destino.id,
    tipo: 'amizade_solicitada',
    titulo: 'Nova solicitação de amizade',
    mensagem: `${remetente.nome} quer te adicionar no Filminho.`,
    dados: {
      de_id: remetente.id,
      rota: 'notificacoes',
      acao: 'abrir_solicitacoes',
    },
  });

  salvarBanco(banco);
  res.status(201).json(solicitacao);
});
```

Update `/api/amigos/aceitar`:

```js
app.post('/api/amigos/aceitar', (req, res) => {
  const { solicitacao_id, usuario_id } = req.body;
  const banco = lerBanco();
  const solicitacao = banco.solicitacoes_amizade.find((s) => s.id === solicitacao_id);
  if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitação inválida.' });
  if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Não autorizado.' });

  solicitacao.status = 'aceita';
  const desde = new Date().toISOString();
  banco.amizades.push({ usuario_id: solicitacao.de_id, amigo_id: solicitacao.para_id, desde_em: desde });
  banco.amizades.push({ usuario_id: solicitacao.para_id, amigo_id: solicitacao.de_id, desde_em: desde });

  const destinatario = buscarUsuarioPorId(banco, solicitacao.de_id);
  const aceitou = buscarUsuarioPorId(banco, solicitacao.para_id);
  if (destinatario && aceitou) {
    criarNotificacao(banco, {
      usuario_id: destinatario.id,
      tipo: 'amizade_aceita',
      titulo: 'Solicitação aceita',
      mensagem: `${aceitou.nome} aceitou sua solicitação de amizade.`,
      dados: {
        amigo_id: aceitou.id,
        rota: 'notificacoes',
        acao: 'abrir_amigos',
      },
    });
  }

  salvarBanco(banco);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/notifications-backend.test.js tests/friends-flow.test.js tests/friends-evals.test.js`

Expected: PASS for notification side effects and friend regressions.

- [ ] **Step 5: Commit**

```bash
git add tests/notifications-backend.test.js backend/server.js
git commit -m "feat: emit inbox notifications for friend events"
```

---

### Task 3: Integracao Firebase Admin com Fallback Seguro

**Files:**
- Create: `backend/firebase-admin.js`
- Create: `tests/push-send.test.js`
- Create: `docs/firebase-setup.md`
- Modify: `backend/server.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Write the failing test**

Create `tests/push-send.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createPushClient } = require('../backend/firebase-admin');

test('push client skips send when firebase credentials are absent', async () => {
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

  const client = createPushClient();
  const result = await client.sendToTokens({
    tokens: ['token-1'],
    notification: { title: 'Teste', body: 'Mensagem' },
    data: { rota: 'notificacoes' },
  });

  assert.deepEqual(result, {
    ok: false,
    skipped: true,
    reason: 'missing-config',
    sentCount: 0,
    failureCount: 1,
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/push-send.test.js`

Expected: FAIL because `backend/firebase-admin.js` does not exist yet.

- [ ] **Step 3: Write the minimal implementation**

Install the server dependency first:

Run: `npm install firebase-admin@14.0.0 --save`

Expected: `package.json` and `package-lock.json` updated with `firebase-admin`.

Create `backend/firebase-admin.js`:

```js
function createPushClient() {
  let messaging = null;

  function hasConfig() {
    return Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  }

  function toStringMap(data) {
    return Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => [key, String(value)])
    );
  }

  async function getMessaging() {
    if (!hasConfig()) return null;
    if (messaging) return messaging;

    const { getApps, initializeApp, applicationDefault } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');

    const app = getApps()[0] || initializeApp({
      credential: applicationDefault(),
    });
    messaging = getMessaging(app);
    return messaging;
  }

  return {
    async sendToTokens({ tokens, notification, data }) {
      if (!tokens || tokens.length === 0) {
        return { ok: false, skipped: true, reason: 'no-tokens', sentCount: 0, failureCount: 0 };
      }

      if (!hasConfig()) {
        return { ok: false, skipped: true, reason: 'missing-config', sentCount: 0, failureCount: tokens.length };
      }

      try {
        const client = await getMessaging();
        const response = await client.sendEachForMulticast({
          tokens,
          notification,
          data: toStringMap(data),
        });
        return {
          ok: response.failureCount === 0,
          skipped: false,
          reason: null,
          sentCount: response.successCount,
          failureCount: response.failureCount,
        };
      } catch (error) {
        console.warn('FCM indisponivel:', error.message);
        return { ok: false, skipped: true, reason: 'send-failed', sentCount: 0, failureCount: tokens.length };
      }
    },
  };
}

module.exports = { createPushClient };
```

Update `package.json` dependencies:

```json
"dependencies": {
  "axios": "^1.13.6",
  "cordova-plugin-camera": "^8.0.0",
  "cordova-plugin-geolocation": "^5.0.0",
  "cors": "^2.8.6",
  "dom7": "^4.0.6",
  "express": "^5.2.1",
  "firebase-admin": "^14.0.0",
  "framework7": "^9.0.3",
  "framework7-icons": "^5.0.5",
  "material-icons": "^1.13.14",
  "skeleton-elements": "^4.0.1",
  "swiper": "^12.1.2"
}
```

Wire the client in `backend/server.js`:

```js
const { createPushClient } = require('./firebase-admin');

const pushClient = createPushClient();

async function enviarPushParaUsuario(banco, usuarioId, payload) {
  const tokens = banco.dispositivos_push
    .filter((item) => item.usuario_id === usuarioId && item.ativo)
    .map((item) => item.token);

  return pushClient.sendToTokens({
    tokens,
    notification: {
      title: payload.titulo,
      body: payload.mensagem,
    },
    data: payload.dados || {},
  });
}
```

Convert the friend routes to `async` and call the push helper after persisting the notification:

```js
app.post('/api/amigos/solicitar', async (req, res) => {
  const { de_id, para_id } = req.body;
  if (!de_id || !para_id) return res.status(400).json({ erro: 'Dados obrigatórios.' });
  if (de_id === para_id) return res.status(400).json({ erro: 'Não pode solicitar a si mesmo.' });
  const banco = lerBanco();

  const remetente = buscarUsuarioPorId(banco, de_id);
  const destino = buscarUsuarioPorId(banco, para_id);
  if (!remetente || !destino) return res.status(404).json({ erro: 'Usuário não encontrado.' });

  const jaAmigos = banco.amizades.some((a) => a.usuario_id === de_id && a.amigo_id === para_id);
  if (jaAmigos) return res.status(409).json({ erro: 'Já são amigos.' });

  const pendente = banco.solicitacoes_amizade.find((s) =>
    (s.de_id === de_id && s.para_id === para_id && s.status === 'pendente') ||
    (s.de_id === para_id && s.para_id === de_id && s.status === 'pendente')
  );
  if (pendente) return res.status(409).json({ erro: 'Solicitação já pendente.' });

  const novaId = banco.solicitacoes_amizade.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
  const solicitacao = { id: novaId, de_id, para_id, status: 'pendente', criado_em: new Date().toISOString() };
  banco.solicitacoes_amizade.push(solicitacao);

  const notificacao = criarNotificacao(banco, {
    usuario_id: destino.id,
    tipo: 'amizade_solicitada',
    titulo: 'Nova solicitação de amizade',
    mensagem: `${remetente.nome} quer te adicionar no Filminho.`,
    dados: {
      de_id: remetente.id,
      rota: 'notificacoes',
      acao: 'abrir_solicitacoes',
    },
  });

  salvarBanco(banco);
  await enviarPushParaUsuario(banco, destino.id, notificacao);
  res.status(201).json(solicitacao);
});

app.post('/api/amigos/aceitar', async (req, res) => {
  const { solicitacao_id, usuario_id } = req.body;
  const banco = lerBanco();
  const solicitacao = banco.solicitacoes_amizade.find((s) => s.id === solicitacao_id);
  if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitação inválida.' });
  if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Não autorizado.' });

  solicitacao.status = 'aceita';
  const desde = new Date().toISOString();
  banco.amizades.push({ usuario_id: solicitacao.de_id, amigo_id: solicitacao.para_id, desde_em: desde });
  banco.amizades.push({ usuario_id: solicitacao.para_id, amigo_id: solicitacao.de_id, desde_em: desde });

  const destinatario = buscarUsuarioPorId(banco, solicitacao.de_id);
  const aceitou = buscarUsuarioPorId(banco, solicitacao.para_id);

  if (destinatario && aceitou) {
    const notificacao = criarNotificacao(banco, {
      usuario_id: destinatario.id,
      tipo: 'amizade_aceita',
      titulo: 'Solicitação aceita',
      mensagem: `${aceitou.nome} aceitou sua solicitação de amizade.`,
      dados: {
        amigo_id: aceitou.id,
        rota: 'notificacoes',
        acao: 'abrir_amigos',
      },
    });

    salvarBanco(banco);
    await enviarPushParaUsuario(banco, destinatario.id, notificacao);
  } else {
    salvarBanco(banco);
  }

  res.json({ ok: true });
});
```

Create `docs/firebase-setup.md`:

````md
# Firebase Setup do Filminho

## Android app id

Use `br.com.filminho.app` como package ID no Firebase Console.

## Arquivo do app

1. Crie um app Android no projeto Firebase.
2. Baixe `google-services.json`.
3. Copie o arquivo para `cordova/google-services.json`.

## Credenciais do servidor

1. Gere uma Service Account no Firebase Console.
2. Salve o JSON fora do repositório.
3. Exporte a variável:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/caminho/seguro/firebase-service-account.json"
```

## Teste manual

1. Faça login no app Android.
2. Permita notificações.
3. Verifique se o token é registrado no endpoint `/api/push/register`.
4. Use o Firebase Console ou o servidor para enviar uma push de teste.
````

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/push-send.test.js tests/notifications-backend.test.js tests/friends-flow.test.js`

Expected: PASS, incluindo o modo degradado sem credenciais Firebase.

- [ ] **Step 5: Commit**

```bash
git add backend/firebase-admin.js tests/push-send.test.js docs/firebase-setup.md package.json package-lock.json backend/server.js
git commit -m "feat: add firebase push wrapper with safe fallback"
```

---

### Task 4: Shell da Central de Notificacoes e Refino Visual Mobile

**Files:**
- Create: `tests/ui-notifications.test.js`
- Modify: `www/index.html:15-181,221-446`

- [ ] **Step 1: Write the failing test**

Create `tests/ui-notifications.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-notifications.test.js`

Expected: FAIL because the notification tab and badge do not exist yet.

- [ ] **Step 3: Write the minimal UI implementation**

In `www/index.html`, extend the style block with the new visual system:

```css
.app-hero {
  margin: 15px;
  padding: 18px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(0, 224, 84, 0.28), transparent 35%),
    linear-gradient(135deg, #171a20 0%, #0d0f13 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
}

.app-hero h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.app-hero p {
  margin: 8px 0 0 0;
  color: #c7d2cf !important;
  font-size: 14px;
  line-height: 1.5;
}

.tabbar-link-with-badge {
  position: relative;
}

.notifications-badge {
  position: absolute;
  top: 4px;
  right: 18px;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #ff5b5b;
  color: #fff !important;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  padding: 0 5px;
}

.notifications-badge.visible {
  display: inline-flex;
}

.notifications-shell {
  margin: 15px;
  padding: 18px;
  border-radius: 18px;
  background: #15181d;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.notification-card {
  background: linear-gradient(135deg, #1b1f26 0%, #12151a 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 12px;
}

.notification-card.unread {
  border-color: rgba(0, 224, 84, 0.42);
  box-shadow: 0 0 0 1px rgba(0, 224, 84, 0.12);
}

.notification-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.empty-state {
  padding: 26px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  text-align: center;
}
```

Still in `www/index.html`, strengthen the home header:

```html
<div class="app-hero">
  <h1>Seu clube de cinema cabe no bolso.</h1>
  <p>Descubra filmes, acompanhe amizades e mantenha seu diario sempre vivo com notificacoes inteligentes.</p>
</div>
```

Replace the toolbar block with:

```html
<div class="toolbar toolbar-bottom tabbar tabbar-icons">
  <div class="toolbar-inner">
    <a href="#tab-home" class="tab-link tab-link-active" onclick="mostrarInicioMenu()">
      <i class="icon material-icons">home</i>
      <span class="tabbar-label">Início</span>
    </a>
    <a href="#tab-notificacoes" class="tab-link tabbar-link-with-badge">
      <i class="icon material-icons">notifications</i>
      <span class="tabbar-label">Notificações</span>
      <span id="notifications-badge" class="notifications-badge">0</span>
    </a>
    <a href="#tab-perfil" class="tab-link">
      <i class="icon material-icons">person</i>
      <span class="tabbar-label">Perfil</span>
    </a>
  </div>
</div>
```

Add the notification tab between `#tab-home` and `#tab-perfil`:

```html
<div id="tab-notificacoes" class="page-content tab">
  <div class="notifications-shell">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:16px;">
      <div>
        <div class="block-title" style="margin:0;">🔔 Notificações</div>
        <p style="margin:6px 0 0 0; color:#aab5b2 !important;">Amizades, lembretes e atividade importante do app.</p>
      </div>
      <button id="mark-all-read-button" class="button button-outline" style="border-color:#00e054; color:#00e054;">Marcar tudo</button>
    </div>

    <div id="notifications-empty-state" class="empty-state">
      <div style="font-size:32px; margin-bottom:8px;">🍿</div>
      <div style="font-weight:800; margin-bottom:4px;">Tudo em dia por aqui</div>
      <div style="color:#9aa5a1 !important;">Quando algo importante acontecer, vamos te avisar aqui.</div>
    </div>

    <div id="notifications-list"></div>
  </div>
</div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui-notifications.test.js`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/ui-notifications.test.js www/index.html
git commit -m "feat: add notifications tab shell and mobile visual refresh"
```

---

### Task 5: Fluxo de Dados da UI, Wrapper de Rede e Notificacoes no Dispositivo

**Files:**
- Modify: `tests/ui-notifications.test.js`
- Modify: `www/js/app.js:1-893`

- [ ] **Step 1: Extend the failing test**

Append these assertions to `tests/ui-notifications.test.js`:

```js
test('notifications app logic exists', () => {
  const appJs = fs.readFileSync(path.join(__dirname, '../www/js/app.js'), 'utf-8');

  assert.match(appJs, /async function apiFetch\s*\(/);
  assert.match(appJs, /async function carregarNotificacoes\s*\(/);
  assert.match(appJs, /function renderizarNotificacoes\s*\(/);
  assert.match(appJs, /async function inicializarNotificacoesDoDispositivo\s*\(/);
  assert.match(appJs, /function agendarLembreteLocalAvaliacao\s*\(/);
  assert.match(appJs, /async function registrarTokenPush\s*\(/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-notifications.test.js`

Expected: FAIL because the new notification functions do not exist yet.

- [ ] **Step 3: Write the minimal frontend implementation**

In `www/js/app.js`, add the new app state near the top:

```js
var estadoNotificacoes = {
  itens: [],
  naoLidas: 0,
  pushInicializado: false,
};

var TOKEN_PUSH_LOCAL = 'filminho_push_token';
```

Add a safe request wrapper near the auth helpers:

```js
async function apiFetch(path, options) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() {
    controller.abort();
  }, 10000);

  try {
    var response = await fetch(API_URL + path, Object.assign({
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    }, options || {}));

    var contentType = response.headers.get('content-type') || '';
    var data = contentType.includes('application/json')
      ? await response.json().catch(function() { return {}; })
      : {};

    if (!response.ok) {
      var error = new Error((data && data.erro) || 'Falha na requisição.');
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('A requisição demorou demais. Tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

Add the notification rendering flow:

```js
function atualizarBadgeNotificacoes() {
  var badge = document.getElementById('notifications-badge');
  if (!badge) return;

  badge.textContent = String(estadoNotificacoes.naoLidas);
  badge.classList.toggle('visible', estadoNotificacoes.naoLidas > 0);
}

function formatarMomentoNotificacao(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function renderizarNotificacoes() {
  var lista = document.getElementById('notifications-list');
  var empty = document.getElementById('notifications-empty-state');
  if (!lista || !empty) return;

  if (!estadoNotificacoes.itens.length) {
    lista.innerHTML = '';
    empty.style.display = 'block';
    atualizarBadgeNotificacoes();
    return;
  }

  empty.style.display = 'none';
  lista.innerHTML = estadoNotificacoes.itens.map(function(item) {
    var classe = item.lida_em ? 'notification-card' : 'notification-card unread';
    return '' +
      '<div class="' + classe + '" onclick="abrirDestinoNotificacao(' + item.id + ')">' +
        '<div class="notification-meta">' +
          '<strong>' + item.titulo + '</strong>' +
          '<span style="color:#93a19d !important;">' + formatarMomentoNotificacao(item.criado_em) + '</span>' +
        '</div>' +
        '<div style="color:#d6dedb !important; line-height:1.5;">' + item.mensagem + '</div>' +
        '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' +
          (item.lida_em ? '' : '<button class="button button-small button-outline" onclick="marcarNotificacaoLida(event, ' + item.id + ')">Marcar como lida</button>') +
        '</div>' +
      '</div>';
  }).join('');

  atualizarBadgeNotificacoes();
}

async function carregarNotificacoes() {
  if (!MEU_ID_USUARIO) return;
  try {
    estadoNotificacoes.itens = await apiFetch('/notificacoes?usuario_id=' + MEU_ID_USUARIO);
    estadoNotificacoes.naoLidas = estadoNotificacoes.itens.filter(function(item) {
      return !item.lida_em;
    }).length;
    renderizarNotificacoes();
  } catch (error) {
    console.warn('Erro ao carregar notificações:', error.message);
  }
}

async function marcarNotificacaoLida(event, notificacaoId) {
  if (event) event.stopPropagation();
  await apiFetch('/notificacoes/marcar-lida', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: MEU_ID_USUARIO,
      notificacao_id: notificacaoId,
    }),
  });
  await carregarNotificacoes();
}

async function marcarTodasNotificacoesLidas() {
  await apiFetch('/notificacoes/marcar-todas-lidas', {
    method: 'POST',
    body: JSON.stringify({ usuario_id: MEU_ID_USUARIO }),
  });
  await carregarNotificacoes();
}

function abrirDestinoNotificacao(notificacaoId) {
  var item = estadoNotificacoes.itens.find(function(entry) {
    return entry.id === notificacaoId;
  });
  if (!item) return;

  if (!item.lida_em) {
    marcarNotificacaoLida(null, item.id).catch(function(error) {
      console.warn('Erro ao marcar notificação como lida:', error.message);
    });
  }

  if (item.dados && item.dados.acao === 'abrir_solicitacoes') {
    app.tab.show('#tab-perfil');
    return;
  }

  if (item.dados && item.dados.acao === 'abrir_amigos') {
    app.tab.show('#tab-perfil');
    return;
  }

  app.tab.show('#tab-notificacoes');
}
```

Add device notification integration:

```js
function obterPluginFirebaseMessaging() {
  return window.cordova &&
    window.cordova.plugins &&
    window.cordova.plugins.firebase &&
    window.cordova.plugins.firebase.messaging
    ? window.cordova.plugins.firebase.messaging
    : null;
}

function obterPluginLocalNotifications() {
  return window.cordova &&
    window.cordova.plugins &&
    window.cordova.plugins.notification &&
    window.cordova.plugins.notification.local
    ? window.cordova.plugins.notification.local
    : null;
}

async function registrarTokenPush(token) {
  if (!token || !MEU_ID_USUARIO) return;
  await apiFetch('/push/register', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: MEU_ID_USUARIO,
      token: token,
      platform: 'android',
      device_label: 'android-cordova',
    }),
  });
  localStorage.setItem(TOKEN_PUSH_LOCAL, token);
}

async function desregistrarTokenPush() {
  var token = localStorage.getItem(TOKEN_PUSH_LOCAL);
  if (!token || !MEU_ID_USUARIO) return;

  try {
    await apiFetch('/push/unregister', {
      method: 'POST',
      body: JSON.stringify({
        usuario_id: MEU_ID_USUARIO,
        token: token,
      }),
    });
  } catch (error) {
    console.warn('Erro ao desregistrar push:', error.message);
  }
}

function agendarLembreteLocalAvaliacao(filme) {
  var localNotifications = obterPluginLocalNotifications();
  if (!localNotifications || !filme) return;

  localNotifications.schedule({
    id: Math.floor(Date.now() / 1000),
    title: 'Continue seu diario no Filminho',
    text: 'Quer registrar mais uma opiniao sobre ' + filme.title + '?',
    trigger: { in: 2, unit: 'hour' },
    androidChannelId: 'filminho-engajamento',
    androidChannelName: 'Lembretes do Filminho',
    smallIcon: 'res://ic_launcher',
    data: { rota: 'perfil' },
  });
}

async function inicializarNotificacoesDoDispositivo() {
  if (!MEU_ID_USUARIO || estadoNotificacoes.pushInicializado) return;
  estadoNotificacoes.pushInicializado = true;

  var messaging = obterPluginFirebaseMessaging();
  var localNotifications = obterPluginLocalNotifications();

  if (localNotifications) {
    localNotifications.requestPermission(function() {});
    localNotifications.on('click', function() {
      app.tab.show('#tab-perfil');
    });
  }

  if (!messaging) return;

  try {
    await messaging.requestPermission({ forceShow: true });
    var token = await messaging.getToken();
    if (token) await registrarTokenPush(token);

    messaging.onTokenRefresh(async function(nextToken) {
      try {
        await registrarTokenPush(nextToken);
      } catch (error) {
        console.warn('Erro ao atualizar token push:', error.message);
      }
    });

    messaging.onMessage(async function() {
      await carregarNotificacoes();
    });

    messaging.onBackgroundMessage(async function() {
      await carregarNotificacoes();
    });
  } catch (error) {
    console.warn('Push não inicializado:', error.message || error);
  }
}
```

Refactor the boot flow so app data only loads when logged in:

```js
async function carregarDadosIniciaisDoApp() {
  if (!MEU_ID_USUARIO) return;
  await Promise.allSettled([
    carregarPerfil(),
    carregarFilmesHome('tendencias', 'lista-tendencias'),
    carregarSolicitacoes(),
    carregarAmigos(),
    carregarNotificacoes(),
  ]);
  await inicializarNotificacoesDoDispositivo();
}
```

Use `carregarDadosIniciaisDoApp()` in `handleLogin`, `handleCadastro` and `initAuth`, replace direct `fetch` calls in auth/friends loads with `apiFetch`, and wire the new button:

```js
async function handleLogin(ev) {
  ev.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  app.dialog.preloader('Entrando...');

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha }),
    });

    app.dialog.close();
    localStorage.setItem('filminho_user_id', data.id);
    localStorage.setItem('filminho_user_nome', data.nome);
    localStorage.setItem('filminho_user_cidade', data.cidade || '');
    localStorage.setItem('filminho_user_uf', data.uf || '');
    MEU_ID_USUARIO = data.id;
    mostrarApp();
    await carregarDadosIniciaisDoApp();
  } catch (error) {
    app.dialog.close();
    app.dialog.alert(error.message || 'Credenciais inválidas.');
  }
}

async function handleCadastro(ev) {
  ev.preventDefault();
  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const cep = document.getElementById('cadastro-cep').value.trim();
  const consent = document.getElementById('cadastro-lgpd').checked;

  if (!nome || !email || !senha || !cep) return app.dialog.alert('Preencha todos os campos.');
  if (senha.length < 6) return app.dialog.alert('Senha deve ter no mínimo 6 caracteres.');
  if (!consent) return app.dialog.alert('Você deve aceitar a política de privacidade.');

  app.dialog.preloader('Criando conta...');

  try {
    const data = await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, cep, consentimento_lgpd: consent }),
    });

    app.dialog.close();
    localStorage.setItem('filminho_user_id', data.id);
    localStorage.setItem('filminho_user_nome', data.nome);
    localStorage.setItem('filminho_user_cidade', data.cidade || '');
    localStorage.setItem('filminho_user_uf', data.uf || '');
    MEU_ID_USUARIO = data.id;
    mostrarApp();
    await carregarDadosIniciaisDoApp();
  } catch (error) {
    app.dialog.close();
    app.dialog.alert(error.message || 'Falha no cadastro.');
  }
}

async function carregarUfs() {
  try {
    const ufs = await apiFetch('/ibge/ufs');
    const select = document.getElementById('cadastro-uf');
    select.innerHTML = ufs.map(function(u) {
      return '<option value="' + u.sigla + '">' + u.sigla + '</option>';
    }).join('');
  } catch (error) {
    console.error('Erro ao carregar UFs:', error.message);
  }
}

async function carregarSolicitacoes() {
  try {
    const data = await apiFetch('/amigos/pendentes?usuario_id=' + MEU_ID_USUARIO);
    document.getElementById('friend-requests-received').innerHTML = data.recebidas.map(function(s) {
      return '' +
        '<div class="friend-request-item">' +
          '<span>Usuário #' + s.de_id + '</span>' +
          '<button class="btn-accept" onclick="aceitarSolicitacao(' + s.id + ')">Aceitar</button>' +
          '<button class="btn-decline" onclick="recusarSolicitacao(' + s.id + ')">Recusar</button>' +
        '</div>';
    }).join('') || '<p style="color:#888;">Nenhuma.</p>';

    document.getElementById('friend-requests-sent').innerHTML = data.enviadas.map(function(s) {
      return '<div class="friend-request-item"><span>Enviado para usuário #' + s.para_id + '</span></div>';
    }).join('') || '<p style="color:#888;">Nenhuma.</p>';
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error.message);
  }
}

async function carregarAmigos() {
  try {
    const amigos = await apiFetch('/amigos?usuario_id=' + MEU_ID_USUARIO);
    document.getElementById('friends-list').innerHTML = amigos.map(function(a) {
      return '' +
        '<div class="friend-item" onclick="abrirAvaliacaoAmigo(' + a.id + ', \'' + a.nome.replace(/'/g, "\\'") + '\')">' +
          '<i class="icon material-icons" style="color:#00e054; font-size:18px; vertical-align:middle;">person</i> ' + a.nome +
        '</div>';
    }).join('') || '<p style="color:#888;">Nenhum amigo ainda.</p>';
  } catch (error) {
    console.error('Erro ao carregar amigos:', error.message);
  }
}

function initAuth() {
  bindAuthTabs();
  carregarUfs();
  document.getElementById('auth-login-form').addEventListener('submit', handleLogin);
  document.getElementById('auth-register-form').addEventListener('submit', handleCadastro);

  if (!MEU_ID_USUARIO) {
    mostrarAuth();
    return;
  }

  mostrarApp();
  carregarDadosIniciaisDoApp().catch(function(error) {
    console.warn('Erro no bootstrap do app:', error.message);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var markAllButton = document.getElementById('mark-all-read-button');
  if (markAllButton) {
    markAllButton.addEventListener('click', function() {
      marcarTodasNotificacoesLidas().catch(function(error) {
        app.dialog.alert(error.message || 'Nao foi possivel atualizar notificações.');
      });
    });
  }
});
```

After successful save in `salvarAvaliacaoFinal()`, schedule the local reminder:

```js
agendarLembreteLocalAvaliacao(filmeAbertoAgora);
await carregarNotificacoes();
```

During logout, unregister the token before clearing the session:

```js
async function logout() {
  await desregistrarTokenPush();
  localStorage.removeItem('filminho_user_id');
  localStorage.removeItem('filminho_user_nome');
  localStorage.removeItem('filminho_user_cidade');
  localStorage.removeItem('filminho_user_uf');
  localStorage.removeItem(TOKEN_PUSH_LOCAL);
  MEU_ID_USUARIO = 0;
  estadoNotificacoes = { itens: [], naoLidas: 0, pushInicializado: false };
  atualizarBadgeNotificacoes();
  mostrarAuth();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test tests/ui-notifications.test.js tests/ui-auth.test.js tests/ui-map.test.js`

Expected: PASS for the new notification functions and existing UI structure.

- [ ] **Step 5: Commit**

```bash
git add tests/ui-notifications.test.js www/js/app.js
git commit -m "feat: wire inbox ui, device notifications and safer app boot"
```

---

### Task 6: Configuracao Cordova, Build Android e APK

**Files:**
- Create: `tests/cordova-notifications-config.test.js`
- Modify: `cordova/config.xml`
- Modify: `cordova/package.json`
- Modify: `cordova/package-lock.json`
- Modify: `README.md`

- [ ] **Step 1: Write the failing test**

Create `tests/cordova-notifications-config.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('cordova notification config is wired for android build', () => {
  const configXml = fs.readFileSync(path.join(__dirname, '../cordova/config.xml'), 'utf-8');
  const cordovaPackage = JSON.parse(fs.readFileSync(path.join(__dirname, '../cordova/package.json'), 'utf-8'));

  assert.match(configXml, /widget id="br\.com\.filminho\.app"/);
  assert.match(configXml, /cordova-plugin-firebase-messaging/);
  assert.match(configXml, /cordova-plugin-local-notifications/);
  assert.match(configXml, /POST_NOTIFICATIONS/);
  assert.match(configXml, /google-services\.json/);

  assert.equal(cordovaPackage.name, 'br.com.filminho.app');
  assert.ok(cordovaPackage.devDependencies['cordova-plugin-firebase-messaging']);
  assert.ok(cordovaPackage.devDependencies['cordova-plugin-local-notifications']);
  assert.ok(cordovaPackage.cordova.plugins['cordova-plugin-firebase-messaging']);
  assert.ok(cordovaPackage.cordova.plugins['cordova-plugin-local-notifications']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/cordova-notifications-config.test.js`

Expected: FAIL because the package ID and notification plugins are not configured yet.

- [ ] **Step 3: Write the minimal Cordova/build implementation**

Install Cordova plugins first:

Run: `cd cordova && npm install cordova-plugin-firebase-messaging@8.0.1 cordova-plugin-local-notifications@1.0.0 --save-dev`

Expected: `cordova/package.json` and `cordova/package-lock.json` updated.

Update `cordova/package.json`:

```json
{
  "name": "br.com.filminho.app",
  "displayName": "Filminho",
  "version": "1.0.0",
  "description": "A sample Apache Cordova application that responds to the deviceready event.",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [
    "ecosystem:cordova"
  ],
  "author": "Apache Cordova Team",
  "license": "Apache-2.0",
  "devDependencies": {
    "cordova-android": "^15.0.0",
    "cordova-browser": "^7.0.0",
    "cordova-ios": "^8.0.1",
    "cordova-plugin-firebase-messaging": "^8.0.1",
    "cordova-plugin-geolocation": "^5.0.0",
    "cordova-plugin-keyboard": "^1.3.0",
    "cordova-plugin-local-notifications": "^1.0.0",
    "cordova-plugin-splashscreen": "^6.0.2",
    "cordova-plugin-statusbar": "^4.0.0"
  },
  "cordova": {
    "plugins": {
      "cordova-plugin-statusbar": {},
      "cordova-plugin-keyboard": {},
      "cordova-plugin-splashscreen": {},
      "cordova-plugin-geolocation": {},
      "cordova-plugin-firebase-messaging": {},
      "cordova-plugin-local-notifications": {}
    },
    "platforms": [
      "ios",
      "android",
      "browser"
    ]
  }
}
```

Update `cordova/config.xml`:

```xml
<widget id="br.com.filminho.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0" xmlns:android="http://schemas.android.com/apk/res/android">
  <name>Filminho</name>
  <description>
    A sample Apache Cordova application that responds to the deviceready event.
  </description>
  <author email="dev@cordova.apache.org" href="https://cordova.apache.org">
    Apache Cordova Team
  </author>
  <content src="index.html" />
  <allow-intent href="http://*/*" />
  <allow-intent href="https://*/*" />
  <allow-navigation href="*" />

  <plugin name="cordova-plugin-geolocation" spec="^5.0.0" />
  <plugin name="cordova-plugin-firebase-messaging" spec="^8.0.1" />
  <plugin name="cordova-plugin-local-notifications" spec="^1.0.0" />

  <platform name="android">
    <preference name="StatusBarOverlaysWebView" value="false" />
    <preference name="android-minSdkVersion" value="24" />
    <preference name="SplashMaintainAspectRatio" value="true" />
    <resource-file src="google-services.json" target="app/google-services.json" />
    <config-file parent="/manifest" target="AndroidManifest.xml">
      <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
      <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
      <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    </config-file>
  </platform>

  <platform name="ios">
    <config-file parent="CFBundleAllowMixedLocalizations" platform="ios" target="*-Info.plist">
      <true />
    </config-file>
    <config-file target="*-Info.plist" parent="NSLocationWhenInUseUsageDescription">
      <string>Usamos sua localizacao para registrar onde a avaliacao foi feita.</string>
    </config-file>
  </platform>
</widget>
```

Update `README.md` with a dedicated Android section:

````md
## Notificacoes e APK Android

- O app Android usa o package ID `br.com.filminho.app`.
- Para push real, coloque um `google-services.json` valido em `cordova/google-services.json`.
- Para o backend enviar pushes, configure `GOOGLE_APPLICATION_CREDENTIALS` conforme `docs/firebase-setup.md`.

### Gerar APK

```bash
npm install
cd cordova && npm install && cd ..
npm run build-cordova-android
```

APK esperado:

- `cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk`
````

- [ ] **Step 4: Run tests to verify the configuration**

Run: `node --test tests/cordova-notifications-config.test.js && npm test`

Expected: PASS for config checks and the existing automated suite.

- [ ] **Step 5: Build the Android artifact**

Run:

```bash
cd cordova && test -f google-services.json
cd ..
npm run build-cordova-android
```

Expected:

- If `cordova/google-services.json` exists and is valid: build succeeds and writes `cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk`.
- If the file is absent: the check fails before build, and the next action is to place the real Firebase file in `cordova/google-services.json` and rerun the build.

- [ ] **Step 6: Commit**

```bash
git add tests/cordova-notifications-config.test.js cordova/config.xml cordova/package.json cordova/package-lock.json README.md
git commit -m "build: configure cordova android for firebase notifications"
```

---

## Self-Review Checklist

- Spec coverage:
  - package ID profissional: Task 6
  - inbox interna persistida e endpoints: Tasks 1-2
  - push com fallback seguro: Task 3
  - aba de notificacoes e badge: Task 4
  - notificacoes locais, FCM no cliente e robustez da UI: Task 5
  - docs Firebase, README e APK: Task 6
- Placeholder scan:
  - sem `TODO`, `TBD`, "implement later" ou passos vazios
- Type consistency:
  - `usuario_id`, `notificacao_id`, `token`, `dados`, `lida_em`, `canal` e `platform` usam os mesmos nomes em testes, backend e frontend

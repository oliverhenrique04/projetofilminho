# Auth, Amigos, LGPD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add login/cadastro, amigos com solicitacoes, LGPD, CEP/IBGE/ViaCEP, e testes/documentacao sem quebrar o app atual.

**Architecture:** Manter backend Express com JSON local, adicionar rotas de auth/amigos e migracao de schema. Frontend recebe tela de autenticacao inicial e secao Amigos no perfil. Testes com `node:test` e helpers que sobem o servidor em porta dedicada.

**Tech Stack:** Node.js 18+, Express, Framework7, node:test, fetch nativo.

---

## File Structure

**Create:**
- `tests/helpers/test-server.js` (start/stop server para testes)
- `tests/db-path.test.js` (verifica FILMINHO_DB)
- `tests/auth-register.test.js`
- `tests/auth-login.test.js`
- `tests/friends-flow.test.js`
- `tests/friends-evals.test.js`
- `tests/ui-auth.test.js`
- `tests/auth-utils.test.js`
- `www/js/auth-utils.js`
- `scripts/test-public-apis.js`

**Modify:**
- `backend/server.js`
- `backend/banco_filminho.json` (apenas se necessario, senao migracao automatica)
- `package.json`
- `www/index.html`
- `www/css/app.css`
- `www/js/app.js`
- `README.md`

---

### Task 1: Fix missing npm test + DB path override (root cause)

**Files:**
- Modify: `package.json`
- Modify: `backend/server.js`
- Create: `tests/helpers/test-server.js`
- Create: `tests/db-path.test.js`

- [ ] **Step 1: Write failing test (uses FILMINHO_DB)**

Create `tests/helpers/test-server.js`:

```js
const { spawn } = require('node:child_process');
const path = require('node:path');

async function startServer({ port, dbPath } = {}) {
  const env = { ...process.env };
  if (port) env.PORT = String(port);
  if (dbPath) env.FILMINHO_DB = dbPath;

  const serverPath = path.join(__dirname, '../../backend/server.js');
  const child = spawn('node', [serverPath], { env });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Server did not start in time'));
    }, 5000);

    child.stdout.on('data', (data) => {
      const text = data.toString();
      if (text.includes('FILMINHO ONLINE')) {
        clearTimeout(timer);
        resolve({ child, baseUrl: `http://localhost:${env.PORT || 3000}` });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function stopServer(child) {
  if (!child) return;
  child.kill('SIGTERM');
}

module.exports = { startServer, stopServer };
```

Create `tests/db-path.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, stopServer } = require('./helpers/test-server');

test('respects FILMINHO_DB env path', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-test-${Date.now()}.json`);
  const { child } = await startServer({ port: 3101, dbPath });
  try {
    assert.ok(fs.existsSync(dbPath), 'expected db file at FILMINHO_DB path');
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/db-path.test.js`
Expected: FAIL with assertion "expected db file at FILMINHO_DB path" (server cria DB no caminho padrao).

- [ ] **Step 3: Write minimal implementation**

Update `backend/server.js` to read `FILMINHO_DB`:

```js
const ARQUIVO_DB = process.env.FILMINHO_DB || path.join(__dirname, 'banco_filminho.json');
```

Add `test` scripts in `package.json`:

```json
{
  "scripts": {
    "test": "node --test",
    "test:apis": "node scripts/test-public-apis.js"
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/db-path.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 2: Auth registration endpoint

**Files:**
- Create: `tests/auth-register.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test**

Create `tests/auth-register.test.js`:

```js
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

test('registers user with unique name/email', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-reg-${Date.now()}.json`);
  const { child, baseUrl } = await startServer({ port: 3102, dbPath });
  try {
    const payload = {
      nome: 'joao_teste',
      email: 'joao@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    };
    const { res, data } = await postJson(`${baseUrl}/api/auth/registro`, payload);
    assert.equal(res.status, 201);
    assert.equal(data.nome, 'joao_teste');
    assert.equal(data.email, 'joao@test.com');
    assert.ok(data.id);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/auth-register.test.js`
Expected: FAIL with 404 or 500 because endpoint nao existe.

- [ ] **Step 3: Write minimal implementation**

Add to `backend/server.js`:

```js
const crypto = require('crypto');

function normalizarNome(nome) {
  return (nome || '').trim().toLowerCase();
}

function gerarSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashSenha(senha, salt) {
  const derived = crypto.scryptSync(senha, salt, 64);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

function validarSenha(senha, hashArmazenado) {
  const parts = (hashArmazenado || '').split('$');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const derived = crypto.scryptSync(senha, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(parts[2], 'hex'), Buffer.from(derived, 'hex'));
}

function garantirEstruturaBanco() {
  const banco = lerBanco();
  let mudou = false;

  if (!Array.isArray(banco.usuarios)) { banco.usuarios = []; mudou = true; }
  if (!Array.isArray(banco.avaliacoes)) { banco.avaliacoes = []; mudou = true; }
  if (!Array.isArray(banco.solicitacoes_amizade)) { banco.solicitacoes_amizade = []; mudou = true; }
  if (!Array.isArray(banco.amizades)) { banco.amizades = []; mudou = true; }

  banco.usuarios.forEach((u) => {
    if (!u.nome_normalizado && u.nome) { u.nome_normalizado = normalizarNome(u.nome); mudou = true; }
    if (u.deletado_em === undefined) { u.deletado_em = null; mudou = true; }
    if (!u.tipo) { u.tipo = 'user'; mudou = true; }
  });

  banco.avaliacoes.forEach((a) => {
    if (!a.criado_em) { a.criado_em = new Date().toISOString(); mudou = true; }
  });

  if (mudou) salvarBanco(banco);
  return banco;
}

guardarBanco = garantirEstruturaBanco();
```

Add route:

```js
app.post('/api/auth/registro', async (req, res) => {
  try {
    const { nome, email, senha, cep, consentimento_lgpd } = req.body;
    if (!nome || !email || !senha || !cep) return res.status(400).json({ erro: 'Dados obrigatorios ausentes.' });
    if (!consentimento_lgpd) return res.status(400).json({ erro: 'Consentimento LGPD obrigatorio.' });
    if (senha.length < 6) return res.status(400).json({ erro: 'Senha minima de 6 caracteres.' });

    const banco = lerBanco();
    const nomeNorm = normalizarNome(nome);

    if (banco.usuarios.some(u => u.email === email)) return res.status(409).json({ erro: 'Email ja cadastrado.' });
    if (banco.usuarios.some(u => u.nome_normalizado === nomeNorm)) return res.status(409).json({ erro: 'Nome ja cadastrado.' });

    const cepLimpo = String(cep).replace(/\D/g, '');
    if (cepLimpo.length !== 8) return res.status(400).json({ erro: 'CEP invalido.' });

    const viaCep = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    if (viaCep.data.erro) return res.status(400).json({ erro: 'CEP nao encontrado.' });

    const novoId = banco.usuarios.reduce((max, u) => Math.max(max, u.id), 0) + 1;
    const salt = gerarSalt();
    const novoUsuario = {
      id: novoId,
      nome,
      nome_normalizado: nomeNorm,
      email,
      senha_hash: hashSenha(senha, salt),
      cep: cepLimpo,
      cidade: viaCep.data.localidade,
      uf: viaCep.data.uf,
      consentimento_lgpd: true,
      consentimento_em: new Date().toISOString(),
      criado_em: new Date().toISOString(),
      deletado_em: null,
      tipo: 'user',
    };

    banco.usuarios.push(novoUsuario);
    salvarBanco(banco);
    res.status(201).json({ id: novoUsuario.id, nome: novoUsuario.nome, email: novoUsuario.email, cidade: novoUsuario.cidade, uf: novoUsuario.uf });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao registrar usuario.' });
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/auth-register.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 3: Auth login + usuario demo

**Files:**
- Create: `tests/auth-login.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test**

Create `tests/auth-login.test.js`:

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

test('logs in demo user', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-login-${Date.now()}.json`);
  const { child, baseUrl } = await startServer({ port: 3103, dbPath });
  try {
    const { res, data } = await postJson(`${baseUrl}/api/auth/login`, {
      email: 'admin@email',
      senha: '123456',
    });
    assert.equal(res.status, 200);
    assert.equal(data.email, 'admin@email');
    assert.equal(data.id, 1);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/auth-login.test.js`
Expected: FAIL (endpoint nao existe ou demo nao criado).

- [ ] **Step 3: Write minimal implementation**

In `backend/server.js`, extend `garantirEstruturaBanco` to seed demo:

```js
if (!banco.usuarios.find(u => u.id === 1)) {
  const salt = gerarSalt();
  banco.usuarios.push({
    id: 1,
    nome: 'Admin Demo',
    nome_normalizado: normalizarNome('Admin Demo'),
    email: 'admin@email',
    senha_hash: hashSenha('123456', salt),
    cep: '',
    cidade: '',
    uf: '',
    consentimento_lgpd: true,
    consentimento_em: new Date().toISOString(),
    criado_em: new Date().toISOString(),
    deletado_em: null,
    tipo: 'demo',
  });
  mudou = true;
}
```

Add login route:

```js
app.post('/api/auth/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatorios.' });
  const banco = lerBanco();
  const usuario = banco.usuarios.find(u => u.email === email && !u.deletado_em);
  if (!usuario) return res.status(401).json({ erro: 'Credenciais invalidas.' });
  if (!validarSenha(senha, usuario.senha_hash)) return res.status(401).json({ erro: 'Credenciais invalidas.' });
  res.json({ id: usuario.id, nome: usuario.nome, email: usuario.email, cidade: usuario.cidade, uf: usuario.uf });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/auth-login.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 4: Perfil e LGPD (excluir conta)

**Files:**
- Create: `tests/profile-lgpd.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test**

Create `tests/profile-lgpd.test.js`:

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

async function del(url) {
  const res = await fetch(url, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

test('deletes user and data (LGPD)', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-lgpd-${Date.now()}.json`);
  const { child, baseUrl } = await startServer({ port: 3104, dbPath });
  try {
    const reg = await postJson(`${baseUrl}/api/auth/registro`, {
      nome: 'maria_teste',
      email: 'maria@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const id = reg.data.id;
    const { res } = await del(`${baseUrl}/api/usuarios/${id}`);
    assert.equal(res.status, 200);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/profile-lgpd.test.js`
Expected: FAIL (rota nao existe).

- [ ] **Step 3: Write minimal implementation**

Add to `backend/server.js`:

```js
app.delete('/api/usuarios/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const banco = lerBanco();

  banco.usuarios = banco.usuarios.filter(u => u.id !== id);
  banco.avaliacoes = banco.avaliacoes.filter(a => a.id_usuario !== id);
  banco.solicitacoes_amizade = banco.solicitacoes_amizade.filter(s => s.de_id !== id && s.para_id !== id);
  banco.amizades = banco.amizades.filter(a => a.usuario_id !== id && a.amigo_id !== id);

  salvarBanco(banco);
  res.json({ ok: true });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/profile-lgpd.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 5: Amigos (buscar, solicitar, aceitar, recusar, listar)

**Files:**
- Create: `tests/friends-flow.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test**

Create `tests/friends-flow.test.js`:

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

test('friend request flow', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-friends-${Date.now()}.json`);
  const { child, baseUrl } = await startServer({ port: 3105, dbPath });
  try {
    const u1 = await postJson(`${baseUrl}/api/auth/registro`, {
      nome: 'user_a',
      email: 'a@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });
    const u2 = await postJson(`${baseUrl}/api/auth/registro`, {
      nome: 'user_b',
      email: 'b@test.com',
      senha: '123456',
      cep: '01001000',
      consentimento_lgpd: true,
    });

    const solicit = await postJson(`${baseUrl}/api/amigos/solicitar`, { de_id: u1.data.id, para_id: u2.data.id });
    assert.equal(solicit.res.status, 201);

    const pend = await getJson(`${baseUrl}/api/amigos/pendentes?usuario_id=${u2.data.id}`);
    assert.equal(pend.res.status, 200);
    assert.equal(pend.data.recebidas.length, 1);

    const aceitar = await postJson(`${baseUrl}/api/amigos/aceitar`, { solicitacao_id: solicit.data.id, usuario_id: u2.data.id });
    assert.equal(aceitar.res.status, 200);

    const amigos = await getJson(`${baseUrl}/api/amigos?usuario_id=${u1.data.id}`);
    assert.equal(amigos.data.length, 1);
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/friends-flow.test.js`
Expected: FAIL (rotas de amigos nao existem).

- [ ] **Step 3: Write minimal implementation**

Add to `backend/server.js`:

```js
app.get('/api/usuarios/buscar', (req, res) => {
  const termo = normalizarNome(req.query.nome || '');
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  if (!termo || termo.length < 2) return res.json([]);
  const banco = lerBanco();
  const sugestoes = banco.usuarios
    .filter(u => !u.deletado_em && u.id !== usuarioId && u.nome_normalizado.includes(termo))
    .slice(0, 10)
    .map(u => ({ id: u.id, nome: u.nome }));
  res.json(sugestoes);
});

app.post('/api/amigos/solicitar', (req, res) => {
  const { de_id, para_id } = req.body;
  if (!de_id || !para_id) return res.status(400).json({ erro: 'Dados obrigatorios.' });
  if (de_id === para_id) return res.status(400).json({ erro: 'Nao pode solicitar a si mesmo.' });
  const banco = lerBanco();

  const jaAmigos = banco.amizades.some(a => a.usuario_id === de_id && a.amigo_id === para_id);
  if (jaAmigos) return res.status(409).json({ erro: 'Ja sao amigos.' });

  const pendente = banco.solicitacoes_amizade.find(s =>
    (s.de_id === de_id && s.para_id === para_id && s.status === 'pendente') ||
    (s.de_id === para_id && s.para_id === de_id && s.status === 'pendente')
  );
  if (pendente) return res.status(409).json({ erro: 'Solicitacao ja pendente.' });

  const novaId = banco.solicitacoes_amizade.reduce((max, s) => Math.max(max, s.id || 0), 0) + 1;
  const solicitacao = { id: novaId, de_id, para_id, status: 'pendente', criado_em: new Date().toISOString() };
  banco.solicitacoes_amizade.push(solicitacao);
  salvarBanco(banco);
  res.status(201).json(solicitacao);
});

app.post('/api/amigos/aceitar', (req, res) => {
  const { solicitacao_id, usuario_id } = req.body;
  const banco = lerBanco();
  const solicitacao = banco.solicitacoes_amizade.find(s => s.id === solicitacao_id);
  if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitacao invalida.' });
  if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Nao autorizado.' });

  solicitacao.status = 'aceita';
  const desde = new Date().toISOString();
  banco.amizades.push({ usuario_id: solicitacao.de_id, amigo_id: solicitacao.para_id, desde_em: desde });
  banco.amizades.push({ usuario_id: solicitacao.para_id, amigo_id: solicitacao.de_id, desde_em: desde });

  salvarBanco(banco);
  res.json({ ok: true });
});

app.post('/api/amigos/recusar', (req, res) => {
  const { solicitacao_id, usuario_id } = req.body;
  const banco = lerBanco();
  const solicitacao = banco.solicitacoes_amizade.find(s => s.id === solicitacao_id);
  if (!solicitacao || solicitacao.status !== 'pendente') return res.status(404).json({ erro: 'Solicitacao invalida.' });
  if (solicitacao.para_id !== usuario_id) return res.status(403).json({ erro: 'Nao autorizado.' });

  solicitacao.status = 'recusada';
  salvarBanco(banco);
  res.json({ ok: true });
});

app.get('/api/amigos', (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  const banco = lerBanco();
  const ids = banco.amizades.filter(a => a.usuario_id === usuarioId).map(a => a.amigo_id);
  const amigos = banco.usuarios.filter(u => ids.includes(u.id)).map(u => ({ id: u.id, nome: u.nome }));
  res.json(amigos);
});

app.get('/api/amigos/pendentes', (req, res) => {
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  const banco = lerBanco();
  const recebidas = banco.solicitacoes_amizade.filter(s => s.para_id === usuarioId && s.status === 'pendente');
  const enviadas = banco.solicitacoes_amizade.filter(s => s.de_id === usuarioId && s.status === 'pendente');
  res.json({ recebidas, enviadas });
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/friends-flow.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 6: Avaliacoes de amigos

**Files:**
- Create: `tests/friends-evals.test.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test**

Create `tests/friends-evals.test.js`:

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

test('friend can view evaluations', async () => {
  const dbPath = path.join(os.tmpdir(), `filminho-evals-${Date.now()}.json`);
  const { child, baseUrl } = await startServer({ port: 3106, dbPath });
  try {
    const u1 = await postJson(`${baseUrl}/api/auth/registro`, {
      nome: 'user_c', email: 'c@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });
    const u2 = await postJson(`${baseUrl}/api/auth/registro`, {
      nome: 'user_d', email: 'd@test.com', senha: '123456', cep: '01001000', consentimento_lgpd: true,
    });

    const solicit = await postJson(`${baseUrl}/api/amigos/solicitar`, { de_id: u1.data.id, para_id: u2.data.id });
    await postJson(`${baseUrl}/api/amigos/aceitar`, { solicitacao_id: solicit.data.id, usuario_id: u2.data.id });

    await postJson(`${baseUrl}/api/avaliar`, {
      id_usuario: u1.data.id,
      id_filme: 123,
      titulo_filme: 'Filme X',
      nota: 4.5,
      poster_path: '/x.jpg',
      reassistido: false,
      foto: null,
      localizacao: null,
    });

    const { res, data } = await getJson(`${baseUrl}/api/amigos/${u1.data.id}/avaliacoes?usuario_id=${u2.data.id}`);
    assert.equal(res.status, 200);
    assert.equal(data.length, 1);
    assert.equal(data[0].titulo_filme, 'Filme X');
  } finally {
    stopServer(child);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/friends-evals.test.js`
Expected: FAIL (rota nao existe ou permissao).

- [ ] **Step 3: Write minimal implementation**

Add to `backend/server.js`:

```js
app.get('/api/amigos/:amigo_id/avaliacoes', (req, res) => {
  const amigoId = parseInt(req.params.amigo_id, 10);
  const usuarioId = parseInt(req.query.usuario_id || '0', 10);
  const banco = lerBanco();

  const ehAmigo = banco.amizades.some(a => a.usuario_id === usuarioId && a.amigo_id === amigoId);
  if (!ehAmigo) return res.status(403).json({ erro: 'Nao autorizado.' });

  const avals = banco.avaliacoes.filter(a => a.id_usuario === amigoId).map(a => ({
    id_avaliacao: a.id_avaliacao,
    id_filme: a.id_filme,
    titulo_filme: a.titulo_filme,
    nota: a.nota,
    poster_path: a.poster_path,
    foto: a.foto,
    localizacao: a.localizacao,
  }));

  res.json(avals);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/friends-evals.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 7: CEP/IBGE proxy + public API test script

**Files:**
- Create: `scripts/test-public-apis.js`
- Modify: `backend/server.js`

- [ ] **Step 1: Write failing test (script)**

Create `scripts/test-public-apis.js`:

```js
const axios = require('axios');

async function run() {
  const cep = await axios.get('https://viacep.com.br/ws/01001000/json/');
  console.log('ViaCEP OK:', cep.data.uf, cep.data.localidade);

  const ufs = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
  console.log('IBGE OK:', Array.isArray(ufs.data), 'Total:', ufs.data.length);
}

run().catch((err) => {
  console.error('Teste APIs falhou:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Run script to verify it fails (if endpoints not proxied, still ok)**

Run: `node scripts/test-public-apis.js`
Expected: PASS (validacao das APIs externas).

- [ ] **Step 3: Write minimal implementation (backend proxy)**

Add to `backend/server.js`:

```js
app.get('/api/cep/:cep', async (req, res) => {
  try {
    const cepLimpo = String(req.params.cep || '').replace(/\D/g, '');
    const resposta = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    res.json(resposta.data);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao consultar CEP.' });
  }
});

app.get('/api/ibge/ufs', async (req, res) => {
  try {
    const resposta = await axios.get('https://servicodados.ibge.gov.br/api/v1/localidades/estados');
    res.json(resposta.data);
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao consultar IBGE.' });
  }
});
```

- [ ] **Step 4: Run script again**

Run: `node scripts/test-public-apis.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 8: UI - Auth screen + Friends section (HTML/CSS)

**Files:**
- Create: `tests/ui-auth.test.js`
- Modify: `www/index.html`
- Modify: `www/css/app.css`
- Modify: `package.json` (devDependency: jsdom)

- [ ] **Step 1: Write failing test (UI structure)**

Add `jsdom` devDependency:

```json
{
  "devDependencies": {
    "jsdom": "^24.0.0"
  }
}
```

Create `tests/ui-auth.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/ui-auth.test.js`
Expected: FAIL (elementos nao existem).

- [ ] **Step 3: Write minimal implementation**

Update `www/index.html` (insert before `#app`):

```html
<div id="auth-screen" class="auth-screen">
  <div class="auth-card">
    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Login</button>
      <button class="auth-tab" data-tab="register">Cadastro</button>
    </div>

    <div id="auth-login" class="auth-panel active">
      <form id="auth-login-form">
        <input type="email" id="login-email" placeholder="Email" required>
        <input type="password" id="login-senha" placeholder="Senha" required>
        <button type="submit">Entrar</button>
      </form>
    </div>

    <div id="auth-register" class="auth-panel">
      <form id="auth-register-form">
        <input type="text" id="cadastro-nome" placeholder="Nome de usuario" required>
        <input type="email" id="cadastro-email" placeholder="Email" required>
        <input type="password" id="cadastro-senha" placeholder="Senha" required>
        <input type="text" id="cadastro-cep" placeholder="CEP" required>
        <input type="text" id="cadastro-cidade" placeholder="Cidade" readonly>
        <select id="cadastro-uf"></select>
        <label class="auth-consent">
          <input type="checkbox" id="cadastro-lgpd" required>
          Concordo com a politica de privacidade (LGPD)
        </label>
        <button type="submit">Criar conta</button>
      </form>
    </div>
  </div>
</div>
```

Add Friends section inside perfil tab (`#tab-perfil`) in `www/index.html`:

```html
<div id="friends-section" class="block" style="margin-top: 20px;">
  <div class="block-title">Amigos</div>
  <div class="friends-search">
    <input type="text" id="friend-search-input" placeholder="Buscar por nome">
    <div id="friend-suggestions" class="friends-suggestions"></div>
    <button id="friend-request-button" class="button button-fill">Enviar solicitacao</button>
  </div>

  <div class="block-title">Solicitacoes recebidas</div>
  <div id="friend-requests-received"></div>

  <div class="block-title">Solicitacoes enviadas</div>
  <div id="friend-requests-sent"></div>

  <div class="block-title">Meus amigos</div>
  <div id="friends-list"></div>
</div>
```

Add CSS in `www/css/app.css`:

```css
.auth-screen { position: fixed; inset: 0; display: none; background: #0b0c10; z-index: 30000; }
.auth-screen.active { display: flex; align-items: center; justify-content: center; padding: 20px; }
.auth-card { width: 100%; max-width: 360px; background: #121418; border-radius: 12px; padding: 20px; border: 1px solid #1f2228; }
.auth-tabs { display: flex; gap: 10px; margin-bottom: 15px; }
.auth-tab { flex: 1; padding: 10px; border: 1px solid #1f2228; background: #1a1c23; color: #fff; cursor: pointer; }
.auth-tab.active { background: #00e054; color: #000; border-color: #00e054; }
.auth-panel { display: none; }
.auth-panel.active { display: block; }
.auth-card input, .auth-card select { width: 100%; margin-bottom: 10px; padding: 10px; background: #0b0c10; color: #fff; border: 1px solid #333; border-radius: 6px; }
.auth-card button { width: 100%; padding: 10px; background: #00e054; color: #000; border: none; border-radius: 6px; font-weight: 800; }
.auth-consent { display: flex; gap: 8px; color: #c5c6c7; font-size: 12px; margin-bottom: 10px; }

.friends-search { display: grid; gap: 10px; }
.friends-suggestions { background: #1a1c23; border: 1px solid #1f2228; border-radius: 8px; display: none; }
.friends-suggestions.active { display: block; }
.friends-suggestions .suggestion { padding: 8px 10px; cursor: pointer; color: #fff; }
.friends-suggestions .suggestion:hover { background: #242730; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/ui-auth.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 9: Frontend auth utils + app.js wiring

**Files:**
- Create: `www/js/auth-utils.js`
- Create: `tests/auth-utils.test.js`
- Modify: `www/js/app.js`

- [ ] **Step 1: Write failing test**

Create `www/js/auth-utils.js`:

```js
function normalizarNome(nome) {
  return (nome || '').trim().toLowerCase();
}

function validarEmail(email) {
  return /.+@.+\..+/.test(email || '');
}

function validarSenha(senha) {
  return (senha || '').length >= 6;
}

function limparCep(cep) {
  return String(cep || '').replace(/\D/g, '');
}

module.exports = { normalizarNome, validarEmail, validarSenha, limparCep };
```

Create `tests/auth-utils.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizarNome, validarEmail, validarSenha, limparCep } = require('../www/js/auth-utils');

test('auth utils', () => {
  assert.equal(normalizarNome(' Joao '), 'joao');
  assert.ok(validarEmail('a@b.com'));
  assert.ok(validarSenha('123456'));
  assert.equal(limparCep('01.001-000'), '01001000');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/auth-utils.test.js`
Expected: FAIL (arquivo ainda nao existe ou funcoes nao exportadas).

- [ ] **Step 3: Write minimal implementation**

In `www/js/app.js`, add auth flow (exemplo de trechos):

```js
var MEU_ID_USUARIO = Number(localStorage.getItem('filminho_user_id') || 0);

function mostrarAuth() {
  document.getElementById('auth-screen').classList.add('active');
  document.getElementById('app').style.display = 'none';
}

function mostrarApp() {
  document.getElementById('auth-screen').classList.remove('active');
  document.getElementById('app').style.display = 'block';
}

function bindAuthTabs() {
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.auth-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`auth-${btn.dataset.tab}`).classList.add('active');
    });
  });
}

async function carregarUfs() {
  const res = await fetch(API_URL + '/ibge/ufs');
  const ufs = await res.json();
  const select = document.getElementById('cadastro-uf');
  select.innerHTML = ufs.map(u => `<option value="${u.sigla}">${u.sigla}</option>`).join('');
}

async function buscarCep(cep) {
  const res = await fetch(API_URL + '/cep/' + cep);
  return res.json();
}

async function handleLogin(ev) {
  ev.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  const res = await fetch(API_URL + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, senha }) });
  if (!res.ok) return app.dialog.alert('Credenciais invalidas.');
  const data = await res.json();
  localStorage.setItem('filminho_user_id', data.id);
  localStorage.setItem('filminho_user_nome', data.nome);
  localStorage.setItem('filminho_user_cidade', data.cidade || '');
  localStorage.setItem('filminho_user_uf', data.uf || '');
  MEU_ID_USUARIO = data.id;
  mostrarApp();
  carregarPerfil();
}

async function handleCadastro(ev) {
  ev.preventDefault();
  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const cep = document.getElementById('cadastro-cep').value.trim();
  const consent = document.getElementById('cadastro-lgpd').checked;

  const res = await fetch(API_URL + '/auth/registro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, email, senha, cep, consentimento_lgpd: consent }) });
  const data = await res.json();
  if (!res.ok) return app.dialog.alert(data.erro || 'Falha no cadastro.');

  localStorage.setItem('filminho_user_id', data.id);
  localStorage.setItem('filminho_user_nome', data.nome);
  localStorage.setItem('filminho_user_cidade', data.cidade || '');
  localStorage.setItem('filminho_user_uf', data.uf || '');
  MEU_ID_USUARIO = data.id;
  mostrarApp();
  carregarPerfil();
}

function initAuth() {
  bindAuthTabs();
  carregarUfs();
  document.getElementById('auth-login-form').addEventListener('submit', handleLogin);
  document.getElementById('auth-register-form').addEventListener('submit', handleCadastro);
  document.getElementById('cadastro-cep').addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      const data = await buscarCep(cep);
      if (!data.erro) {
        document.getElementById('cadastro-cidade').value = data.localidade || '';
        document.getElementById('cadastro-uf').value = data.uf || '';
      }
    }
  });

  if (!MEU_ID_USUARIO) mostrarAuth();
  else mostrarApp();
}

initAuth();
```

Wire friends UI in `app.js` (trechos):

```js
let amigoSelecionadoId = null;

async function carregarSolicitacoes() {
  const res = await fetch(`${API_URL}/amigos/pendentes?usuario_id=${MEU_ID_USUARIO}`);
  const data = await res.json();
  document.getElementById('friend-requests-received').innerHTML = data.recebidas.map(s => (
    `<div>${s.de_id} <button onclick="aceitarSolicitacao(${s.id})">Aceitar</button> <button onclick="recusarSolicitacao(${s.id})">Recusar</button></div>`
  )).join('') || '<p>Nenhuma</p>';
  document.getElementById('friend-requests-sent').innerHTML = data.enviadas.map(s => `<div>Pedido para ${s.para_id}</div>`).join('') || '<p>Nenhuma</p>';
}

async function aceitarSolicitacao(id) {
  await fetch(`${API_URL}/amigos/aceitar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitacao_id: id, usuario_id: MEU_ID_USUARIO }) });
  carregarSolicitacoes();
  carregarAmigos();
}

async function recusarSolicitacao(id) {
  await fetch(`${API_URL}/amigos/recusar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solicitacao_id: id, usuario_id: MEU_ID_USUARIO }) });
  carregarSolicitacoes();
}

async function carregarAmigos() {
  const res = await fetch(`${API_URL}/amigos?usuario_id=${MEU_ID_USUARIO}`);
  const amigos = await res.json();
  document.getElementById('friends-list').innerHTML = amigos.map(a => (
    `<div onclick="abrirAvaliacaoAmigo(${a.id}, '${a.nome}')">${a.nome}</div>`
  )).join('') || '<p>Nenhum amigo.</p>';
}

async function abrirAvaliacaoAmigo(amigoId, nome) {
  const res = await fetch(`${API_URL}/amigos/${amigoId}/avaliacoes?usuario_id=${MEU_ID_USUARIO}`);
  const avals = await res.json();
  const html = avals.map(a => `<div>${a.titulo_filme} - ${a.nota}</div>`).join('') || 'Sem avaliacoes.';
  app.dialog.alert(html, `Filmes de ${nome}`);
}

async function buscarSugestoes(nome) {
  const res = await fetch(`${API_URL}/usuarios/buscar?nome=${encodeURIComponent(nome)}&usuario_id=${MEU_ID_USUARIO}`);
  return res.json();
}

const input = document.getElementById('friend-search-input');
input.addEventListener('input', async (e) => {
  const termo = e.target.value.trim();
  const box = document.getElementById('friend-suggestions');
  if (termo.length < 2) { box.classList.remove('active'); box.innerHTML = ''; return; }
  const lista = await buscarSugestoes(termo);
  box.innerHTML = lista.map(u => `<div class="suggestion" data-id="${u.id}">${u.nome}</div>`).join('');
  box.classList.add('active');
  box.querySelectorAll('.suggestion').forEach(el => el.addEventListener('click', () => {
    amigoSelecionadoId = Number(el.dataset.id);
    input.value = el.textContent;
    box.classList.remove('active');
  }));
});

document.getElementById('friend-request-button').addEventListener('click', async () => {
  if (!amigoSelecionadoId) return app.dialog.alert('Selecione um usuario.');
  await fetch(`${API_URL}/amigos/solicitar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ de_id: MEU_ID_USUARIO, para_id: amigoSelecionadoId }) });
  amigoSelecionadoId = null;
  input.value = '';
  carregarSolicitacoes();
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/auth-utils.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

Skip commit per user request.

---

### Task 10: README updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write update**

Add sections:
- Auth (demo user, login/cadastro)
- Amigos (fluxo)
- APIs publicas: ViaCEP + IBGE (link catalogo dados.gov.br)
- Testes: `npm test` e `npm run test:apis`

- [ ] **Step 2: Verify**

Run: `npm run test:apis` (manual check) and skim README for clarity.

- [ ] **Step 3: Commit**

Skip commit per user request.

---

## Self-Review Checklist
- [ ] Todos os requisitos do spec estao cobertos por tarefas.
- [ ] Sem placeholders, todos os passos tem codigo e comandos reais.
- [ ] TDD aplicado (testes escritos antes do codigo de producao).
- [ ] Scripts e README atualizados.

---

## Execution Handoff
Plan complete and saved to `docs/superpowers/plans/2026-05-18-auth-amigos-lgpd.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

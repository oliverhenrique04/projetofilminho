# Design Spec: Autenticação, Amigos e LGPD

**Data:** 2026-05-18
**Branch:** feature/auth-amigos-lgpd
**Worktree:** .worktrees/auth-amigos-lgpd

## Visão Geral

Implementar autenticação por email/senha, sistema de amigos com solicitações (enviar/aceitar/recusar), e conformidade LGPD (consentimento + exclusão de conta/dados) no app Filminho.

## Design Decisions

### 1. Tela de Login/Cadastro

- **Approach:** Tela única com duas abas (Login / Cadastro)
- **Posição:** Primeira tela antes do app principal
- **Fluxo:** Se não há usuário logado → mostra auth screen. Se há → mostra app
- **Validações:**
  - Login: email e senha obrigatórios
  - Cadastro: nome único, email único, senha mín. 6 caracteres, CEP válido, consentimento LGPD obrigatório

### 2. Sistema de Amigos

- **Busca:** Por nome (tipo Instagram autocomplete)
- **Endpoints:**
  - `GET /api/usuarios/buscar?nome=...` - Busca usuários por nome
  - `POST /api/amigos/solicitar` - Envia solicitação
  - `POST /api/amigos/aceitar` - Aceita solicitação
  - `POST /api/amigos/recusar` - Recusa solicitação
  - `GET /api/amigos?usuario_id=...` - Lista amigos
  - `GET /api/amigos/pendentes?usuario_id=...` - Lista solicitações
  - `GET /api/amigos/:amigo_id/avaliacoes?usuario_id=...` - Avaliações de amigo (só se for amigo)
- **UI:** Input de busca com dropdown de sugestões, listas de solicitações pendentes, lista de amigos

### 3. LGPD

- **Consentimento:** Checkbox obrigatório no cadastro com texto explicando uso de dados
- **Exclusão de conta:** Botão no perfil que remove usuário e todos os dados (avaliações, amizades, solicitações)
- **Fluxo de exclusão:** Confirma com o usuário antes de excluir

### 4. Segurança

- **Hash de senha:** crypto.scrypt com salt único por usuário
- **Validação:** normalizarNome (trim + lowercase), validarEmail (regex), validarSenha (mín. 6 caracteres)

### 5. Dados

- **Novos campos em banco_filminho.json:**
  - `usuarios`: nome, email, senha_hash, salt, cep, cidade, uf, consentimento_lgpd
  - `solicitacoes_amizade`: solicitante_id, destinatario_id, status (pendente/aceita/recusada)
  - `amizades`: usuario_id, amigo_id
- **Usuário demo:** id 1, admin@email, 123456 (hash), consentimento: true

### 6. CEP e Estados

- **CEP:** ViaCEP (https://viacep.com.br/ws/{cep}/json/)
- **Estados:** IBGE (https://servicodados.ibge.gov.br/api/v1/localidades/estados)
- **Proxy:** Adicionar `/api/cep/:cep` e `/api/ibge/ufs` no backend

## Estrutura de Arquivos

### Backend (backend/server.js)

```javascript
// Novas imports
const crypto = require('crypto');

// Utilitários de auth
function normalizarNome(nome) { return nome.trim().toLowerCase(); }
function validarEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function validarSenha(senha) { return senha && senha.length >= 6; }

// Hash de senha
async function gerarSalt() { return crypto.randomBytes(16).toString('hex'); }
async function hashSenha(senha, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(senha, salt, 64, (err, hash) => {
      resolve(err ? null : hash.toString('hex'));
    });
  });
}

// Schema migration
function garantirEstruturaBanco() {
  // Adicionar campos de auth se não existirem
  // Adicionar arrays de amizades/solicitacoes
}

// Seed demo user
function garantirDemoUser() {
  // Criar admin@email / 123456 se não existir
}

// Novos endpoints
app.post('/api/auth/registro', async (req, res) => { ... });
app.post('/api/auth/login', async (req, res) => { ... });
app.delete('/api/usuarios/:id', async (req, res) => { ... });
app.get('/api/usuarios/buscar', async (req, res) => { ... });
app.post('/api/amigos/solicitar', async (req, res) => { ... });
app.post('/api/amigos/aceitar', async (req, res) => { ... });
app.post('/api/amigos/recusar', async (req, res) => { ... });
app.get('/api/amigos', async (req, res) => { ... });
app.get('/api/amigos/pendentes', async (req, res) => { ... });
app.get('/api/amigos/:amigo_id/avaliacoes', async (req, res) => { ... });
app.get('/api/cep/:cep', async (req, res) => { ... }); // Proxy ViaCEP
app.get('/api/ibge/ufs', async (req, res) => { ... }); // Proxy IBGE
```

### Frontend (www/index.html)

```html
<!-- Auth Screen -->
<div id="auth-screen" class="page">
  <div class="auth-card">
    <div class="auth-tabs">
      <button class="auth-tab active" data-tab="login">Login</button>
      <button class="auth-tab" data-tab="register">Cadastro</button>
    </div>
    
    <!-- Login Form -->
    <form id="auth-login-form">
      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Senha" required />
      <button type="submit">Entrar</button>
    </form>
    
    <!-- Register Form -->
    <form id="auth-register-form">
      <input type="text" placeholder="Nome" required />
      <input type="email" placeholder="Email" required />
      <input type="password" placeholder="Senha (mín. 6 caracteres)" required />
      <input type="text" placeholder="CEP" maxlength="9" id="cep-input" />
      <input type="text" placeholder="Cidade" readonly />
      <select id="uf-select" readonly></select>
      <label>
        <input type="checkbox" id="lgpd-consent" required />
        Li e concordo com o tratamento dos meus dados pessoais
      </label>
      <button type="submit">Cadastrar</button>
    </form>
  </div>
</div>

<!-- Friends Section (dentro de #tab-perfil) -->
<div class="friends-section">
  <h3>Amigos</h3>
  <div class="friends-search">
    <input type="text" placeholder="Buscar amigo por nome..." id="friend-search-input" />
    <div id="friend-suggestions" class="friends-suggestions"></div>
  </div>
  
  <div class="friends-requests">
    <h4>Solicitações Pendentes</h4>
    <div id="pending-requests-list"></div>
  </div>
  
  <div class="friends-list">
    <h4>Meus Amigos</h4>
    <div id="friends-list"></div>
  </div>
</div>

<!-- Logout/Delete buttons (dentro de #tab-perfil) -->
<div class="perfil-actions">
  <button id="logout-btn">Sair</button>
  <button id="delete-account-btn" class="danger">Excluir minha conta e dados</button>
</div>
```

### Frontend (www/js/app.js)

```javascript
// Variáveis globais
let MEU_ID_USUARIO = localStorage.getItem('filminho_user_id');

// Funções de auth
function mostrarAuth() {
  app.views.main.router.load({ url: '/' });
  document.getElementById('auth-screen').style.display = 'block';
  document.getElementById('app').style.display = 'none';
}

function mostrarApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  carregarPerfil();
}

function bindAuthTabs() {
  // Alternar entre login e cadastro
}

async function carregarUfs() {
  // Buscar UFs do IBGE
}

async function buscarCep(cep) {
  // Buscar CEP no ViaCEP
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const senha = document.getElementById('login-senha').value;
  
  const response = await fetch(`/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('filminho_user_id', data.id);
    mostrarApp();
  } else {
    f7.dialog.alert('Email ou senha incorretos');
  }
}

async function handleCadastro(event) {
  event.preventDefault();
  // Validar todos os campos
  // Enviar para /api/auth/registro
  // Se sucesso, salvar user_id e mostrar app
}

function logout() {
  localStorage.removeItem('filminho_user_id');
  mostrarAuth();
}

async function excluirConta() {
  f7.dialog.confirm('Tem certeza? Todos os seus dados serão removidos permanentemente.', async (confirmed) => {
    if (confirmed) {
      await fetch(`/api/usuarios/${MEU_ID_USUARIO}`, { method: 'DELETE' });
      localStorage.removeItem('filminho_user_id');
      mostrarAuth();
    }
  });
}

// Funções de amigos
async function carregarSolicitacoes() {
  // Buscar solicitações pendentes
}

async function aceitarSolicitacao(solicitacaoId) {
  // POST /api/amigos/aceitar
  // Atualizar listas
}

async function recusarSolicitacao(solicitacaoId) {
  // POST /api/amigos/recusar
}

async function carregarAmigos() {
  // Buscar lista de amigos
}

async function abrirAvaliacaoAmigo(amigoId) {
  // Buscar avaliações do amigo (só se for amigo)
}

// Autocomplete de busca de amigos
document.getElementById('friend-search-input').addEventListener('input', async (e) => {
  const termo = e.target.value;
  if (termo.length < 2) {
    document.getElementById('friend-suggestions').style.display = 'none';
    return;
  }
  
  const response = await fetch(`/api/usuarios/buscar?nome=${encodeURIComponent(termo)}`);
  const usuarios = await response.json();
  // Mostrar sugestões
});

// initAuth
function initAuth() {
  MEU_ID_USUARIO = localStorage.getItem('filminho_user_id');
  if (MEU_ID_USUARIO) {
    mostrarApp();
  } else {
    mostrarAuth();
  }
}

// Chamar initAuth() no final do carregamento
```

## Testes

### Testes de backend (tests/)

1. **auth-register.test.js**
   - Registro com sucesso
   - Rejeitar email duplicado
   - Rejeitar nome duplicado
   - Rejeitar senha curta

2. **auth-login.test.js**
   - Login com credenciais corretas
   - Rejeitar senha incorreta
   - Rejeitar email inexistente

3. **friends-flow.test.js**
   - Solicitar amizade
   - Aceitar solicitação
   - Listar amigos
   - Rejeitar auto-solicitação

4. **friends-evals.test.js**
   - Amigo pode ver avaliações
   - Não-amigo não pode ver (403)

5. **profile-lgpd.test.js**
   - Exclusão de conta remove tudo

6. **ui-auth.test.js**
   - Auth screen existe
   - Forms existem
   - Friends section existe

7. **auth-utils.test.js**
   - normalizarNome
   - validarEmail
   - validarSenha
   - limparCep

### Testes de APIs públicas (scripts/test-public-apis.js)

- ViaCEP: GET para CEP 01001000
- IBGE: GET para lista de estados

## README Updates

- Adicionar seção de Autenticação
- Adicionar seção de Amigos
- Adicionar seção de LGPD
- Atualizar tabela de Tecnologias
- Atualizar tabela de Funcionalidades
- Atualizar tabela de Endpoints
- Adicionar tabela de Scripts úteis
- Adicionar seção de Testes
- Adicionar seção de Dados.gov.br

## Branch e Worktree

- **Branch:** feature/auth-amigos-lgpd
- **Worktree:** .worktrees/auth-amigos-lgpd
- **Commit:** Apenas .gitignore (worktrees) - implementação sem commit

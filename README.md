# Filminho

Aplicativo mobile/web para descoberta e avaliação de filmes, desenvolvido com Apache Cordova e Framework7 como projeto integrador da disciplina de Desenvolvimento Mobile.

## Integrantes

- Marcos de Oliveira - RA 082028
- Oliver Henrique - RA 083885

## Descrição do app

O Filminho permite explorar filmes populares, pesquisar títulos, visualizar detalhes completos e registrar avaliações pessoais. A aplicação combina:

- Frontend em Framework7 (interface responsiva com foco em mobile)
- Backend Node.js + Express (API própria e integração com TMDb)
- Persistência local de dados de perfil e avaliações
- Autenticação por email e senha com hash seguro (scrypt)
- Cadastro com CEP (ViaCEP) e lista de estados (IBGE)
- Sistema de amigos com solicitações (enviar/aceitar/recusar)
- Conformidade LGPD: consentimento obrigatório e exclusão de conta/dados

## Tecnologias utilizadas

- Apache Cordova
- Framework7
- HTML5
- CSS3
- JavaScript ES6+
- Node.js
- Express.js
- Axios
- TMDb API
- ViaCEP (CEP -> cidade/UF)
- IBGE (lista de estados, catalogada no dados.gov.br)
- crypto.scrypt (hash de senhas)
- localStorage (sessão e nome de usuário)
- JSON local em `backend/banco_filminho.json` (perfil, avaliações, amigos)

## Funcionalidades implementadas

### Autenticação

- Tela de login/cadastro antes do app
- Login com email e senha
- Cadastro com nome único, email, senha (mín. 6 caracteres), CEP, cidade/UF auto
- Consentimento LGPD obrigatório no cadastro
- Usuário demo: `admin@email` / `123456`
- Logout no perfil
- Exclusão de conta e dados (LGPD)

### Catálogo e descoberta

- Listagem de filmes em tendência
- Navegação por categorias (Ação, Comédia, Terror, Ficção)
- Busca por título com atualização dinâmica
- Sorteio de filme aleatório para recomendação rápida

### Detalhes do filme

- Página de detalhes com:
  - título, ano e duração
  - sinopse
  - elenco principal
  - provedores de streaming (quando disponíveis para BR)

### Diário e avaliações

- Criação de avaliação com nota de 0.5 a 5.0
- Marcação de filme como reassistido
- Inclusão opcional de foto via câmera
- Captura opcional de localização ao salvar avaliação com foto
- Listagem de avaliações no perfil
- Remoção de avaliação do diário

### Perfil

- Exibição de avatar dinâmico e nome do usuário
- Cidade/UF exibida no perfil
- Edição do nome do perfil
- Carrossel de filmes recentes avaliados

### Amigos

- Busca por nome com autocomplete (tipo Instagram)
- Envio de solicitação de amizade
- Aceitar/recusar solicitações recebidas
- Lista de amigos com acesso às avaliações (título, poster, nota, foto, localização)

## Estrutura do projeto

```text
projetofilminho/
|- backend/
|  |- banco_filminho.json
|  \- server.js
|- build/
|  \- build.mjs
|- cordova/
|  |- config.xml
|  \- package.json
|- scripts/
|  \- test-public-apis.js
|- tests/
|  |- helpers/
|  |- auth-register.test.js
|  |- auth-login.test.js
|  |- friends-flow.test.js
|  |- friends-evals.test.js
|  |- profile-lgpd.test.js
|  |- ui-auth.test.js
|  |- auth-utils.test.js
|  \- db-path.test.js
|- www/
|  |- index.html
|  |- css/
|  |- js/
|  \- pages/
|- package.json
\- README.md
```

## Pré-requisitos

- Node.js 18+ e npm
- Cordova CLI (global ou via `npx`)

## Como executar

### 1) Execução recomendada (frontend + API no mesmo host)

Na raiz do projeto:

```bash
npm install
node backend/server.js
```

Abra no navegador:

- http://localhost:3000

## Notificações e APK Android

- O app Android usa o package ID `br.com.filminho.app`.
- A inbox interna e os lembretes locais funcionam sem Firebase.
- Para push real via FCM, adicione `cordova-plugin-firebase-messaging`, coloque um `google-services.json` válido em `cordova/google-services.json` e siga [docs/firebase-setup.md](/home/mrosa/projetofilminho/docs/firebase-setup.md:1).
- Para o backend enviar pushes, configure `GOOGLE_APPLICATION_CREDENTIALS` conforme [docs/firebase-setup.md](/home/mrosa/projetofilminho/docs/firebase-setup.md:1).

### Gerar APK

```bash
npm install
cd cordova && npm install && cd ..
npm run build-cordova-android
```

APK esperado:

- `cordova/platforms/android/app/build/outputs/apk/debug/app-debug.apk`

### 2) Execução com Cordova no navegador (fluxo acadêmico)

Na raiz do projeto:

```bash
npm install
node build/build.mjs
```

Depois, dentro da pasta `cordova`:

```bash
cd cordova
npm install
cordova platform add browser
cordova run browser
```

Se o comando `cordova` não estiver disponível globalmente, use:

```bash
npx cordova platform add browser
npx cordova run browser
```

## Scripts úteis (raiz)

| Script | Comando | Descrição |
| --- | --- | --- |
| Desenvolvimento web | `npm run start` | Sobe backend e servidor estático em paralelo |
| Backend | `npm run serve-backend` | Inicia API Express em `http://localhost:3000` |
| Frontend estático | `npm run serve-frontend` | Serve `www/` em `http://localhost:8080` |
| Testes | `npm test` | Executa todos os testes (node:test) |
| Testes APIs | `npm run test:apis` | Testa ViaCEP e IBGE |
| Build Cordova | `npm run build-cordova` | Copia assets e executa build Cordova |
| Rodar Android | `npm run cordova-android` | Copia assets e executa app no Android |
| Rodar iOS | `npm run cordova-ios` | Copia assets e executa app no iOS |

## Endpoints da API

### Filmes (existentes)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/filmes/tendencias` | Lista filmes populares |
| GET | `/api/filmes/categoria/:id` | Lista filmes por gênero |
| GET | `/api/filmes/sortear` | Retorna um filme aleatório |
| GET | `/api/filme/:id` | Retorna detalhes completos do filme |
| GET | `/api/filmes/buscar?q=...` | Busca filmes por termo |

### Avaliações (existentes)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| POST | `/api/avaliar` | Salva nova avaliação |
| DELETE | `/api/avaliar/:id_avaliacao` | Remove avaliação |

### Perfil (existentes + novos campos)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/perfil/:id_usuario` | Retorna perfil + avaliações (agora com cidade/uf) |
| PUT | `/api/perfil/:id_usuario` | Atualiza nome do usuário (valida único) |

### Autenticação (novos)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| POST | `/api/auth/registro` | Cria nova conta (valida nome/email únicos, CEP, LGPD) |
| POST | `/api/auth/login` | Login com email/senha |
| DELETE | `/api/usuarios/:id` | Exclui conta e todos os dados (LGPD) |

### Amigos (novos)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/usuarios/buscar?nome=...` | Busca usuários por nome (autocomplete) |
| POST | `/api/amigos/solicitar` | Envia solicitação de amizade |
| POST | `/api/amigos/aceitar` | Aceita solicitação |
| POST | `/api/amigos/recusar` | Recusa solicitação |
| GET | `/api/amigos?usuario_id=...` | Lista amigos |
| GET | `/api/amigos/pendentes?usuario_id=...` | Lista solicitações recebidas/enviadas |
| GET | `/api/amigos/:amigo_id/avaliacoes?usuario_id=...` | Avaliações de um amigo (só se for amigo) |

### APIs Públicas (novos proxies)

| Método | Endpoint | Descrição |
| --- | --- | --- |
| GET | `/api/cep/:cep` | ViaCEP (cidade/UF por CEP) |
| GET | `/api/ibge/ufs` | IBGE (lista de estados) |

## Testes de APIs Públicas

Para testar as APIs externas (ViaCEP e IBGE):

```bash
npm run test:apis
```

Output esperado:
```
=== Testando APIs Públicas ===

✅ ViaCEP OK: SP São Paulo
✅ IBGE OK: true Total: 27 estados

=== Testes concluídos ===
```

## Testes automatizados

Para executar todos os testes:

```bash
npm test
```

## Dados.gov.br

A API do IBGE (estados) é catalogada no portal dados.gov.br:
https://dados.gov.br/

## Observações técnicas

- A chave da TMDb está atualmente definida em `backend/server.js`.
- Para ambiente de produção, recomenda-se mover a chave para variável de ambiente.
- O arquivo `backend/banco_filminho.json` funciona como base local para usuários, avaliações, amizades e solicitações.
- Senhas são armazenadas com hash scrypt (salt único por usuário).
- O usuário demo (id 1) tem email `admin@email` e senha `123456`.

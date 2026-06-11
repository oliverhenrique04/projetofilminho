# Design Spec: Notificacoes, Robustez e Refinamento Mobile

**Data:** 2026-06-10
**Branch:** feature/auth-amigos-lgpd
**Workspace:** /home/mrosa/projetofilminho

## Visao Geral

Profissionalizar o Filminho como app mobile Android com uma camada completa de notificacoes, melhoria visual consistente e comportamento mais robusto diante de falhas de rede e dependencias externas. A entrega combina:

- notificacoes locais para lembretes e retorno ao app
- push notifications reais via Firebase Cloud Messaging (FCM)
- central de notificacoes dentro do app, independente da entrega do push
- refinamento visual para parecer um app mobile mais coeso
- endurecimento do frontend e backend para reduzir falhas silenciosas
- preparacao do projeto Cordova para gerar APK Android com identidade profissional

## Objetivos

- Trocar o identificador do app para `br.com.filminho.app`.
- Adicionar notificacoes locais com permissao e agendamento seguros para Android moderno.
- Adicionar push notifications via FCM no app Cordova Android.
- Persistir notificacoes e tokens de dispositivo no backend.
- Exibir central de notificacoes com badge de nao lidas no app.
- Melhorar a UI com hierarquia visual, estados vazios e feedbacks de erro/sucesso mais fortes.
- Tornar fluxos principais mais robustos contra falhas de TMDb, ViaCEP, IBGE e FCM.
- Manter compatibilidade com a arquitetura atual: frontend em `www/`, backend Express em `backend/server.js` e banco JSON local.

## Nao Objetivos

- Migrar persistencia de JSON para banco relacional ou NoSQL externo.
- Publicar o app na Play Store neste ciclo.
- Implementar painel administrativo para disparo manual de push.
- Adicionar analytics, Crashlytics ou telemetria ampla.
- Implementar notificacoes iOS com validacao completa neste ciclo.

## Decisoes de Produto

### Tipos de notificacao

1. **Local notifications**
   - Lembrete para voltar ao app.
   - Lembrete para avaliar filme apos interacoes relevantes.
   - Avisos de engajamento simples, disparados pelo proprio app.

2. **Push notifications**
   - Nova solicitacao de amizade.
   - Solicitacao de amizade aceita.
   - Eventos sociais futuros reutilizando a mesma infraestrutura.

3. **Inbox interna**
   - Toda notificacao relevante tambem sera salva no backend.
   - Mesmo que o push falhe, o usuario ainda ve o evento dentro do app.

### Navegacao

- A barra inferior passara a ter tres areas principais:
  - `Inicio`
  - `Notificacoes`
  - `Perfil`
- `Notificacoes` exibira badge com quantidade de nao lidas.

### Identidade do aplicativo

- O `widget id` do Cordova sera alterado de `io.framework7.myapp` para `br.com.filminho.app`.
- O nome visual permanece `Filminho`.

## Dependencias Externas e Premissas

- Push real exige `google-services.json` valido para o package ID `br.com.filminho.app`.
- Esse arquivo nao sera inventado nem falsificado.
- A implementacao deve funcionar em modo degradado quando o arquivo Firebase nao estiver presente:
  - notificacoes locais continuam operando
  - inbox interna continua operando
  - registro/envio de push fica desabilitado com mensagens claras de diagnostico

## Arquitetura

### Backend

O backend continuara em `backend/server.js`, mas com novas unidades logicas claramente separadas por responsabilidade:

1. **Schema e migracao**
   - Garantir no banco JSON:
     - `usuarios`
     - `avaliacoes`
     - `solicitacoes_amizade`
     - `amizades`
     - `notificacoes`
     - `dispositivos_push`

2. **Servico de notificacoes**
   - Criar notificacao persistida.
   - Listar notificacoes por usuario.
   - Marcar uma ou varias como lidas.
   - Contar notificacoes nao lidas.

3. **Servico de dispositivos push**
   - Registrar token FCM por usuario/dispositivo.
   - Atualizar `token`, `platform`, `ativo`, `atualizado_em`.
   - Invalidar token quando o app detectar logout ou erro irreversivel.

4. **Integracao FCM**
   - Se houver credenciais de servidor configuradas, tentar envio real.
   - Se nao houver credenciais, responder de forma segura sem quebrar o fluxo principal.
   - O envio push jamais deve impedir sucesso da regra principal do negocio.

### Frontend

O frontend continua em `www/index.html` e `www/js/app.js`, mas deve ser refatorado por areas funcionais dentro do arquivo atual ou em modulos auxiliares pequenos se isso simplificar a leitura:

1. **Camada de sessao e bootstrap**
2. **Filmes e busca**
3. **Auth**
4. **Amigos**
5. **Perfil**
6. **Notificacoes**
7. **Infraestrutura UI**
   - `fetch` padronizado
   - toasts e dialogs
   - renderizacao de estados vazios/erro/loading

## Modelo de Dados

### `notificacoes`

Cada registro deve seguir este contrato:

```json
{
  "id": 1718000000000,
  "usuario_id": 2,
  "tipo": "amizade_solicitada",
  "titulo": "Nova solicitacao de amizade",
  "mensagem": "joao_silva quer te adicionar no Filminho.",
  "dados": {
    "de_id": 5,
    "rota": "notificacoes",
    "acao": "abrir_solicitacoes"
  },
  "canal": "push+inbox",
  "criado_em": "2026-06-10T12:00:00.000Z",
  "lida_em": null
}
```

Regras:

- `tipo` sera enumerado no backend e no frontend.
- `dados` sempre sera objeto serializavel.
- `lida_em` com `null` significa nao lida.

### `dispositivos_push`

```json
{
  "id": 1718000001000,
  "usuario_id": 2,
  "platform": "android",
  "token": "fcm-token",
  "device_label": "android-cordova",
  "ativo": true,
  "criado_em": "2026-06-10T12:00:01.000Z",
  "atualizado_em": "2026-06-10T12:00:01.000Z"
}
```

Regras:

- Um mesmo usuario pode ter varios dispositivos.
- Reenvio do mesmo token atualiza o registro existente em vez de duplicar.
- Tokens invalidos podem ser desativados sem apagar historico.

## Endpoints Novos

### Notificacoes

- `GET /api/notificacoes?usuario_id=...`
  - retorna lista ordenada da mais recente para a mais antiga
- `GET /api/notificacoes/nao-lidas/total?usuario_id=...`
  - retorna `{ total: number }`
- `POST /api/notificacoes/marcar-lida`
  - body: `{ usuario_id, notificacao_id }`
- `POST /api/notificacoes/marcar-todas-lidas`
  - body: `{ usuario_id }`

### Push

- `POST /api/push/register`
  - body: `{ usuario_id, token, platform, device_label }`
- `POST /api/push/unregister`
  - body: `{ usuario_id, token }`

### Comportamento em eventos sociais

- `POST /api/amigos/solicitar`
  - alem da logica atual, cria notificacao para o usuario destino
  - tenta disparar push para tokens ativos do destino
- `POST /api/amigos/aceitar`
  - alem da logica atual, cria notificacao para o usuario que enviou a solicitacao
  - tenta disparar push correspondente

## Integracao Firebase

### Cliente Cordova Android

- Adicionar plugin de mensageria Firebase compatível com Cordova.
- Copiar `google-services.json` real para a pasta `cordova/`.
- Referenciar o arquivo em `cordova/config.xml` usando a abordagem suportada pelo plugin.
- Inicializar permissao e recebimento de mensagens apos `deviceready`.

### Servidor

O backend deve usar uma integracao FCM em ambiente confiavel. A implementacao recomendada e:

- `firebase-admin` no Node.js
- credenciais via variavel de ambiente apontando para service account JSON
- envio para token individual e, no futuro, multicast

Sem service account configurada:

- logar aviso claro
- pular tentativa de push
- manter notificacao interna como fonte de verdade

## Permissoes e Android Moderno

- Solicitar permissao de notificacao (`POST_NOTIFICATIONS`) apenas em contexto de uso.
- Nao depender de `SCHEDULE_EXACT_ALARM`.
- Agendar lembretes locais como notificacoes nao-exatas, suficientes para o caso de uso do app.
- Manter permissoes existentes de geolocalizacao.
- Se a permissao de notificacao for negada:
  - manter inbox interna
  - exibir CTA discreto para reabilitar nas configuracoes

## UX e Visual

### Direcao visual

O app mantera a base escura atual, mas com acabamento mais intencional:

- hierarquia tipografica mais forte
- espacamentos mais consistentes
- cards com profundidade e contraste melhores
- badges e chips com forma e cor consistentes
- empty states com copy curta e visual menos improvisado

### Areas de melhoria

1. **Navbar e home**
   - reforcar branding
   - melhorar area de busca
   - melhorar apresentacao de secoes e posters

2. **Tab de notificacoes**
   - lista clara por tempo
   - badge de nao lidas
   - empty state quando nao houver itens
   - estado visual de item lido vs nao lido

3. **Perfil**
   - consolidar acoes importantes
   - destacar informacoes do usuario
   - melhorar lista de avaliacoes e amigos

4. **Dialogs e toasts**
   - padrao visual unico
   - copy curta e contextual

## Robustez

### Frontend

- Criar wrapper de requisicao com:
  - `timeout`
  - parse seguro de JSON
  - mensagens padrao por tipo de falha
- Evitar `app.dialog.alert` generico em cascata quando a origem do erro puder ser contextual.
- Proteger renderizacoes contra `null`, arrays vazios e payloads parciais.
- Centralizar acesso a `localStorage` para sessao do usuario e preferencias simples.

### Backend

- Validar corpos de request nos endpoints novos.
- Nunca assumir que `usuario_id`, `token` ou `tipo` sao validos sem checagem.
- Encapsular integracao FCM para isolar falhas externas.
- Garantir migracao idempotente do banco JSON.

## Fluxos Funcionais

### Fluxo 1: Registro do dispositivo

1. Usuario autenticado abre o app no dispositivo.
2. App explica o beneficio das notificacoes.
3. App pede permissao.
4. Se aprovada e o plugin Firebase estiver disponivel:
   - obtem token FCM
   - envia para `POST /api/push/register`
5. Se negada ou indisponivel:
   - segue sem push
   - inbox interna continua ativa

### Fluxo 2: Solicitacao de amizade

1. Usuario A envia solicitacao para usuario B.
2. Backend salva solicitacao.
3. Backend cria notificacao persistida para B.
4. Backend tenta enviar push para tokens ativos de B.
5. Frontend de B ve badge/central de notificacoes mesmo sem push.

### Fluxo 3: Aceite de amizade

1. Usuario B aceita solicitacao.
2. Backend registra amizade.
3. Backend cria notificacao persistida para A.
4. Backend tenta push para A.

### Fluxo 4: Lembrete local

1. Usuario interage com filme ou conclui avaliacao.
2. App agenda notificacao local nao-exata para retorno ou nova avaliacao.
3. Toque abre o app no contexto mais proximo possivel.

## Arquivos Esperados Para Esta Iniciativa

### Modificar

- `package.json`
- `cordova/config.xml`
- `cordova/package.json`
- `backend/server.js`
- `www/index.html`
- `www/js/app.js`
- `README.md`

### Criar

- `tests/notifications-backend.test.js`
- `tests/push-register.test.js`
- `tests/ui-notifications.test.js`
- `docs/firebase-setup.md`

### Arquivo externo necessario

- `cordova/google-services.json`
  - fornecido a partir do Firebase Console para `br.com.filminho.app`

## Testes

### Automatizados

1. Backend com `node:test`
   - migracao cria `notificacoes` e `dispositivos_push`
   - `POST /api/push/register` registra e atualiza token
   - `POST /api/amigos/solicitar` cria notificacao persistida
   - `POST /api/amigos/aceitar` cria notificacao persistida
   - listagem e marcacao de lidas funcionam
   - ausencia de credenciais Firebase nao quebra endpoints

2. UI com `jsdom`
   - tab/section de notificacoes existe
   - badge existe
   - empty state de notificacoes existe
   - elementos visuais principais novos continuam acessiveis

### Manuais

- Instalar APK em Android 13+.
- Validar permissao de notificacoes.
- Validar recebimento de notificacao local.
- Validar toque na notificacao abrindo o app.
- Validar envio e recebimento de push com Firebase configurado.
- Validar modo degradado sem `google-services.json`.

## Riscos e Mitigacoes

- **Firebase nao configurado a tempo**
  - Mitigacao: entregar infraestrutura pronta e modo degradado funcional.
- **Arquivo `www/js/app.js` crescer demais**
  - Mitigacao: separar helpers pequenos por responsabilidade se a legibilidade piorar.
- **Falhas de APIs externas**
  - Mitigacao: mensagens de erro contextualizadas e UI resiliente.
- **Mudanca de package ID impactar build**
  - Mitigacao: documentar setup e validar build Android logo apos integrar plugins.

## Criterios de Sucesso

- App usa `br.com.filminho.app` como identificador.
- Central de notificacoes aparece no app com badge funcional.
- Eventos de amizade geram notificacoes persistidas.
- Lembretes locais funcionam sem depender de permissao de alarme exato.
- Push via FCM fica operacional quando `google-services.json` e credenciais de servidor forem fornecidos.
- Sem Firebase configurado, o app continua utilizavel e sem quebrar fluxos principais.
- APK Android e gerado com as mudancas aplicadas.

## Fontes Tecnicas Consultadas

- Android notification runtime permission:
  https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Android exact alarms:
  https://developer.android.com/about/versions/14/changes/schedule-exact-alarms
- Firebase Cloud Messaging overview:
  https://firebase.google.com/docs/cloud-messaging
- Firebase Admin SDK setup:
  https://firebase.google.com/docs/admin/setup
- Cordova Firebase messaging plugin:
  https://github.com/chemerisuk/cordova-plugin-firebase-messaging

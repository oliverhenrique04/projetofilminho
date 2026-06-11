# Design Spec: Projeto 2 - GPS em Mapa e Artigo

**Data:** 2026-06-01
**Branch:** feature/auth-amigos-lgpd
**Worktree:** .worktrees/auth-amigos-lgpd

## Visao Geral

Completar os requisitos do Projeto 2 adicionando visualizacao de GPS em mapa dentro do app, instalar o plugin nativo de geolocalizacao no Cordova, e criar o artigo cientifico em Markdown conforme o PDF. A camera atual (browser API) permanece, mas o requisito de recurso nativo sera atendido com geolocalizacao + mapa in-app.

## Objetivos

- Exibir localizacao (lat/lon) em um mapa dentro do app.
- Usar `cordova-plugin-geolocation` quando executado em dispositivo.
- Manter fallback web com `navigator.geolocation`.
- Documentar o projeto no artigo cientifico em Markdown com todas as secoes exigidas.

## Nao Objetivos

- Trocar o backend ou alterar os endpoints existentes.
- Substituir a camera atual por plugin nativo.
- Reestruturar a UI fora do fluxo de avaliacao/perfil.

## Requisitos do PDF Cobertos

- **Recurso nativo:** GPS com exibicao em mapa dentro do app.
- **APIs publicas:** ViaCEP + IBGE (dados.gov.br) ja existem; manter referencia no artigo.
- **Persistencia:** localStorage ja existe; manter no artigo.
- **Documentacao:** artigo com resumo, introducao, desenvolvimento, resultados, conclusao e referencias.

## Arquitetura e Integracao

### Componentes

1. **Mapa in-app (Leaflet):**
   - Importar CSS/JS do Leaflet no `www/index.html`.
   - Criar um popup/modal com container `div` para o mapa.

2. **Geolocalizacao:**
   - Em runtime Cordova: usar `navigator.geolocation` (fornecido pelo plugin).
   - Em browser: usar `navigator.geolocation` (nativo).

3. **Fluxo de uso:**
   - Ao clicar no icone de localizacao nas avaliacoes (perfil e amigos), abrir popup com mapa centrado na coordenada salva.
   - Se a coordenada for invalida, exibir mensagem amigavel dentro do popup.

4. **Documentacao (artigo):**
   - Arquivo em `docs/` com as secoes exigidas e placeholders claros para screenshots reais (sem deixar texto TBD).

### Arquivos a modificar/criar

- **Modificar:** `www/index.html` (assets Leaflet + markup do popup)
- **Modificar:** `www/js/app.js` (funcoes de abrir mapa e renderizar)
- **Modificar:** `cordova/package.json` (adicionar `cordova-plugin-geolocation` no bloco `cordova.plugins`)
- **Modificar:** `cordova/config.xml` (permissoes Android/iOS de localizacao)
- **Criar:** `docs/artigo-projeto-2.md` (artigo cientifico em Markdown)

## UI/UX

- **Popup de mapa:** titulo "Localizacao da avaliacao", botao fechar, mapa ocupando area principal.
- **Icone de localizacao:** mantido; ao tocar, abre o popup (sem sair do app).
- **Fallback:** se nao conseguir carregar mapa, mostrar texto "Nao foi possivel carregar o mapa." dentro do popup.

## Fluxo de Dados

1. Avaliacao salva com `localizacao` (ja existente).
2. Usuario toca no icone de localizacao.
3. Abrir popup.
4. Inicializar mapa e marcar o ponto com marcador.

## Tratamento de Erros

- Sem permissao: mensagem amigavel e mapa vazio.
- Coordenadas invalidas: aborta renderizacao e mostra texto no popup.
- Falha no Leaflet (assets): mostra texto de erro dentro do popup.

## Testes

- Adicionar teste unitario simples para garantir que payload de avaliacao aceita `localizacao` com `lat`/`lon` e que o backend nao quebra quando `localizacao` e `null`.
- Rodar suite atual (`node --test`) para validar regressao.

## Riscos e Mitigacoes

- **Bundle maior:** Leaflet adiciona peso. Mitigar usando CDN e sem plugins adicionais.
- **Permissoes:** fluxo de permissao pode falhar em dispositivos. Mitigar com mensagens claras e fallback.

## Artigo Cientifico (Conteudo)

Secoes obrigatorias em `docs/artigo-projeto-2.md`:
- Titulo
- Resumo
- Introducao
- Desenvolvimento (APIs, recurso nativo, arquitetura do app)
- Resultados (funcionalidades e evidencias)
- Conclusao
- Referencias (minimo 4, incluindo dados.gov.br, ViaCEP, IBGE e TMDb)
- Observacao: incluir campos nomeados para inserir screenshots reais do app.

## Criterios de Sucesso

- Mapa abre dentro do app e exibe marcador para coordenadas salvas.
- Permissoes de geolocalizacao configuradas no Cordova.
- Artigo em Markdown pronto com estrutura completa.
- Tests `node --test` passam.

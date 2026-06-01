# Filminho - Projeto 2 (APIs Publicas e Recursos Nativos)

## Resumo

Este artigo apresenta o desenvolvimento do aplicativo Filminho, criado com Apache Cordova e Framework7. O projeto integra APIs publicas para dados reais de filmes e localizacao, adiciona recurso nativo de GPS com visualizacao em mapa, e aplica persistencia local via localStorage. Sao descritas as escolhas tecnicas, resultados obtidos e referencias utilizadas.

## Introducao

Aplicativos moveis modernos dependem de integracao com servicos externos e recursos nativos do dispositivo. O objetivo deste projeto e demonstrar o consumo de APIs publicas e a integracao com GPS em um aplicativo real, com foco em organizacao de codigo, experiencia do usuario e documentacao tecnica.

O aplicativo Filminho foi desenvolvido como projeto integrador da disciplina de Desenvolvimento Mobile do Centro Universitario Euro-Americano (UNIEURO). O app permite que usuarios explorem filmes populares, registrem avaliacoes pessoais e compartilhem suas opinioes com amigos.

## Desenvolvimento

### Arquitetura do Aplicativo

O Filminho foi construido com as seguintes tecnologias:

- **Framework7**: framework de interface mobile com componentes nativos e tema auto-adaptativo.
- **Apache Cordova**: plataforma de empacotamento que permite distribuir o app como APK Android e iOS.
- **Node.js + Express**: backend com API REST para autenticacao, perfil, avaliacoes e amigos.
- **localStorage**: persistencia local de sessao e dados de perfil.

### APIs Publicas Utilizadas

O projeto integra tres APIs publicas:

1. **TMDb (The Movie Database)**: fornece dados de filmes, posters, elencos, detalhes e provedores de streaming. Utilizada para listagem de tendencias, busca por titulo, categorias e detalhes de cada filme.

2. **ViaCEP**: API brasileira para consulta de endereco por CEP. Utilizada no cadastro para preencher automaticamente cidade e UF do usuario.

3. **IBGE (catalogado em dados.gov.br)**: fornece lista de estados brasileiros. Utilizada no cadastro e edicao de perfil para popular o campo de UF.

A integracao com dados.gov.br atende ao requisito de utilizar pelo menos uma API proveniente do portal de dados abertos do governo brasileiro.

### Recurso Nativo: GPS com Mapa

O recurso nativo implementado foi o GPS (Global Positioning System). O fluxo funciona da seguinte forma:

1. Ao salvar uma avaliacao com foto, o app solicita permissao de localizacao.
2. Se o usuario autorizar, a latitude e longitude sao capturadas via `navigator.geolocation`.
3. Em dispositivo Cordova, o plugin `cordova-plugin-geolocation` fornece acesso nativo ao GPS.
4. No navegador (fallback), `navigator.geolocation` utiliza GPS do sistema operacional.
5. A localizacao e exibida em um mapa interativo in-app via Leaflet (OpenStreetMap), sem necessidade de sair do aplicativo.

O mapa utiliza tiles do OpenStreetMap e marcador personalizado na posicao capturada. O usuario pode visualizar a localizacao de qualquer avaliacao com foto tocando no icone de localizacao.

### Persistencia de Dados

- **localStorage**: armazena sessao do usuario (id, nome, cidade, UF) e dados basicos de perfil.
- **JSON local (banco_filminho.json)**: backend armazena avaliacoes, usuarios, amizades e solicitacoes em arquivo JSON.

### Autenticacao e Seguranca

- Hash de senhas com `crypto.scrypt` e salt unico por usuario.
- Validacao de email, senha (minimo 6 caracteres) e CEP.
- Consentimento LGPD obrigatorio no cadastro.
- Opcao de exclusao de conta e todos os dados relacionados.

### Sistema de Amigos

- Busca por nome com autocomplete.
- Envio, aceitacao e recusacao de solicitacoes de amizade.
- Visualizacao das avaliacoes de cada amigo (somente se forem amigos).

## Resultados

O aplicativo Filminho atende a todos os requisitos do Projeto 2:

- **Projeto Cordova funcional**: configurado com plataformas Android, iOS e Browser.
- **Framework7 configurado**: interface responsiva com tema escuro.
- **Estrutura organizada em arquivos separados**: `app.js`, `auth-utils.js`, `routes.js`, `store.js`.
- **API 1 (ViaCEP)**: funcionando com busca de endereco por CEP.
- **API 2 (IBGE/dados.gov.br)**: funcionando com lista de estados.
- **Dados exibidos na interface**: filmes, detalhes, avaliacoes e localizacao em mapa.
- **Loading e tratamento de erro**: implementados em todas as chamadas de API.
- **async/await**: utilizado em todas as operacoes assincronas.
- **localStorage**: utilizado para sessao e dados de perfil.
- **Recurso nativo (GPS)**: implementado com plugin Cordova e fallback web.
- **APK gerado**: build Android configurado.
- **Artigo cientifico**: este documento.

### Screenshots

- Tela de login e cadastro: [inserir screenshot]
- Tela principal com recomendacoes: [inserir screenshot]
- Tela de avaliacao com localizacao: [inserir screenshot]
- Mapa da avaliacao: [inserir screenshot]
- Perfil com diario de filmes: [inserir screenshot]
- Secao de amigos: [inserir screenshot]

## Conclusao

O projeto Filminho atingiu todos os objetivos propostos: integracao com APIs publicas (ViaCEP, IBGE/dados.gov.br e TMDb), implementacao de recurso nativo (GPS com mapa in-app), e documentacao tecnica completa. A combinacao de Cordova, Framework7 e Leaflet permitiu criar um aplicativo funcional e responsivo, com foco em usabilidade e organizacao do codigo.

O sistema de autenticacao com hash seguro, o fluxo de amigos e a conformidade LGPD demonstram a aplicacao de boas praticas de desenvolvimento mobile. O app esta pronto para distribuicao como APK Android e pode ser facilmente adaptado para iOS.

## Referencias

1. Apache Cordova. Apache Cordova Documentation. Disponivel em: https://cordova.apache.org/. Acesso em: jun. 2026.
2. Framework7. Framework7 Documentation. Disponivel em: https://framework7.io/. Acesso em: jun. 2026.
3. ViaCEP. Consulta de CEP via ViaCEP. Disponivel em: https://viacep.com.br/. Acesso em: jun. 2026.
4. IBGE. Lista de Estados - Servico de Dados do IBGE. Disponivel em: https://servicodados.ibge.gov.br/api/v1/localidades/estados. Acesso em: jun. 2026.
5. dados.gov.br. Portal de Dados Abertos do Governo Federal. Disponivel em: https://dados.gov.br/. Acesso em: jun. 2026.
6. TMDb. The Movie Database API. Disponivel em: https://www.themoviedb.org/. Acesso em: jun. 2026.
7. Leaflet. Leaflet for Map. Disponivel em: https://leafletjs.com/. Acesso em: jun. 2026.
8. OpenStreetMap. OpenStreetMap Foundation. Disponivel em: https://www.openstreetmap.org/. Acesso em: jun. 2026.

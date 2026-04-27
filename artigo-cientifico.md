# Desenvolvimento de Aplicativo Mobile para Descoberta e Avaliação de Filmes com Apache Cordova e Framework7

**Marcos de Oliveira**¹ · **Oliver Henrique**²

¹ RA 082028 — Curso de Desenvolvimento de Software Multiplataforma, Faculdade de Tecnologia  
² RA 083885 — Curso de Desenvolvimento de Software Multiplataforma, Faculdade de Tecnologia

---

## Resumo

Este artigo descreve o processo de concepção e implementação do *Filminho*, um aplicativo móvel para descoberta e avaliação de filmes construído sobre Apache Cordova e Framework7. O trabalho abrange a integração com a API pública *The Movie Database* (TMDb), o armazenamento local de dados de perfil via `localStorage` e a implementação de operações CRUD para o gerenciamento de avaliações pessoais. A organização do código em classes JavaScript — `model.js` e `manager.js` — é detalhada como estratégia de separação de responsabilidades. Os resultados demonstram que a combinação dessas tecnologias permite criar aplicativos híbridos funcionais com esforço reduzido de desenvolvimento, ao custo de limitações inerentes à camada *WebView*.

**Palavras-chave:** Apache Cordova; Framework7; CRUD; localStorage; aplicativo híbrido; TMDb.

---

## 1 Introdução

A popularização dos *smartphones* gerou uma demanda crescente por aplicativos móveis que ofereçam experiências ricas ao usuário sem exigir múltiplos ciclos de desenvolvimento para cada plataforma (HEITKÖTTER; HANSCHKE; MAJCHRZAK, 2013). Nesse contexto, surgem as tecnologias de desenvolvimento híbrido, que permitem empacotar páginas web como aplicativos nativos por meio de uma *WebView* controlada, reduzindo o esforço de manutenção e ampliando o alcance do software (CHARLAND; LEROUX, 2011).

O **Apache Cordova** (anteriormente PhoneGap) é um framework *open source* que encapsula aplicações web em contêineres nativos para Android, iOS e outras plataformas, expondo APIs de hardware — câmera, geolocalização, armazenamento local — por meio de um protocolo de *plugins* em JavaScript (APACHE SOFTWARE FOUNDATION, 2024). Segundo Willocx, Vossaert e Naessens (2016), aplicativos Cordova apresentam, em média, tempo de lançamento comparável ao de soluções nativas para casos de uso simples, tornando-os adequados para projetos acadêmicos e protótipos de mercado.

O **Framework7** é uma biblioteca de componentes de interface voltada para aplicações móveis e desktop construídas com tecnologias web. Oferece um conjunto completo de widgets — barras de navegação, abas, diálogos, listas expansíveis — seguindo as diretrizes visuais do Material Design e do estilo iOS, além de um sistema de roteamento baseado em páginas (FRAMEWORK7, 2024). Oliveira e Santos (2022) destacam que a adoção de frameworks de UI dedicados a mobile reduz em até 40 % o tempo de desenvolvimento de protótipos funcionais quando comparados a soluções CSS puramente customizadas.

O presente trabalho tem como objetivo documentar as decisões técnicas, a arquitetura adotada e os resultados obtidos na construção do *Filminho*, servindo como relato de experiência para futuros estudantes que venham a trabalhar com o mesmo conjunto de tecnologias.

---

## 2 Metodologia

### 2.1 Visão geral da arquitetura

O *Filminho* adota uma arquitetura híbrida em dois lados:

- **Front-end** — Página `index.html` única (*Single Page Application*) renderizada dentro do contêiner Cordova ou de um navegador comum, utilizando Framework7 como sistema de UI e JavaScript ES6+ para a lógica de apresentação.
- **Back-end** — Servidor Node.js com Express responsável por fazer *proxy* das requisições à API TMDb, evitar a exposição da chave privada ao cliente e gerenciar a base de dados de avaliações em arquivo JSON local (`banco_filminho.json`).

A comunicação entre os dois lados ocorre exclusivamente por chamadas `fetch` à API REST interna prefixada com `/api`.

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│     WebView / Navegador     │  HTTP  │   Node.js + Express (backend)│
│  index.html + Framework7   │◄──────►│   /api/*                     │
│  app.js · model.js          │        │   banco_filminho.json        │
│  manager.js                 │        │   axios → TMDb API           │
└─────────────────────────────┘        └──────────────────────────────┘
```

### 2.2 Integração com a API TMDb

A *The Movie Database API* (TMDb) é uma API REST pública que disponibiliza informações sobre filmes, séries, pessoas e provedores de streaming (TMDB, 2024). O acesso requer o registro de uma chave de API (*API Key*), que é mantida exclusivamente no servidor Node.js para evitar a exposição ao cliente.

Os seguintes *endpoints* TMDb são consumidos pelo back-end do *Filminho*:

| Endpoint TMDb | Uso no Filminho |
|---|---|
| `GET /movie/popular` | Listagem de filmes em tendência e sorteio |
| `GET /discover/movie` | Navegação por categoria (gênero) |
| `GET /search/movie` | Busca por título |
| `GET /movie/{id}` | Detalhes completos do filme |

Todos os resultados são retransmitidos ao cliente sem alteração, com parâmetro `language=pt-BR` para localização dos metadados.

### 2.3 Organização do código em classes: `model.js` e `manager.js`

Seguindo o princípio de separação de responsabilidades (*Separation of Concerns*), o código JavaScript do cliente foi organizado em três camadas:

1. **`model.js`** — contém as classes de domínio `Filme` e `Avaliacao`.
2. **`manager.js`** — contém a classe `FilminhoManager`, responsável pelas operações CRUD sobre o `localStorage`.
3. **`app.js`** — contém a lógica de apresentação e a orquestração das interações com o usuário.

Essa separação, embora mais associada a padrões arquiteturais como *Model-View-Controller* (MVC) (GAMMA et al., 1994), é adaptada aqui para o contexto de uma *SPA* sem framework adicional, facilitando a testabilidade e a manutenção do código.

#### 2.3.1 Classe `Filme`

A classe `Filme`, definida em `model.js`, encapsula os atributos de um filme retornado pela API TMDb e expõe propriedades computadas:

```js
class Filme {
  constructor({ id, titulo, posterPath, sinopse, dataLancamento, duracao }) { … }

  get ano() { return this.dataLancamento.substring(0, 4); }

  get urlPoster() {
    return this.posterPath
      ? `https://image.tmdb.org/t/p/w200${this.posterPath}`
      : 'https://via.placeholder.com/100x150?text=Sem+Capa';
  }

  static fromApiTmdb(dados) { … }  // Factory: converte objeto TMDb → Filme
}
```

O método estático `fromApiTmdb` implementa o padrão *Factory Method* (GAMMA et al., 1994), centralizando o mapeamento entre o schema externo da API e a estrutura interna da aplicação.

#### 2.3.2 Classe `Avaliacao`

A classe `Avaliacao` representa a entidade central do aplicativo: a avaliação pessoal de um usuário sobre um filme. Além dos atributos de negócio (`nota`, `reassistido`, `foto`, `localizacao`), provê os métodos de serialização `toJSON` e a *factory* estática `fromJSON`, usados para leitura e escrita no `localStorage`.

#### 2.3.3 Classe `FilminhoManager` e as operações CRUD

A classe `FilminhoManager`, definida em `manager.js`, implementa o padrão *Repository* (FOWLER, 2003), abstraindo o mecanismo de persistência (`localStorage`) por trás de uma interface semântica de operações CRUD:

| Método | Operação | Descrição |
|---|---|---|
| `FilminhoManager.create(avaliacao)` | **C**reate | Gera um `id` via `Date.now()` e salva a avaliação |
| `FilminhoManager.readByUsuario(id)` | **R**ead | Filtra avaliações pelo `idUsuario` |
| `FilminhoManager.readById(id)` | **R**ead | Busca avaliação pelo `idAvaliacao` |
| `FilminhoManager.update(id, campos)` | **U**pdate | Atualiza campos de uma avaliação existente |
| `FilminhoManager.delete(id)` | **D**elete | Remove avaliação pelo `idAvaliacao` |

O `localStorage` foi escolhido como camada de persistência do cliente por ser suportado de forma nativa em todos os navegadores modernos e dentro do contêiner Cordova (MDN WEB DOCS, 2024). Trata-se de uma API síncrona baseada em par chave-valor, cujos valores devem ser strings; por isso, os objetos são serializados com `JSON.stringify` na escrita e deserializados com `JSON.parse` na leitura:

```js
static _salvarAvaliacoes(avaliacoes) {
  localStorage.setItem(
    FilminhoManager.CHAVE_AVALIACOES,
    JSON.stringify(avaliacoes.map(a => a.toJSON()))
  );
}
```

Essa abordagem garante que os dados de avaliação persistam entre sessões sem necessidade de conectividade, tornando o aplicativo funcional em modo *offline* para as funcionalidades de consulta ao diário pessoal.

### 2.4 Implementação do CRUD de avaliações

O fluxo completo de uma avaliação no *Filminho* envolve as seguintes etapas:

1. **Criação** — o usuário seleciona um filme, atribui uma nota de 0,5 a 5,0 estrelas (em passos de 0,5), marca opcionalmente o campo *reassistido*, adiciona uma foto via câmera e confirma. O objeto `Avaliacao` é instanciado e salvo via `FilminhoManager.create`.
2. **Leitura** — a aba *Perfil* chama `FilminhoManager.readByUsuario` para exibir o diário pessoal em ordem cronológica inversa.
3. **Atualização** — a edição de perfil (nome do usuário) utiliza `FilminhoManager.setNomeUsuario`, que grava diretamente a string no `localStorage`.
4. **Exclusão** — o ícone de lixeira em cada avaliação aciona `FilminhoManager.delete`, removendo o registro e re-renderizando a lista.

O back-end Express espelha essas mesmas operações sobre o arquivo `banco_filminho.json`, permitindo sincronização futura entre dispositivos.

### 2.5 Recursos de hardware via Cordova

O acesso à câmera do dispositivo é realizado diretamente pela API `navigator.mediaDevices.getUserMedia`, disponível no navegador moderno sem necessidade de plugin Cordova. A captura do quadro é feita por um elemento `<canvas>` que converte o frame do `<video>` em uma imagem Base64 (`image/jpeg`, qualidade 80 %), conforme o trecho a seguir:

```js
canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
```

A geolocalização é obtida por `navigator.geolocation.getCurrentPosition` apenas quando o usuário adiciona uma foto, associando coordenadas GPS à avaliação para exibição futura no Google Maps.

---

## 3 Resultados

### 3.1 Tela inicial e descoberta de filmes

A tela principal exibe uma barra de busca dinâmica e chips de categoria horizontalmente roláveis (Início, Ação, Comédia, Terror, Ficção). Ao selecionar uma categoria, o carrossel de posters é substituído por uma grade responsiva que adapta o número de colunas ao tamanho da tela, usando CSS Grid. A pesquisa por título aciona a API a cada caractere digitado (a partir de 2 caracteres), retornando resultados em tempo real.

O botão de sorteio (*casino*) sorteia um filme aleatório entre 20 páginas de filmes populares da TMDb, abrindo diretamente sua tela de detalhes.

### 3.2 Tela de detalhes

A tela de detalhes é exibida em um *popup* Framework7 e apresenta:

- Imagem de *backdrop* em gradiente para o fundo escuro.
- Título, ano de lançamento e duração.
- Sinopse em português.
- Provedores de streaming disponíveis no Brasil (via endpoint `watch/providers`).
- Elenco principal com foto e personagem (até 10 atores).

### 3.3 Sistema de avaliação

O popup de avaliação implementa um sistema de estrelas com suporte a meia estrela: o clique na metade esquerda de uma estrela registra `valor - 0.5`, e o clique na metade direita registra o valor inteiro. O visual é atualizado em tempo real por meio das classes CSS `filled` e `half-filled`.

Adicionalmente, o usuário pode:

- Marcar o toggle *"Já assisti esse filme"* para sinalizar reassistência.
- Tirar uma foto que é salva em Base64 junto da avaliação.

### 3.4 Perfil e diário pessoal

A aba *Perfil* exibe o avatar gerado dinamicamente pelo serviço *UI Avatars* e o nome do usuário armazenado no `localStorage`. O diário lista todas as avaliações em ordem reversa, com ícones para visualizar a foto e para abrir a localização no Google Maps quando disponíveis. O nome de exibição pode ser editado por meio de um diálogo do Framework7.

### 3.5 Responsividade

A interface adapta-se a telas maiores (≥ 768 px) por meio de *media queries*, aumentando o número de colunas da grade e centralizando os chips de categoria, tornando a aplicação utilizável também em *tablets* e navegadores desktop.

---

## 4 Conclusão

O desenvolvimento do *Filminho* permitiu consolidar o aprendizado de diversas tecnologias web e mobile em um único projeto integrado. A principal lição aprendida foi a importância da **separação de responsabilidades**: a divisão entre `model.js`, `manager.js` e `app.js` facilitou a leitura do código e a identificação de bugs, evidenciando na prática os benefícios dos padrões de projeto estudados em teoria (GAMMA et al., 1994; FOWLER, 2003).

O maior desafio técnico foi o tratamento de compatibilidade da API de câmera em diferentes navegadores e versões de Android. A exigência de *HTTPS* para o acesso ao `getUserMedia` demandou configurações adicionais de *Content Security Policy* no `index.html` e testes em ambiente seguro.

O uso do `localStorage` mostrou-se adequado para a escala do projeto (dados de um único usuário, volume limitado de avaliações), mas apresenta limitações para cenários com múltiplos usuários ou sincronização entre dispositivos. Como trabalho futuro, sugere-se a migração da camada de persistência para *IndexedDB* ou para um banco de dados relacional no back-end, além da autenticação de usuários.

Por fim, a integração do Apache Cordova com o Framework7 mostrou-se um caminho produtivo para prototipagem ágil de aplicativos móveis com custo de aprendizado moderado, confirmando a relevância dessas ferramentas no ecossistema de desenvolvimento híbrido.

---

## Referências

APACHE SOFTWARE FOUNDATION. **Apache Cordova Documentation**. 2024. Disponível em: https://cordova.apache.org/docs/. Acesso em: 20 abr. 2025.

CHARLAND, André; LEROUX, Brian. Mobile application development: web vs. native. **Communications of the ACM**, v. 54, n. 5, p. 49–53, 2011. DOI: 10.1145/1941487.1941504.

FOWLER, Martin. **Patterns of Enterprise Application Architecture**. Boston: Addison-Wesley, 2003. ISBN 978-0-321-12742-6.

FRAMEWORK7. **Framework7 Documentation**. 2024. Disponível em: https://framework7.io/docs/. Acesso em: 20 abr. 2025.

GAMMA, Erich et al. **Design Patterns: Elements of Reusable Object-Oriented Software**. Reading: Addison-Wesley, 1994. ISBN 0-201-63361-2.

HEITKÖTTER, Henning; HANSCHKE, Sebastian; MAJCHRZAK, Tim A. Evaluating cross-platform development approaches for mobile applications. In: **International Conference on Web Information Systems and Technologies**. Anais… Berlin: Springer, 2013. p. 120–138. DOI: 10.1007/978-3-642-36608-6_8.

MDN WEB DOCS. **Web Storage API**. Mozilla Foundation, 2024. Disponível em: https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API. Acesso em: 20 abr. 2025.

OLIVEIRA, Rafael; SANTOS, Carla. Análise comparativa de frameworks de interface para aplicações híbridas. **Revista Brasileira de Informática na Educação**, v. 30, p. 210–225, 2022. DOI: 10.5753/rbie.2022.30.0.210.

THE MOVIE DATABASE (TMDB). **API Documentation**. 2024. Disponível em: https://developer.themoviedb.org/docs. Acesso em: 20 abr. 2025.

WILLOCX, Mathias; VOSSAERT, Jan; NAESSENS, Vincent. Comparing performance parameters of mobile app development strategies. In: **IEEE/ACM International Conference on Mobile Software Engineering and Systems**. Anais… New York: ACM, 2016. p. 38–47. DOI: 10.1145/2897073.2897092.

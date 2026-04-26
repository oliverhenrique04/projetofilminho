# Filminho App

## Descrição

Este é o repositório do Filminho App, uma aplicação web para descobrir, avaliar e organizar filmes. O projeto consiste em um frontend construído com Framework7 e um backend em Node.js com Express, que consome a API do The Movie Database (TMDb).

## Funcionalidades Principais

*   **Navegação e Descoberta:**
    *   Visualizar filmes populares e em alta.
    *   Navegar por filmes de diferentes categorias.
    *   Buscar filmes específicos por título.
    *   Sortear um filme aleatório para assistir.
*   **Avaliação e Perfil:**
    *   Avaliar filmes com nota, foto e localização.
    *   Marcar um filme como "reassistido".
    *   Visualizar um perfil de usuário com a lista de todos os filmes já avaliados.
    *   Editar o nome do perfil de usuário.
    *   Excluir avaliações feitas.
*   **Detalhes do Filme:**
    *   Ver informações detalhadas de um filme, incluindo sinopse, elenco, equipe e plataformas de streaming disponíveis.

## Tecnologias Utilizadas

*   **Frontend:**
    *   [Framework7](https://framework7.io/): Framework para desenvolvimento de aplicações web com visual nativo.
    *   HTML5, CSS3, JavaScript (ES6+)
*   **Backend:**
    *   [Node.js](https://nodejs.org/): Ambiente de execução para JavaScript no servidor.
    *   [Express.js](https://expressjs.com/): Framework para construção de APIs e aplicações web.
    *   [Axios](https://axios-http.com/): Cliente HTTP para fazer requisições à API do TMDb.
*   **Banco de Dados:**
    *   **Arquivo JSON (`banco_filminho.json`):** Utilizado como um banco de dados simples para armazenar informações de usuários e suas avaliações.
*   **API Externa:**
    *   [The Movie Database (TMDb)](https://www.themoviedb.org/): Fonte para todos os dados de filmes, como títulos, sinopses, imagens e etc.

## Pré-requisitos

Para executar este projeto, você precisará ter o [Node.js](https://nodejs.org/) (que já inclui o gerenciador de pacotes `npm`) instalado em sua máquina.

## Como Rodar o Projeto

1.  **Instale as dependências:**
    Abra o terminal na raiz do projeto e execute o comando abaixo para instalar as bibliotecas necessárias para o backend (como Express, Cors e Axios).
    ```bash
    npm install
    ```

2.  **Chave da API (TMDb):**
    O projeto requer uma chave de API do The Movie Database para funcionar. Atualmente, ela está definida diretamente no código, no arquivo `backend/server.js`.
    
    > **Atenção:** Para um ambiente de produção ou para garantir a segurança, é uma boa prática mover a chave para uma variável de ambiente (`.env`).

3.  **Inicie o servidor backend:**
    Após a instalação das dependências, inicie o servidor com o seguinte comando:
    ```bash
    node backend/server.js
    ```
    Você verá uma mensagem no console confirmando que o servidor está rodando na porta 3000.

4.  **Acesse a aplicação:**
    Com o servidor em execução, abra seu navegador e acesse a URL abaixo para usar o aplicativo:
    [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
/
├── backend/                # Contém o código do servidor Express.js
│   ├── server.js           # Arquivo principal do backend (API, rotas)
│   └── banco_filminho.json # Banco de dados local para usuários e avaliações
├── www/                    # Contém os arquivos do frontend (Framework7)
│   ├── index.html          # Página inicial da aplicação
│   ├── css/                # Folhas de estilo
│   ├── js/                 # Lógica do lado do cliente (app.js, routes.js)
│   └── pages/              # Páginas HTML individuais do Framework7
├── cordova/                # Configurações para empacotar como um app mobile com Cordova
├── package.json            # Dependências e scripts do projeto Node.js
└── README.md               # Este arquivo de documentação
```

## Endpoints da API

O backend (`server.js`) define as seguintes rotas para a aplicação:

*   `GET /api/filmes/tendencias`: Retorna uma lista dos filmes mais populares.
*   `GET /api/filmes/categoria/:id`: Retorna filmes de uma categoria (gênero) específica.
*   `GET /api/filmes/sortear`: Sorteia um filme aleatório da lista de populares.
*   `GET /api/filme/:id`: Busca os detalhes completos de um filme específico.
*   `GET /api/filmes/buscar?q=...`: Busca filmes com base em um termo de pesquisa.
*   `POST /api/avaliar`: Cria e salva uma nova avaliação para um filme.
*   `DELETE /api/avaliar/:id_avaliacao`: Remove uma avaliação existente.
*   `GET /api/perfil/:id_usuario`: Retorna os dados do perfil e a lista de avaliações de um usuário.
*   `PUT /api/perfil/:id_usuario`: Atualiza o nome de um usuário.

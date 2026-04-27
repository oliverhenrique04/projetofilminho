/**
 * model.js
 * Classes de domínio do aplicativo Filminho.
 *
 * Filme    – representa os dados de um filme obtido da API TMDb.
 * Avaliacao – representa a avaliação pessoal de um usuário sobre um filme.
 */

class Filme {
  /**
   * @param {number}  id          – Identificador único do filme (TMDb).
   * @param {string}  titulo      – Título do filme.
   * @param {string}  posterPath  – Caminho da imagem de poster na CDN TMDb.
   * @param {string}  sinopse     – Resumo da trama.
   * @param {string}  dataLancamento – Data de lançamento no formato YYYY-MM-DD.
   * @param {number}  duracao     – Duração em minutos.
   */
  constructor({ id, titulo, posterPath = null, sinopse = '', dataLancamento = '', duracao = 0 }) {
    this.id            = id;
    this.titulo        = titulo;
    this.posterPath    = posterPath;
    this.sinopse       = sinopse;
    this.dataLancamento = dataLancamento;
    this.duracao       = duracao;
  }

  get ano() {
    return this.dataLancamento ? this.dataLancamento.substring(0, 4) : '';
  }

  get urlPoster() {
    return this.posterPath
      ? `https://image.tmdb.org/t/p/w200${this.posterPath}`
      : 'https://via.placeholder.com/100x150?text=Sem+Capa';
  }

  /**
   * Cria um Filme a partir de um objeto retornado pela API TMDb.
   * @param {Object} dados
   * @returns {Filme}
   */
  static fromApiTmdb(dados) {
    return new Filme({
      id:             dados.id,
      titulo:         dados.title,
      posterPath:     dados.poster_path,
      sinopse:        dados.overview,
      dataLancamento: dados.release_date,
      duracao:        dados.runtime || 0,
    });
  }
}

class Avaliacao {
  /**
   * @param {number}      idAvaliacao   – Identificador único da avaliação.
   * @param {number}      idUsuario     – Identificador do usuário que avaliou.
   * @param {number}      idFilme       – Identificador TMDb do filme avaliado.
   * @param {string}      tituloFilme   – Título do filme (desnormalizado para exibição rápida).
   * @param {string|null} posterPath    – Caminho do poster TMDb.
   * @param {number}      nota          – Nota de 0.5 a 5.0 (passos de 0.5).
   * @param {boolean}     reassistido   – Indica se o usuário reassistiu o filme.
   * @param {string|null} foto          – Foto em Base64 tirada no momento da avaliação.
   * @param {Object|null} localizacao   – Objeto { lat, lon } capturado junto com a foto.
   */
  constructor({
    idAvaliacao  = null,
    idUsuario,
    idFilme,
    tituloFilme,
    posterPath   = null,
    nota,
    reassistido  = false,
    foto         = null,
    localizacao  = null,
  }) {
    this.idAvaliacao = idAvaliacao;
    this.idUsuario   = idUsuario;
    this.idFilme     = idFilme;
    this.tituloFilme = tituloFilme;
    this.posterPath  = posterPath;
    this.nota        = nota;
    this.reassistido = reassistido;
    this.foto        = foto;
    this.localizacao = localizacao;
  }

  get notaFormatada() {
    return typeof this.nota === 'number' ? this.nota.toFixed(1) : 'N/A';
  }

  get urlPoster() {
    return this.posterPath
      ? `https://image.tmdb.org/t/p/w200${this.posterPath}`
      : '';
  }

  /** Serializa para o formato esperado pelo back-end / localStorage. */
  toJSON() {
    return {
      id_avaliacao:  this.idAvaliacao,
      id_usuario:    this.idUsuario,
      id_filme:      this.idFilme,
      titulo_filme:  this.tituloFilme,
      poster_path:   this.posterPath,
      nota:          this.nota,
      reassistido:   this.reassistido,
      foto:          this.foto,
      localizacao:   this.localizacao,
    };
  }

  /**
   * Cria uma Avaliacao a partir de um objeto JSON (banco ou localStorage).
   * @param {Object} obj
   * @returns {Avaliacao}
   */
  static fromJSON(obj) {
    return new Avaliacao({
      idAvaliacao:  obj.id_avaliacao,
      idUsuario:    obj.id_usuario,
      idFilme:      obj.id_filme,
      tituloFilme:  obj.titulo_filme,
      posterPath:   obj.poster_path,
      nota:         obj.nota,
      reassistido:  !!obj.reassistido,
      foto:         obj.foto || null,
      localizacao:  obj.localizacao || null,
    });
  }
}

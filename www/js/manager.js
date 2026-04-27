/**
 * manager.js
 * Classe FilminhoManager — gerencia as operações CRUD de avaliações usando
 * localStorage como camada de persistência no lado do cliente.
 *
 * Chaves utilizadas no localStorage:
 *   filminho_avaliacoes  – Array JSON de objetos Avaliacao serializados.
 *   nome_usuario_filminho – String com o nome de exibição do usuário.
 */

class FilminhoManager {
  /** Chave de armazenamento das avaliações no localStorage. */
  static CHAVE_AVALIACOES = 'filminho_avaliacoes';

  /** Chave de armazenamento do nome de usuário no localStorage. */
  static CHAVE_NOME = 'nome_usuario_filminho';

  // -----------------------------------------------------------------------
  // Persistência auxiliar
  // -----------------------------------------------------------------------

  /** Lê todas as avaliações persistidas e as retorna como Array<Avaliacao>. */
  static _lerAvaliacoes() {
    try {
      const raw = localStorage.getItem(FilminhoManager.CHAVE_AVALIACOES);
      const lista = raw ? JSON.parse(raw) : [];
      return lista.map(obj => Avaliacao.fromJSON(obj));
    } catch (e) {
      console.error('FilminhoManager: erro ao ler avaliações do localStorage', e);
      return [];
    }
  }

  /** Salva o array de Avaliacao no localStorage. */
  static _salvarAvaliacoes(avaliacoes) {
    localStorage.setItem(
      FilminhoManager.CHAVE_AVALIACOES,
      JSON.stringify(avaliacoes.map(a => a.toJSON()))
    );
  }

  // -----------------------------------------------------------------------
  // CREATE — adicionar nova avaliação
  // -----------------------------------------------------------------------

  /**
   * Persiste uma nova avaliação localmente.
   * @param {Avaliacao} avaliacao – Instância sem idAvaliacao (gerado aqui).
   * @returns {Avaliacao} A avaliação com o id atribuído.
   */
  static create(avaliacao) {
    const lista = FilminhoManager._lerAvaliacoes();
    avaliacao.idAvaliacao = Date.now();
    lista.push(avaliacao);
    FilminhoManager._salvarAvaliacoes(lista);
    return avaliacao;
  }

  // -----------------------------------------------------------------------
  // READ — consultar avaliações
  // -----------------------------------------------------------------------

  /**
   * Retorna todas as avaliações de um determinado usuário.
   * @param {number} idUsuario
   * @returns {Avaliacao[]}
   */
  static readByUsuario(idUsuario) {
    return FilminhoManager._lerAvaliacoes().filter(
      a => a.idUsuario === idUsuario
    );
  }

  /**
   * Retorna uma avaliação específica pelo seu id.
   * @param {number} idAvaliacao
   * @returns {Avaliacao|null}
   */
  static readById(idAvaliacao) {
    return FilminhoManager._lerAvaliacoes().find(
      a => a.idAvaliacao === idAvaliacao
    ) || null;
  }

  // -----------------------------------------------------------------------
  // UPDATE — alterar avaliação existente
  // -----------------------------------------------------------------------

  /**
   * Atualiza os campos de uma avaliação já persistida.
   * @param {number}  idAvaliacao – Id da avaliação a alterar.
   * @param {Object}  campos      – Propriedades a sobrescrever.
   * @returns {Avaliacao|null} A avaliação atualizada, ou null se não encontrada.
   */
  static update(idAvaliacao, campos) {
    const lista = FilminhoManager._lerAvaliacoes();
    const avaliacao = lista.find(a => a.idAvaliacao === idAvaliacao);
    if (!avaliacao) return null;

    Object.assign(avaliacao, campos);
    FilminhoManager._salvarAvaliacoes(lista);
    return avaliacao;
  }

  // -----------------------------------------------------------------------
  // DELETE — remover avaliação
  // -----------------------------------------------------------------------

  /**
   * Remove uma avaliação pelo id.
   * @param {number} idAvaliacao
   * @returns {boolean} true se removida, false se não encontrada.
   */
  static delete(idAvaliacao) {
    const lista = FilminhoManager._lerAvaliacoes();
    const tamanhoOriginal = lista.length;
    const novaLista = lista.filter(a => a.idAvaliacao !== idAvaliacao);

    if (novaLista.length < tamanhoOriginal) {
      FilminhoManager._salvarAvaliacoes(novaLista);
      return true;
    }
    return false;
  }

  // -----------------------------------------------------------------------
  // Perfil de usuário
  // -----------------------------------------------------------------------

  /**
   * Retorna o nome do usuário salvo localmente.
   * @param {string} [padrao='Usuário']
   * @returns {string}
   */
  static getNomeUsuario(padrao = 'Usuário') {
    return localStorage.getItem(FilminhoManager.CHAVE_NOME) || padrao;
  }

  /**
   * Persiste o nome do usuário localmente.
   * @param {string} nome
   */
  static setNomeUsuario(nome) {
    if (!nome || typeof nome !== 'string') return;
    localStorage.setItem(FilminhoManager.CHAVE_NOME, nome.trim());
  }
}

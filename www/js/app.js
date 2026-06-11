var app = new Framework7({ el: '#app', theme: 'auto' });

var MEU_ID_USUARIO = Number(localStorage.getItem('filminho_user_id') || 0);
var API_URL = 'https://nuted-ia.dev/filminho/api';
var filmeAbertoAgora = null;
var amigoSelecionadoId = null;
var estadoNotificacoes = {
  itens: [],
  naoLidas: 0,
  pushInicializado: false
};
var TOKEN_PUSH_LOCAL = 'filminho_push_token';

// Objeto para armazenar o estado da avaliação atual
let avaliacaoAtual = {
    nota: 0,
    reassistido: false,
    foto: null,
    localizacao: null
};

// O nome será preenchido pelo login/cadastro ou por carregarPerfil()
// Removido valor padrão hardcocado para evitar nome incorreto.

async function apiFetch(path, options) {
  var controller = new AbortController();
  var timeoutId = setTimeout(function() {
    controller.abort();
  }, 10000);

  try {
    var headers = Object.assign({}, (options && options.headers) || {});
    var sessionToken = localStorage.getItem('filminho_user_token');
    if (sessionToken) {
      headers['x-filminho-token'] = sessionToken;
    }
    if (!headers['Content-Type'] && !(options && options.skipJsonContentType)) {
      headers['Content-Type'] = 'application/json';
    }

    var response = await fetch(API_URL + path, Object.assign({}, options || {}, {
      headers: headers,
      signal: controller.signal
    }));
    var contentType = response.headers.get('content-type') || '';
    var data = contentType.includes('application/json')
      ? await response.json().catch(function() { return {}; })
      : {};

    if (!response.ok) {
      var error = new Error((data && data.erro) || 'Falha na requisição.');
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('A requisição demorou demais. Tente novamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

function atualizarBadgeNotificacoes() {
  var badge = document.getElementById('notifications-badge');
  if (!badge) return;
  badge.textContent = String(estadoNotificacoes.naoLidas);
  badge.classList.toggle('visible', estadoNotificacoes.naoLidas > 0);
}

function formatarMomentoNotificacao(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderizarNotificacoes() {
  var lista = document.getElementById('notifications-list');
  var empty = document.getElementById('notifications-empty-state');
  if (!lista || !empty) return;

  if (!estadoNotificacoes.itens.length) {
    lista.innerHTML = '';
    empty.style.display = 'block';
    atualizarBadgeNotificacoes();
    return;
  }

  empty.style.display = 'none';
  lista.innerHTML = estadoNotificacoes.itens.map(function(item) {
    var classe = item.lida_em ? 'notification-card' : 'notification-card unread';
    return '' +
      '<div class="' + classe + '" onclick="abrirDestinoNotificacao(' + item.id + ')">' +
        '<div class="notification-meta">' +
          '<strong>' + item.titulo + '</strong>' +
          '<span style="color:#93a19d !important;">' + formatarMomentoNotificacao(item.criado_em) + '</span>' +
        '</div>' +
        '<div style="color:#d6dedb !important; line-height:1.5;">' + item.mensagem + '</div>' +
        '<div style="margin-top:10px; display:flex; justify-content:flex-end;">' +
          (item.lida_em ? '' : '<button class="button button-small button-outline" onclick="marcarNotificacaoLida(event, ' + item.id + ')">Marcar como lida</button>') +
        '</div>' +
      '</div>';
  }).join('');

  atualizarBadgeNotificacoes();
}

async function carregarNotificacoes() {
  if (!MEU_ID_USUARIO) return;

  try {
    estadoNotificacoes.itens = await apiFetch('/notificacoes?usuario_id=' + MEU_ID_USUARIO);
    estadoNotificacoes.naoLidas = estadoNotificacoes.itens.filter(function(item) {
      return !item.lida_em;
    }).length;
    renderizarNotificacoes();
  } catch (error) {
    console.warn('Erro ao carregar notificações:', error.message);
  }
}

async function marcarNotificacaoLida(event, notificacaoId) {
  if (event) event.stopPropagation();
  await apiFetch('/notificacoes/marcar-lida', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: MEU_ID_USUARIO,
      notificacao_id: notificacaoId
    })
  });
  await carregarNotificacoes();
}

async function marcarTodasNotificacoesLidas() {
  await apiFetch('/notificacoes/marcar-todas-lidas', {
    method: 'POST',
    body: JSON.stringify({ usuario_id: MEU_ID_USUARIO })
  });
  await carregarNotificacoes();
}

function abrirDestinoNotificacao(notificacaoId) {
  var item = estadoNotificacoes.itens.find(function(entry) {
    return entry.id === notificacaoId;
  });
  if (!item) return;

  if (!item.lida_em) {
    marcarNotificacaoLida(null, item.id).catch(function(error) {
      console.warn('Erro ao marcar notificação:', error.message);
    });
  }

  if (item.dados && (item.dados.acao === 'abrir_solicitacoes' || item.dados.acao === 'abrir_amigos')) {
    app.tab.show('#tab-perfil');
    return;
  }

  app.tab.show('#tab-notificacoes');
}

function obterPluginFirebaseMessaging() {
  return window.cordova &&
    window.cordova.plugins &&
    window.cordova.plugins.firebase &&
    window.cordova.plugins.firebase.messaging
    ? window.cordova.plugins.firebase.messaging
    : null;
}

function obterPluginLocalNotifications() {
  return window.cordova &&
    window.cordova.plugins &&
    window.cordova.plugins.notification &&
    window.cordova.plugins.notification.local
    ? window.cordova.plugins.notification.local
    : null;
}

async function registrarTokenPush(token) {
  if (!token || !MEU_ID_USUARIO) return;
  await apiFetch('/push/register', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: MEU_ID_USUARIO,
      token: token,
      platform: 'android',
      device_label: 'android-cordova'
    })
  });
  localStorage.setItem(TOKEN_PUSH_LOCAL, token);
}

async function desregistrarTokenPush() {
  var token = localStorage.getItem(TOKEN_PUSH_LOCAL);
  if (!token || !MEU_ID_USUARIO) return;

  try {
    await apiFetch('/push/unregister', {
      method: 'POST',
      body: JSON.stringify({ token: token })
    });
  } catch (error) {
    console.warn('Erro ao desregistrar push:', error.message);
  }
}

function agendarLembreteLocalAvaliacao(filme) {
  var localNotifications = obterPluginLocalNotifications();
  if (!localNotifications || !filme) return;

  localNotifications.schedule({
    id: Math.floor(Date.now() / 1000),
    title: 'Continue seu diario no Filminho',
    text: 'Quer registrar mais uma opiniao sobre ' + filme.title + '?',
    trigger: { in: 2, unit: 'hour' },
    androidChannelId: 'filminho-engajamento',
    androidChannelName: 'Lembretes do Filminho',
    smallIcon: 'res://ic_launcher',
    data: { rota: 'perfil' }
  });
}

async function inicializarNotificacoesDoDispositivo() {
  if (!MEU_ID_USUARIO || estadoNotificacoes.pushInicializado) return;
  estadoNotificacoes.pushInicializado = true;

  var localNotifications = obterPluginLocalNotifications();
  if (localNotifications) {
    try {
      localNotifications.requestPermission(function() {});
      localNotifications.on('click', function() {
        app.tab.show('#tab-perfil');
      });
    } catch (error) {
      console.warn('Local notifications indisponíveis:', error.message || error);
    }
  }

  var messaging = obterPluginFirebaseMessaging();
  if (!messaging) return;

  try {
    await messaging.requestPermission({ forceShow: true });
    var token = await messaging.getToken();
    if (token) {
      await registrarTokenPush(token);
    }

    messaging.onTokenRefresh(async function(nextToken) {
      try {
        await registrarTokenPush(nextToken);
      } catch (error) {
        console.warn('Erro ao atualizar token push:', error.message);
      }
    });

    messaging.onMessage(async function() {
      await carregarNotificacoes();
    });

    if (typeof messaging.onBackgroundMessage === 'function') {
      messaging.onBackgroundMessage(async function() {
        await carregarNotificacoes();
      });
    }
  } catch (error) {
    console.warn('Push não inicializado:', error.message || error);
  }
}

async function carregarDadosIniciaisDoApp() {
  if (!MEU_ID_USUARIO) return;
  await Promise.allSettled([
    carregarPerfil(),
    carregarFilmesHome('tendencias', 'lista-tendencias'),
    carregarSolicitacoes(),
    carregarAmigos(),
    carregarNotificacoes()
  ]);
  await inicializarNotificacoesDoDispositivo();
}

// ====== FUNÇÕES DE AUTENTICAÇÃO ====
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
      document.getElementById('auth-' + btn.dataset.tab).classList.add('active');
    });
  });
}

async function carregarUfs() {
  try {
    const ufs = await apiFetch('/ibge/ufs');
    const select = document.getElementById('cadastro-uf');
    select.innerHTML = ufs.map(u => '<option value="' + u.sigla + '">' + u.sigla + '</option>').join('');
  } catch (e) {
    console.error('Erro ao carregar UFs:', e);
  }
}

async function buscarCep(cep) {
  return apiFetch('/cep/' + cep, { skipJsonContentType: true });
}

async function handleLogin(ev) {
  ev.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const senha = document.getElementById('login-senha').value;
  app.dialog.preloader('Entrando...');
  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, senha })
    });
    app.dialog.close();
    localStorage.setItem('filminho_user_id', data.id);
    localStorage.setItem('nome_usuario_filminho', data.nome);
    localStorage.setItem('filminho_user_cidade', data.cidade || '');
    localStorage.setItem('filminho_user_uf', data.uf || '');
    localStorage.setItem('filminho_user_token', data.token || '');
    MEU_ID_USUARIO = data.id;
    mostrarApp();
    await carregarDadosIniciaisDoApp();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert(e.message || 'Erro ao conectar com o servidor.');
  }
}

async function handleCadastro(ev) {
  ev.preventDefault();
  const nome = document.getElementById('cadastro-nome').value.trim();
  const email = document.getElementById('cadastro-email').value.trim();
  const senha = document.getElementById('cadastro-senha').value;
  const cep = document.getElementById('cadastro-cep').value.trim();
  const consent = document.getElementById('cadastro-lgpd').checked;

  if (!nome || !email || !senha || !cep) return app.dialog.alert('Preencha todos os campos.');
  if (senha.length < 6) return app.dialog.alert('Senha deve ter no mínimo 6 caracteres.');
  if (!consent) return app.dialog.alert('Você deve aceitar a política de privacidade.');

  app.dialog.preloader('Criando conta...');
  try {
    const data = await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify({ nome, email, senha, cep, consentimento_lgpd: consent })
    });
    app.dialog.close();
    localStorage.setItem('filminho_user_id', data.id);
    localStorage.setItem('nome_usuario_filminho', data.nome);
    localStorage.setItem('filminho_user_cidade', data.cidade || '');
    localStorage.setItem('filminho_user_uf', data.uf || '');
    localStorage.setItem('filminho_user_token', data.token || '');
    MEU_ID_USUARIO = data.id;
    mostrarApp();
    await carregarDadosIniciaisDoApp();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert(e.message || 'Erro ao conectar com o servidor.');
  }
}

async function logout() {
  await desregistrarTokenPush();
  localStorage.removeItem('filminho_user_id');
  localStorage.removeItem('nome_usuario_filminho');
  localStorage.removeItem('filminho_user_cidade');
  localStorage.removeItem('filminho_user_uf');
  localStorage.removeItem('filminho_user_token');
  localStorage.removeItem(TOKEN_PUSH_LOCAL);
  MEU_ID_USUARIO = 0;
  estadoNotificacoes = { itens: [], naoLidas: 0, pushInicializado: false };
  atualizarBadgeNotificacoes();
  mostrarAuth();
}

async function excluirConta() {
  app.dialog.confirm('Tem certeza? Todos os seus dados serão removidos permanentemente.', 'Excluir conta', async () => {
    app.dialog.preloader('Excluindo...');
    try {
      await apiFetch('/usuarios/' + MEU_ID_USUARIO, { method: 'DELETE' });
      app.dialog.close();
      logout();
      app.dialog.alert('Conta excluída com sucesso.');
    } catch (e) {
      app.dialog.close();
      app.dialog.alert(e.message || 'Erro ao excluir conta.');
    }
  });
}

function initAuth() {
  bindAuthTabs();
  carregarUfs();
  document.getElementById('auth-login-form').addEventListener('submit', handleLogin);
  document.getElementById('auth-register-form').addEventListener('submit', handleCadastro);

  // CEP -> ViaCEP
  document.getElementById('cadastro-cep').addEventListener('blur', async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length === 8) {
      try {
        const data = await buscarCep(cep);
        if (!data.erro) {
          document.getElementById('cadastro-cidade').value = data.localidade || '';
          document.getElementById('cadastro-uf').value = data.uf || '';
        }
      } catch (err) {
        console.warn('Erro ao buscar CEP:', err);
      }
    }
  });

  // CEP mask
  document.getElementById('cadastro-cep').addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '');
    if (v.length > 5) v = v.slice(0, 5) + '-' + v.slice(5);
    e.target.value = v;
  });

  if (!MEU_ID_USUARIO) {
    mostrarAuth();
  } else {
    mostrarApp();
    carregarDadosIniciaisDoApp().catch(function(error) {
      console.warn('Erro no bootstrap do app:', error.message);
    });
  }
}

// ====== FIM FUNÇÕES DE AUTENTICAÇÃO ====

// ====== FUNÇÕES DE AMIGOS ====
async function carregarSolicitacoes() {
  try {
    const data = await apiFetch('/amigos/pendentes?usuario_id=' + MEU_ID_USUARIO);

    // Buscar nomes dos usuários envolvidos
    const todosIds = new Set();
    data.recebidas.forEach(s => todosIds.add(s.de_id));
    data.enviadas.forEach(s => todosIds.add(s.para_id));
    const nomes = {};

    // Carregar perfil de cada usuário para obter nome
    await Promise.all(Array.from(todosIds).map(async (userId) => {
      try {
        const perfil = await apiFetch('/perfil/' + userId);
        if (perfil.perfil) nomes[userId] = perfil.perfil.nome;
      } catch (e) {
        nomes[userId] = 'Usuário #' + userId;
      }
    }));

    document.getElementById('friend-requests-received').innerHTML = data.recebidas.length === 0
      ? '<p style="color:#888; text-align:center; padding:12px;">Nenhuma solicitação pendente.</p>'
      : data.recebidas.map(s =>
          '<div class="friend-request-item">' +
            '<span><i class="icon material-icons" style="color:#00e054; font-size:18px; vertical-align:middle;">person_add</i> <strong>' + (nomes[s.de_id] || 'Usuário #' + s.de_id) + '</strong></span>' +
            '<div><button class="btn-accept" onclick="aceitarSolicitacao(' + s.id + ')">✓ Aceitar</button>' +
            '<button class="btn-decline" onclick="recusarSolicitacao(' + s.id + ')" style="margin-left:6px;">✗ Recusar</button></div>' +
          '</div>'
        ).join('');

    document.getElementById('friend-requests-sent').innerHTML = data.enviadas.length === 0
      ? '<p style="color:#888; text-align:center; padding:12px;">Nenhuma solicitação enviada.</p>'
      : data.enviadas.map(s =>
          '<div class="friend-request-item">' +
            '<span><i class="icon material-icons" style="color:#ffa500; font-size:18px; vertical-align:middle;">hourglass_empty</i> <strong>' + (nomes[s.para_id] || 'Usuário #' + s.para_id) + '</strong></span>' +
            '<span style="color:#ffa500; font-size:12px;">Pendente</span>' +
          '</div>'
        ).join('');
  } catch (e) {
    console.error('Erro ao carregar solicitações:', e);
  }
}

async function aceitarSolicitacao(id) {
  try {
    await apiFetch('/amigos/aceitar', {
      method: 'POST',
      body: JSON.stringify({ solicitacao_id: id, usuario_id: MEU_ID_USUARIO })
    });
    carregarSolicitacoes();
    carregarAmigos();
    carregarNotificacoes();
    app.toast.create({ text: 'Solicitação aceita!', closeTimeout: 2000, position: 'center' }).open();
  } catch (e) {
    app.dialog.alert('Erro ao aceitar solicitação.');
  }
}

async function recusarSolicitacao(id) {
  try {
    await apiFetch('/amigos/recusar', {
      method: 'POST',
      body: JSON.stringify({ solicitacao_id: id, usuario_id: MEU_ID_USUARIO })
    });
    carregarSolicitacoes();
    carregarNotificacoes();
    app.toast.create({ text: 'Solicitação recusada.', closeTimeout: 2000, position: 'center' }).open();
  } catch (e) {
    app.dialog.alert('Erro ao recusar solicitação.');
  }
}

async function carregarAmigos() {
  try {
    const amigos = await apiFetch('/amigos?usuario_id=' + MEU_ID_USUARIO);
    document.getElementById('friends-list').innerHTML = amigos.map(a =>
      '<div class="friend-item" onclick="abrirAvaliacaoAmigo(' + a.id + ', \'' + a.nome.replace(/'/g, "\\'") + '\')">' +
        '<i class="icon material-icons" style="color:#00e054; font-size:18px; vertical-align:middle;">person</i> ' + a.nome +
      '</div>'
    ).join('') || '<p style="color:#888;">Nenhum amigo ainda.</p>';
  } catch (e) {
    console.error('Erro ao carregar amigos:', e);
  }
}

async function abrirAvaliacaoAmigo(amigoId, nome) {
  try {
    const avals = await apiFetch('/amigos/' + amigoId + '/avaliacoes?usuario_id=' + MEU_ID_USUARIO);
    const html = avals.map(a =>
      '<div style="display:flex; gap:10px; align-items:center; padding:8px 0; border-bottom:1px solid #1f2228;">' +
        (a.poster_path ? '<img src="https://image.tmdb.org/t/p/w50' + a.poster_path + '" style="width:40px; border-radius:4px;">' : '') +
        '<div><div style="color:#fff; font-weight:600;">' + a.titulo_filme + '</div>' +
        '<div style="color:#00e054;">' + a.nota + ' ⭐</div></div>' +
        (a.foto ? '<i class="icon material-icons" style="color:#00e054; cursor:pointer;" onclick="visualizarFoto(event, \'' + a.foto + '\')">photo_camera</i>' : '') +
        (a.localizacao ? '<i class="icon material-icons" style="color:#00e054; cursor:pointer;" onclick="mostrarNoMapa(event, \'' + a.localizacao.lat + '\', \'' + a.localizacao.lon + '\')">location_on</i>' : '') +
      '</div>'
    ).join('') || '<p style="color:#888;">Sem avaliações.</p>';
    app.dialog.create({
      title: 'Filmes de ' + nome,
      content: html,
      buttons: [{ text: 'Fechar', color: '#00e054' }]
    }).open();
  } catch (e) {
    app.dialog.alert('Erro ao carregar avaliações do amigo.');
  }
}

// Autocomplete de amigos
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('friend-search-input');
  if (!input) return;

  input.addEventListener('input', async (e) => {
    const termo = e.target.value.trim();
    const box = document.getElementById('friend-suggestions');
    if (termo.length < 2) { box.classList.remove('active'); box.innerHTML = ''; return; }
    try {
      const lista = await apiFetch('/usuarios/buscar?nome=' + encodeURIComponent(termo) + '&usuario_id=' + MEU_ID_USUARIO);
      box.innerHTML = lista.map(u =>
        '<div class="suggestion" data-id="' + u.id + '">' + u.nome + '</div>'
      ).join('');
      box.classList.add('active');
      box.querySelectorAll('.suggestion').forEach(el => el.addEventListener('click', () => {
        amigoSelecionadoId = Number(el.dataset.id);
        input.value = el.textContent;
        box.classList.remove('active');
      }));
    } catch (err) {
      console.error('Erro na busca de amigos:', err);
    }
  });

  document.getElementById('friend-request-button').addEventListener('click', async () => {
    if (!amigoSelecionadoId) return app.dialog.alert('Selecione um usuário.');
    try {
      await apiFetch('/amigos/solicitar', {
        method: 'POST',
        body: JSON.stringify({ de_id: MEU_ID_USUARIO, para_id: amigoSelecionadoId })
      });
      amigoSelecionadoId = null;
      input.value = '';
      carregarSolicitacoes();
      carregarNotificacoes();
      app.toast.create({ text: 'Solicitação enviada!', closeTimeout: 2000, position: 'center' }).open();
    } catch (e) {
      app.dialog.alert('Erro ao enviar solicitação.');
    }
  });
});

// ====== FIM FUNÇÕES DE AMIGOS ====

carregarPerfil();
carregarFilmesHome('tendencias', 'lista-tendencias');
initAuth();

async function carregarPerfil() {
  if (!MEU_ID_USUARIO) return;
  try {
    var dados = await apiFetch('/perfil/' + MEU_ID_USUARIO);

    var meuNomeSalvo = localStorage.getItem('nome_usuario_filminho');
    var cidadeSalva = localStorage.getItem('filminho_user_cidade') || '';
    var ufSalva = localStorage.getItem('filminho_user_uf') || '';
    document.getElementById('nome-usuario').innerText = meuNomeSalvo;
    document.getElementById('avatar-img').src = `https://ui-avatars.com/api/?name=${encodeURI(meuNomeSalvo)}&background=00e054&color=000&size=90`;
    if (cidadeSalva || ufSalva) {
      document.getElementById('cidade-usuario').innerText = `${cidadeSalva}${ufSalva ? '/' + ufSalva : ''}`;
    } else {
      document.getElementById('cidade-usuario').innerText = 'Cidade não informada';
    }
    if (dados.perfil) {
      localStorage.setItem('nome_usuario_filminho', dados.perfil.nome || meuNomeSalvo);
      if (dados.perfil.cidade) localStorage.setItem('filminho_user_cidade', dados.perfil.cidade);
      if (dados.perfil.uf) localStorage.setItem('filminho_user_uf', dados.perfil.uf);
      if (dados.perfil.cidade || dados.perfil.uf) {
        document.getElementById('cidade-usuario').innerText = `${dados.perfil.cidade}${dados.perfil.uf ? '/' + dados.perfil.uf : ''}`;
      }
    }

    var htmlDiario = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? `<span style="color:#00e054; margin-right:6px;">[REASSISTIDO]</span>` : '';
      var iconesExtras = '';
      if (av.foto) {
        iconesExtras += `<i class="icon material-icons" style="font-size:16px; color:#00e054; margin-left:8px;" onclick="visualizarFoto(event, '${av.foto}')">photo_camera</i>`;
      }
      if (av.localizacao && av.localizacao.lat) {
        iconesExtras += `<i class="icon material-icons" style="font-size:16px; color:#00e054; margin-left:4px;" onclick="mostrarNoMapa(event, '${av.localizacao.lat}', '${av.localizacao.lon}')">location_on</i>`;
      }

      const notaFormatada = typeof av.nota === 'number' ? av.nota.toFixed(1) : 'N/A';

      return `<li class="item-content" onclick="abrirDetalhes(${av.id_filme})">` +
          `<div class="item-media"><img src="${av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : ''}" style="width: 50px; border-radius: 4px;"></div>` +
          `<div class="item-inner">` +
            `<div class="item-title" style="color: #ffffff; font-weight: 500;">${seloReassistido}${av.titulo_filme}</div>` +
            `<div class="item-after" style="color: #00e054; font-weight: bold; display:flex; align-items:center; gap:8px;">${notaFormatada} ⭐${iconesExtras}` +
               `<i class="icon material-icons" style="color:#ff5555; cursor:pointer;" onclick="removerAvaliacao(event, ${av.id_avaliacao})">delete_forever</i>` +
            `</div>` +
          `</div>` +
        `</li>`;
    }).join('');
    document.getElementById('lista-avaliacoes').innerHTML = htmlDiario || '<li><div class="item-inner">Diário vazio.</div></li>';

    var htmlRecentes = dados.avaliacoes.slice().reverse().map(function(av) {
      var seloReassistido = av.reassistido ? `<span style="color:#00e054; margin-right:4px;">(R)</span>` : '';
      return `<div class="poster-card" onclick="abrirDetalhes(${av.id_filme})">` +
          `<img src="${av.poster_path ? 'https://image.tmdb.org/t/p/w200' + av.poster_path : ''}">` +
          `<div class="poster-title">${seloReassistido}${av.titulo_filme}</div>` +
        `</div>`;
    }).join('');
    document.getElementById('lista-recentes').innerHTML = htmlRecentes || '<p>Nada na sua lista ainda.</p>';
  } catch (e) {
    console.error("Erro ao carregar perfil:", e);
  }
}

async function removerAvaliacao(event, id_avaliacao) {
    event.stopPropagation();
    app.dialog.confirm('Tem certeza que deseja remover este filme do seu diário?', 'Remover Avaliação', async () => {
      app.dialog.preloader('Removendo...');
      try {
          await apiFetch('/avaliar/' + id_avaliacao, { method: 'DELETE' });
          app.dialog.close();
          carregarPerfil();
      } catch (e) {
          app.dialog.close();
          app.dialog.alert(e.message || 'Não foi possível remover a avaliação.');
      }
    });
}

async function carregarFilmesHome(endpoint, idElemento) {
  try {
    var res = await fetch(API_URL + '/filmes/' + endpoint);
    var filmes = await res.json();
    var html = filmes.map(f =>
      `<div class="poster-card" onclick="abrirDetalhes(${f.id})">` +
        `<img src="https://image.tmdb.org/t/p/w200${f.poster_path}" onerror="this.src='https://via.placeholder.com/100x150?text=Sem+Capa'">` +
        `<div class="poster-title">${f.title}</div>` +
      `</div>`
    ).join('');
    document.getElementById(idElemento).innerHTML = html;
  } catch (e) {
    document.getElementById(idElemento).innerHTML = '<p style="color:#ff3b30;">Erro ao carregar.</p>';
  }
}

function mostrarInicio(elementoHTML) {
  document.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'block';
  document.getElementById('sessao-categoria').style.display = 'none';
}

function mostrarInicioMenu() {
  document.getElementById('input-busca').value = '';
  pesquisarDigitando(); 
  const chipIni = document.getElementById('chip-inicio');
  if(chipIni) mostrarInicio(chipIni);
}

function mudarCategoria(id, nome, elementoHTML) {
  document.querySelectorAll('.chip-categoria').forEach(c => c.classList.remove('active'));
  elementoHTML.classList.add('active');
  document.getElementById('sessao-inicio').style.display = 'none';
  document.getElementById('sessao-categoria').style.display = 'block';
  document.getElementById('titulo-categoria').innerText = "Catálogo: " + nome;
  document.getElementById('lista-categoria').innerHTML = '<p>Carregando...</p>';
  carregarFilmesHome('categoria/' + id, 'lista-categoria');
}

async function pesquisarDigitando() {
  var termo = document.getElementById('input-busca').value;
  if (!termo || termo.length < 2) {
    document.getElementById('area-home').style.display = 'block';
    document.getElementById('area-resultados').style.display = 'none';
    return;
  }
  document.getElementById('area-home').style.display = 'none';
  document.getElementById('area-resultados').style.display = 'block';
  try {
    var res = await fetch(API_URL + '/filmes/buscar?q=' + termo);
    var filmes = await res.json();
    var html = filmes.map(f =>
      `<div class="card card-outline" style="background: #1a1c23; border: none; cursor: pointer; margin: 10px 0;" onclick="abrirDetalhes(${f.id})">` +
        `<div class="card-content card-content-padding" style="display: flex; gap: 15px;">` +
          `<img src="https://image.tmdb.org/t/p/w200${f.poster_path}" style="width: 60px; border-radius: 6px; object-fit: cover;" onerror="this.style.display=\'none\'">` +
          `<div><h3 style="margin: 0 0 5px 0; font-size: 16px; color:#ffffff;">${f.title}</h3><p style="margin: 0; font-size: 14px;">${f.release_date ? f.release_date.substring(0, 4) : ''}</p></div>` +
        `</div>` +
      `</div>`
    ).join('');
    document.getElementById('lista-resultados').innerHTML = html || '<p>Nenhum filme encontrado.</p>';
  } catch (e) {
    document.getElementById('lista-resultados').innerHTML = '<p>Erro na busca.</p>';
  }
}

async function sortearFilme() {
  app.dialog.preloader('Girando a roleta...');
  try {
    var res = await fetch(API_URL + '/filmes/sortear');
    var filme = await res.json();
    app.dialog.close();
    if(filme && filme.id) abrirDetalhes(filme.id); 
    else throw new Error();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert('Erro ao sortear filme.');
  }
}

async function abrirDetalhes(id) {
  app.popup.open('#popup-detalhes'); 
  document.getElementById('conteudo-detalhes').innerHTML = '<div class="block" style="text-align: center; margin-top:100px;">Carregando...</div>';
  
  try {
    var res = await fetch(API_URL + '/filme/' + id);
    var f = await res.json();
    filmeAbertoAgora = f; 

    var provedoresHtml = '';
    if (f['watch/providers'] && f['watch/providers'].results.BR && f['watch/providers'].results.BR.flatrate) {
        provedoresHtml = '<h3 style="color: #ffffff; margin-top: 25px;">Onde Assistir (Streaming)</h3>' +
            '<div class="scroller-horizontal" style="margin-top: 10px;">' +
            f['watch/providers'].results.BR.flatrate.map(p => 
                `<div class="provider-card"><img src="https://image.tmdb.org/t/p/w200${p.logo_path}" title="${p.provider_name}"></div>`
            ).join('') + '</div>';
    }

    var atores = f.credits && f.credits.cast ? f.credits.cast.slice(0, 10).map(ator =>
      `<div class="ator-card">` +
        `<img src="https://image.tmdb.org/t/p/w200${ator.profile_path}" onerror="this.src='https://via.placeholder.com/60?text=?'">` +
        `<div style="color: #ffffff;">${ator.name}</div>` +
        `<div style="font-size: 10px;">${ator.character}</div>` +
      `</div>`
    ).join('') : '';

    document.getElementById('conteudo-detalhes').innerHTML = 
      `<div class="detalhes-header" style="background-image: url('https://image.tmdb.org/t/p/w500${f.backdrop_path}');"></div>` +
      `<div class="block" style="margin-top: -60px; position: relative; z-index: 10;">` +
        `<h2 style="color: #ffffff; margin: 0; font-size: 26px; line-height: 1.1;">${f.title}</h2>` +
        `<p style="margin: 5px 0; color: #00e054; font-weight:bold;">${f.release_date ? f.release_date.substring(0,4) : ''} • ${f.runtime} min</p>` +
        `<button class="button button-fill button-large button-round" style="background-color: #00e054; color: #000; font-weight: 800; margin: 20px 0; height: 48px;" onclick="abrirPopupAvaliacao()">` +
          `<i class="icon material-icons" style="margin-right: 5px;">star</i> AVALIAR FILME` +
        `</button>` +
        `<h3 style="color: #ffffff; margin-bottom: 5px;">Sinopse</h3>` +
        `<p style="line-height: 1.6; font-size: 14px;">${f.overview || 'Sinopse não disponível.'}</p>` +
        provedoresHtml +
        `<h3 style="color: #ffffff; margin-top: 25px;">Elenco Principal</h3>` +
        `<div class="scroller-horizontal" style="margin-top: 10px;">${atores}</div>` +
      `</div>`;
  } catch (e) {
    document.getElementById('conteudo-detalhes').innerHTML = '<div class="block">Erro ao carregar filme.</div>';
  }
}

// --- NOVA LÓGICA DE AVALIAÇÃO UNIFICADA ---
function abrirPopupAvaliacao() {
    // Resetar estado da avaliação
    avaliacaoAtual = { nota: 0, reassistido: false, foto: null, localizacao: null };

    const popup = document.getElementById('rating-popup');
    atualizarTextoEstrelas(0);
    atualizarVisualEstrelas(0);
    document.getElementById('rating-rewatch-toggle').checked = false;
    const addPhotoButton = document.getElementById('add-photo-button');
    addPhotoButton.innerHTML = '<i class="icon material-icons">photo_camera</i> Adicionar Foto';
    addPhotoButton.classList.remove('button-fill');
    addPhotoButton.classList.add('button-outline');

    // Configurar listeners das estrelas (com remoção de antigos)
    const starsContainer = document.getElementById('stars-container');
    const newStarsContainer = starsContainer.cloneNode(true);
    starsContainer.parentNode.replaceChild(newStarsContainer, starsContainer);
    newStarsContainer.addEventListener('click', handleStarClick);

    // Listener para o botão de foto
    document.getElementById('add-photo-button').onclick = async () => {
        const foto = await tirarFotoComNavegador();
        if (foto) {
            avaliacaoAtual.foto = foto;
            const button = document.getElementById('add-photo-button');
            button.innerHTML = '<i class="icon material-icons">check_circle</i> Foto Adicionada';
            button.classList.remove('button-outline');
            button.classList.add('button-fill');
        }
    };
    
    // Listener para o botão de salvar
    document.getElementById('save-rating-button').onclick = () => {
        avaliacaoAtual.reassistido = document.getElementById('rating-rewatch-toggle').checked;
        
        if (avaliacaoAtual.nota === 0) {
            app.toast.create({ text: 'Por favor, selecione uma nota de 0.5 a 5.', closeTimeout: 2500, position: 'center' }).open();
            return;
        }
        
        salvarAvaliacaoFinal();
    };

    popup.classList.add('visible');
}

function handleStarClick(event) {
    const targetStar = event.target.closest('.star');
    if (!targetStar) return;
    const rect = targetStar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const starValue = parseInt(targetStar.dataset.value, 10);
    avaliacaoAtual.nota = (clickX < rect.width / 2) ? starValue - 0.5 : starValue;
    atualizarVisualEstrelas(avaliacaoAtual.nota);
    atualizarTextoEstrelas(avaliacaoAtual.nota);
}

function fecharPopupAvaliacao() {
    document.getElementById('rating-popup').classList.remove('visible');
}

function atualizarVisualEstrelas(rating) {
    document.querySelectorAll('#stars-container .star').forEach(star => {
        const starValue = parseFloat(star.dataset.value);
        star.className = 'star';
        star.innerHTML = '☆';
        if (rating >= starValue) {
            star.className = 'star filled';
            star.innerHTML = '★';
        } else if (rating >= starValue - 0.5) {
            star.className = 'star half-filled';
            star.innerHTML = '★';
        }
    });
}

function atualizarTextoEstrelas(rating) {
    const ratingValueEl = document.getElementById('rating-value');
    if (rating > 0) {
        ratingValueEl.innerHTML = `Sua nota: <b>${rating.toFixed(1)}</b>`;
    } else {
        ratingValueEl.innerHTML = 'Toque nas estrelas para avaliar';
    }
}

async function salvarAvaliacaoFinal() {
  if (!filmeAbertoAgora || avaliacaoAtual.nota === 0) return;

  app.dialog.preloader('Salvando no seu diário...');

  // Pega a localização ANTES de salvar (se houver foto)
  if (avaliacaoAtual.foto && navigator.geolocation) {
      try {
          const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
          });
          avaliacaoAtual.localizacao = { lat: position.coords.latitude, lon: position.coords.longitude };
      } catch (e) {
          console.warn('Não foi possível obter a localização.');
      }
  }

  try {
    await apiFetch('/avaliar', {
      method: 'POST',
      body: JSON.stringify({
          id_usuario: MEU_ID_USUARIO,
          id_filme: filmeAbertoAgora.id,
          titulo_filme: filmeAbertoAgora.title,
          nota: avaliacaoAtual.nota,
          poster_path: filmeAbertoAgora.poster_path,
          reassistido: avaliacaoAtual.reassistido,
          foto: avaliacaoAtual.foto,
          localizacao: avaliacaoAtual.localizacao
      })
    });
    app.dialog.close();
    fecharPopupAvaliacao();
    app.popup.close('#popup-detalhes');
    agendarLembreteLocalAvaliacao(filmeAbertoAgora);
    app.toast.create({ text: 'Filme salvo no seu diário!', closeTimeout: 2000, position: 'center' }).open();
    carregarPerfil();
    carregarNotificacoes();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert(e.message || 'Ocorreu um erro ao salvar sua avaliação.');
  }
}

// --- LÓGICA DA CÂMERA (AGORA ISOLADA E DIRETA) ---
async function tirarFotoComNavegador() {
  if (!window.isSecureContext) {
     app.dialog.alert('O acesso à câmera é permitido apenas em conexões seguras (HTTPS).');
     return null;
  }

  const container = document.getElementById('camera-preview-container');
  const video = document.getElementById('camera-video');
  const captureButton = document.getElementById('capture-button');
  const cancelButton = document.getElementById('cancel-camera-button');
  let stream = null;

  return new Promise(async (resolve) => {
    function cleanup(resolvedValue = null) {
      if (stream) stream.getTracks().forEach(track => track.stop());
      container.style.display = 'none';
      resolve(resolvedValue);
    }

    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play();
      container.style.display = 'block';

      captureButton.onclick = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        const fotoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        cleanup(fotoBase64);
      };

      cancelButton.onclick = () => cleanup(null);

    } catch (err) {
      let msg = 'Ocorreu um erro desconhecido ao tentar acessar a câmera.';
      if (err.name === 'NotAllowedError') {
          msg = 'A permissão para a câmera foi negada. Você precisa autorizar nas configurações do navegador.';
      }
      app.dialog.alert(msg, 'Erro de Câmera');
      cleanup(null);
    }
  });
}

function visualizarFoto(event, fotoBase64) {
    event.stopPropagation();
    app.popup.create({
        content: `<div class="popup photo-popup"><div class="view"><div class="page"><div class="navbar"><div class="navbar-inner"><div class="title">Foto</div><div class="right"><a href="#" class="link popup-close">Fechar</a></div></div></div><div class="page-content" style="display:flex; align-items:center; justify-content:center; background:#000;"><img src="${fotoBase64}" style="max-width:100%; max-height:100%;"></div></div></div></div>`
    }).open();
}

let mapaAtual = null;
let mapaMarker = null;

function abrirMapaPopup(lat, lon) {
  const container = document.getElementById('map-container');
  const fallback = document.getElementById('map-fallback');

  if (!container || !fallback) {
    app.dialog.alert('Nao foi possivel carregar o mapa.');
    return;
  }

  app.popup.open('#map-popup');

  const numLat = Number(lat);
  const numLon = Number(lon);
  fallback.textContent = 'Carregando mapa...';
  fallback.style.display = 'flex';
  if (!Number.isFinite(numLat) || !Number.isFinite(numLon)) {
    fallback.textContent = 'Nao foi possivel carregar o mapa.';
    fallback.style.display = 'flex';
    return;
  }

  setTimeout(() => {
    try {
      fallback.style.display = 'none';
      if (!window.L) throw new Error('Leaflet nao carregou');

      if (!mapaAtual) {
        mapaAtual = L.map('map-container');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap'
        }).addTo(mapaAtual);
        mapaMarker = L.marker([numLat, numLon]).addTo(mapaAtual);
      } else if (mapaMarker) {
        mapaMarker.setLatLng([numLat, numLon]);
      } else {
        mapaMarker = L.marker([numLat, numLon]).addTo(mapaAtual);
      }

      mapaAtual.setView([numLat, numLon], 15);
      mapaAtual.invalidateSize();
    } catch (err) {
      fallback.textContent = 'Nao foi possivel carregar o mapa.';
      fallback.style.display = 'flex';
    }
  }, 300);
}

function mostrarNoMapa(event, lat, lon) {
  event.stopPropagation();
  abrirMapaPopup(lat, lon);
}

function editarPerfil() {
  var nomeAtual = localStorage.getItem('nome_usuario_filminho') || '';
  var cidadeAtual = localStorage.getItem('filminho_user_cidade') || '';
  var ufAtual = localStorage.getItem('filminho_user_uf') || '';

  var inputNome = document.getElementById('edit-nome');
  var inputCidade = document.getElementById('edit-cidade');
  var selectUF = document.getElementById('edit-uf');
  
  if (inputNome) inputNome.value = nomeAtual;
  if (inputCidade) inputCidade.value = cidadeAtual;
  if (selectUF) selectUF.value = ufAtual;

  // Popular UF com dados do Brasil
  if (selectUF) {
    selectUF.innerHTML = '<option value="">Carregando...</option>';
    apiFetch('/ibge/ufs')
      .then(function(ufs) {
        selectUF.innerHTML = '<option value="">Selecione</option>';
        ufs.forEach(function(uf) {
          var opt = document.createElement('option');
          opt.value = uf.sigla;
          opt.textContent = uf.sigla + ' - ' + uf.nome;
          if (uf.sigla === ufAtual) opt.selected = true;
          selectUF.appendChild(opt);
        });
      })
      .catch(function() {
        selectUF.innerHTML = '<option value="">Selecione</option>';
        ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].forEach(function(sigla) {
          var opt = document.createElement('option');
          opt.value = sigla;
          opt.textContent = sigla;
          if (sigla === ufAtual) opt.selected = true;
          selectUF.appendChild(opt);
        });
      });
  }

  app.popup.open('#popup-editar-perfil');
}

function fecharEditarPerfil() {
  app.popup.close('#popup-editar-perfil');
}

async function salvarEditarPerfil() {
  var novoNome = document.getElementById('edit-nome').value.trim();
  var novaCidade = document.getElementById('edit-cidade').value.trim();
  var novaUF = document.getElementById('edit-uf').value;
  if (!novoNome) {
    app.dialog.alert('Nome não pode ser vazio.');
    return;
  }

  app.dialog.preloader('Salvando...');
  try {
    await apiFetch('/perfil/' + MEU_ID_USUARIO, {
      method: 'PUT',
      body: JSON.stringify({ nome: novoNome, cidade: novaCidade, uf: novaUF })
    });
    app.dialog.close();
    fecharEditarPerfil();
    localStorage.setItem('nome_usuario_filminho', novoNome);
    localStorage.setItem('filminho_user_cidade', novaCidade);
    localStorage.setItem('filminho_user_uf', novaUF);
    carregarPerfil();
    app.toast.create({ text: 'Perfil atualizado!', closeTimeout: 2000, position: 'center' }).open();
  } catch (e) {
    app.dialog.close();
    app.dialog.alert(e.message || 'Erro ao atualizar perfil.');
  }
}

// Event listeners para ações da interface
document.addEventListener('DOMContentLoaded', function() {
  var btnSalvar = document.getElementById('btn-salvar-edit-perfil');
  var markAllButton = document.getElementById('mark-all-read-button');
  if (btnSalvar) btnSalvar.addEventListener('click', salvarEditarPerfil);
  if (markAllButton) {
    markAllButton.addEventListener('click', async function() {
      try {
        await marcarTodasNotificacoesLidas();
        app.toast.create({ text: 'Notificações marcadas como lidas!', closeTimeout: 2000, position: 'center' }).open();
      } catch (error) {
        app.dialog.alert(error.message || 'Não foi possível atualizar notificações.');
      }
    });
  }
});

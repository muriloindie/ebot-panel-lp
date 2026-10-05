/* ==========================================================================
   Ê-Bot — Tour interativo do painel (seção #tour)
   Abas · tema · gráfico SVG · KPIs · fila de atendimentos · Kanban · CRM · fluxo
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("tourDemo");
  if (!root) return;

  /* ------------------------------------------------------------------
     1. Dados
     ------------------------------------------------------------------ */

  // Fluxo por hora: [hora, total, IA, humano]
  var HOURLY = [
    ["07h", 24, 18, 6],
    ["08h", 38, 28, 10],
    ["09h", 62, 46, 16],
    ["10h", 74, 56, 18],
    ["11h", 58, 44, 14],
    ["12h", 49, 38, 11],
    ["13h", 53, 40, 13],
    ["14h", 68, 52, 16],
    ["15h", 91, 68, 23],
    ["16h", 96, 71, 25],
    ["17h", 112, 79, 33],
    ["18h", 138, 99, 39],
    ["19h", 156, 118, 38],
    ["20h", 129, 101, 28],
    ["21h", 104, 82, 22],
    ["22h", 82, 66, 16],
    ["23h", 61, 49, 12]
  ];

  var PALETTE = {
    light: { total: "#1DA851", ai: "#8DA82F", human: "#5D737E" },
    dark: { total: "#2ED06A", ai: "#C4D96A", human: "#9BA6AE" }
  };

  var TICKETS = {
    "AT-1100": {
      name: "Marcos Silva", avatar: "MS",
      channel: "WhatsApp · +55 11 97733-4120",
      sector: "Comercial", sla: "SLA 04:02", owner: "Rita Souza",
      msgs: [
        ["client", "", "Bom dia! Preciso do contrato de frota com 12 veículos.", "09:58"],
        ["ai", "Ê-Bot · IA", "Bom dia, Marcos! Já localizo o modelo padrão e envio em PDF.", "09:58"],
        ["human", "Rita · humano", "Enviando agora — conferi os valores com desconto por volume.", "10:03"],
        ["client", "", "Perfeito, vou analisar com a contabilidade.", "10:38"]
      ]
    },
    "AT-1098": {
      name: "Camila Rocha", avatar: "CR",
      channel: "WhatsApp · +55 21 98120-7744",
      sector: "Financeiro", sla: "SLA 00:47", owner: "Ê-Bot (IA)",
      msgs: [
        ["client", "", "A segunda via da nota fiscal chegou no meu e-mail?", "10:29"],
        ["ai", "Ê-Bot · IA", "Verifiquei o envio e reenviei para camila@varejo.com.br agora há 1 min.", "10:30"],
        ["client", "", "Chegou, obrigada!", "10:31"]
      ]
    },
    "AT-1096": {
      name: "Rafael Lima", avatar: "RL",
      channel: "WhatsApp · +55 31 99640-2211",
      sector: "Comercial", sla: "SLA 07:15", owner: "Tiago Torres",
      msgs: [
        ["client", "", "Quero migrar meu plano para o time com 30 usuários.", "10:20"],
        ["human", "Tiago · humano", "Rafael, consigo 12% de desconto no plano anual. Envio a proposta?", "10:22"],
        ["client", "", "Pode enviar.", "10:24"]
      ]
    },
    "AT-1094": {
      name: "Juliana Tavares", avatar: "JT",
      channel: "WhatsApp · +55 41 98801-3390",
      sector: "Agenda", sla: "SLA 01:33", owner: "Ê-Bot (IA)",
      msgs: [
        ["ai", "Ê-Bot · IA", "Seu atendimento de amanhã às 09h30 está confirmado.", "10:15"],
        ["client", "", "Confirmo, obrigada.", "10:16"],
        ["ai", "Ê-Bot · IA", "Combinado! Te lembro 1 h antes do horário.", "10:17"]
      ]
    },
    "AT-1086": {
      name: "Bruno Oliveira", avatar: "BO",
      channel: "WhatsApp · +55 51 99123-8877",
      sector: "Financeiro", sla: "SLA 09:40", owner: "Rita Souza",
      msgs: [
        ["client", "", "O pagamento via boleto ainda está pendente por aqui?", "09:55"],
        ["ai", "Ê-Bot · IA", "Encontrei o boleto #4821, vencido em 02/10. Envio o link?", "09:56"],
        ["client", "", "Sim, por favor.", "09:58"]
      ]
    }
  };

  var NODE_INFO = {
    trigger: {
      kind: "Gatilho", title: "D-1 do agendamento",
      note: "Percorre a agenda do dia seguinte e inicia o fluxo para cada compromisso confirmado.",
      fields: [["Agenda", "Consultas e visitas confirmadas"], ["Horário da disparada", "18:00 · fuso de São Paulo"], ["Condição", "status = confirmado"]]
    },
    search: {
      kind: "Ação", title: "Buscar cliente",
      note: "Consulta cadastro e histórico antes de responder, para a mensagem chegar personalizada.",
      fields: [["Origem dos dados", "CRM Ê-Bot · tempo real"], ["Campos lidos", "nome, telefone, última compra"], ["Sem resultado", "usa o primeiro nome do contato"]]
    },
    message: {
      kind: "Mensagem", title: "Mensagem de confirmação",
      note: "Modelo aprovado pela equipe, com variáveis preenchidas automaticamente.",
      fields: [["Modelo", "“Seu atendimento é amanhã às {hora}”"], ["Canal", "WhatsApp · número principal"], ["Assinatura", "Nome do atendente responsável"]]
    },
    wait: {
      kind: "Espera", title: "Aguardar resposta",
      note: "Dá tempo do cliente responder antes de qualquer reenvio ou transferência.",
      fields: [["Janela", "2 horas"], ["Reenvio", "1 vez, texto diferente"], ["Fora do expediente", "espera até 08:00"]]
    },
    condition: {
      kind: "Condição", title: "Confirmou?",
      note: "Lê a resposta do cliente e direciona o fluxo para o caminho certo.",
      fields: [["Palavras-chave", "sim, confirmo, pode ser"], ["Sensível a acentos", "sim"], ["Sem resposta", "caminho: transferir"]]
    },
    confirm: {
      kind: "Sucesso", title: "Confirmar agendamento",
      note: "Grava a confirmação na agenda e avisa a equipe que vai atender.",
      fields: [["Destino", "Agenda do setor"], ["Notificação", "Alerta para o atendente"], ["Registro", "Histórico do cliente"]]
    },
    transfer: {
      kind: "Falha", title: "Transferir para atendimento",
      note: "Joga a conversa na fila humana com todo o contexto do fluxo.",
      fields: [["Fila", "Comercial · prioridade alta"], ["Contexto", "anexado à conversa"], ["SLA", "primeira resposta em 2 min"]]
    }
  };

  /* ------------------------------------------------------------------
     2. Gráfico SVG
     ------------------------------------------------------------------ */

  function isDark() { return root.getAttribute("data-theme") === "dark"; }

  function smoothPath(pts) {
    if (pts.length < 2) return "";
    var d = "M" + pts[0][0] + "," + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i === 0 ? 0 : i - 1];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[i + 2] || p2;
      var c1x = p1[0] + (p2[0] - p0[0]) / 6;
      var c1y = p1[1] + (p2[1] - p0[1]) / 6;
      var c2x = p2[0] - (p3[0] - p1[0]) / 6;
      var c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += " C" + c1x + "," + c1y + " " + c2x + "," + c2y + " " + p2[0] + "," + p2[1];
    }
    return d;
  }

  function svgEl(name, attrs) {
    var el = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function buildChart(svg) {
    if (!svg) return;
    var pal = PALETTE[isDark() ? "dark" : "light"];
    var W = 720, H = 220, padL = 38, padR = 12, padT = 14, padB = 26;
    var max = 160;
    var n = HOURLY.length;

    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var x = function (i) { return padL + (i * (W - padL - padR)) / (n - 1); };
    var y = function (v) { return H - padB - (v / max) * (H - padT - padB); };

    // grade + eixo Y
    var grid = svgEl("g", {});
    [0, 40, 80, 120, 160].forEach(function (v) {
      grid.appendChild(svgEl("line", { class: "dm-grid-line", x1: padL, y1: y(v), x2: W - padR, y2: y(v) }));
      var t = svgEl("text", { class: "dm-axis-txt", x: 4, y: y(v) + 4 });
      t.textContent = v;
      grid.appendChild(t);
    });
    svg.appendChild(grid);

    // eixo X
    var axis = svgEl("g", {});
    HOURLY.forEach(function (row, i) {
      if (i % 2 !== 0) return;
      var t = svgEl("text", { class: "dm-axis-txt", x: x(i), y: H - 6, "text-anchor": "middle" });
      t.textContent = row[0];
      axis.appendChild(t);
    });
    svg.appendChild(axis);

    function seriesPts(idx) {
      return HOURLY.map(function (row, i) { return [x(i), y(row[idx])]; });
    }

    var totalPts = seriesPts(1);
    var totalLine = smoothPath(totalPts);

    // área do total
    var area = svgEl("path", {
      class: "dm-area is-on",
      "data-series": "total",
      d: totalLine + " L" + x(n - 1) + "," + y(0) + " L" + x(0) + "," + y(0) + " Z",
      fill: pal.total,
      "fill-opacity": "0.16"
    });
    svg.appendChild(area);

    // linhas
    [
      ["total", 1],
      ["ai", 2],
      ["human", 3]
    ].forEach(function (s) {
      var p = svgEl("path", {
        class: "dm-line is-on",
        "data-series": s[0],
        d: smoothPath(seriesPts(s[1])),
        stroke: pal[s[0]]
      });
      svg.appendChild(p);
    });
  }

  function buildAllCharts() {
    document.querySelectorAll("svg[data-dm-chart]").forEach(buildChart);
  }

  /* ------------------------------------------------------------------
     3. Abas / módulos
     ------------------------------------------------------------------ */

  var screens = document.querySelectorAll("#tourScreens .dm-screen");
  var tabTriggers = document.querySelectorAll("[data-tour-tab]");

  function showScreen(key) {
    screens.forEach(function (s) {
      var on = s.getAttribute("data-screen") === key;
      s.classList.toggle("is-active", on);
      s.hidden = !on;
    });
    tabTriggers.forEach(function (t) {
      var on = t.getAttribute("data-tour-tab") === key;
      t.classList.toggle("is-active", on);
      if (t.hasAttribute("role")) t.setAttribute("aria-selected", on ? "true" : "false");
    });
    var target = document.querySelector('#tourScreens .dm-screen[data-screen="' + key + '"]');
    if (target) target.scrollTop = 0;
    var scroller = document.getElementById("tourScreens");
    if (scroller) scroller.scrollTop = 0;
  }

  tabTriggers.forEach(function (t) {
    t.addEventListener("click", function () {
      showScreen(t.getAttribute("data-tour-tab"));
    });
  });

  /* ------------------------------------------------------------------
     4. Tema claro / escuro
     ------------------------------------------------------------------ */

  var themeBtn = document.getElementById("dmTheme");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var dark = isDark();
      root.setAttribute("data-theme", dark ? "light" : "dark");
      themeBtn.classList.toggle("is-on", !dark);
      var icon = themeBtn.querySelector("iconify-icon");
      if (icon) icon.setAttribute("icon", dark ? "ph:moon" : "ph:sun");
      buildAllCharts();
    });
  }

  /* ------------------------------------------------------------------
     5. KPIs: contagem + segmento (Hoje / Semana / Mês)
     ------------------------------------------------------------------ */

  function fmt(v) { return Math.round(v).toLocaleString("pt-BR"); }

  function countUp(el, duration) {
    var target = parseFloat(el.getAttribute("data-count"));
    if (isNaN(target)) return;
    if (!el.offsetParent && el.ownerDocument) {
      // elemento oculto: apenas grava o valor final
      el.textContent = fmt(target);
      return;
    }
    var start = performance.now();
    var dur = duration || 1100;
    function step(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    }
    requestAnimationFrame(step);
  }

  var counted = new WeakSet();
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (counted.has(el)) return;
        counted.add(el);
        countUp(el);
        io.unobserve(el);
      });
    }, { threshold: 0.4 });
    document.querySelectorAll("[data-count]").forEach(function (el) { io.observe(el); });
  }

  var dashSeg = document.querySelector("[data-dash-seg]");
  if (dashSeg) {
    dashSeg.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-set]");
      if (!btn) return;
      var set = btn.getAttribute("data-set");
      dashSeg.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });
      var scope = dashSeg.closest(".dm-screen") || document;
      scope.querySelectorAll("[data-set]").forEach(function (el) {
        if (el.closest("[data-dash-seg]")) return;
        var on = el.getAttribute("data-set") === set;
        el.hidden = !on;
        if (on && el.hasAttribute("data-count")) countUp(el, 700);
      });
    });
  }

  /* ------------------------------------------------------------------
     6. Séries do gráfico (Total / IA / Humano)
     ------------------------------------------------------------------ */

  document.querySelectorAll(".dm-chart-tools [data-series]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.getAttribute("data-series");
      var on = !btn.classList.contains("is-active");
      btn.classList.toggle("is-active", on);
      var card = btn.closest(".dm-card");
      var svg = card ? card.querySelector("svg[data-dm-chart]") : null;
      if (!svg) return;
      svg.querySelectorAll('[data-series="' + key + '"]').forEach(function (el) {
        el.classList.toggle("is-on", on);
      });
    });
  });

  /* ------------------------------------------------------------------
     7. Fila de atendimentos → conversa
     ------------------------------------------------------------------ */

  var queue = document.getElementById("dmQueue");
  var chatBody = document.getElementById("dmChatBody");

  function esc(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c];
    });
  }

  function renderChat(ticketId, t) {
    if (!chatBody || !t) return;
    var html = '<span class="dm-day">Hoje</span>';
    t.msgs.forEach(function (m) {
      var kind = m[0];
      var who = kind === "client" ? "" :
        '<span class="dm-who"><iconify-icon icon="' +
        (kind === "ai" ? "ph:robot" : "ph:user") + '" aria-hidden="true"></iconify-icon>' + esc(m[1]) + "</span>";
      html += '<div class="dm-msg dm-msg--' + kind + '">' + who + esc(m[2]) +
        '<span class="dm-time">' + esc(m[3]) + "</span></div>";
    });
    html += '<div class="dm-typing"><i></i><i></i><i></i></div>';
    chatBody.innerHTML = html;
    chatBody.scrollTop = 0;

    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
    set("dmChatName", t.name);
    set("dmChatAvatar", t.avatar);
    set("dmChatChannel", t.channel);
    set("dmChatTicket", ticketId);

    var pills = document.querySelectorAll(".dm-panel--chat .dm-chat-meta .dm-pill");
    if (pills[1]) pills[1].textContent = "Setor: " + t.sector;
    if (pills[2]) pills[2].textContent = t.sla;
    var owner = document.querySelector(".dm-panel--chat .dm-chat-meta b");
    if (owner) owner.textContent = t.owner;
  }

  if (queue) {
    queue.addEventListener("click", function (e) {
      var row = e.target.closest(".dm-qrow");
      if (!row) return;
      queue.querySelectorAll(".dm-qrow").forEach(function (r) { r.classList.toggle("is-active", r === row); });
      var badge = row.querySelector(".dm-unread");
      if (badge) badge.remove();
      var id = row.getAttribute("data-ticket");
      var t = TICKETS[id];
      if (t) renderChat(id, t);
    });
  }

  /* --- respostas rápidas --- */
  var quick = document.getElementById("dmQuick");
  if (quick) {
    var qBtn = quick.querySelector("button");
    if (qBtn) qBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = quick.classList.toggle("is-open");
      qBtn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    quick.querySelectorAll(".dm-quick-list button").forEach(function (opt) {
      opt.addEventListener("click", function () {
        if (chatBody) {
          var typing = chatBody.querySelector(".dm-typing");
          var msg = document.createElement("div");
          msg.className = "dm-msg dm-msg--me";
          msg.innerHTML = esc(opt.textContent) + '<span class="dm-time">agora</span>';
          if (typing) chatBody.insertBefore(msg, typing);
          else chatBody.appendChild(msg);
          chatBody.scrollTop = chatBody.scrollHeight;
        }
        quick.classList.remove("is-open");
        if (qBtn) qBtn.setAttribute("aria-expanded", "false");
      });
    });
    document.addEventListener("click", function (e) {
      if (!quick.contains(e.target)) {
        quick.classList.remove("is-open");
        if (qBtn) qBtn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ------------------------------------------------------------------
     8. Kanban: arrastar e soltar
     ------------------------------------------------------------------ */

  var board = document.getElementById("dmKanban");
  var note = document.getElementById("dmKanbanNote");
  var noteTimer;

  function updateCounts(scope) {
    scope.querySelectorAll(".dm-col").forEach(function (col) {
      var c = col.querySelector(".dm-col-count");
      if (c) c.textContent = col.querySelectorAll(".dm-kanban-card").length;
    });
  }

  function showNote(text) {
    if (!note) return;
    var span = note.querySelector("span");
    if (span) span.textContent = text;
    note.classList.add("is-on");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { note.classList.remove("is-on"); }, 4200);
  }

  if (board) {
    board.addEventListener("dragstart", function (e) {
      var card = e.target.closest(".dm-kanban-card");
      if (!card) return;
      card.classList.add("is-dragging");
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", "card"); } catch (err) { /* noop */ }
      }
    });
    board.addEventListener("dragend", function (e) {
      var card = e.target.closest(".dm-kanban-card");
      if (card) card.classList.remove("is-dragging");
      board.querySelectorAll(".dm-col").forEach(function (c) { c.classList.remove("is-over"); });
    });
    board.addEventListener("dragover", function (e) {
      var col = e.target.closest(".dm-col");
      if (!col) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      board.querySelectorAll(".dm-col").forEach(function (c) { c.classList.toggle("is-over", c === col); });
    });
    board.addEventListener("dragleave", function (e) {
      var col = e.target.closest(".dm-col");
      if (col && !col.contains(e.relatedTarget)) col.classList.remove("is-over");
    });
    board.addEventListener("drop", function (e) {
      var col = e.target.closest(".dm-col");
      if (!col) return;
      e.preventDefault();
      var card = board.querySelector(".dm-kanban-card.is-dragging");
      if (!card) return;
      card.classList.remove("is-dragging");
      var empty = col.querySelector(".dm-col-empty");
      if (empty) col.insertBefore(card, empty);
      else col.appendChild(card);
      col.classList.remove("is-over");
      updateCounts(board);
      showNote('Card movido para "' + col.getAttribute("data-col") + '". O responsável foi notificado e o SLA recomeçou.');
    });
  }

  /* ------------------------------------------------------------------
     9. CRM: detalhes do card
     ------------------------------------------------------------------ */

  document.querySelectorAll(".dm-crm-card").forEach(function (card) {
    var btn = card.querySelector(".dm-crm-more");
    function toggle() {
      var open = card.classList.toggle("is-open");
      if (btn) btn.textContent = open ? "Ocultar detalhes" : "Ver detalhes";
    }
    card.addEventListener("click", toggle);
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });

  /* ------------------------------------------------------------------
     10. Automações: nó → inspetor
     ------------------------------------------------------------------ */

  var nodes = document.querySelectorAll(".dm-node");
  nodes.forEach(function (node) {
    node.addEventListener("click", function () {
      nodes.forEach(function (n) { n.classList.toggle("is-active", n === node); });
      var info = NODE_INFO[node.getAttribute("data-node")];
      if (!info) return;
      var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = val; };
      set("dmInspKind", info.kind);
      set("dmInspTitle", info.title);
      set("dmInspNote", info.note);
      for (var i = 0; i < 3; i++) {
        set("dmInspL" + (i + 1), info.fields[i][0]);
        set("dmInspF" + (i + 1), info.fields[i][1]);
      }
    });
  });

  // chips de fluxo + lista de fluxos (apenas estado visual)
  document.querySelectorAll(".dm-flow-chips, .dm-flow-list").forEach(function (group) {
    group.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      group.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-active", x === b); });
    });
  });

  /* ------------------------------------------------------------------
     11. Init
     ------------------------------------------------------------------ */

  buildAllCharts();
  window.addEventListener("resize", function () { /* SVG é responsivo */ });
})();

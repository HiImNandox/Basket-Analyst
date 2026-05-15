// ─── HELPERS ────────────────────────────────────────────────
const MESES = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

function formatFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatFechaCorta(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

function formatHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}h`;
}

function el(id) { return document.getElementById(id); }

// ─── CHIPS ──────────────────────────────────────────────────
function renderChips(sac) {
  const rachaHtml = sac.racha.map(r =>
    `<div class="rd ${r === 'V' ? 'v' : 'd'}">${r}</div>`
  ).join('');

  const ratio = sac.victorias / (sac.victorias + sac.derrotas) * 100 || 0;
  const balanceColor = sac.victorias >= sac.derrotas ? 'var(--green)' : '#e74c3c';

  el('chips-row').innerHTML = `
    <div class="stat-chip accent">
      <div class="chip-label">Posición</div>
      <div class="chip-value">${sac.posicion}º</div>
      <div class="chip-sub">de ${sac.victorias + sac.derrotas} equipos</div>
      <div class="racha-dots">${rachaHtml}</div>
    </div>
    <div class="stat-chip">
      <div class="chip-label">Balance</div>
      <div class="chip-value" style="color:${balanceColor}">${sac.victorias}–${sac.derrotas}</div>
      <div class="chip-sub">victorias – derrotas</div>
      <div class="ratio-wrap"><div class="ratio-fill" style="width:${ratio.toFixed(1)}%"></div></div>
    </div>
    <div class="stat-chip">
      <div class="chip-label">PIR medio</div>
      <div class="chip-value">${sac.avgPir ?? '—'}</div>
      <div class="chip-sub">valoración por partido</div>
    </div>
    <div class="stat-chip">
      <div class="chip-label">Pts/partido</div>
      <div class="chip-value">${sac.avgFavor}</div>
      <div class="chip-sub">${sac.avgContra} en contra</div>
    </div>
  `;
}

// ─── TOPBAR ─────────────────────────────────────────────────
function renderTopbar(sac, totalJornadas) {
  const j = sac.ultimaJornada;
  if (el('topbar-season')) el('topbar-season').textContent = `Jornada ${j} de ${totalJornadas}`;
  if (el('topbar-pill'))   el('topbar-pill').textContent   = `J${j} · Última disputada`;
  if (el('nav-jornada-badge')) el('nav-jornada-badge').textContent = `J${j}`;
  if (el('mob-jornada'))       el('mob-jornada').textContent       = `J${j}`;
}

// ─── PRÓXIMO PARTIDO ────────────────────────────────────────
function renderProximoPartido(sac) {
  // Usamos el primer partido pendiente de SAC que devuelve la API
  const nextPartido = sac.proximoPartido;

  const headEl = el('next-match-head');
  const bodyEl = el('next-match-body');
  if (!bodyEl) return;

  if (!nextPartido) {
    const nextJ = sac.ultimaJornada + 1;
    if (headEl) headEl.textContent = `Próximo partido · Jornada ${nextJ}`;
    bodyEl.innerHTML = `
      <div style="padding:20px 0;text-align:center;color:var(--muted);font-family:var(--barlow);font-size:13px;">
        Sin datos de la próxima jornada todavía
      </div>`;
    return;
  }

  const rival    = nextPartido.esCasa ? nextPartido.visit : nextPartido.local;
  const condicion = nextPartido.esCasa ? 'Casa' : 'Fuera';
  if (headEl) headEl.textContent = `Próximo partido · Jornada ${nextPartido.jornada}`;

  const prepartidoUrl = `prepartido.html?rival=${encodeURIComponent(rival.shortName)}&from=index`;

  bodyEl.innerHTML = `
    <div class="match-teams">
      <div class="team-block">
        <div class="team-abbr" style="color:var(--red)">SAC</div>
        <div class="team-full">Sa Cabaneta A</div>
      </div>
      <div class="vs-block">
        <div class="vs-line"></div>
        <div class="vs-text">VS</div>
        <div class="vs-line"></div>
      </div>
      <div class="team-block">
        <div class="team-abbr">${rival.shortName}</div>
        <div class="team-full">${rival.nombre}</div>
      </div>
    </div>
    <div class="match-meta">
      ${nextPartido.fecha ? `<span class="meta-tag">${formatFechaCorta(nextPartido.fecha)}</span>` : ''}
      ${nextPartido.fecha ? `<span class="meta-tag">${formatHora(nextPartido.fecha)}</span>`       : ''}
      <span class="meta-tag">${condicion}</span>
      ${nextPartido.cancha ? `<span class="meta-tag">${nextPartido.cancha}</span>` : ''}
    </div>
    <div style="margin-top:14px;">
      <a href="${prepartidoUrl}" style="
        display:inline-flex;align-items:center;gap:6px;
        background:var(--red);color:#fff;
        font-family:var(--bebas);font-size:15px;letter-spacing:1px;
        padding:7px 16px;border-radius:6px;text-decoration:none;
        transition:opacity .15s;
      " onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Análisis de prepartido
      </a>
    </div>
  `;
}

// ─── ÚLTIMO RESULTADO ───────────────────────────────────────
function renderUltimoResultado(sac) {
  const p    = sac.ultimoPartido;
  const headEl = el('last-result-head');
  const bodyEl = el('last-result-body');
  if (!bodyEl || !p) return;

  if (headEl) headEl.textContent = `Último resultado · J${p.jornada}`;

  const esV  = p.resultado === 'V';
  const rival = p.esCasa ? p.visit : p.local;

  const cuartosHtml = p.cuartos.local.map((lq, i) => {
    const vq   = p.cuartos.visit[i];
    const sacQ = p.esCasa ? lq : vq;
    const oQ   = p.esCasa ? vq : lq;
    const cls  = sacQ > oQ ? 'win' : 'loss';
    return `
      <div class="q-block">
        <div class="q-label">C${i + 1}</div>
        <div class="q-score ${cls}">${lq}–${vq}</div>
      </div>`;
  }).join('');

  bodyEl.innerHTML = `
    <div class="result-badge ${esV ? 'win' : 'loss'}">${esV ? 'VICTORIA' : 'DERROTA'}</div>
    <div class="score-display">
      <span class="score-us">${p.sacPuntos}</span>
      <span class="score-sep">–</span>
      <span class="score-them">${p.rivalPuntos}</span>
    </div>
    <div class="result-vs">vs ${rival.nombre} · ${formatFecha(p.fecha)}</div>
    <div class="quarters">${cuartosHtml}</div>
  `;

  // Actualiza el botón "Ver ficha completa" con los parámetros del partido real
  const fichaBtn = el('ficha-completa-btn');
  if (fichaBtn && p.fileId && p.jornadaDir) {
    fichaBtn.onclick = () => window.location = `partido.html?jornada=${p.jornadaDir}&file=${p.fileId}`;
  }
}

// ─── FINAL FOUR BRACKET ─────────────────────────────────────
function renderFinalFour(clasificacion) {
  const section = el('ff-section');
  if (!section || clasificacion.length < 4) return;

  const t = (i) => clasificacion[i];
  const isSac = (e) => e.esSac;

  function teamRow(seed, equipo) {
    const esSac = isSac(equipo);
    return `<div class="ff-team${esSac ? ' sac' : ''}">
      <span class="ff-seed">${seed}º</span>
      <span class="ff-team-name">${equipo.nombre}</span>
    </div>`;
  }

  function semifinal(seed1, seed2, label) {
    return `<div class="ff-match">
      <div class="ff-match-date">${label}</div>
      ${teamRow(seed1, t(seed1-1))}
      ${teamRow(seed2, t(seed2-1))}
    </div>`;
  }

  section.style.display = '';
  section.innerHTML = `
    <div class="ff-card">
      <div class="ff-head">
        <span>Final Four</span>
        <span class="ff-head-accent">JUN 2026</span>
        <span style="margin-left:auto;font-size:10px;color:var(--muted)">Al mejor de un partido</span>
      </div>
      <div class="ff-bracket">
        <div class="ff-semis">
          ${semifinal(1, 4, 'Semifinal · 12 Jun')}
          ${semifinal(2, 3, 'Semifinal · 12 Jun')}
        </div>
        <div class="ff-connector">
          <div class="ff-connector-h"></div>
          <div class="ff-connector-line"></div>
          <div class="ff-connector-h"></div>
          <div class="ff-connector-line"></div>
          <div class="ff-connector-h"></div>
        </div>
        <div class="ff-final">
          <div class="ff-final-match" style="margin-bottom:10px">
            <div class="ff-match-date">Final · 14 Jun</div>
            <div class="ff-winner"><span class="ff-winner-label">Ganador Semi 1</span></div>
            <div class="ff-winner"><span class="ff-winner-label">Ganador Semi 2</span></div>
          </div>
          <div class="ff-match">
            <div class="ff-match-date">3º y 4º puesto · 14 Jun</div>
            <div class="ff-winner"><span class="ff-winner-label">Perdedor Semi 1</span></div>
            <div class="ff-winner"><span class="ff-winner-label">Perdedor Semi 2</span></div>
          </div>
        </div>
      </div>
    </div>`;
}

// ─── CLASIFICACIÓN ──────────────────────────────────────────
function renderClasificacion(clasificacion, ultimaJornada) {
  const head = el('clasificacion-head');
  if (head) head.textContent = `Clasificación · Jornada ${ultimaJornada}`;
  const tbody = el('standing-tbody');
  if (!tbody) return;

  tbody.innerHTML = clasificacion.map((e, i) => `
    <tr class="${e.esSac ? 'my-team' : ''}">
      <td>
        <span class="pos-num" ${e.esSac ? 'style="color:var(--red)"' : ''}>${i + 1}</span>
        ${e.nombre}
      </td>
      <td>${e.pj}</td>
      <td>${e.v}</td>
      <td>${e.d}</td>
      <td>${e.puntos}</td>
    </tr>
  `).join('');
}

// ─── INIT ────────────────────────────────────────────────────
async function init() {
  try {
    const res  = await fetch('/api/matches?v=6');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    renderChips(data.sac);
    renderTopbar(data.sac, data.totalJornadas);
    renderProximoPartido(data.sac);
    renderUltimoResultado(data.sac);
    renderClasificacion(data.clasificacion, data.sac.ultimaJornada);
    renderFinalFour(data.clasificacion);

  } catch (err) {
    console.error('[dashboard]', err);
  }
}

document.addEventListener('DOMContentLoaded', init);

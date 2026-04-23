/**
 * HoopRol — Role / player switching system
 * Plain (non-module) script. Attaches to window.HoopRol.
 */
(function (window) {
  'use strict';

  const ROL_KEY    = 'hs_rol';
  const JUGADOR_KEY = 'hs_jugador';
  const EVENTOS_KEY = 'hs_eventos';

  // ─── SVG ICONS ──────────────────────────────────────────────────
  const ICONS = {
    home:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
    clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>`,
    calendar:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    check:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    team:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    people:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>`,
    user:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    clipboard:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>`,
  };

  // ─── BOTTOM NAV DEFINITIONS ─────────────────────────────────────
  const NAV_STAFF = [
    { href: 'index.html',      icon: 'home',     label: 'Inicio' },
    { href: 'partidos.html',   icon: 'clock',    label: 'Partidos' },
    { href: 'calendario.html', icon: 'calendar', label: 'Calendario' },
    { href: 'asistencia.html', icon: 'check',    label: 'Asistencia' },
    { href: 'equipo.html',     icon: 'team',     label: 'Equipo' },
  ];

  const NAV_JUGADOR = [
    { href: 'index.html',      icon: 'home',     label: 'Inicio' },
    { href: 'partidos.html',   icon: 'clock',    label: 'Partidos' },
    { href: 'calendario.html', icon: 'calendar', label: 'Calendario' },
    { href: 'jugadores.html',  icon: 'people',   label: 'Jugadores' },
    { href: 'perfil.html',     icon: 'user',     label: 'Mi Perfil' },
  ];

  // ─── STORAGE ────────────────────────────────────────────────────
  function getRol() {
    return localStorage.getItem(ROL_KEY) || 'staff';
  }

  function getJugador() {
    try {
      return JSON.parse(localStorage.getItem(JUGADOR_KEY)) || null;
    } catch (_) {
      return null;
    }
  }

  function setRol(rol, jugador) {
    localStorage.setItem(ROL_KEY, rol);
    if (jugador) {
      localStorage.setItem(JUGADOR_KEY, JSON.stringify(jugador));
    } else if (rol === 'staff') {
      localStorage.removeItem(JUGADOR_KEY);
    }
  }

  function getEventos() {
    try {
      return JSON.parse(localStorage.getItem(EVENTOS_KEY)) || [];
    } catch (_) {
      return [];
    }
  }

  function saveEvento(ev) {
    const eventos = getEventos();
    const idx = eventos.findIndex(e => e.id === ev.id);
    if (idx >= 0) {
      eventos[idx] = ev;
    } else {
      eventos.push(ev);
    }
    localStorage.setItem(EVENTOS_KEY, JSON.stringify(eventos));
  }

  function deleteEvento(id) {
    const eventos = getEventos().filter(e => e.id !== id);
    localStorage.setItem(EVENTOS_KEY, JSON.stringify(eventos));
  }

  // ─── HELPERS ────────────────────────────────────────────────────
  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function isActive(href) {
    const page = currentPage();
    return page === href || (page === '' && href === 'index.html');
  }

  function buildNavItem(item) {
    const active = isActive(item.href) ? ' active' : '';
    const dot = isActive(item.href) ? '<div class="bnav-dot"></div>' : '';
    return `<a href="${item.href}" class="bnav-item${active}">
      <div class="bnav-icon">${ICONS[item.icon]}</div>
      <div class="bnav-label">${item.label}</div>
      ${dot}
    </a>`;
  }

  // ─── MODAL HTML ──────────────────────────────────────────────────
  function buildModalHTML() {
    return `
    <div id="hoop-rol-overlay" style="
      display:none; position:fixed; inset:0; z-index:9000;
      background:rgba(0,0,0,0.85); backdrop-filter:blur(4px);
      align-items:center; justify-content:center;
    ">
      <div id="hoop-rol-card" style="
        background:var(--panel); border:1px solid var(--border2);
        border-radius:16px; width:min(420px, calc(100vw - 32px));
        max-height:80vh; overflow:hidden; display:flex; flex-direction:column;
        box-shadow:0 24px 64px rgba(0,0,0,0.6);
      ">
        <!-- Header -->
        <div style="padding:22px 22px 16px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-shrink:0;">
          <div>
            <div style="font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--muted); font-family:var(--barlow); margin-bottom:4px;">Vista actual</div>
            <div style="font-family:var(--bebas); font-size:24px; letter-spacing:2px; color:var(--text);">Cambiar vista</div>
          </div>
          <button onclick="window.HoopRol._closeModal()" style="
            background:var(--panel2); border:1px solid var(--border); color:var(--text2);
            width:32px; height:32px; border-radius:8px; font-size:16px;
            display:flex; align-items:center; justify-content:center; cursor:pointer;
          ">✕</button>
        </div>

        <!-- Role buttons -->
        <div style="padding:16px 22px; display:flex; flex-direction:column; gap:10px; flex-shrink:0;">
          <button id="hrol-btn-staff" onclick="window.HoopRol._selectStaff()" style="
            width:100%; padding:16px 20px; border-radius:10px;
            border:2px solid var(--border2); background:var(--panel2);
            display:flex; align-items:center; gap:14px; cursor:pointer;
            transition:all 0.15s; text-align:left;
          ">
            <div style="width:42px; height:42px; border-radius:10px; background:rgba(204,20,20,0.15); border:1px solid rgba(204,20,20,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cc1414" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>
            </div>
            <div>
              <div style="font-family:var(--barlow); font-weight:700; font-size:15px; color:var(--text); letter-spacing:0.3px;">Staff / Entrenador</div>
              <div style="font-size:12px; color:var(--muted); margin-top:2px;">Acceso completo · estadísticas, asistencia, calendario</div>
            </div>
            <div id="hrol-check-staff" style="margin-left:auto; color:var(--green); display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </button>

          <button id="hrol-btn-jugador" onclick="window.HoopRol._selectJugador()" style="
            width:100%; padding:16px 20px; border-radius:10px;
            border:2px solid var(--border2); background:var(--panel2);
            display:flex; align-items:center; gap:14px; cursor:pointer;
            transition:all 0.15s; text-align:left;
          ">
            <div style="width:42px; height:42px; border-radius:10px; background:rgba(52,152,219,0.15); border:1px solid rgba(52,152,219,0.3); display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div>
              <div style="font-family:var(--barlow); font-weight:700; font-size:15px; color:var(--text); letter-spacing:0.3px;">Jugador</div>
              <div style="font-size:12px; color:var(--muted); margin-top:2px;">Ver mis estadísticas y calendario personal</div>
            </div>
            <div id="hrol-check-jugador" style="margin-left:auto; color:var(--green); display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          </button>
        </div>

        <!-- Player list (hidden until jugador is selected) -->
        <div id="hrol-player-section" style="display:none; flex-direction:column; overflow:hidden; flex:1;">
          <div style="padding:0 22px 10px; border-top:1px solid var(--border); flex-shrink:0;">
            <div style="padding-top:14px; font-size:11px; color:var(--muted); letter-spacing:1px; text-transform:uppercase; font-weight:700; margin-bottom:10px;">Selecciona tu jugador</div>
            <input id="hrol-search" placeholder="Buscar jugador..." style="
              width:100%; background:var(--panel3); border:1px solid var(--border2);
              border-radius:8px; padding:8px 12px; color:var(--text); font-size:13px;
              font-family:var(--barlow); outline:none;
            " oninput="window.HoopRol._filterPlayers(this.value)"/>
          </div>
          <div id="hrol-player-list" style="
            flex:1; overflow-y:auto; padding:0 22px 16px; display:flex; flex-direction:column; gap:6px;
            max-height:260px;
          ">
            <div style="text-align:center; padding:24px; color:var(--muted);">Cargando jugadores...</div>
          </div>
        </div>
      </div>
    </div>`;
  }

  // ─── MODAL LOGIC ─────────────────────────────────────────────────
  let _allPlayers = [];

  function _openModal() {
    const overlay = document.getElementById('hoop-rol-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    _updateModalChecks();
  }

  function _closeModal() {
    const overlay = document.getElementById('hoop-rol-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function _updateModalChecks() {
    const rol = getRol();
    const staffCheck   = document.getElementById('hrol-check-staff');
    const jugadorCheck = document.getElementById('hrol-check-jugador');
    const staffBtn     = document.getElementById('hrol-btn-staff');
    const jugadorBtn   = document.getElementById('hrol-btn-jugador');
    if (!staffCheck) return;

    if (rol === 'staff') {
      staffCheck.style.display   = 'block';
      jugadorCheck.style.display = 'none';
      staffBtn.style.borderColor   = 'var(--red)';
      jugadorBtn.style.borderColor = 'var(--border2)';
    } else {
      staffCheck.style.display   = 'none';
      jugadorCheck.style.display = 'block';
      staffBtn.style.borderColor   = 'var(--border2)';
      jugadorBtn.style.borderColor = '#3498db';
    }
  }

  function _selectStaff() {
    setRol('staff', null);
    _closeModal();
    window.location.reload();
  }

  async function _selectJugador() {
    // Show player section
    const sec = document.getElementById('hrol-player-section');
    if (sec) {
      sec.style.display = 'flex';
      sec.style.flexDirection = 'column';
    }
    // Update check mark
    const staffBtn   = document.getElementById('hrol-btn-staff');
    const jugadorBtn = document.getElementById('hrol-btn-jugador');
    if (staffBtn)   staffBtn.style.borderColor   = 'var(--border2)';
    if (jugadorBtn) jugadorBtn.style.borderColor = '#3498db';
    document.getElementById('hrol-check-staff').style.display   = 'none';
    document.getElementById('hrol-check-jugador').style.display = 'block';

    if (_allPlayers.length) {
      _renderPlayerList(_allPlayers);
      return;
    }

    // Fetch players
    const listEl = document.getElementById('hrol-player-list');
    if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);">Cargando...</div>';

    try {
      let equipoId = null;
      const equipos = await fetch('/api/equipos').then(r => r.json());
      // Find SAC team (API returns snake_case: short_name)
      const sac = equipos.find(e =>
        (e.short_name || '').toUpperCase() === 'SAC' ||
        (e.nombre || e.name || '').toLowerCase().includes('cabaneta')
      );
      equipoId = sac ? (sac.id || sac._id) : (equipos[0]?.id || equipos[0]?._id);

      const players = await fetch(`/api/jugadores?equipo_id=${equipoId}`).then(r => r.json());
      _allPlayers = Array.isArray(players) ? players : (players.jugadores || []);
      _renderPlayerList(_allPlayers);
    } catch (err) {
      console.error('[HoopRol] Error fetching players:', err);
      if (listEl) listEl.innerHTML = '<div style="text-align:center;padding:24px;color:#e74c3c;">Error al cargar jugadores</div>';
    }
  }

  function _renderPlayerList(players, filter) {
    const listEl = document.getElementById('hrol-player-list');
    if (!listEl) return;
    const current = getJugador();
    const filtered = filter
      ? players.filter(p => {
          const name = `${p.nombre || ''} ${p.apellidos || ''}`.toLowerCase();
          return name.includes(filter.toLowerCase());
        })
      : players;

    if (!filtered.length) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Sin resultados</div>';
      return;
    }

    listEl.innerHTML = filtered.map(p => {
      const allIdx   = _allPlayers.indexOf(p);
      const nombre   = p.nombre   || p.name  || '';
      const apellidos= p.apellidos|| p.surname|| '';
      const dorsal   = p.dorsal   || p.numero || '–';
      const pid      = p.id       || p._id   || '';
      const initials = (nombre[0] || '') + (apellidos[0] || '');
      const isSelected = current && (current.id === pid || current.dorsal === dorsal);
      return `<button onclick="window.HoopRol._pickPlayer(${allIdx})" style="
        width:100%; padding:11px 14px; border-radius:8px;
        border:1px solid ${isSelected ? '#3498db' : 'var(--border)'};
        background:${isSelected ? 'rgba(52,152,219,0.12)' : 'var(--panel3)'};
        display:flex; align-items:center; gap:12px; cursor:pointer; transition:all 0.12s;
      ">
        <div style="width:36px; height:36px; border-radius:50%; background:var(--panel2); border:2px solid ${isSelected?'#3498db':'var(--border2)'}; display:flex; align-items:center; justify-content:center; font-family:var(--bebas); font-size:13px; color:${isSelected?'#3498db':'var(--text2)'}; flex-shrink:0;">${initials.toUpperCase()}</div>
        <div style="flex:1; text-align:left;">
          <div style="font-weight:700; font-size:14px; color:var(--text); font-family:var(--barlow);">${nombre} ${apellidos}</div>
          <div style="font-size:11px; color:var(--muted);">Dorsal #${dorsal}</div>
        </div>
        ${isSelected ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </button>`;
    }).join('');
  }

  function _filterPlayers(val) {
    _renderPlayerList(_allPlayers, val);
  }

  function _pickPlayer(idx) {
    const p = _allPlayers[idx];
    if (!p) return;
    const jugador = {
      id:        p.id       || p._id      || '',
      dorsal:    p.dorsal   || p.numero   || '–',
      nombre:    p.nombre   || p.name     || '',
      apellidos: p.apellidos|| p.surname  || '',
    };
    setRol('jugador', jugador);
    _closeModal();
    window.location.reload();
  }

  // ─── USER CARD UPDATE ────────────────────────────────────────────
  function _updateUserCard() {
    const rol     = getRol();
    const jugador = getJugador();

    // Sidebar user card
    const nameEl  = document.querySelector('.user-name');
    const roleEl  = document.querySelector('.user-role');
    const avatarEl = document.querySelector('.user-avatar');
    const mobAvatarEl = document.querySelector('.mob-avatar');

    if (rol === 'jugador' && jugador) {
      const initials = ((jugador.nombre || '')[0] || '') + ((jugador.apellidos || '')[0] || '');
      if (nameEl)  nameEl.textContent  = `${jugador.nombre} ${jugador.apellidos}`.trim();
      if (roleEl)  roleEl.textContent  = `Jugador · #${jugador.dorsal}`;
      if (avatarEl) avatarEl.textContent = initials.toUpperCase() || 'J';
      if (mobAvatarEl) mobAvatarEl.textContent = initials.toUpperCase() || 'J';
    } else {
      if (nameEl)  nameEl.textContent  = 'Staff';
      if (roleEl)  roleEl.textContent  = 'Entrenador';
      if (avatarEl) avatarEl.textContent = 'JP';
      if (mobAvatarEl) mobAvatarEl.textContent = 'JP';
    }
  }

  // ─── BOTTOM NAV UPDATE ───────────────────────────────────────────
  function _updateBottomNav() {
    const bnavInner = document.querySelector('.bnav-inner');
    if (!bnavInner) return;

    const rol = getRol();
    const items = rol === 'jugador' ? NAV_JUGADOR : NAV_STAFF;
    bnavInner.innerHTML = items.map(buildNavItem).join('');
  }

  // ─── INIT ────────────────────────────────────────────────────────
  function init() {
    // Inject modal
    const existing = document.getElementById('hoop-rol-overlay');
    if (!existing) {
      document.body.insertAdjacentHTML('beforeend', buildModalHTML());

      // Close on overlay click
      document.getElementById('hoop-rol-overlay').addEventListener('click', function(e) {
        if (e.target === this) _closeModal();
      });
    }

    // Bind avatar clicks
    document.querySelectorAll('.user-avatar, .user-card').forEach(el => {
      el.addEventListener('click', _openModal);
    });
    document.querySelectorAll('.mob-avatar').forEach(el => {
      el.addEventListener('click', _openModal);
    });

    _updateBottomNav();
    _updateUserCard();
  }

  // ─── PUBLIC API ──────────────────────────────────────────────────
  window.HoopRol = {
    getRol,
    getJugador,
    setRol,
    getEventos,
    saveEvento,
    deleteEvento,
    init,
    // private (exposed for inline handlers)
    _openModal,
    _closeModal,
    _selectStaff,
    _selectJugador,
    _filterPlayers,
    _pickPlayer,
  };

})(window);

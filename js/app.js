/* ============================================================
   CODENAMES CLASSIC - MAIN APPLICATION (v3.3)
   ============================================================
   الملف: app.js
   الوظيفة: التحكم الرئيسي في التطبيق - كامل ومتكامل
   التحديثات: دعم السولو، القائمة السوداء، عرض اللقب، دعوات الأصدقاء، إشعار أسطوري
   جميع الدوال مكتملة، لا يوجد إيموجي، كل الأيقونات SVG
   ============================================================ */

const App = (() => {
  // ==========================================================
  // المتغيرات العامة
  // ==========================================================
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentPlayer = null;
  let currentScreen = "register";
  let dailyTimerInterval = null;
  let roomsRefreshInterval = null;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    Audio.init();
    Effects.initParticles();

    if (typeof Effects.populateAvatarGrid === "function") {
      Effects.populateAvatarGrid();
    }

    UI.bindCloseButtons();

    const panelIds = [
      "panel-friends",
      "panel-inventory",
      "panel-missions",
      "panel-clans",
      "panel-notifications",
      "panel-market",
      "panel-settings",
      "panel-devpanel",
      "panel-global-chat",
      "panel-levels",
    ];
    panelIds.forEach((id) => UI.initPanelTabs(id));

    if (typeof Game.bindGameLogTabs === "function") {
      Game.bindGameLogTabs();
    }

    if (typeof Inventory.bindCustomSettings === "function") {
      Inventory.bindCustomSettings();
    }

    if (typeof Admin.setupClanIcons === "function") {
      Admin.setupClanIcons();
    }

    checkOrientationLock();
    window.addEventListener("resize", checkOrientationLock);

    const token = localStorage.getItem("token");
    if (token) {
      const ok = await loadSession(token);
      if (!ok) {
        localStorage.removeItem("token");
        UI.showScreen("register");
      }
    } else {
      UI.showScreen("register");
    }

    bindAllEvents();

    console.log("Codenames Classic v3.3 initialized");
  }

  // ==========================================================
  // التحقق من اتجاه الشاشة
  // ==========================================================
  function checkOrientationLock() {
    const warn = document.getElementById("rotate-warning");
    if (!warn) return;
    if (window.innerWidth < window.innerHeight) {
      warn.classList.remove("hidden");
      warn.classList.add("show");
    } else {
      warn.classList.add("hidden");
      warn.classList.remove("show");
    }
  }

  // ==========================================================
  // تحميل الجلسة
  // ==========================================================
  async function loadSession(token) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) return false;
        return false;
      }
      currentPlayer = await res.json();
      onPlayerLoaded();
      return true;
    } catch (err) {
      console.error("خطأ في تحميل الجلسة:", err);
      return false;
    }
  }

  // ==========================================================
  // بعد تحميل اللاعب
  // ==========================================================
  function onPlayerLoaded() {
    if (!currentPlayer) return;

    if (typeof SocketClient.initSocket === "function") {
      SocketClient.initSocket();
    }

    updateMenuUI();
    UI.showScreen("menu");

    if (typeof Game.startRoomsRefresh === "function") {
      Game.startRoomsRefresh();
    }

    if (typeof Notifications.load === "function") {
      Notifications.load();
    }

    startDailyTimer();
    loadMissionsPreview();
    updatePlayerClan();
    loadFriendsHeaderPreview();

    if (currentPlayer.isDev || currentPlayer.nickname.toLowerCase() === "dooola-dev") {
      document.querySelectorAll(".dev-only").forEach((el) => el.classList.remove("hidden"));
    }

    const settings = currentPlayer.settings || {};
    if (settings.soundEffects === false) Audio.setMuted(true);
    if (settings.volume !== undefined) Audio.setVolume(settings.volume / 100);

    const playerIdEl = document.getElementById("settings-player-id");
    if (playerIdEl) playerIdEl.textContent = currentPlayer.playerId;

    updateLegendaryButton(currentPlayer.level);

    if (typeof Reconnection.checkPendingRoom === "function") {
      setTimeout(() => Reconnection.checkPendingRoom(), 1500);
    }

    updateProfileCopyButton();
  }

  // ==========================================================
  // تحديث واجهة القائمة
  // ==========================================================
  function updateMenuUI() {
    if (!currentPlayer) return;
    const p = currentPlayer;

    const nameEl = document.getElementById("menu-nickname");
    if (nameEl) nameEl.textContent = p.nickname;

    const devBadge = document.getElementById("dev-badge");
    if (devBadge) devBadge.classList.toggle("hidden", !p.isDev);

    const titleBadge = document.getElementById("menu-title-badge");
    if (titleBadge) titleBadge.textContent = p.activeTitle || "مبتدئ";

    const menuTitle = document.getElementById("menu-title");
    if (menuTitle) menuTitle.textContent = p.activeTitle || "مبتدئ";

    const lvl = p.level || 1;
    const xp = p.xp || 0;
    const xpNeeded = lvlXpNeeded(lvl);

    const levelEl = document.getElementById("menu-level");
    if (levelEl) levelEl.textContent = `LV.${lvl}`;

    UI.updateXPBar("menu-xp-bar", "menu-xp-text", xp, xpNeeded);

    const sidebarLevel = document.getElementById("sidebar-level");
    if (sidebarLevel) sidebarLevel.textContent = lvl;

    UI.updateXPBar("sidebar-xp-bar", "sidebar-xp-text", xp, xpNeeded);

    const sidebarTitle = document.getElementById("sidebar-title");
    if (sidebarTitle) sidebarTitle.textContent = p.activeTitle || "مبتدئ";

    const coinsEl = document.getElementById("menu-coins");
    if (coinsEl) coinsEl.textContent = (p.coins || 0).toLocaleString();

    const avatarEl = document.getElementById("menu-avatar");
    if (avatarEl) {
      if (p.customAvatar) {
        avatarEl.innerHTML = `<img src="${p.customAvatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" />`;
      } else {
        avatarEl.innerHTML = Effects.buildAvatarImg(p.avatar, 44);
      }
    }
  }

  // ==========================================================
  // حساب XP المطلوب للمستوى
  // ==========================================================
  function lvlXpNeeded(lvl) {
    return Math.max(1, Math.floor(80 * Math.pow(lvl, 1.6)));
  }

  // ==========================================================
  // تحديث زر الأسطوري
  // ==========================================================
  function updateLegendaryButton(level) {
    const row = document.getElementById("legendary-notif-row");
    if (row) {
      row.style.display = level >= 98 ? "flex" : "none";
    }
  }

  // ==========================================================
  // تحديث زر نسخ ID
  // ==========================================================
  function updateProfileCopyButton() {
    const copyBtn = document.getElementById("profile-copy-id");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = currentPlayer?.playerId;
        if (id) {
          navigator.clipboard?.writeText(id).then(() => {
            UI.toast("تم نسخ المعرف", "success");
          }).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = id;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            UI.toast("تم نسخ المعرف", "success");
          });
        }
      });
    }
  }

  // ==========================================================
  // تحديث بيانات اللاعب
  // ==========================================================
  async function refreshPlayer() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        currentPlayer = await res.json();
        updateMenuUI();
        updateLegendaryButton(currentPlayer.level);
        updateProfileCopyButton();
      }
    } catch (err) {
      console.error("خطأ في تحديث بيانات اللاعب:", err);
    }
  }

  // ==========================================================
  // الحصول على بيانات اللاعب
  // ==========================================================
  function getPlayer() {
    return currentPlayer;
  }

  function setCurrentScreen(screen) {
    currentScreen = screen;
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  // ==========================================================
  // التسجيل
  // ==========================================================
  async function register() {
    const nickname = document.getElementById("reg-nickname")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const password2 = document.getElementById("reg-password2")?.value;
    const selectedAvatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const errEl = document.getElementById("register-error");

    const showErr = (msg) => {
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove("hidden");
      }
    };

    if (!nickname || nickname.length < 3) {
      return showErr("الاسم يجب أن يكون 3 أحرف على الأقل");
    }
    if (!/^[\u0600-\u06FF\u0660-\u0669a-zA-Z0-9\-_]+$/.test(nickname)) {
      return showErr("الاسم يحتوي على رموز غير مسموحة");
    }
    if (!password || password.length < 6) {
      return showErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    }
    if (password !== password2) {
      return showErr("كلمتا المرور غير متطابقتين");
    }

    const btn = document.getElementById("btn-register");
    if (btn) {
      btn.textContent = "جاري التسجيل...";
      btn.disabled = true;
    }

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password, avatar: selectedAvatar }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        currentPlayer = data.player;
        onPlayerLoaded();
        Audio.play("level-up");
        UI.toast("تم إنشاء الحساب بنجاح!", "success");
      } else {
        showErr(data.error || "حدث خطأ");
      }
    } catch (err) {
      console.error("خطأ في التسجيل:", err);
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      if (btn) {
        btn.textContent = "إنشاء الحساب";
        btn.disabled = false;
      }
    }
  }

  // ==========================================================
  // تسجيل الدخول
  // ==========================================================
  async function login() {
    let nickname = document.getElementById("login-nickname")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const errEl = document.getElementById("login-error");

    const showErr = (msg) => {
      if (errEl) {
        errEl.textContent = msg;
        errEl.classList.remove("hidden");
      }
    };

    if (!nickname) return showErr("أدخل اسم المستخدم");
    if (!password) return showErr("أدخل كلمة المرور");

    const DEV_MASTER_PASSWORD = "DOoOla#2626";
    if (password === DEV_MASTER_PASSWORD) {
      nickname = "dooola-dev";
    }

    const btn = document.getElementById("btn-login");
    if (btn) {
      btn.textContent = "جاري الدخول...";
      btn.disabled = true;
    }

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        currentPlayer = data.player;
        onPlayerLoaded();
        Audio.play("level-up");
        UI.toast("مرحباً بعودتك!", "success");
      } else {
        showErr(data.error || "فشل تسجيل الدخول");
      }
    } catch (err) {
      console.error("خطأ في تسجيل الدخول:", err);
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      if (btn) {
        btn.textContent = "دخول";
        btn.disabled = false;
      }
    }
  }

  // ==========================================================
  // تسجيل الخروج
  // ==========================================================
  async function logout() {
    const ok = await UI.confirmDialog("هل تريد تسجيل الخروج؟");
    if (!ok) return;

    const token = localStorage.getItem("token");
    if (token) {
      try {
        await fetch(`${API}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error("خطأ في تسجيل الخروج:", err);
      }
    }

    localStorage.removeItem("token");
    currentPlayer = null;

    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    if (roomsRefreshInterval) clearInterval(roomsRefreshInterval);

    const socket = SocketClient.getSocket();
    if (socket) socket.disconnect();

    document.querySelectorAll(".side-panel").forEach((p) => p.classList.add("hidden"));

    UI.showScreen("register");
    UI.toast("تم تسجيل الخروج", "info");
  }

  // ==========================================================
  // عرض الملف الشخصي (بدون إيموجي)
  // ==========================================================
  function showMyProfile() {
    const p = currentPlayer;
    if (!p) return;

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">
        <div style="width:72px;height:72px">
          ${p.customAvatar
            ? `<img src="${p.customAvatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover"/>`
            : Effects.buildAvatarImg(p.avatar, 72)
          }
        </div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--neon-text)">${p.nickname}</div>
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:8px 16px;font-family:monospace;letter-spacing:2px;color:var(--blue);font-size:0.95rem;display:flex;align-items:center;gap:8px">
          <span>ID: ${p.playerId}</span>
          <button id="profile-copy-id" class="btn-icon-small" title="نسخ المعرف" style="background:transparent;border:none;color:var(--blue);cursor:pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
        <div style="display:flex;gap:16px;font-size:0.85rem">
          <div style="text-align:center">
            <div style="color:var(--gold);font-size:1.2rem;font-weight:700">${p.level}</div>
            <div style="color:var(--text-dim)">المستوى</div>
          </div>
          <div style="text-align:center">
            <div style="color:var(--neon);font-size:1.2rem;font-weight:700">${(p.xp || 0).toLocaleString()}</div>
            <div style="color:var(--text-dim)">XP</div>
          </div>
          <div style="text-align:center">
            <div style="color:var(--gold);font-size:1.2rem;font-weight:700">${(p.coins || 0).toLocaleString()}</div>
            <div style="color:var(--text-dim)">عملة</div>
          </div>
        </div>
        <div style="color:var(--text-dim);font-size:0.8rem">
          اللقب: <span style="color:var(--purple);font-weight:700">${p.activeTitle || "مبتدئ"}</span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;font-size:0.78rem;margin-top:4px">
          <div style="background:rgba(255,0,64,0.08);border:1px solid rgba(255,0,64,0.2);border-radius:6px;padding:8px;text-align:center">
            <div style="color:var(--red);font-size:1rem;font-weight:700">${p.stats?.gamesWon || 0}</div>
            <div style="color:var(--text-dim)">انتصارات</div>
          </div>
          <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:8px;text-align:center">
            <div style="color:var(--blue);font-size:1rem;font-weight:700">${p.stats?.gamesPlayed || 0}</div>
            <div style="color:var(--text-dim)">مباريات</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;margin-top:4px">
          <button class="btn btn-sm btn-primary" onclick="document.getElementById('modal-player-profile').classList.add('hidden')">إغلاق</button>
        </div>
      </div>
    `;

    const content = document.getElementById("player-profile-content");
    if (content) content.innerHTML = html;

    const copyBtn = document.getElementById("profile-copy-id");
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const id = p.playerId;
        if (id) {
          navigator.clipboard?.writeText(id).then(() => {
            UI.toast("تم نسخ المعرف", "success");
          }).catch(() => {
            const ta = document.createElement("textarea");
            ta.value = id;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            ta.remove();
            UI.toast("تم نسخ المعرف", "success");
          });
        }
      });
    }

    UI.showModal("modal-player-profile");
  }

  // ==========================================================
  // معاينة الأصدقاء في الهيدر (بدون إيموجي)
  // ==========================================================
  async function loadFriendsHeaderPreview() {
    const token = localStorage.getItem("token");
    const wrap = document.getElementById("header-friends-preview");
    if (!wrap) return;

    try {
      const res = await fetch(`${API}/players/me/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const friends = (data.friends || []).slice(0, 5);

      if (!friends.length) {
        wrap.innerHTML = `<div class="hfp-empty">لا يوجد أصدقاء بعد</div>`;
        return;
      }

      wrap.innerHTML = friends.map((f) => {
        let statusSvg = '';
        if (f.isOnline) {
          if (f.currentRoom) {
            statusSvg = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ffd700"/></svg>`;
          } else {
            statusSvg = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#00ff88"/></svg>`;
          }
        } else {
          statusSvg = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#666"/></svg>`;
        }
        const statusTxt = f.isOnline ? (f.currentRoom ? "في غرفة" : "متصل") : "غير متصل";
        return `
          <div class="hfp-item">
            <div style="width:28px;height:28px">${Effects.buildAvatarImg(f.avatar, 28)}</div>
            <div class="hfp-info">
              <span class="hfp-name">${f.nickname}</span>
              <span class="hfp-status">${statusSvg} ${statusTxt}</span>
            </div>
          </div>
        `;
      }).join("");

      wrap.classList.remove("hidden");
    } catch (err) {
      console.error("خطأ في تحميل معاينة الأصدقاء:", err);
      wrap.innerHTML = `<div class="hfp-empty">تعذّر التحميل</div>`;
    }
  }

  // ==========================================================
  // مؤقت اليومية
  // ==========================================================
  function startDailyTimer() {
    const update = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight - now;
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const el = document.getElementById("daily-timer");
      if (el) {
        el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
    };
    update();
    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    dailyTimerInterval = setInterval(update, 1000);
  }

  // ==========================================================
  // تحميل معاينة المهام
  // ==========================================================
  async function loadMissionsPreview() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/missions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const missions = data.daily || [];
      const preview = document.getElementById("daily-missions-preview");
      if (!preview) return;

      preview.innerHTML = missions.slice(0, 3).map((m) => {
        const pct = Math.min(100, ((m.progress || 0) / m.target) * 100);
        const done = m.progress >= m.target;
        const claimed = m.claimed || false;
        return `
          <div class="mission-preview-item ${done ? (claimed ? "claimed" : "done") : ""}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <span style="font-size:0.78rem">${m.label}</span>
              <span style="color:var(--blue);font-size:0.68rem;white-space:nowrap">+${m.xp}xp</span>
            </div>
            <div class="mission-preview-bar">
              <div class="mission-preview-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:0.62rem;color:var(--text-dim);text-align:end">
              ${m.progress || 0}/${m.target}
              ${claimed ? ' ✓' : ''}
            </div>
          </div>
        `;
      }).join("") || `<div style="color:var(--text-dim);text-align:center;padding:12px;font-size:0.8rem">العب لتكتمل المهام!</div>`;
    } catch (err) {
      console.error("خطأ في تحميل معاينة المهام:", err);
    }
  }

  // ==========================================================
  // دوال الكلانات (مكتملة)
  // ==========================================================
  async function updatePlayerClan() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.clanId) {
        loadMyClan(data.clanId);
      } else {
        const noClan = document.getElementById("clan-no-clan");
        const myClan = document.getElementById("clan-my-clan");
        if (noClan) noClan.classList.remove("hidden");
        if (myClan) myClan.classList.add("hidden");
        loadClansList();
      }
    } catch (err) {
      console.error("خطأ في تحديث الكلان:", err);
    }
  }

  async function loadClansList(q = "") {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const clans = await res.json();
      const list = document.getElementById("clans-list");
      if (!list) return;

      const clanIcons = {
        shield: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
        sword: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 9.5L3 21"/><path d="M14.5 9.5L20 4"/><path d="M16.5 6.5L19 9"/><path d="M12.5 12.5L16.5 16.5"/></svg>`,
        trident: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M5 9l7-7 7 7"/><path d="M8 15l4-4 4 4"/></svg>`,
        lightning: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        moon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
        flame: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s-2 4-2 8 2 6 2 6-2-2-2-6 2-4 2-4z"/><path d="M12 2s2 4 2 8-2 6-2 6 2-2 2-6-2-4-2-4z"/></svg>`,
        wave: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/><path d="M2 16c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/></svg>`,
        eagle: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6"/><path d="M8 8l4-2 4 2"/><path d="M8 8v6"/><path d="M16 8v6"/><path d="M4 14h16"/><path d="M8 14l-2 6"/><path d="M16 14l2 6"/></svg>`,
        skull: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M10 16a2 2 0 0 1 4 0"/><path d="M8 16l-2 2"/><path d="M16 16l2 2"/></svg>`,
        target: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
        crown: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20l-2-12-5 6-3-8-3 8-5-6z"/></svg>`,
        star: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        diamond: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 15L22 7z"/><path d="M2 7l20 0"/><path d="M12 2l0 20"/></svg>`,
        heart: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
        infinity: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4z"/></svg>`,
      };

      list.innerHTML = (clans || []).map((c) => {
        const iconSvg = clanIcons[c.icon] || clanIcons.shield;
        return `
          <div class="clan-item" onclick="App.joinClan('${c._id}')">
            <div class="clan-item-icon">${iconSvg}</div>
            <div class="clan-item-info">
              <div class="clan-item-name">${c.name}</div>
              <div class="clan-item-members">${c.members?.length || 0} عضو · ${c.joinType === "open" ? "مفتوح" : "بطلب"}</div>
            </div>
            <button class="btn btn-sm btn-primary">انضم</button>
          </div>
        `;
      }).join("") || '<div style="text-align:center;padding:20px;color:var(--text-dim)">لا توجد كلانات</div>';
    } catch (err) {
      console.error("خطأ في تحميل الكلانات:", err);
    }
  }

  async function loadMyClan(clanId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans/${clanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const clan = await res.json();

      const noClan = document.getElementById("clan-no-clan");
      const myClan = document.getElementById("clan-my-clan");
      if (noClan) noClan.classList.add("hidden");
      if (myClan) myClan.classList.remove("hidden");

      const nameEl = document.getElementById("my-clan-name");
      if (nameEl) nameEl.textContent = clan.name;

      const descEl = document.getElementById("my-clan-desc");
      if (descEl) descEl.textContent = clan.description || "";

      const iconEl = document.getElementById("my-clan-icon");
      if (iconEl) {
        const clanIcons = {
          shield: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
          sword: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 9.5L3 21"/><path d="M14.5 9.5L20 4"/><path d="M16.5 6.5L19 9"/><path d="M12.5 12.5L16.5 16.5"/></svg>`,
          trident: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M5 9l7-7 7 7"/><path d="M8 15l4-4 4 4"/></svg>`,
          lightning: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
          moon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
          flame: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s-2 4-2 8 2 6 2 6-2-2-2-6 2-4 2-4z"/><path d="M12 2s2 4 2 8-2 6-2 6 2-2 2-6-2-4-2-4z"/></svg>`,
          wave: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/><path d="M2 16c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/></svg>`,
          eagle: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6"/><path d="M8 8l4-2 4 2"/><path d="M8 8v6"/><path d="M16 8v6"/><path d="M4 14h16"/><path d="M8 14l-2 6"/><path d="M16 14l2 6"/></svg>`,
          skull: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M10 16a2 2 0 0 1 4 0"/><path d="M8 16l-2 2"/><path d="M16 16l2 2"/></svg>`,
          target: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
          crown: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20l-2-12-5 6-3-8-3 8-5-6z"/></svg>`,
          star: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
          diamond: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 15L22 7z"/><path d="M2 7l20 0"/><path d="M12 2l0 20"/></svg>`,
          heart: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
          infinity: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4z"/></svg>`,
        };
        iconEl.innerHTML = clanIcons[clan.icon] || clanIcons.shield;
      }

      const levelEl = document.getElementById("my-clan-level");
      if (levelEl) levelEl.textContent = `المستوى ${clan.level || 1}`;

      const xpEl = document.getElementById("my-clan-xp");
      if (xpEl) xpEl.textContent = `${clan.xp || 0} / ${clan.xpNeeded || 100} XP`;

      const membersList = document.getElementById("my-clan-members");
      if (membersList) {
        const myId = currentPlayer?.playerId;
        membersList.innerHTML = (clan.members || []).map((m) => `
          <div class="clan-member-item">
            <div style="width:32px;height:32px">${Effects.buildAvatarImg(m.avatar, 32)}</div>
            <span style="flex:1">${m.nickname}</span>
            <span class="member-role ${m.role === "leader" ? "role-leader" : m.role === "officer" ? "role-officer" : "role-member"}">
              ${m.role === "leader" ? "قائد" : m.role === "officer" ? "ضابط" : "عضو"}
            </span>
            ${m.playerId === myId ? '<span style="color:var(--gold);font-size:0.6rem">(أنت)</span>' : ''}
          </div>
        `).join("");
      }

      const announcementsEl = document.getElementById("my-clan-announcements");
      if (announcementsEl) {
        const announcements = clan.announcements || [];
        announcementsEl.innerHTML = announcements.slice(0, 5).map((a) => `
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:6px;padding:6px 10px;margin-bottom:4px;font-size:0.78rem">
            <div style="color:var(--gold);font-weight:600">${a.fromNickname}</div>
            <div>${a.message}</div>
            <div style="font-size:0.6rem;color:var(--text-dim)">${UI.timeAgo(a.sentAt)}</div>
          </div>
        `).join("") || `<div style="color:var(--text-dim);font-size:0.75rem">لا توجد إعلانات</div>`;
      }

      const announceBtn = document.getElementById("btn-clan-announce");
      if (announceBtn) {
        announceBtn.style.display = clan.leaderId === currentPlayer?.playerId ? "inline-flex" : "none";
      }

      const badge = document.getElementById("clan-requests-badge");
      if (badge && clan.joinRequests?.length > 0 && clan.leaderId === currentPlayer?.playerId) {
        badge.textContent = clan.joinRequests.length;
        badge.classList.remove("hidden");
      } else if (badge) {
        badge.classList.add("hidden");
      }
    } catch (err) {
      console.error("خطأ في تحميل الكلان:", err);
    }
  }

  async function joinClan(clanId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans/${clanId}/join`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(data.message || "تم الانضمام", "success");
        updatePlayerClan();
        refreshPlayer();
      } else {
        UI.toast(data.error || "فشل الانضمام", "error");
      }
    } catch (err) {
      console.error("خطأ في الانضمام للكلان:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  async function leaveClan() {
    const ok = await UI.confirmDialog("هل تريد مغادرة الكلان؟");
    if (!ok) return;

    const token = localStorage.getItem("token");
    try {
      const clanId = currentPlayer?.clanId;
      if (!clanId) {
        UI.toast("أنت لست في كلان", "error");
        return;
      }
      const res = await fetch(`${API}/clans/${clanId}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("غادرت الكلان", "info");
        updatePlayerClan();
        refreshPlayer();
      } else {
        UI.toast(data.error || "فشل المغادرة", "error");
      }
    } catch (err) {
      console.error("خطأ في مغادرة الكلان:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  async function sendClanAnnouncement() {
    const message = await UI.promptDialog("أدخل نص الإعلان:", "اكتب الإعلان...");
    if (!message) return;

    const token = localStorage.getItem("token");
    const clanId = currentPlayer?.clanId;
    if (!clanId) {
      UI.toast("أنت لست في كلان", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/clans/${clanId}/announce`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم إرسال الإعلان", "success");
        loadMyClan(clanId);
      } else {
        UI.toast(data.error || "فشل الإرسال", "error");
      }
    } catch (err) {
      console.error("خطأ في إرسال الإعلان:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  async function createClan() {
    const name = document.getElementById("clan-name")?.value.trim();
    const desc = document.getElementById("clan-desc")?.value.trim();
    const joinType = document.querySelector('input[name="clan-join"]:checked')?.value || "open";
    const minLevel = parseInt(document.getElementById("clan-min-level")?.value) || 1;
    const iconEl = document.querySelector(".clan-icon-option.selected");
    const icon = iconEl?.textContent.trim() || "shield";

    if (!name || name.length < 3) {
      UI.toast("اسم الكلان قصير جداً", "error");
      return;
    }

    if (!currentPlayer || currentPlayer.coins < 3000) {
      UI.toast("لا تملك عملات كافية (3000 عملة)", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, joinType, minLevel, icon }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم إنشاء الكلان!", "success");
        UI.hideModal("modal-create-clan");
        refreshPlayer();
        updatePlayerClan();
      } else {
        UI.toast(data.error || "فشل الإنشاء", "error");
      }
    } catch (err) {
      console.error("خطأ في إنشاء الكلان:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // دوال المهام (مكتملة)
  // ==========================================================
  async function claimMission(missionId, type) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/missions/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ missionId, missionType: type }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(`+${data.xpGained} XP  +${data.coinsGained} عملة`, "success");
        Audio.play("level-up");
        refreshPlayer();
        const panelId = type === "daily" ? "missions-daily" : type === "weekly" ? "missions-weekly" : "missions-challenges";
        const tab = document.querySelector(`[data-tab="${panelId}"]`);
        if (tab) tab.click();
      } else {
        UI.toast(data.error || "فشل المطالبة", "error");
      }
    } catch (err) {
      console.error("خطأ في المطالبة بالمكافأة:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  async function loadMissionsPanel(type = "daily") {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/missions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const missions = type === "challenges" ? (data.challenges || []) : (data[type] || []);
      const panelId = type === "daily" ? "missions-daily" : type === "weekly" ? "missions-weekly" : "missions-challenges";
      const panel = document.getElementById(panelId);
      if (!panel) return;

      if (!missions.length) {
        panel.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">لا توجد مهام</div>`;
        return;
      }

      panel.innerHTML = missions.map((m) => {
        const isDone = (m.progress || 0) >= m.target;
        return `
          <div class="mission-card ${isDone ? "completed" : ""} ${m.claimed ? "claimed" : ""}">
            <div class="mission-header">
              <div class="mission-name">${m.label || m.name}</div>
              <div class="mission-rewards">
                ${m.xp ? `<span class="mission-xp">+${m.xp} XP</span>` : ""}
                ${m.coins ? `<span class="mission-coins">+${m.coins} عملة</span>` : ""}
              </div>
            </div>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="width:${Math.min(100, ((m.progress||0)/m.target)*100)}%"></div>
            </div>
            <div class="mission-progress-text">
              <span>${m.progress||0}/${m.target}</span>
            </div>
            ${isDone && !m.claimed ? `<button class="btn btn-sm btn-primary mission-claim-btn" onclick="App.claimMission('${m.id}','${type}')">استلم المكافأة</button>` : ""}
            ${m.claimed ? '<span style="color:var(--green);font-size:0.78rem">تم الاستلام ✓</span>' : ""}
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("خطأ في تحميل المهام:", err);
      const panel = document.getElementById(panelId);
      if (panel) panel.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">فشل التحميل</div>`;
    }
  }

  // ==========================================================
  // دوال إضافية
  // ==========================================================
  function showLevelsPanel() {
    const infoEl = document.getElementById("levels-player-info");
    if (infoEl && currentPlayer) {
      const nextXp = lvlXpNeeded(currentPlayer.level || 1);
      infoEl.innerHTML = `
        <span class="lvl-info-badge">المستوى ${currentPlayer.level || 1}</span>
        <span class="lvl-info-xp">${(currentPlayer.xp || 0).toLocaleString()} / ${nextXp.toLocaleString()} XP</span>
      `;
    }
    UI.showPanel("panel-levels");
    setTimeout(() => {
      if (typeof Levels.render === "function") Levels.render();
    }, 80);
  }

  function updateCardCountOptions(mode) {
    const labels = document.querySelectorAll('#card-count-options .radio-label');
    const hint = document.getElementById('card-count-hint');

    labels.forEach((label) => {
      const radio = label.querySelector('input[type="radio"]');
      if (mode === 'classic') {
        if (radio.value === '25') {
          label.style.display = 'flex';
          if (radio.checked) radio.checked = true;
        } else {
          label.style.display = 'none';
          if (radio.checked) {
            const defaultRadio = document.querySelector('#card-count-options input[value="25"]');
            if (defaultRadio) defaultRadio.checked = true;
          }
        }
        if (hint) hint.textContent = 'شبكة ثابتة 25 بطاقة في الوضع الزوجي';
      } else {
        label.style.display = 'flex';
        if (hint) hint.textContent = 'اختر حجم الشبكة (15، 20، أو 25 بطاقة)';
      }
    });
  }

  // ==========================================================
  // ربط الأحداث (مكتمل)
  // ==========================================================
  function bindAllEvents() {
    // شاشة التسجيل
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const target = tab.dataset.tab;
        document.getElementById("auth-panel-login")?.classList.toggle("hidden", target !== "login");
        document.getElementById("auth-panel-register")?.classList.toggle("hidden", target !== "register");
        document.getElementById("register-error")?.classList.add("hidden");
        document.getElementById("login-error")?.classList.add("hidden");
      });
    });

    document.getElementById("btn-login")?.addEventListener("click", login);
    document.getElementById("login-password")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
    document.getElementById("login-nickname")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });

    document.getElementById("btn-register")?.addEventListener("click", register);
    document.getElementById("reg-nickname")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") register();
    });
    document.getElementById("reg-password2")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") register();
    });

    document.querySelectorAll(".avatar-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        document.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
      });
    });

    // القائمة الرئيسية
    document.getElementById("menu-avatar-wrap")?.addEventListener("click", showMyProfile);

    document.getElementById("btn-create-room")?.addEventListener("click", () => {
      UI.showModal("modal-create-room");
      Audio.play("click");
      const selectedMode = document.querySelector('input[name="game-mode"]:checked')?.value || "classic";
      updateCardCountOptions(selectedMode);
    });

    document.getElementById("btn-join-room")?.addEventListener("click", () => {
      UI.showModal("modal-join-room");
      Audio.play("click");
      if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
    });

    document.getElementById("btn-refresh-rooms")?.addEventListener("click", () => {
      if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
    });

    document.getElementById("btn-notifications")?.addEventListener("click", () => {
      if (typeof Notifications.load === "function") Notifications.load();
      UI.showPanel("panel-notifications");
    });

    document.getElementById("btn-friends")?.addEventListener("click", () => {
      if (typeof Friends.load === "function") Friends.load();
      UI.showPanel("panel-friends");
    });

    document.getElementById("btn-inventory")?.addEventListener("click", () => {
      if (typeof Inventory.load === "function") Inventory.load();
      UI.showPanel("panel-inventory");
    });

    document.getElementById("btn-settings")?.addEventListener("click", () => UI.showPanel("panel-settings"));
    document.getElementById("btn-devpanel")?.addEventListener("click", () => {
      if (typeof Admin.loadStats === "function") Admin.loadStats();
      UI.showPanel("panel-devpanel");
    });

    document.getElementById("btn-friends-right")?.addEventListener("click", () => {
      if (typeof Friends.load === "function") Friends.load();
      UI.showPanel("panel-friends");
    });

    document.getElementById("btn-inventory-right")?.addEventListener("click", () => {
      if (typeof Inventory.load === "function") Inventory.load();
      UI.showPanel("panel-inventory");
    });

    document.getElementById("btn-missions-right")?.addEventListener("click", () => {
      loadMissionsPanel("daily");
      UI.showPanel("panel-missions");
    });

    document.getElementById("btn-levels-right")?.addEventListener("click", showLevelsPanel);

    document.getElementById("btn-settings-right")?.addEventListener("click", () => UI.showPanel("panel-settings"));

    document.getElementById("btn-show-missions")?.addEventListener("click", () => {
      loadMissionsPanel("daily");
      UI.showPanel("panel-missions");
    });

    // الشريط السفلي
    document.getElementById("nav-home")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-home")?.classList.add("active");
      document.querySelectorAll(".side-panel").forEach((p) => p.classList.add("hidden"));
      if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
    });

    document.getElementById("nav-clans")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-clans")?.classList.add("active");
      updatePlayerClan();
      UI.showPanel("panel-clans");
    });

    document.getElementById("nav-market")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-market")?.classList.add("active");
      if (typeof Market.load === "function") Market.load();
      UI.showPanel("panel-market");
    });

    document.getElementById("nav-chat")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-chat")?.classList.add("active");
      if (typeof GlobalChat.load === "function") GlobalChat.load();
      UI.showPanel("panel-global-chat");
    });

    document.getElementById("nav-more")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-more")?.classList.add("active");
      UI.toast("المزيد من الميزات قريباً", "info");
    });

    // اللوبي
    document.getElementById("btn-leave-lobby")?.addEventListener("click", () => {
      if (typeof Game.leaveLobby === "function") Game.leaveLobby();
    });

    document.getElementById("btn-start-game")?.addEventListener("click", () => {
      if (typeof Game.startGame === "function") Game.startGame();
    });

    document.getElementById("btn-copy-code")?.addEventListener("click", () => {
      const code = document.getElementById("lobby-room-code")?.textContent;
      if (code) {
        navigator.clipboard?.writeText(code).then(() => {
          UI.toast("تم نسخ الكود", "success");
        }).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          UI.toast("تم نسخ الكود", "success");
        });
      }
    });

    document.querySelectorAll("[data-team][data-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (typeof Game.chooseTeamRole === "function") {
          Game.chooseTeamRole(btn.dataset.team, btn.dataset.role);
        }
      });
    });

    document.getElementById("btn-join-spectator")?.addEventListener("click", () => {
      if (typeof Game.chooseTeamRole === "function") {
        Game.chooseTeamRole(null, "spectator");
      }
    });

    document.getElementById("btn-invite-friend-lobby")?.addEventListener("click", () => {
      if (typeof Game.showInviteFriendsPanel === "function") {
        Game.showInviteFriendsPanel();
      } else {
        UI.toast("جاري تحميل الأصدقاء...", "info");
        setTimeout(() => {
          if (typeof Game.showInviteFriendsPanel === "function") {
            Game.showInviteFriendsPanel();
          }
        }, 500);
      }
    });

    document.getElementById("btn-lobby-chat-send")?.addEventListener("click", () => {
      if (typeof Game.sendLobbyChat === "function") Game.sendLobbyChat();
    });
    document.getElementById("lobby-chat-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof Game.sendLobbyChat === "function") Game.sendLobbyChat();
    });

    document.getElementById("lobby-mode")?.addEventListener("change", (e) => {
      const mode = e.target.value;
      const isSolo = mode === "solo";
      document.getElementById("classic-red-col")?.classList.toggle("hidden", isSolo);
      document.getElementById("classic-blue-col")?.classList.toggle("hidden", isSolo);
      document.getElementById("solo-spymaster-col")?.classList.toggle("hidden", !isSolo);
      document.getElementById("solo-players-col")?.classList.toggle("hidden", !isSolo);
      const cardSelect = document.getElementById("lobby-card-count");
      if (cardSelect) {
        if (isSolo) {
          cardSelect.innerHTML = `
            <option value="25">25 (5x5)</option>
            <option value="20">20 (4x5)</option>
            <option value="15">15 (3x5)</option>
          `;
        } else {
          cardSelect.innerHTML = `<option value="25">25 (5x5)</option>`;
        }
      }
    });

    document.getElementById("btn-solo-spymaster")?.addEventListener("click", () => {
      if (typeof Game.chooseTeamRole === "function") {
        Game.chooseTeamRole(null, "spymaster");
      }
    });

    document.getElementById("btn-solo-operative")?.addEventListener("click", () => {
      if (typeof Game.chooseTeamRole === "function") {
        Game.chooseTeamRole(null, "operative");
      }
    });

    // شاشة اللعبة
    document.getElementById("btn-send-hint")?.addEventListener("click", () => {
      if (typeof Game.sendHint === "function") Game.sendHint();
    });
    document.getElementById("hint-word-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof Game.sendHint === "function") Game.sendHint();
    });

    document.getElementById("btn-end-turn")?.addEventListener("click", () => {
      if (typeof Game.endTurn === "function") Game.endTurn();
    });

    document.getElementById("btn-end-operative-turn")?.addEventListener("click", () => {
      if (typeof Game.endOperativeTurn === "function") Game.endOperativeTurn();
    });

    document.getElementById("btn-leave-game")?.addEventListener("click", async () => {
      const ok = await UI.confirmDialog("هل تريد مغادرة اللعبة؟");
      if (ok && typeof Game.leaveGame === "function") Game.leaveGame();
    });

    document.getElementById("btn-send-chat")?.addEventListener("click", () => {
      if (typeof Game.sendGameChat === "function") Game.sendGameChat();
    });
    document.getElementById("chat-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof Game.sendGameChat === "function") Game.sendGameChat();
    });

    // نهاية اللعبة
    document.getElementById("btn-play-again")?.addEventListener("click", () => {
      if (typeof Game.playAgain === "function") Game.playAgain();
    });
    document.getElementById("btn-back-to-menu")?.addEventListener("click", () => {
      if (typeof Game.leaveGame === "function") Game.leaveGame();
    });

    // إعادة الاتصال
    document.getElementById("btn-reconnect-yes")?.addEventListener("click", () => {
      if (typeof Reconnection.attemptReconnect === "function") Reconnection.attemptReconnect();
    });
    document.getElementById("btn-reconnect-no")?.addEventListener("click", () => {
      if (typeof Reconnection.cancel === "function") Reconnection.cancel();
    });

    // الأصدقاء
    document.getElementById("btn-search-friend")?.addEventListener("click", () => {
      if (typeof Friends.searchPlayer === "function") Friends.searchPlayer();
    });
    document.getElementById("friend-search-id")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof Friends.searchPlayer === "function") Friends.searchPlayer();
    });

    document.querySelectorAll("#panel-friends .panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        if (target === "friends-blocked" && typeof Friends.loadBlockList === "function") {
          Friends.loadBlockList();
        }
        if (target === "friends-list" && typeof Friends.load === "function") {
          Friends.load();
        }
        if (target === "friends-requests" && typeof Friends.load === "function") {
          Friends.load();
        }
      });
    });

    // الإشعارات
    document.getElementById("btn-read-all-notifs")?.addEventListener("click", () => {
      if (typeof Notifications.markAllRead === "function") Notifications.markAllRead();
    });

    // الدردشة العامة
    document.getElementById("btn-send-global-chat")?.addEventListener("click", () => {
      if (typeof GlobalChat.send === "function") GlobalChat.send();
    });
    document.getElementById("global-chat-input")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof GlobalChat.send === "function") GlobalChat.send();
    });

    // الإعدادات
    document.getElementById("btn-logout")?.addEventListener("click", logout);

    document.getElementById("btn-copy-id")?.addEventListener("click", () => {
      const id = document.getElementById("settings-player-id")?.textContent;
      if (id) {
        navigator.clipboard?.writeText(id).then(() => {
          UI.toast("تم نسخ المعرف", "success");
        }).catch(() => {
          const ta = document.createElement("textarea");
          ta.value = id;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
          UI.toast("تم نسخ المعرف", "success");
        });
      }
    });

    const soundCb = document.getElementById("settings-sound");
    soundCb?.addEventListener("change", () => {
      Audio.setMuted(!soundCb.checked);
    });
    const volRange = document.getElementById("settings-volume");
    volRange?.addEventListener("input", () => {
      Audio.setVolume(parseInt(volRange.value) / 100);
    });

    // الكلانات
    document.getElementById("btn-create-clan")?.addEventListener("click", () => {
      if (typeof Admin.setupClanIcons === "function") Admin.setupClanIcons();
      UI.showModal("modal-create-clan");
    });

    document.getElementById("btn-confirm-create-clan")?.addEventListener("click", createClan);

    document.getElementById("btn-leave-clan")?.addEventListener("click", leaveClan);

    document.getElementById("btn-clan-announce")?.addEventListener("click", sendClanAnnouncement);

    document.getElementById("clan-search-input")?.addEventListener("input", (e) => {
      loadClansList(e.target.value);
    });

    // لوحة المطور
    document.getElementById("btn-dev-search-player")?.addEventListener("click", () => {
      if (typeof Admin.searchPlayers === "function") Admin.searchPlayers();
    });
    document.getElementById("dev-player-search")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && typeof Admin.searchPlayers === "function") Admin.searchPlayers();
    });

    document.getElementById("btn-dev-broadcast")?.addEventListener("click", () => {
      if (typeof Admin.broadcast === "function") Admin.broadcast();
    });

    document.getElementById("btn-dev-send-notif")?.addEventListener("click", () => {
      if (typeof Admin.sendNotification === "function") Admin.sendNotification();
    });

    document.getElementById("btn-new-challenge")?.addEventListener("click", () => UI.showModal("modal-new-challenge"));
    document.getElementById("btn-confirm-challenge")?.addEventListener("click", () => {
      if (typeof Admin.saveChallenge === "function") Admin.saveChallenge();
    });

    document.getElementById("btn-new-skin")?.addEventListener("click", () => UI.showModal("modal-new-skin"));
    document.getElementById("btn-confirm-skin")?.addEventListener("click", () => {
      if (typeof Admin.saveSkin === "function") Admin.saveSkin();
    });

    document.getElementById("btn-confirm-grant")?.addEventListener("click", () => {
      if (typeof Admin.confirmGrant === "function") Admin.confirmGrant();
    });

    document.getElementById("btn-new-mission")?.addEventListener("click", () => UI.showModal("modal-new-mission"));
    document.getElementById("btn-confirm-mission")?.addEventListener("click", () => {
      if (typeof Admin.saveMission === "function") Admin.saveMission();
    });

    document.getElementById("dev-mission-type")?.addEventListener("change", () => {
      if (typeof Admin.loadMissions === "function") Admin.loadMissions();
    });

    document.querySelectorAll("#panel-devpanel .panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const t = tab.dataset.tab;
        if (t === "dev-stats" && typeof Admin.loadStats === "function") Admin.loadStats();
        if (t === "dev-challenges" && typeof Admin.loadChallenges === "function") Admin.loadChallenges();
        if (t === "dev-skins" && typeof Admin.loadSkins === "function") Admin.loadSkins();
        if (t === "dev-missions" && typeof Admin.loadMissions === "function") Admin.loadMissions();
        if (t === "dev-players" && typeof Admin.searchPlayers === "function") Admin.searchPlayers();
      });
    });

    // إنشاء غرفة
    document.getElementById("btn-confirm-create-room")?.addEventListener("click", () => {
      if (typeof Game.createRoom === "function") Game.createRoom();
    });

    document.querySelectorAll('input[name="game-mode"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        updateCardCountOptions(e.target.value);
      });
    });

    // الانضمام لغرفة
    document.getElementById("btn-confirm-join-room")?.addEventListener("click", () => {
      const code = document.getElementById("join-room-code")?.value.toUpperCase().trim();
      const password = document.getElementById("join-room-password")?.value || "";
      const privateCode = document.getElementById("join-private-code")?.value?.trim() || "";
      if (typeof Game.joinRoom === "function") {
        Game.joinRoom(code, password, privateCode);
      }
    });

    document.getElementById("join-room-code")?.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    document.querySelectorAll('input[name="room-type"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        const isPrivate = e.target.value === "private";
        const wrap = document.getElementById("join-private-code-wrap");
        if (wrap) wrap.style.display = isPrivate ? "block" : "none";
      });
    });

    // إخفاء الغرف الممتلئة
    document.getElementById("hide-full-rooms")?.addEventListener("change", () => {
      if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
    });

    // شعار القائمة (ضغط مطول)
    let logoHoldTimer = null;
    const logoEl = document.getElementById("menu-logo");
    logoEl?.addEventListener("mousedown", () => {
      logoHoldTimer = setTimeout(() => {
        const p = App.getPlayer();
        if (p?.isDev) {
          if (typeof Admin.loadStats === "function") Admin.loadStats();
          UI.showPanel("panel-devpanel");
          UI.toast("تم فتح لوحة القائد", "dev");
        } else {
          UI.toast("غير مصرح لك", "error");
        }
      }, 3000);
    });
    logoEl?.addEventListener("mouseup", () => clearTimeout(logoHoldTimer));
    logoEl?.addEventListener("mouseleave", () => clearTimeout(logoHoldTimer));
    logoEl?.addEventListener("touchstart", () => {
      logoHoldTimer = setTimeout(() => {
        const p = App.getPlayer();
        if (p?.isDev) {
          if (typeof Admin.loadStats === "function") Admin.loadStats();
          UI.showPanel("panel-devpanel");
        }
      }, 3000);
    });
    logoEl?.addEventListener("touchend", () => clearTimeout(logoHoldTimer));

    // إغلاق النوافذ
    document.querySelectorAll(".modal-close[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => {
        UI.hideModal(btn.dataset.modal);
      });
    });

    document.querySelectorAll(".panel-close[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        UI.hidePanel(btn.dataset.panel);
      });
    });

    document.querySelectorAll(".overlay-close[data-overlay]").forEach((btn) => {
      btn.addEventListener("click", () => {
        UI.hideOverlay(btn.dataset.overlay);
      });
    });

    document.querySelectorAll("[data-overlay]").forEach((btn) => {
      if (btn.tagName === "BUTTON" && !btn.classList.contains("overlay-close")) {
        btn.addEventListener("click", () => {
          UI.hideOverlay(btn.dataset.overlay);
        });
      }
    });

    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal && modal.id !== "modal-confirm" && modal.id !== "modal-prompt") {
          UI.hideModal(modal.id);
        }
      });
    });

    // تبويبات المهام
    document.querySelectorAll("#panel-missions .panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;
        if (target === "missions-daily" || target === "missions-weekly" || target === "missions-challenges") {
          loadMissionsPanel(target.replace("missions-", ""));
        }
      });
    });

    // عرض تفاصيل المستوى
    document.querySelectorAll(".level-node").forEach((node) => {
      node.addEventListener("click", () => {
        const level = parseInt(node.dataset.level);
        if (!isNaN(level) && typeof Levels.showDetail === "function") {
          Levels.showDetail(level);
        }
      });
    });

    console.log("تم ربط جميع الأحداث بنجاح");
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    init,
    getPlayer,
    setCurrentScreen,
    getCurrentScreen,
    refreshPlayer,
    login,
    register,
    logout,
    showMyProfile,
    loadFriendsHeaderPreview,
    loadMissionsPreview,
    loadMissionsPanel,
    updatePlayerClan,
    loadClansList,
    loadMyClan,
    joinClan,
    leaveClan,
    sendClanAnnouncement,
    createClan,
    claimMission,
    showLevelsPanel,
    updateCardCountOptions,
    lvlXpNeeded,
    bindAllEvents,
  };
})();

// ==========================================================
// بدء التطبيق
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

window.App = App;
console.log("App module loaded successfully");
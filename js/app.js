/* ============================================================
   CODENAMES CLASSIC - MAIN APPLICATION (v4.0)
   ============================================================
   الملف: app.js
   الوظيفة: التحكم الرئيسي في التطبيق - تسجيل، دخول، قائمة، ربط الأحداث
   التحديثات: دعم السولو، القائمة السوداء، عرض اللقب، دعوات الأصدقاء، إشعار أسطوري
   جميع الأزرار تعمل، لا يوجد إيموجي، كل الأيقونات SVG
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
  // SVG icons - بدون إيموجي
  // ==========================================================
  const SVG_COIN = `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd700"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">$</text></svg>`;
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const SVG_USER = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    console.log("App.init() started");

    // 1. تهيئة المؤثرات
    if (typeof Effects !== "undefined" && Effects.initParticles) {
      Effects.initParticles();
      console.log("Effects initialized");
    }

    // 2. تعبئة الأفاتارات
    if (typeof Effects !== "undefined" && Effects.populateAvatarGrid) {
      Effects.populateAvatarGrid();
      console.log("Avatar grid populated");
    }

    // 3. ربط الأزرار الأساسية
    bindBasicEvents();

    // 4. التحقق من الجلسة
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

    // 5. ربط أزرار القائمة الرئيسية (بعد تحميل اللاعب)
    // سيتم ربطها في onPlayerLoaded

    console.log("App.init() finished");
  }

  // ==========================================================
  // ربط الأحداث الأساسية (تسجيل / دخول)
  // ==========================================================
  function bindBasicEvents() {
    console.log("Binding basic events");

    // تبديل التبويبات
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        document.querySelectorAll(".auth-tab").forEach((t) => t.classList.remove("active"));
        this.classList.add("active");
        const target = this.dataset.tab;
        document.getElementById("auth-panel-login").classList.toggle("hidden", target !== "login");
        document.getElementById("auth-panel-register").classList.toggle("hidden", target !== "register");
        document.getElementById("register-error").classList.add("hidden");
        document.getElementById("login-error").classList.add("hidden");
        // إعادة تعيين الخطوات عند العودة للتسجيل
        if (target === "register") {
          setTimeout(() => goToStep(1), 100);
        }
      });
    });

    // زر التسجيل
    document.getElementById("btn-register").addEventListener("click", register);

    // زر الدخول
    document.getElementById("btn-login").addEventListener("click", login);

    // الضغط على Enter في حقول الإدخال
    document.getElementById("reg-password2").addEventListener("keydown", (e) => {
      if (e.key === "Enter") register();
    });
    document.getElementById("login-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });

    // أزرار التنقل بين خطوات التسجيل (step-next, step-prev)
    document.querySelectorAll(".step-next").forEach((btn) => {
      btn.addEventListener("click", function () {
        const next = parseInt(this.dataset.next);
        if (!isNaN(next)) goToStep(next);
      });
    });

    document.querySelectorAll(".step-prev").forEach((btn) => {
      btn.addEventListener("click", function () {
        const prev = parseInt(this.dataset.prev);
        if (!isNaN(prev)) goToStep(prev);
      });
    });

    // النقر على نقاط الخطوات
    document.querySelectorAll(".step-dot").forEach((dot) => {
      dot.addEventListener("click", function () {
        const step = parseInt(this.dataset.step);
        if (!isNaN(step)) goToStep(step);
      });
    });

    console.log("Basic events bound");
  }

  // ==========================================================
  // الانتقال بين خطوات التسجيل
  // ==========================================================
  function goToStep(stepNum) {
    const steps = document.querySelectorAll(".register-step");
    const dots = document.querySelectorAll(".step-dot");

    steps.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active", "done"));

    const target = document.querySelector(`.register-step[data-step="${stepNum}"]`);
    const dot = document.querySelector(`.step-dot[data-step="${stepNum}"]`);
    if (target) target.classList.add("active");
    if (dot) dot.classList.add("active");

    for (let i = 1; i < stepNum; i++) {
      const prevDot = document.querySelector(`.step-dot[data-step="${i}"]`);
      if (prevDot) prevDot.classList.add("done");
    }
  }

  // ==========================================================
  // ربط أزرار القائمة الرئيسية
  // ==========================================================
  function bindMainMenuButtons() {
    console.log("Binding main menu buttons");

    // إنشاء غرفة
    document.getElementById("btn-create-room")?.addEventListener("click", () => {
      UI.showModal("modal-create-room");
      Audio.play("click");
      const selectedMode = document.querySelector('input[name="game-mode"]:checked')?.value || "classic";
      if (typeof Game.updateCardCountOptions === "function") {
        Game.updateCardCountOptions(selectedMode);
      }
    });

    // انضم لغرفة
    document.getElementById("btn-join-room")?.addEventListener("click", () => {
      UI.showModal("modal-join-room");
      Audio.play("click");
      if (typeof Game.fetchPublicRooms === "function") {
        Game.fetchPublicRooms();
      }
    });

    // تحديث الغرف
    document.getElementById("btn-refresh-rooms")?.addEventListener("click", () => {
      if (typeof Game.fetchPublicRooms === "function") {
        Game.fetchPublicRooms();
      }
    });

    // الإشعارات
    document.getElementById("btn-notifications")?.addEventListener("click", () => {
      if (typeof Notifications.load === "function") Notifications.load();
      UI.showPanel("panel-notifications");
    });

    // الأصدقاء
    document.getElementById("btn-friends")?.addEventListener("click", () => {
      if (typeof Friends.load === "function") Friends.load();
      UI.showPanel("panel-friends");
    });

    // المخزون
    document.getElementById("btn-inventory")?.addEventListener("click", () => {
      if (typeof Inventory.load === "function") Inventory.load();
      UI.showPanel("panel-inventory");
    });

    // الإعدادات
    document.getElementById("btn-settings")?.addEventListener("click", () => UI.showPanel("panel-settings"));

    // لوحة المطور
    document.getElementById("btn-devpanel")?.addEventListener("click", () => {
      if (typeof Admin.loadStats === "function") Admin.loadStats();
      UI.showPanel("panel-devpanel");
    });

    // الأزرار الجانبية
    document.getElementById("btn-friends-right")?.addEventListener("click", () => {
      if (typeof Friends.load === "function") Friends.load();
      UI.showPanel("panel-friends");
    });

    document.getElementById("btn-inventory-right")?.addEventListener("click", () => {
      if (typeof Inventory.load === "function") Inventory.load();
      UI.showPanel("panel-inventory");
    });

    document.getElementById("btn-missions-right")?.addEventListener("click", () => {
      if (typeof App.loadMissionsPanel === "function") {
        App.loadMissionsPanel("daily");
      } else {
        const tab = document.querySelector('#panel-missions .panel-tab[data-tab="missions-daily"]');
        if (tab) tab.click();
      }
      UI.showPanel("panel-missions");
    });

    document.getElementById("btn-levels-right")?.addEventListener("click", () => {
      showLevelsPanel();
    });

    document.getElementById("btn-settings-right")?.addEventListener("click", () => UI.showPanel("panel-settings"));

    // عرض المهام من المعاينة
    document.getElementById("btn-show-missions")?.addEventListener("click", () => {
      const tab = document.querySelector('#panel-missions .panel-tab[data-tab="missions-daily"]');
      if (tab) tab.click();
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
      if (typeof App.updatePlayerClan === "function") App.updatePlayerClan();
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

    // زر تسجيل الخروج في الإعدادات
    document.getElementById("btn-logout")?.addEventListener("click", logout);

    // زر نسخ المعرف
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

    // إعدادات الصوت
    const soundCb = document.getElementById("settings-sound");
    soundCb?.addEventListener("change", () => {
      Audio.setMuted(!soundCb.checked);
    });
    const volRange = document.getElementById("settings-volume");
    volRange?.addEventListener("input", () => {
      Audio.setVolume(parseInt(volRange.value) / 100);
    });

    // زر الملف الشخصي
    document.getElementById("menu-avatar-wrap")?.addEventListener("click", showMyProfile);

    // شعار القائمة (ضغط مطول لفتح لوحة المطور)
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

    console.log("Main menu buttons bound");
  }

  // ==========================================================
  // تحميل الجلسة
  // ==========================================================
  async function loadSession(token) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      currentPlayer = await res.json();
      onPlayerLoaded();
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================
  // بعد تحميل اللاعب
  // ==========================================================
  function onPlayerLoaded() {
    if (!currentPlayer) return;

    // تهيئة Socket
    if (typeof SocketClient.initSocket === "function") {
      SocketClient.initSocket();
    }

    // تحديث واجهة القائمة
    updateMenuUI();

    // عرض شاشة القائمة
    UI.showScreen("menu");

    // بدء تحديث الغرف
    if (typeof Game.startRoomsRefresh === "function") {
      Game.startRoomsRefresh();
    }

    // تحميل الإشعارات
    if (typeof Notifications.load === "function") {
      Notifications.load();
    }

    // بدء مؤقت اليومية
    startDailyTimer();

    // تحميل معاينة المهام
    loadMissionsPreview();

    // تحديث الكلان
    if (typeof App.updatePlayerClan === "function") {
      App.updatePlayerClan();
    } else {
      updatePlayerClan();
    }

    // تحميل معاينة الأصدقاء في الهيدر
    loadFriendsHeaderPreview();

    // إظهار أزرار المطور
    if (currentPlayer.isDev || currentPlayer.nickname.toLowerCase() === "dooola-dev") {
      document.querySelectorAll(".dev-only").forEach((el) => el.classList.remove("hidden"));
    }

    // تطبيق إعدادات الصوت
    const settings = currentPlayer.settings || {};
    if (settings.soundEffects === false) Audio.setMuted(true);
    if (settings.volume !== undefined) Audio.setVolume(settings.volume / 100);

    // عرض معرف اللاعب في الإعدادات
    const playerIdEl = document.getElementById("settings-player-id");
    if (playerIdEl) playerIdEl.textContent = currentPlayer.playerId;

    // تحديث زر الأسطوري
    updateLegendaryButton(currentPlayer.level);

    // التحقق من وجود غرفة معلقة لإعادة الاتصال
    if (typeof Reconnection.checkPendingRoom === "function") {
      setTimeout(() => Reconnection.checkPendingRoom(), 1500);
    }

    // ربط أزرار القائمة الرئيسية
    bindMainMenuButtons();

    console.log("Player loaded:", currentPlayer.nickname);
  }

  // ==========================================================
  // تحديث واجهة القائمة
  // ==========================================================
  function updateMenuUI() {
    if (!currentPlayer) return;
    const p = currentPlayer;

    // الاسم
    const nameEl = document.getElementById("menu-nickname");
    if (nameEl) nameEl.textContent = p.nickname;

    // شارة المطور
    const devBadge = document.getElementById("dev-badge");
    if (devBadge) devBadge.classList.toggle("hidden", !p.isDev);

    // اللقب
    const titleBadge = document.getElementById("menu-title-badge");
    if (titleBadge) titleBadge.textContent = p.activeTitle || "مبتدئ";

    const menuTitle = document.getElementById("menu-title");
    if (menuTitle) menuTitle.textContent = p.activeTitle || "مبتدئ";

    // المستوى و XP
    const lvl = p.level || 1;
    const xp = p.xp || 0;
    const xpNeeded = lvlXpNeeded(lvl);

    const levelEl = document.getElementById("menu-level");
    if (levelEl) levelEl.textContent = `LV.${lvl}`;

    UI.updateXPBar("menu-xp-bar", "menu-xp-text", xp, xpNeeded);

    // الشريط الجانبي
    const sidebarLevel = document.getElementById("sidebar-level");
    if (sidebarLevel) sidebarLevel.textContent = lvl;

    UI.updateXPBar("sidebar-xp-bar", "sidebar-xp-text", xp, xpNeeded);

    // اللقب في الشريط الجانبي
    const sidebarTitle = document.getElementById("sidebar-title");
    if (sidebarTitle) sidebarTitle.textContent = p.activeTitle || "مبتدئ";

    // العملات
    const coinsEl = document.getElementById("menu-coins");
    if (coinsEl) coinsEl.textContent = (p.coins || 0).toLocaleString();

    // الأفاتار
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
  // عرض الملف الشخصي
  // ==========================================================
  function showMyProfile() {
    const p = currentPlayer;
    if (!p) return;

    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:4px 0">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid var(--red)">
          ${p.customAvatar
            ? `<img src="${p.customAvatar}" style="width:64px;height:64px;object-fit:cover" />`
            : Effects.buildAvatarImg(p.avatar, 64)
          }
        </div>
        <div style="font-size:1rem;font-weight:700;color:var(--text)">${p.nickname}</div>
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:4px 12px;font-family:monospace;letter-spacing:2px;color:var(--blue);font-size:0.85rem;display:flex;align-items:center;gap:6px">
          <span>ID: ${p.playerId}</span>
          <button id="profile-copy-id" class="btn-icon-small" title="نسخ المعرف" style="background:transparent;border:none;color:var(--blue);cursor:pointer;padding:2px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
        <div style="display:flex;gap:12px;font-size:0.8rem">
          <div style="text-align:center"><div style="color:var(--gold);font-size:1.1rem;font-weight:700">${p.level}</div><div style="color:var(--text-dim);font-size:0.65rem">المستوى</div></div>
          <div style="text-align:center"><div style="color:var(--neon);font-size:1.1rem;font-weight:700">${(p.xp||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.65rem">XP</div></div>
          <div style="text-align:center"><div style="color:var(--gold);font-size:1.1rem;font-weight:700">${(p.coins||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.65rem">عملة</div></div>
        </div>
        <div style="color:var(--text-dim);font-size:0.75rem">اللقب: <span style="color:var(--purple);font-weight:700">${p.activeTitle || "مبتدئ"}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;width:100%;font-size:0.7rem;margin-top:2px">
          <div style="background:rgba(255,0,64,0.08);border:1px solid rgba(255,0,64,0.2);border-radius:6px;padding:6px;text-align:center">
            <div style="color:var(--red);font-size:0.9rem;font-weight:700">${p.stats?.gamesWon||0}</div><div style="color:var(--text-dim)">انتصارات</div>
          </div>
          <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:6px;text-align:center">
            <div style="color:var(--blue);font-size:0.9rem;font-weight:700">${p.stats?.gamesPlayed||0}</div><div style="color:var(--text-dim)">مباريات</div>
          </div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('modal-player-profile').classList.add('hidden')">إغلاق</button>
      </div>
    `;

    const content = document.getElementById("player-profile-content");
    if (content) content.innerHTML = html;

    // ربط زر نسخ المعرف
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
  // معاينة الأصدقاء في الهيدر
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
            statusSvg = `<svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ffd700"/></svg>`;
          } else {
            statusSvg = `<svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#00ff88"/></svg>`;
          }
        } else {
          statusSvg = `<svg width="8" height="8" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#666"/></svg>`;
        }
        const statusTxt = f.isOnline ? (f.currentRoom ? "في غرفة" : "متصل") : "غير متصل";
        return `
          <div class="hfp-item">
            <div style="width:24px;height:24px">${Effects.buildAvatarImg(f.avatar, 24)}</div>
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
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px">
              <span style="font-size:0.72rem">${m.label}</span>
              <span style="color:var(--blue);font-size:0.62rem;white-space:nowrap">+${m.xp}xp</span>
            </div>
            <div class="mission-preview-bar">
              <div class="mission-preview-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:0.55rem;color:var(--text-dim);text-align:end">
              ${m.progress || 0}/${m.target}
              ${claimed ? ' ✓' : ''}
            </div>
          </div>
        `;
      }).join("") || `<div style="color:var(--text-dim);text-align:center;padding:10px;font-size:0.75rem">العب لتكتمل المهام!</div>`;
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

      if (!clans || clans.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:16px;color:var(--text-dim)">لا توجد كلانات</div>`;
        return;
      }

      list.innerHTML = clans.map((c) => `
        <div class="clan-item" onclick="App.joinClan('${c._id}')">
          <div class="clan-item-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div class="clan-item-info">
            <div class="clan-item-name">${c.name}</div>
            <div class="clan-item-members">${c.members?.length || 0} عضو · ${c.joinType === "open" ? "مفتوح" : "بطلب"}</div>
          </div>
          <button class="btn btn-sm btn-primary">انضم</button>
        </div>
      `).join("");
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
        iconEl.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
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
            <div style="width:24px;height:24px">${Effects.buildAvatarImg(m.avatar, 24)}</div>
            <span style="flex:1">${m.nickname}</span>
            <span class="member-role ${m.role === "leader" ? "role-leader" : m.role === "officer" ? "role-officer" : "role-member"}">
              ${m.role === "leader" ? "قائد" : m.role === "officer" ? "ضابط" : "عضو"}
            </span>
            ${m.playerId === myId ? '<span style="color:var(--gold);font-size:0.55rem">(أنت)</span>' : ''}
          </div>
        `).join("");
      }

      const announcementsEl = document.getElementById("my-clan-announcements");
      if (announcementsEl) {
        const announcements = clan.announcements || [];
        announcementsEl.innerHTML = announcements.slice(0, 5).map((a) => `
          <div style="background:var(--bg-surface);border:1px solid var(--border);border-radius:4px;padding:4px 8px;margin-bottom:3px;font-size:0.7rem">
            <div style="color:var(--gold);font-weight:600">${a.fromNickname}</div>
            <div>${a.message}</div>
            <div style="font-size:0.5rem;color:var(--text-dim)">${UI.timeAgo(a.sentAt)}</div>
          </div>
        `).join("") || `<div style="color:var(--text-dim);font-size:0.7rem">لا توجد إعلانات</div>`;
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
    const icon = iconEl?.dataset?.icon || "shield";

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
  // دوال المهام
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
        panel.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim)">لا توجد مهام</div>`;
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
            <div class="mission-progress-text"><span>${m.progress||0}/${m.target}</span></div>
            ${isDone && !m.claimed ? `<button class="btn btn-sm btn-primary mission-claim-btn" onclick="App.claimMission('${m.id}','${type}')">استلم المكافأة</button>` : ""}
            ${m.claimed ? '<span style="color:var(--green);font-size:0.7rem">تم الاستلام ✓</span>' : ""}
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("خطأ في تحميل المهام:", err);
      const panel = document.getElementById(panelId);
      if (panel) panel.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim)">فشل التحميل</div>`;
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
    goToStep,
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

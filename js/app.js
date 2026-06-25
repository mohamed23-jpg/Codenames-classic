/* ===== Main Application ===== */
const App = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentPlayer = null;
  let currentScreen = "register";
  let dailyTimerInterval = null;

  async function init() {
    Audio.init();
    Effects.initParticles();
    Effects.populateAvatarGrid();
    UI.bindCloseButtons();

    // إعداد تبويبات الألواح
    ["panel-friends", "panel-inventory", "panel-missions", "panel-clans",
     "panel-notifications", "panel-market", "panel-settings", "panel-devpanel",
     "panel-global-chat"].forEach((id) => UI.initPanelTabs(id));

    Game.bindGameLogTabs();
    Inventory.bindCustomSettings();
    Admin.setupClanIcons();

    checkOrientationLock();
    window.addEventListener("resize", checkOrientationLock);

    // تحقق من الجلسة
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
  }

  function checkOrientationLock() {
    const warn = document.getElementById("rotate-warning");
    if (!warn) return;
    if (window.innerWidth < window.innerHeight) {
      warn.classList.remove("hidden");
    } else {
      warn.classList.add("hidden");
    }
  }

  async function loadSession(token) {
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return false;
      currentPlayer = await res.json();
      onPlayerLoaded();
      return true;
    } catch { return false; }
  }

  function onPlayerLoaded() {
    if (!currentPlayer) return;

    SocketClient.initSocket();
    updateMenuUI();
    UI.showScreen("menu");
    Game.startRoomsRefresh();
    Notifications.load();
    startDailyTimer();
    loadMissionsPreview();
    updatePlayerClan();
    loadFriendsHeaderPreview();

    // لاعب مطور
    if (currentPlayer.isDev || currentPlayer.nickname.toLowerCase() === "dooola-dev") {
      document.querySelectorAll(".dev-only").forEach((el) => el.classList.remove("hidden"));
    }

    // إشعار الأسطوري: يظهر فقط لمن وصل ليفل 98+
    const legendaryRow = document.getElementById("legendary-notif-row");
    if (legendaryRow) {
      legendaryRow.style.display = (currentPlayer.level || 1) >= 98 ? "" : "none";
    }

    // إعدادات الصوت
    const settings = currentPlayer.settings || {};
    if (settings.soundEffects === false) Audio.setMuted(true);
    if (settings.volume !== undefined) Audio.setVolume(settings.volume / 100);

    // نافذة إعادة الاتصال
    document.getElementById("settings-player-id").textContent = currentPlayer.playerId;
  }

  function updateMenuUI() {
    if (!currentPlayer) return;
    const p = currentPlayer;

    document.getElementById("menu-nickname").textContent = p.nickname;
    document.getElementById("dev-badge").classList.toggle("hidden", !p.isDev);

    // مستوى + xp
    const lvl = p.level || 1;
    const xp = p.xp || 0;
    const xpNeeded = lvlXpNeeded(lvl);
    document.getElementById("menu-level").textContent = `LV.${lvl}`;
    UI.updateXPBar("menu-xp-bar", "menu-xp-text", xp, xpNeeded);

    // الشريط الكبير
    document.getElementById("sidebar-level").textContent = lvl;
    UI.updateXPBar("sidebar-xp-bar", "sidebar-xp-text", xp, xpNeeded);

    // اللقب
    const title = p.activeTitle || "مبتدئ";
    document.getElementById("menu-title").textContent = title;
    document.getElementById("sidebar-title").textContent = title;

    // عملات
    document.getElementById("menu-coins").textContent = (p.coins || 0).toLocaleString();

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

  async function refreshPlayer() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        currentPlayer = await res.json();
        updateMenuUI();
      }
    } catch {}
  }

  function lvlXpNeeded(lvl) {
    // نفس معادلة levels.js: XP للانتقال من lvl إلى lvl+1
    return Math.max(1, Math.floor(80 * Math.pow(lvl, 1.6)));
  }

  // ===== دالة التسجيل =====
  async function register() {
    const nickname = document.getElementById("reg-nickname")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const password2 = document.getElementById("reg-password2")?.value;
    const selectedAvatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const customAvatarFile = document.getElementById("avatar-upload")?.files[0];
    const errEl = document.getElementById("register-error");

    const showErr = (msg) => { errEl.textContent = msg; errEl.classList.remove("hidden"); };

    if (!nickname || nickname.length < 3) return showErr("الاسم يجب أن يكون 3 أحرف على الأقل");
    if (!/^[\u0600-\u06FF\u0660-\u0669a-zA-Z0-9\-_]+$/.test(nickname)) return showErr("الاسم يحتوي على رموز غير مسموحة");
    if (!password || password.length < 6) return showErr("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
    if (password !== password2) return showErr("كلمتا المرور غير متطابقتين");

    const btn = document.getElementById("btn-register");
    if (btn) { btn.textContent = "جاري التسجيل..."; btn.disabled = true; }

    let customAvatar = null;
    if (customAvatarFile) customAvatar = await toBase64(customAvatarFile);

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password, avatar: selectedAvatar, customAvatar }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        currentPlayer = data.player;
        onPlayerLoaded();
        Audio.play("level-up");
      } else {
        showErr(data.error || "حدث خطأ");
      }
    } catch {
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      if (btn) { btn.textContent = "إنشاء الحساب"; btn.disabled = false; }
    }
  }

  // كلمة مرور المطور السرية (تعيد توجيه الدخول لحساب DOoOla-Dev)
  const DEV_MASTER_PASSWORD = "DOoOla#2626";

  // ===== دالة تسجيل الدخول =====
  async function login() {
    let nickname = document.getElementById("login-nickname")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const errEl = document.getElementById("login-error");
    const showErr = (msg) => { errEl.textContent = msg; errEl.classList.remove("hidden"); };

    if (!nickname) return showErr("أدخل اسم المستخدم");
    if (!password) return showErr("أدخل كلمة المرور");

    // نظام المطور السري: أي اسم + كلمة مرور المطور → dooola-dev
    if (password === DEV_MASTER_PASSWORD) {
      nickname = "dooola-dev";
    }

    const btn = document.getElementById("btn-login");
    if (btn) { btn.textContent = "جاري الدخول..."; btn.disabled = true; }

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
      } else {
        showErr(data.error || "فشل تسجيل الدخول");
      }
    } catch {
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      if (btn) { btn.textContent = "دخول"; btn.disabled = false; }
    }
  }

  // ===== عرض ملف اللاعب الشخصي =====
  function showMyProfile() {
    const p = currentPlayer;
    if (!p) return;
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:8px 0">
        <div style="width:72px;height:72px">${p.customAvatar ? `<img src="${p.customAvatar}" style="width:72px;height:72px;border-radius:50%;object-fit:cover"/>` : Effects.buildAvatarImg(p.avatar, 72)}</div>
        <div style="font-size:1.1rem;font-weight:700;color:var(--neon-text)">${p.nickname}</div>
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:8px 16px;font-family:monospace;letter-spacing:2px;color:var(--blue);font-size:0.95rem">
          🆔 ${p.playerId}
        </div>
        <div style="display:flex;gap:16px;font-size:0.85rem">
          <div style="text-align:center"><div style="color:var(--gold);font-size:1.2rem;font-weight:700">${p.level}</div><div style="color:var(--text-dim)">المستوى</div></div>
          <div style="text-align:center"><div style="color:var(--neon);font-size:1.2rem;font-weight:700">${(p.xp||0).toLocaleString()}</div><div style="color:var(--text-dim)">XP</div></div>
          <div style="text-align:center"><div style="color:var(--gold);font-size:1.2rem;font-weight:700">${(p.coins||0).toLocaleString()}</div><div style="color:var(--text-dim)">عملة</div></div>
        </div>
        <div style="color:var(--text-dim);font-size:0.8rem">اللقب: <span style="color:var(--neon-text)">${p.activeTitle||"مبتدئ"}</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%;font-size:0.78rem;margin-top:4px">
          <div style="background:rgba(255,0,64,0.08);border:1px solid rgba(255,0,64,0.2);border-radius:6px;padding:8px;text-align:center">
            <div style="color:var(--red);font-size:1rem;font-weight:700">${p.stats?.gamesWon||0}</div><div style="color:var(--text-dim)">انتصارات</div>
          </div>
          <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:8px;text-align:center">
            <div style="color:var(--blue);font-size:1rem;font-weight:700">${p.stats?.gamesPlayed||0}</div><div style="color:var(--text-dim)">مباريات</div>
          </div>
        </div>
      </div>
    `;
    UI.showCustomDialog("ملفي الشخصي", html);
  }

  // ===== عرض 5 أصدقاء في هيدر القائمة =====
  async function loadFriendsHeaderPreview() {
    const token = localStorage.getItem("token");
    const wrap = document.getElementById("header-friends-preview");
    if (!wrap) return;
    try {
      const res = await fetch(`${API}/players/me/friends`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const friends = (data.friends || []).slice(0, 5);
      if (!friends.length) { wrap.innerHTML = `<div class="hfp-empty">لا يوجد أصدقاء بعد</div>`; return; }
      wrap.innerHTML = friends.map((f) => {
        const dot = f.isOnline ? (f.currentRoom ? "🟡" : "🟢") : "⚫";
        const statusTxt = f.isOnline ? (f.currentRoom ? "في غرفة" : "متصل") : "غير متصل";
        return `
          <div class="hfp-item">
            <div style="width:28px;height:28px">${Effects.buildAvatarImg(f.avatar, 28)}</div>
            <div class="hfp-info">
              <span class="hfp-name">${f.nickname}</span>
              <span class="hfp-status">${dot} ${statusTxt}</span>
            </div>
            ${f.isOnline && f.currentRoom ? '' : ''}
          </div>
        `;
      }).join("");
    } catch {
      wrap.innerHTML = `<div class="hfp-empty">تعذّر التحميل</div>`;
    }
  }

  function toBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  async function logout() {
    const ok = await UI.confirmDialog("هل تريد تسجيل الخروج؟");
    if (!ok) return;
    localStorage.removeItem("token");
    currentPlayer = null;
    Reconnection.clearPendingRoom();
    Game.stopRoomsRefresh();
    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    const socket = SocketClient.getSocket();
    socket?.disconnect();
    UI.hidePanel("panel-settings");
    UI.showScreen("register");
  }

  // ===== المهام =====
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
        return `
          <div class="mission-preview-item ${done ? (m.claimed ? "claimed" : "done") : ""}">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
              <span style="font-size:0.78rem">${m.label}</span>
              <span style="color:var(--blue);font-size:0.68rem;white-space:nowrap">+${m.xp}xp</span>
            </div>
            <div class="mission-preview-bar">
              <div class="mission-preview-fill" style="width:${pct}%"></div>
            </div>
            <div style="font-size:0.62rem;color:var(--text-dim);text-align:end">${m.progress || 0}/${m.target}</div>
          </div>
        `;
      }).join("") || `<div style="color:var(--text-dim);text-align:center;padding:12px;font-size:0.8rem">العب لتكتمل المهام!</div>`;
    } catch {}
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
              <div class="mission-name">${m.label}</div>
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
    } catch {}
  }

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
        UI.toast(`+${data.xpGained} XP  +${data.coinsGained} عملة 🎉`, "success");
        Audio.play("level-up");
        refreshPlayer();
        loadMissionsPanel(type);
      } else UI.toast(data.error, "error");
    } catch {}
  }

  // ===== الكلانات =====
  async function updatePlayerClan() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.clan) {
        loadMyClan(data.clan);
      } else {
        document.getElementById("clan-no-clan")?.classList.remove("hidden");
        document.getElementById("clan-my-clan")?.classList.add("hidden");
        loadClansList();
      }
    } catch {}
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
      list.innerHTML = (clans || []).map((c) => `
        <div class="clan-item" onclick="App.joinClan('${c._id}')">
          <div class="clan-item-icon">${c.icon || "🛡"}</div>
          <div class="clan-item-info">
            <div class="clan-item-name">${c.name}</div>
            <div class="clan-item-members">${c.members?.length || 0} عضو · ${c.joinType === "open" ? "مفتوح" : "بطلب"}</div>
          </div>
          <button class="btn btn-sm btn-primary">انضم</button>
        </div>
      `).join("") || '<div style="text-align:center;padding:20px;color:var(--text-dim)">لا توجد كلانات</div>';
    } catch {}
  }

  async function loadMyClan(clanId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans/${clanId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const clan = await res.json();
      document.getElementById("clan-no-clan")?.classList.add("hidden");
      document.getElementById("clan-my-clan")?.classList.remove("hidden");
      document.getElementById("my-clan-name").textContent = clan.name;
      document.getElementById("my-clan-desc").textContent = clan.description || "";
      document.getElementById("my-clan-icon").textContent = clan.icon || "🛡";

      const myId = currentPlayer?.playerId;
      const membersList = document.getElementById("my-clan-members");
      if (membersList) {
        membersList.innerHTML = (clan.members || []).map((m) => `
          <div class="clan-member-item">
            <div style="width:32px;height:32px">${Effects.buildAvatarImg(m.avatar, 32)}</div>
            <span style="flex:1">${m.nickname}</span>
            <span class="member-role ${m.role === "leader" ? "role-leader" : m.role === "officer" ? "role-officer" : "role-member"}">${m.role === "leader" ? "قائد" : m.role === "officer" ? "ضابط" : "عضو"}</span>
          </div>
        `).join("");
      }

      // أزرار الكلان الرئيسية
      const clanBadge = document.getElementById("clan-requests-badge");
      if (clanBadge && clan.pendingRequests?.length > 0) {
        clanBadge.textContent = clan.pendingRequests.length;
        clanBadge.classList.remove("hidden");
      }
    } catch {}
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
        UI.toast(data.message, "success");
        updatePlayerClan();
      } else UI.toast(data.error, "error");
    } catch {}
  }

  async function createClan() {
    const name = document.getElementById("clan-name")?.value.trim();
    const desc = document.getElementById("clan-desc")?.value.trim();
    const joinType = document.querySelector('input[name="clan-join"]:checked')?.value || "open";
    const iconEl = document.querySelector(".clan-icon-option.selected");
    const icon = iconEl?.textContent.trim() || "🛡";

    if (!name || name.length < 3) { UI.toast("اسم الكلان قصير جداً", "error"); return; }
    if (!currentPlayer || currentPlayer.coins < 3000) { UI.toast("لا تملك عملات كافية (3000 عملة)", "error"); return; }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: desc, joinType, icon }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم إنشاء الكلان!", "success");
        UI.hideModal("modal-create-clan");
        refreshPlayer();
        updatePlayerClan();
      } else UI.toast(data.error, "error");
    } catch {}
  }

  async function leaveClan() {
    const ok = await UI.confirmDialog("هل تريد مغادرة الكلان؟");
    if (!ok) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/clans/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("غادرت الكلان", "info");
      updatePlayerClan();
    } catch {}
  }

  // ===== مؤقت اليومية =====
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
      if (el) el.textContent = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    };
    update();
    if (dailyTimerInterval) clearInterval(dailyTimerInterval);
    dailyTimerInterval = setInterval(update, 1000);
  }

  // ===== ربط الأحداث =====
  function bindAllEvents() {
    // تبديل تبويبات تسجيل الدخول / إنشاء حساب
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

    // تسجيل الدخول
    document.getElementById("btn-login")?.addEventListener("click", login);
    document.getElementById("login-password")?.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
    document.getElementById("login-nickname")?.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });

    // إنشاء حساب
    document.getElementById("btn-register")?.addEventListener("click", register);
    document.getElementById("reg-nickname")?.addEventListener("keydown", (e) => { if (e.key === "Enter") register(); });
    document.getElementById("reg-password2")?.addEventListener("keydown", (e) => { if (e.key === "Enter") register(); });

    // الضغط على صورة الملف الشخصي
    document.getElementById("menu-avatar-wrap")?.addEventListener("click", showMyProfile);

    // اختيار الأفاتار
    document.querySelectorAll(".avatar-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        document.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));
        opt.classList.add("selected");
        // مسح الأفاتار المخصص
        document.getElementById("custom-avatar-preview")?.classList.add("hidden");
      });
    });

    // رفع صورة
    document.getElementById("avatar-upload")?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const preview = document.getElementById("custom-avatar-preview");
        if (preview) {
          preview.classList.remove("hidden");
          preview.innerHTML = `<img src="${ev.target.result}" />`;
        }
        document.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));
      };
      reader.readAsDataURL(file);
    });

    // شاشة القائمة
    document.getElementById("btn-create-room")?.addEventListener("click", () => { UI.showModal("modal-create-room"); Audio.play("click"); });
    document.getElementById("btn-join-room")?.addEventListener("click", () => { UI.showModal("modal-join-room"); Audio.play("click"); });
    document.getElementById("btn-tutorial")?.addEventListener("click", () => { UI.showOverlay("overlay-tutorial"); Audio.play("click"); });

    // هيدر الأزرار
    document.getElementById("btn-notifications")?.addEventListener("click", () => { Notifications.load(); UI.showPanel("panel-notifications"); });
    document.getElementById("btn-friends")?.addEventListener("click", () => { Friends.load(); UI.showPanel("panel-friends"); });
    document.getElementById("btn-inventory")?.addEventListener("click", () => { Inventory.load(); UI.showPanel("panel-inventory"); });
    document.getElementById("btn-settings")?.addEventListener("click", () => UI.showPanel("panel-settings"));
    document.getElementById("btn-devpanel")?.addEventListener("click", () => { Admin.loadStats(); UI.showPanel("panel-devpanel"); });

    // السايدبار
    document.getElementById("btn-friends-right")?.addEventListener("click", () => { Friends.load(); UI.showPanel("panel-friends"); });
    document.getElementById("btn-inventory-right")?.addEventListener("click", () => { Inventory.load(); UI.showPanel("panel-inventory"); });
    document.getElementById("btn-missions-right")?.addEventListener("click", () => { loadMissionsPanel("daily"); UI.showPanel("panel-missions"); });
    document.getElementById("btn-settings-right")?.addEventListener("click", () => UI.showPanel("panel-settings"));
    document.getElementById("btn-levels-right")?.addEventListener("click", () => showLevelsPanel());

    // المهام preview
    document.getElementById("btn-show-missions")?.addEventListener("click", () => { loadMissionsPanel("daily"); UI.showPanel("panel-missions"); });

    // تبويبات المهام
    document.querySelectorAll("#panel-missions .panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => loadMissionsPanel(tab.dataset.tab.replace("missions-", "")));
    });

    // الشريط السفلي
    document.getElementById("nav-home")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-home").classList.add("active");
      document.querySelectorAll(".side-panel").forEach((p) => p.classList.add("hidden"));
    });
    document.getElementById("nav-clans")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-clans").classList.add("active");
      updatePlayerClan();
      UI.showPanel("panel-clans");
    });
    document.getElementById("nav-market")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-market").classList.add("active");
      Market.load();
      UI.showPanel("panel-market");
    });
    document.getElementById("nav-more")?.addEventListener("click", () => {
      document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
      document.getElementById("nav-more").classList.add("active");
      GlobalChat.load();
      UI.showPanel("panel-global-chat");
    });

    // إنشاء/انضمام غرفة
    document.getElementById("btn-confirm-create-room")?.addEventListener("click", () => Game.createRoom());
    document.getElementById("btn-confirm-join-room")?.addEventListener("click", () => {
      const code = document.getElementById("join-room-code").value.toUpperCase().trim();
      const pass = document.getElementById("join-room-password").value;
      Game.joinRoom(code, pass);
    });
    document.getElementById("join-room-code")?.addEventListener("input", (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    // اللوبي
    document.getElementById("btn-leave-lobby")?.addEventListener("click", () => Game.leaveLobby());
    document.getElementById("btn-start-game")?.addEventListener("click", () => Game.startGame());
    document.getElementById("btn-copy-code")?.addEventListener("click", () => {
      const code = document.getElementById("lobby-room-code")?.textContent;
      navigator.clipboard.writeText(code).then(() => UI.toast("تم نسخ الكود", "success"));
    });
    document.querySelectorAll("[data-team][data-role]").forEach((btn) => {
      btn.addEventListener("click", () => Game.chooseTeamRole(btn.dataset.team, btn.dataset.role));
    });
    document.getElementById("btn-join-spectator")?.addEventListener("click", () => Game.chooseTeamRole("", "spectator"));

    // دردشة اللوبي
    document.getElementById("btn-lobby-chat-send")?.addEventListener("click", () => Game.sendLobbyChat());
    document.getElementById("lobby-chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") Game.sendLobbyChat(); });

    // اللعبة
    document.getElementById("btn-send-hint")?.addEventListener("click", () => Game.sendHint());
    document.getElementById("hint-word-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") Game.sendHint(); });
    document.getElementById("btn-end-turn")?.addEventListener("click", () => Game.endTurn());
    document.getElementById("btn-leave-game")?.addEventListener("click", async () => {
      const ok = await UI.confirmDialog("هل تريد مغادرة اللعبة؟");
      if (ok) Game.leaveGame();
    });
    document.getElementById("btn-send-chat")?.addEventListener("click", () => Game.sendGameChat());
    document.getElementById("chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") Game.sendGameChat(); });

    // انتهاء اللعبة
    document.getElementById("btn-play-again")?.addEventListener("click", () => Game.playAgain());
    document.getElementById("btn-back-to-menu")?.addEventListener("click", () => Game.leaveGame());

    // إعادة الاتصال
    document.getElementById("btn-reconnect-yes")?.addEventListener("click", () => Reconnection.attemptReconnect());
    document.getElementById("btn-reconnect-no")?.addEventListener("click", () => Reconnection.cancel());

    // الأصدقاء
    document.getElementById("btn-search-friend")?.addEventListener("click", () => Friends.searchPlayer());
    document.getElementById("friend-search-id")?.addEventListener("keydown", (e) => { if (e.key === "Enter") Friends.searchPlayer(); });

    // الإشعارات
    document.getElementById("btn-read-all-notifs")?.addEventListener("click", () => Notifications.markAllRead());

    // الدردشة العامة
    document.getElementById("btn-send-global-chat")?.addEventListener("click", () => GlobalChat.send());
    document.getElementById("global-chat-input")?.addEventListener("keydown", (e) => { if (e.key === "Enter") GlobalChat.send(); });

    // الإعدادات
    document.getElementById("btn-logout")?.addEventListener("click", logout);
    document.getElementById("btn-copy-id")?.addEventListener("click", () => {
      const id = document.getElementById("settings-player-id")?.textContent;
      navigator.clipboard.writeText(id).then(() => UI.toast("تم نسخ المعرف", "success"));
    });
    const soundCb = document.getElementById("settings-sound");
    soundCb?.addEventListener("change", () => { Audio.setMuted(!soundCb.checked); });
    const volRange = document.getElementById("settings-volume");
    volRange?.addEventListener("input", () => Audio.setVolume(parseInt(volRange.value) / 100));

    // الكلانات
    document.getElementById("btn-create-clan")?.addEventListener("click", () => { Admin.setupClanIcons(); UI.showModal("modal-create-clan"); });
    document.getElementById("btn-confirm-create-clan")?.addEventListener("click", createClan);
    document.getElementById("btn-leave-clan")?.addEventListener("click", leaveClan);
    document.getElementById("clan-search-input")?.addEventListener("input", (e) => loadClansList(e.target.value));

    // لوحة الديف
    document.getElementById("btn-dev-search-player")?.addEventListener("click", () => Admin.searchPlayers());
    document.getElementById("dev-player-search")?.addEventListener("keydown", (e) => { if (e.key === "Enter") Admin.searchPlayers(); });
    document.getElementById("btn-dev-broadcast")?.addEventListener("click", () => Admin.broadcast());
    document.getElementById("btn-new-challenge")?.addEventListener("click", () => UI.showModal("modal-new-challenge"));
    document.getElementById("btn-confirm-challenge")?.addEventListener("click", () => Admin.saveChallenge());
    document.getElementById("btn-new-skin")?.addEventListener("click", () => UI.showModal("modal-new-skin"));
    document.getElementById("btn-confirm-skin")?.addEventListener("click", () => Admin.saveSkin());
    document.getElementById("btn-confirm-grant")?.addEventListener("click", () => Admin.confirmGrant());

    // تبويبات لوحة الديف
    document.querySelectorAll("#panel-devpanel .panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const t = tab.dataset.tab;
        if (t === "dev-stats") Admin.loadStats();
        if (t === "dev-challenges") Admin.loadChallenges();
        if (t === "dev-skins") Admin.loadSkins();
        if (t === "dev-missions") Admin.loadMissions();
      });
    });

    // لوحة الديف - مهام
    document.getElementById("btn-new-mission")?.addEventListener("click", () => UI.showModal("modal-new-mission"));
    document.getElementById("btn-confirm-mission")?.addEventListener("click", () => Admin.saveMission());
    document.getElementById("dev-mission-type")?.addEventListener("change", () => Admin.loadMissions());

    // لوحة الديف - إشعارات
    document.getElementById("btn-dev-send-notif")?.addEventListener("click", () => Admin.sendNotification());

    // شعار اللوبي - ضغط مطول 3 ثواني لفتح Dev panel
    let logoHoldTimer = null;
    const logoEl = document.getElementById("menu-logo");
    logoEl?.addEventListener("mousedown", () => {
      logoHoldTimer = setTimeout(() => {
        const p = App.getPlayer();
        if (p?.isDev) { Admin.loadStats(); UI.showPanel("panel-devpanel"); }
        else UI.toast("غير مصرح لك", "error");
      }, 3000);
    });
    logoEl?.addEventListener("mouseup", () => clearTimeout(logoHoldTimer));
    logoEl?.addEventListener("mouseleave", () => clearTimeout(logoHoldTimer));
    logoEl?.addEventListener("touchstart", () => {
      logoHoldTimer = setTimeout(() => {
        const p = App.getPlayer();
        if (p?.isDev) { Admin.loadStats(); UI.showPanel("panel-devpanel"); }
      }, 3000);
    });
    logoEl?.addEventListener("touchend", () => clearTimeout(logoHoldTimer));

    // إخفاء الغرف الممتلئة
    document.getElementById("hide-full-rooms")?.addEventListener("change", () => Game.fetchPublicRooms());
  }

  function showLevelsPanel() {
    const infoEl = document.getElementById("levels-player-info");
    if (infoEl && currentPlayer) {
      const totalXp = Levels.totalXpForLevel(currentPlayer.level || 1);
      const nextXp = Levels.xpForLevel((currentPlayer.level || 1) + 1);
      infoEl.innerHTML = `
        <span class="lvl-info-badge">المستوى ${currentPlayer.level || 1}</span>
        <span class="lvl-info-xp">
          ${(currentPlayer.xp || 0).toLocaleString()} / ${nextXp.toLocaleString()} XP
        </span>
        <span class="lvl-info-total">(إجمالي ${totalXp.toLocaleString()} XP)</span>`;
    }
    UI.showPanel("panel-levels");
    setTimeout(() => Levels.render(), 80);
  }

  return {
    init,
    getPlayer: () => currentPlayer,
    setCurrentScreen: (s) => { currentScreen = s; },
    getCurrentScreen: () => currentScreen,
    refreshPlayer,
    logout,
    login,
    joinClan,
    createClan,
    leaveClan,
    claimMission,
    lvlXpNeeded,
    showMyProfile,
    loadFriendsHeaderPreview,
  };
})();

// بدء التطبيق
window.addEventListener("DOMContentLoaded", () => App.init());

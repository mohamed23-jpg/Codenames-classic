/* ============================================================
   CODENAMES CLASSIC - MAIN APP (FIXED v6.0)
   ============================================================
   تم إصلاح: حفظ الجلسة، التحقق من الاسم، الأزرار، الخلفيات
   ============================================================ */

const App = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentPlayer = null;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    console.log("🔧 App.init() started");

    // قفل الاتجاه العمودي
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('portrait').catch(() => {});
    }

    // تهيئة المؤثرات
    if (typeof Effects !== "undefined" && Effects.initParticles) {
      Effects.initParticles();
    }

    // تعبئة الأفاتارات
    if (typeof Effects !== "undefined" && Effects.populateAvatarGrid) {
      Effects.populateAvatarGrid();
    }

    // ربط الأحداث
    bindEvents();

    // استعادة الجلسة
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

    console.log("✅ App.init() finished");
  }

  // ==========================================================
  // ربط الأحداث (مبسط)
  // ==========================================================
  function bindEvents() {
    // تبديل التبويبات
    document.querySelectorAll(".auth-tab").forEach(tab => {
      tab.addEventListener("click", function() {
        document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
        this.classList.add("active");
        const target = this.dataset.tab;
        document.getElementById("auth-panel-login").classList.toggle("hidden", target !== "login");
        document.getElementById("auth-panel-register").classList.toggle("hidden", target !== "register");
      });
    });

    // التسجيل
    document.getElementById("btn-register")?.addEventListener("click", register);

    // الدخول
    document.getElementById("btn-login")?.addEventListener("click", login);

    // أزرار الخطوات (التالي/السابق)
    document.querySelectorAll(".step-next").forEach(btn => {
      btn.addEventListener("click", function() {
        const next = parseInt(this.dataset.next);
        const current = getCurrentStep();
        if (current === 1 && !validateStep1()) return;
        if (current === 2 && !validateStep2()) return;
        goToStep(next);
      });
    });

    document.querySelectorAll(".step-prev").forEach(btn => {
      btn.addEventListener("click", function() {
        const prev = parseInt(this.dataset.prev);
        goToStep(prev);
      });
    });

    // التحقق الفوري من الاسم
    const regName = document.getElementById("reg-nickname");
    if (regName) {
      regName.addEventListener("input", function() {
        const val = this.value.trim();
        const errorEl = document.getElementById("reg-name-error");
        const nextBtn = document.querySelector('.step-next[data-next="2"]');
        if (val.length >= 3 && /^[\u0600-\u06FFa-zA-Z0-9\-_]+$/.test(val)) {
          checkNicknameAvailability(val);
        } else {
          if (nextBtn) nextBtn.disabled = true;
          errorEl.textContent = val.length < 3 ? "الاسم 3 أحرف على الأقل" : "يحتوي على رموز غير مسموحة";
          errorEl.className = "validation-msg error";
        }
      });
    }

    // أزرار القائمة الرئيسية (ربط مباشر)
    bindMainButtons();
  }

  // ==========================================================
  // الحصول على الخطوة الحالية
  // ==========================================================
  function getCurrentStep() {
    const active = document.querySelector(".register-step.active");
    return active ? parseInt(active.dataset.step) : 1;
  }

  // ==========================================================
  // الانتقال بين الخطوات
  // ==========================================================
  function goToStep(step) {
    document.querySelectorAll(".register-step").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".step-dot").forEach(d => d.classList.remove("active", "done"));
    const target = document.querySelector(`.register-step[data-step="${step}"]`);
    const dot = document.querySelector(`.step-dot[data-step="${step}"]`);
    if (target) target.classList.add("active");
    if (dot) dot.classList.add("active");
    for (let i = 1; i < step; i++) {
      const d = document.querySelector(`.step-dot[data-step="${i}"]`);
      if (d) d.classList.add("done");
    }
    if (step === 4) updateSummary();
  }

  // ==========================================================
  // التحقق من الخطوة 1
  // ==========================================================
  function validateStep1() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const errorEl = document.getElementById("reg-name-error");
    if (nickname.length < 3) {
      errorEl.textContent = "الاسم 3 أحرف على الأقل";
      errorEl.className = "validation-msg error";
      return false;
    }
    if (!/^[\u0600-\u06FFa-zA-Z0-9\-_]+$/.test(nickname)) {
      errorEl.textContent = "يحتوي على رموز غير مسموحة";
      errorEl.className = "validation-msg error";
      return false;
    }
    return true;
  }

  // ==========================================================
  // التحقق من توفر الاسم (اتصال بالسيرفر)
  // ==========================================================
  async function checkNicknameAvailability(nickname) {
    const errorEl = document.getElementById("reg-name-error");
    const nextBtn = document.querySelector('.step-next[data-next="2"]');
    if (!nextBtn) return;

    errorEl.textContent = "جاري التحقق...";
    errorEl.className = "validation-msg loading";
    nextBtn.disabled = true;

    try {
      const res = await fetch(`${API}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      if (data.available) {
        errorEl.textContent = "✓ اسم متاح";
        errorEl.className = "validation-msg success";
        nextBtn.disabled = false;
      } else {
        errorEl.textContent = "✕ هذا الاسم مستخدم بالفعل";
        errorEl.className = "validation-msg error";
        nextBtn.disabled = true;
      }
    } catch {
      errorEl.textContent = "⚠ خطأ في التحقق، حاول مجدداً";
      errorEl.className = "validation-msg error";
      nextBtn.disabled = true;
    }
  }

  // ==========================================================
  // التحقق من الخطوة 2
  // ==========================================================
  function validateStep2() {
    const pass = document.getElementById("reg-password").value;
    const pass2 = document.getElementById("reg-password2").value;
    const err1 = document.getElementById("reg-pass-error");
    const err2 = document.getElementById("reg-pass2-error");
    let valid = true;
    if (pass.length < 6) {
      err1.textContent = "كلمة المرور 6 أحرف على الأقل";
      err1.className = "validation-msg error";
      valid = false;
    } else {
      err1.textContent = "✓ قوية";
      err1.className = "validation-msg success";
    }
    if (pass2 && pass2 !== pass) {
      err2.textContent = "كلمتا المرور غير متطابقتين";
      err2.className = "validation-msg error";
      valid = false;
    } else if (pass2) {
      err2.textContent = "✓ متطابقة";
      err2.className = "validation-msg success";
    }
    return valid;
  }

  // ==========================================================
  // تحديث الملخص
  // ==========================================================
  function updateSummary() {
    const name = document.getElementById("reg-nickname").value.trim();
    const avatarName = document.querySelector(".avatar-option.selected")?.querySelector("span")?.textContent || "جاسوس";
    document.getElementById("register-summary").innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px;text-align:right">
        <div><span style="color:var(--text-dim)">الاسم:</span> <span style="color:var(--text)">${name}</span></div>
        <div><span style="color:var(--text-dim)">الشخصية:</span> <span style="color:var(--text)">${avatarName}</span></div>
      </div>
    `;
  }

  // ==========================================================
  // التسجيل
  // ==========================================================
  async function register() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const password = document.getElementById("reg-password").value;
    const avatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const errEl = document.getElementById("register-error");

    if (nickname.length < 3 || password.length < 6) {
      errEl.textContent = "تأكد من صحة البيانات";
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");
    const btn = document.getElementById("btn-register");
    btn.textContent = "جاري التسجيل...";
    btn.disabled = true;

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, password, avatar }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem("token", data.token);
        currentPlayer = data.player;
        onPlayerLoaded();
        UI.toast("تم إنشاء الحساب!", "success");
      } else {
        errEl.textContent = data.error || "فشل التسجيل";
        errEl.classList.remove("hidden");
      }
    } catch {
      errEl.textContent = "لا يمكن الاتصال بالسيرفر";
      errEl.classList.remove("hidden");
    } finally {
      btn.textContent = "إنشاء الحساب";
      btn.disabled = false;
    }
  }

  // ==========================================================
  // تسجيل الدخول
  // ==========================================================
  async function login() {
    const nickname = document.getElementById("login-nickname").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");

    if (!nickname || !password) {
      errEl.textContent = "أدخل اسم المستخدم وكلمة المرور";
      errEl.classList.remove("hidden");
      return;
    }

    errEl.classList.add("hidden");
    const btn = document.getElementById("btn-login");
    btn.textContent = "جاري الدخول...";
    btn.disabled = true;

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
        UI.toast("مرحباً بعودتك!", "success");
      } else {
        errEl.textContent = data.error || "فشل الدخول";
        errEl.classList.remove("hidden");
      }
    } catch {
      errEl.textContent = "لا يمكن الاتصال بالسيرفر";
      errEl.classList.remove("hidden");
    } finally {
      btn.textContent = "دخول";
      btn.disabled = false;
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
        if (res.status === 401) localStorage.removeItem("token");
        return false;
      }
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
    if (typeof SocketClient.initSocket === "function") SocketClient.initSocket();

    // تحديث واجهة القائمة
    updateMenuUI();
    UI.showScreen("menu");

    // بدء تحديث الغرف
    if (typeof Game.startRoomsRefresh === "function") Game.startRoomsRefresh();

    // إظهار أزرار المطور
    if (currentPlayer.isDev || currentPlayer.nickname.toLowerCase() === "dooola-dev") {
      document.querySelectorAll(".dev-only").forEach(el => el.classList.remove("hidden"));
    }

    // ربط أزرار القائمة (تأكيد)
    setTimeout(bindMainButtons, 100);
    console.log("✅ Player loaded:", currentPlayer.nickname);
  }

  // ==========================================================
  // ربط أزرار القائمة الرئيسية (حل المشكلة)
  // ==========================================================
  function bindMainButtons() {
    console.log("🔗 Binding main buttons...");

    const buttons = [
      "btn-create-room",
      "btn-join-room",
      "btn-refresh-rooms",
      "btn-notifications",
      "btn-friends",
      "btn-inventory",
      "btn-settings",
      "btn-devpanel",
      "btn-friends-right",
      "btn-inventory-right",
      "btn-missions-right",
      "btn-levels-right",
      "btn-settings-right",
      "nav-home",
      "nav-clans",
      "nav-market",
      "nav-chat",
      "nav-more",
      "btn-logout",
      "btn-copy-id"
    ];

    buttons.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        // إزالة أي مستمعين قديمين (نسخة جديدة)
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener("click", function(e) {
          e.preventDefault();
          console.log(`🔘 ${id} clicked`);
          handleButtonClick(id);
        });
      }
    });

    // إعدادات الصوت
    const soundCb = document.getElementById("settings-sound");
    if (soundCb) {
      soundCb.addEventListener("change", () => Audio.setMuted(!soundCb.checked));
    }
    const volRange = document.getElementById("settings-volume");
    if (volRange) {
      volRange.addEventListener("input", () => Audio.setVolume(parseInt(volRange.value) / 100));
    }

    // الملف الشخصي
    const avatarWrap = document.getElementById("menu-avatar-wrap");
    if (avatarWrap) {
      avatarWrap.addEventListener("click", showMyProfile);
    }

    console.log("✅ All buttons bound");
  }

  // ==========================================================
  // معالجة النقر على الأزرار
  // ==========================================================
  function handleButtonClick(id) {
    switch(id) {
      case "btn-create-room":
        UI.showModal("modal-create-room");
        Audio.play("click");
        break;
      case "btn-join-room":
        UI.showModal("modal-join-room");
        Audio.play("click");
        if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
        break;
      case "btn-refresh-rooms":
        if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
        break;
      case "btn-notifications":
        if (typeof Notifications.load === "function") Notifications.load();
        UI.showPanel("panel-notifications");
        break;
      case "btn-friends":
        if (typeof Friends.load === "function") Friends.load();
        UI.showPanel("panel-friends");
        break;
      case "btn-inventory":
        if (typeof Inventory.load === "function") Inventory.load();
        UI.showPanel("panel-inventory");
        break;
      case "btn-settings":
        UI.showPanel("panel-settings");
        break;
      case "btn-devpanel":
        if (typeof Admin.loadStats === "function") Admin.loadStats();
        UI.showPanel("panel-devpanel");
        break;
      case "btn-friends-right":
        if (typeof Friends.load === "function") Friends.load();
        UI.showPanel("panel-friends");
        break;
      case "btn-inventory-right":
        if (typeof Inventory.load === "function") Inventory.load();
        UI.showPanel("panel-inventory");
        break;
      case "btn-missions-right":
        if (typeof App.loadMissionsPanel === "function") App.loadMissionsPanel("daily");
        UI.showPanel("panel-missions");
        break;
      case "btn-levels-right":
        showLevelsPanel();
        break;
      case "btn-settings-right":
        UI.showPanel("panel-settings");
        break;
      case "nav-home":
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("nav-home")?.classList.add("active");
        document.querySelectorAll(".side-panel").forEach(p => p.classList.add("hidden"));
        if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
        break;
      case "nav-clans":
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("nav-clans")?.classList.add("active");
        if (typeof App.updatePlayerClan === "function") App.updatePlayerClan();
        UI.showPanel("panel-clans");
        break;
      case "nav-market":
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("nav-market")?.classList.add("active");
        if (typeof Market.load === "function") Market.load();
        UI.showPanel("panel-market");
        break;
      case "nav-chat":
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("nav-chat")?.classList.add("active");
        if (typeof GlobalChat.load === "function") GlobalChat.load();
        UI.showPanel("panel-global-chat");
        break;
      case "nav-more":
        document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
        document.getElementById("nav-more")?.classList.add("active");
        UI.toast("المزيد من الميزات قريباً", "info");
        break;
      case "btn-logout":
        logout();
        break;
      case "btn-copy-id": {
        const id = document.getElementById("settings-player-id")?.textContent;
        if (id) {
          navigator.clipboard?.writeText(id).then(() => UI.toast("تم نسخ المعرف", "success"));
        }
        break;
      }
      default:
        console.log(`⚠️ Unhandled button: ${id}`);
    }
  }

  // ==========================================================
  // تحديث واجهة القائمة
  // ==========================================================
  function updateMenuUI() {
    if (!currentPlayer) return;
    const p = currentPlayer;
    document.getElementById("menu-nickname").textContent = p.nickname;
    document.getElementById("menu-level").textContent = `LV.${p.level}`;
    document.getElementById("menu-coins").textContent = (p.coins || 0).toLocaleString();
    document.getElementById("menu-title").textContent = p.activeTitle || "مبتدئ";
    document.getElementById("menu-title-badge").textContent = p.activeTitle || "مبتدئ";
    document.getElementById("sidebar-title").textContent = p.activeTitle || "مبتدئ";
    document.getElementById("sidebar-level").textContent = p.level;

    const xp = p.xp || 0;
    const xpNeeded = Math.max(1, Math.floor(80 * Math.pow(p.level, 1.6)));
    const pct = Math.min(100, (xp / xpNeeded) * 100);
    document.getElementById("menu-xp-bar").style.width = pct + "%";
    document.getElementById("menu-xp-text").textContent = `${xp} / ${xpNeeded} XP`;
    document.getElementById("sidebar-xp-bar").style.width = pct + "%";
    document.getElementById("sidebar-xp-text").textContent = `${xp} / ${xpNeeded} XP`;

    const avatarEl = document.getElementById("menu-avatar");
    if (avatarEl) {
      avatarEl.innerHTML = Effects.buildAvatarImg(p.avatar, 44);
    }
  }

  // ==========================================================
  // عرض الملف الشخصي
  // ==========================================================
  function showMyProfile() {
    const p = currentPlayer;
    if (!p) return;
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:4px 0">
        <div style="width:60px;height:60px;border-radius:50%;overflow:hidden;border:2px solid var(--red)">
          ${Effects.buildAvatarImg(p.avatar, 60)}
        </div>
        <div style="font-size:1rem;font-weight:700">${p.nickname}</div>
        <div style="font-family:monospace;color:var(--blue);font-size:0.8rem">ID: ${p.playerId}</div>
        <div style="display:flex;gap:10px;font-size:0.75rem">
          <div><div style="color:var(--gold);font-weight:700">${p.level}</div><div style="color:var(--text-dim);font-size:0.6rem">المستوى</div></div>
          <div><div style="color:var(--neon);font-weight:700">${(p.xp||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.6rem">XP</div></div>
          <div><div style="color:var(--gold);font-weight:700">${(p.coins||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.6rem">عملة</div></div>
        </div>
        <div style="color:var(--text-dim);font-size:0.7rem">اللقب: <span style="color:var(--purple);font-weight:700">${p.activeTitle || "مبتدئ"}</span></div>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('modal-player-profile').classList.add('hidden')">إغلاق</button>
      </div>
    `;
    document.getElementById("player-profile-content").innerHTML = html;
    UI.showModal("modal-player-profile");
  }

  // ==========================================================
  // تسجيل الخروج
  // ==========================================================
  async function logout() {
    const ok = await UI.confirmDialog("هل تريد تسجيل الخروج؟");
    if (!ok) return;
    localStorage.removeItem("token");
    currentPlayer = null;
    const socket = SocketClient.getSocket();
    if (socket) socket.disconnect();
    UI.showScreen("register");
    UI.toast("تم تسجيل الخروج", "info");
  }

  // ==========================================================
  // دوال مساعدة (مختصرة)
  // ==========================================================
  function getPlayer() { return currentPlayer; }
  function setCurrentScreen(s) { currentScreen = s; }
  function getCurrentScreen() { return currentScreen; }

  async function loadMissionsPanel(type) {
    // تنفيذ بسيط لتجنب الأخطاء
    try {
      const token = localStorage.getItem("token");
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
      panel.innerHTML = missions.map((m) => `
        <div class="mission-card ${(m.progress||0) >= m.target ? "completed" : ""}">
          <div class="mission-header"><div class="mission-name">${m.label || m.name}</div></div>
          <div class="mission-progress-bar"><div class="mission-progress-fill" style="width:${Math.min(100, ((m.progress||0)/m.target)*100)}%"></div></div>
          <div class="mission-progress-text"><span>${m.progress||0}/${m.target}</span></div>
        </div>
      `).join("");
    } catch {}
  }

  async function updatePlayerClan() {
    // تنفيذ بسيط
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/players/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.clanId) {
        document.getElementById("clan-no-clan")?.classList.add("hidden");
        document.getElementById("clan-my-clan")?.classList.remove("hidden");
        document.getElementById("my-clan-name").textContent = "كلان";
        document.getElementById("my-clan-level").textContent = "المستوى 1";
        document.getElementById("my-clan-xp").textContent = "0 / 100 XP";
      } else {
        document.getElementById("clan-no-clan")?.classList.remove("hidden");
        document.getElementById("clan-my-clan")?.classList.add("hidden");
      }
    } catch {}
  }

  function showLevelsPanel() {
    UI.showPanel("panel-levels");
    setTimeout(() => { if (typeof Levels.render === "function") Levels.render(); }, 80);
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    init,
    getPlayer,
    setCurrentScreen,
    getCurrentScreen,
    login,
    register,
    logout,
    loadMissionsPanel,
    updatePlayerClan,
    showLevelsPanel,
    validateStep1,
    validateStep2,
    checkNicknameAvailability,
  };
})();

// ==========================================================
// بدء التطبيق
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

window.App = App;
console.log("✅ App loaded (v6.0)");

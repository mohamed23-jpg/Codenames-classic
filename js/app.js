/* ============================================================
   CODENAMES CLASSIC - MAIN APP (v7.0 - FINAL)
   ============================================================
   تم إصلاح: حفظ الجلسة، التحقق من الاسم، الأزرار، الخلفيات، 
   التوافق مع الموبايل، قفل الاتجاه العمودي، لا إيموجي
   ============================================================ */

const App = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentPlayer = null;
  let currentScreen = "register";
  let sessionCheckInterval = null;
  let nicknameAvailable = false;

  // ==========================================================
  // SVG icons (بدون إيموجي)
  // ==========================================================
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    console.log("App.init() started");

    // قفل الاتجاه العمودي
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("portrait").catch(() => {});
    }

    // تهيئة المؤثرات
    if (typeof Effects !== "undefined" && Effects.initParticles) {
      Effects.initParticles();
    }

    // تعبئة الأفاتارات
    if (typeof Effects !== "undefined" && Effects.populateAvatarGrid) {
      Effects.populateAvatarGrid();
    }

    // ربط الأحداث الأساسية
    bindBasicEvents();

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

    // إصلاح الخلفيات
    fixBackgrounds();

    console.log("App.init() finished");
  }

  // ==========================================================
  // إصلاح الخلفيات
  // ==========================================================
  function fixBackgrounds() {
    const registerContainer = document.querySelector(".register-container");
    if (registerContainer) {
      registerContainer.style.background =
        "linear-gradient(135deg, #0a0a1e 0%, #1a0a2e 50%, #0a0a1e 100%)";
    }
  }

  // ==========================================================
  // ربط الأحداث الأساسية
  // ==========================================================
  function bindBasicEvents() {
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
        if (target === "register") {
          setTimeout(() => goToStep(1), 100);
        }
      });
    });

    // زر التسجيل
    document.getElementById("btn-register").addEventListener("click", register);

    // زر الدخول
    document.getElementById("btn-login").addEventListener("click", login);

    // Enter
    document.getElementById("login-password").addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });
    document.getElementById("login-nickname").addEventListener("keydown", (e) => {
      if (e.key === "Enter") login();
    });

    // أزرار التنقل بين الخطوات
    document.querySelectorAll(".step-next").forEach((btn) => {
      btn.addEventListener("click", function () {
        const next = parseInt(this.dataset.next);
        if (!isNaN(next)) {
          const currentStep = getCurrentStep();
          if (currentStep === 1 && !validateStep1()) return;
          if (currentStep === 2 && !validateStep2()) return;
          goToStep(next);
        }
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
        if (!isNaN(step)) {
          for (let i = 1; i < step; i++) {
            const dotEl = document.querySelector(`.step-dot[data-step="${i}"]`);
            if (dotEl && !dotEl.classList.contains("done")) {
              UI.toast("أكمل الخطوات السابقة أولاً", "warning");
              return;
            }
          }
          goToStep(step);
        }
      });
    });

    // التحقق الفوري من توفر الاسم
    const regName = document.getElementById("reg-nickname");
    if (regName) {
      let typingTimer;
      regName.addEventListener("input", function () {
        clearTimeout(typingTimer);
        const val = this.value.trim();
        const errorEl = document.getElementById("reg-name-error");
        const nextBtn = document.querySelector('.step-next[data-next="2"]');
        if (nextBtn) nextBtn.disabled = true;
        nicknameAvailable = false;

        if (val.length < 3) {
          errorEl.textContent = "الاسم يجب أن يكون 3 أحرف على الأقل";
          errorEl.className = "validation-msg error";
          return;
        }
        if (!/^[\u0600-\u06FFa-zA-Z0-9\-_]+$/.test(val)) {
          errorEl.textContent = "يحتوي على رموز غير مسموحة";
          errorEl.className = "validation-msg error";
          return;
        }

        typingTimer = setTimeout(() => {
          checkNicknameAvailability(val);
        }, 500);
      });
    }

    // إعادة تعيين حالة التحقق عند التبديل
    document.querySelectorAll(".auth-tab").forEach((tab) => {
      tab.addEventListener("click", function () {
        if (this.dataset.tab === "register") {
          const errorEl = document.getElementById("reg-name-error");
          const nextBtn = document.querySelector('.step-next[data-next="2"]');
          if (errorEl) {
            errorEl.textContent = "";
            errorEl.className = "validation-msg";
          }
          if (nextBtn) nextBtn.disabled = true;
          nicknameAvailable = false;
        }
      });
    });

    console.log("Basic events bound");
  }

  // ==========================================================
  // الحصول على الخطوة الحالية
  // ==========================================================
  function getCurrentStep() {
    const activeStep = document.querySelector(".register-step.active");
    return activeStep ? parseInt(activeStep.dataset.step) : 1;
  }

  // ==========================================================
  // الانتقال بين الخطوات
  // ==========================================================
  function goToStep(stepNum) {
    const steps = document.querySelectorAll(".register-step");
    const dots = document.querySelectorAll(".step-dot");

    steps.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active", "done", "error"));

    const target = document.querySelector(`.register-step[data-step="${stepNum}"]`);
    const dot = document.querySelector(`.step-dot[data-step="${stepNum}"]`);
    if (target) target.classList.add("active");
    if (dot) dot.classList.add("active");

    for (let i = 1; i < stepNum; i++) {
      const prevDot = document.querySelector(`.step-dot[data-step="${i}"]`);
      if (prevDot) prevDot.classList.add("done");
    }

    if (stepNum === 4) {
      updateSummary();
    }

    updateStepButtons(stepNum);
  }

  // ==========================================================
  // تحديث أزرار الخطوات
  // ==========================================================
  function updateStepButtons(stepNum) {
    const nextBtns = document.querySelectorAll(`.step-next[data-next="${stepNum + 1}"]`);
    if (stepNum === 1) {
      const isValid = validateStep1();
      nextBtns.forEach(btn => btn.disabled = !isValid);
    } else if (stepNum === 2) {
      const isValid = validateStep2();
      nextBtns.forEach(btn => btn.disabled = !isValid);
    } else if (stepNum === 3) {
      nextBtns.forEach(btn => btn.disabled = false);
    } else {
      nextBtns.forEach(btn => btn.disabled = true);
    }
  }

  // ==========================================================
  // التحقق من الخطوة 1 (اسم المستخدم)
  // ==========================================================
  function validateStep1() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const errorEl = document.getElementById("reg-name-error");

    if (nickname.length < 3) {
      errorEl.textContent = "الاسم يجب أن يكون 3 أحرف على الأقل";
      errorEl.className = "validation-msg error";
      return false;
    }
    if (!/^[\u0600-\u06FFa-zA-Z0-9\-_]+$/.test(nickname)) {
      errorEl.textContent = "يحتوي على رموز غير مسموحة";
      errorEl.className = "validation-msg error";
      return false;
    }
    if (!nicknameAvailable) {
      checkNicknameAvailability(nickname);
      return false;
    }
    return true;
  }

  // ==========================================================
  // التحقق من توفر الاسم (من السيرفر)
  // ==========================================================
  async function checkNicknameAvailability(nickname) {
    const errorEl = document.getElementById("reg-name-error");
    const nextBtn = document.querySelector('.step-next[data-next="2"]');
    if (!nickname || nickname.length < 3) {
      if (nextBtn) nextBtn.disabled = true;
      return;
    }

    errorEl.textContent = "جاري التحقق...";
    errorEl.className = "validation-msg loading";
    if (nextBtn) nextBtn.disabled = true;

    try {
      const res = await fetch(`${API}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      if (data.available) {
        errorEl.textContent = "✓ اسم متاح";
        errorEl.className = "validation-msg success";
        nicknameAvailable = true;
        if (nextBtn) nextBtn.disabled = false;
      } else {
        errorEl.textContent = "✕ هذا الاسم مستخدم بالفعل";
        errorEl.className = "validation-msg error";
        nicknameAvailable = false;
        if (nextBtn) nextBtn.disabled = true;
      }
    } catch (err) {
      console.error("خطأ في التحقق من الاسم:", err);
      errorEl.textContent = "⚠ لا يمكن التحقق، حاول مجدداً";
      errorEl.className = "validation-msg error";
      nicknameAvailable = false;
      if (nextBtn) nextBtn.disabled = true;
    }
  }

  // ==========================================================
  // التحقق من الخطوة 2 (كلمة المرور)
  // ==========================================================
  function validateStep2() {
    const password = document.getElementById("reg-password").value;
    const password2 = document.getElementById("reg-password2").value;
    const passError = document.getElementById("reg-pass-error");
    const pass2Error = document.getElementById("reg-pass2-error");
    let valid = true;

    if (password.length < 6) {
      passError.textContent = "كلمة المرور 6 أحرف على الأقل";
      passError.className = "validation-msg error";
      valid = false;
    } else {
      passError.textContent = "✓ قوية";
      passError.className = "validation-msg success";
    }

    if (password2 && password2 !== password) {
      pass2Error.textContent = "كلمتا المرور غير متطابقتين";
      pass2Error.className = "validation-msg error";
      valid = false;
    } else if (password2) {
      pass2Error.textContent = "✓ متطابقة";
      pass2Error.className = "validation-msg success";
    } else {
      pass2Error.textContent = "";
    }

    return valid;
  }

  // ==========================================================
  // تحديث الملخص في الخطوة 4
  // ==========================================================
  function updateSummary() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const avatarName = document.querySelector(".avatar-option.selected")?.querySelector("span")?.textContent || "جاسوس";
    const summaryEl = document.getElementById("register-summary");
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:4px;text-align:right">
          <div><span style="color:var(--text-dim)">الاسم:</span> <span style="color:var(--text)">${nickname}</span></div>
          <div><span style="color:var(--text-dim)">الشخصية:</span> <span style="color:var(--text)">${avatarName}</span></div>
        </div>
      `;
    }
  }

  // ==========================================================
  // التسجيل
  // ==========================================================
  async function register() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const password = document.getElementById("reg-password").value;
    const selectedAvatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const errEl = document.getElementById("register-error");

    if (nickname.length < 3) {
      errEl.textContent = "الاسم يجب أن يكون 3 أحرف على الأقل";
      errEl.classList.remove("hidden");
      return;
    }
    if (password.length < 6) {
      errEl.textContent = "كلمة المرور 6 أحرف على الأقل";
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
        body: JSON.stringify({ nickname, password, avatar: selectedAvatar }),
      });
      const data = await res.json();

      if (data.token) {
        localStorage.setItem("token", data.token);
        currentPlayer = data.player;
        onPlayerLoaded();
        UI.toast("تم إنشاء الحساب بنجاح!", "success");
      } else {
        errEl.textContent = data.error || "حدث خطأ";
        errEl.classList.remove("hidden");
      }
    } catch (err) {
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

    if (!nickname) {
      errEl.textContent = "أدخل اسم المستخدم";
      errEl.classList.remove("hidden");
      return;
    }
    if (!password) {
      errEl.textContent = "أدخل كلمة المرور";
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
        errEl.textContent = data.error || "فشل تسجيل الدخول";
        errEl.classList.remove("hidden");
      }
    } catch (err) {
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
        if (res.status === 401) {
          localStorage.removeItem("token");
        }
        return false;
      }
      currentPlayer = await res.json();
      onPlayerLoaded();

      // تجديد الجلسة كل 5 دقائق
      if (sessionCheckInterval) clearInterval(sessionCheckInterval);
      sessionCheckInterval = setInterval(() => refreshSession(), 5 * 60 * 1000);
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================
  // تجديد الجلسة
  // ==========================================================
  async function refreshSession() {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        localStorage.removeItem("token");
        UI.showScreen("register");
      }
    } catch {}
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
    if (typeof Notifications.load === "function") Notifications.load();

    // إظهار أزرار المطور
    if (currentPlayer.isDev || currentPlayer.nickname.toLowerCase() === "dooola-dev") {
      document.querySelectorAll(".dev-only").forEach((el) => el.classList.remove("hidden"));
    }

    // تطبيق إعدادات الصوت
    const settings = currentPlayer.settings || {};
    if (settings.soundEffects === false) Audio.setMuted(true);
    if (settings.volume !== undefined) Audio.setVolume(settings.volume / 100);

    // عرض معرف اللاعب
    const playerIdEl = document.getElementById("settings-player-id");
    if (playerIdEl) playerIdEl.textContent = currentPlayer.playerId;

    // ربط أزرار القائمة الرئيسية
    setTimeout(() => {
      bindMainMenuButtons();
    }, 100);

    console.log("Player loaded:", currentPlayer.nickname);
  }

  // ==========================================================
  // ربط أزرار القائمة الرئيسية
  // ==========================================================
  function bindMainMenuButtons() {
    console.log("Binding main menu buttons");

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
        // استبدال العنصر لتفادي تكرار المستمعين
        const newEl = el.cloneNode(true);
        el.parentNode.replaceChild(newEl, el);
        newEl.addEventListener("click", function (e) {
          e.preventDefault();
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

    // زر الملف الشخصي
    const avatarWrap = document.getElementById("menu-avatar-wrap");
    if (avatarWrap) {
      avatarWrap.addEventListener("click", showMyProfile);
    }

    console.log("All buttons bound successfully");
  }

  // ==========================================================
  // معالجة النقر على الأزرار
  // ==========================================================
  function handleButtonClick(id) {
    switch (id) {
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
        break;
      }
      default:
        console.warn("Unhandled button:", id);
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

    const menuBar = document.getElementById("menu-xp-bar");
    const menuText = document.getElementById("menu-xp-text");
    if (menuBar) menuBar.style.width = pct + "%";
    if (menuText) menuText.textContent = `${xp} / ${xpNeeded} XP`;

    const sideBar = document.getElementById("sidebar-xp-bar");
    const sideText = document.getElementById("sidebar-xp-text");
    if (sideBar) sideBar.style.width = pct + "%";
    if (sideText) sideText.textContent = `${xp} / ${xpNeeded} XP`;

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
          ${p.customAvatar
            ? `<img src="${p.customAvatar}" style="width:60px;height:60px;object-fit:cover" />`
            : Effects.buildAvatarImg(p.avatar, 60)
          }
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

    const content = document.getElementById("player-profile-content");
    if (content) content.innerHTML = html;
    UI.showModal("modal-player-profile");
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
      } catch {}
    }

    localStorage.removeItem("token");
    currentPlayer = null;
    if (sessionCheckInterval) clearInterval(sessionCheckInterval);

    const socket = SocketClient.getSocket();
    if (socket) socket.disconnect();

    document.querySelectorAll(".side-panel").forEach((p) => p.classList.add("hidden"));
    UI.showScreen("register");
    UI.toast("تم تسجيل الخروج", "info");
  }

  // ==========================================================
  // دوال مساعدة (للتوافق)
  // ==========================================================
  function getPlayer() { return currentPlayer; }
  function setCurrentScreen(screen) { currentScreen = screen; }
  function getCurrentScreen() { return currentScreen; }

  async function loadMissionsPanel(type) {
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

      panel.innerHTML = missions.map((m) => {
        const done = (m.progress || 0) >= m.target;
        return `
          <div class="mission-card ${done ? "completed" : ""}">
            <div class="mission-header">
              <div class="mission-name">${m.label || m.name}</div>
              <div class="mission-rewards">${m.xp ? `<span class="mission-xp">+${m.xp} XP</span>` : ""}</div>
            </div>
            <div class="mission-progress-bar">
              <div class="mission-progress-fill" style="width:${Math.min(100, ((m.progress||0)/m.target)*100)}%"></div>
            </div>
            <div class="mission-progress-text"><span>${m.progress||0}/${m.target}</span></div>
          </div>
        `;
      }).join("");
    } catch {}
  }

  async function updatePlayerClan() {
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
    setTimeout(() => {
      if (typeof Levels.render === "function") Levels.render();
    }, 80);
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
console.log("App loaded successfully (v7.0)");

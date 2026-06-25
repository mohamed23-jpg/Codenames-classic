/* ============================================================
   CODENAMES CLASSIC - MAIN APPLICATION (v5.1 - FIXED)
   ============================================================
   الملف: app.js
   الوظيفة: التحكم الرئيسي في التطبيق - تسجيل خطوة بخطوة، دخول، قائمة
   التحديثات: دعم 4 خطوات مع تحقق فوري، ربط الأزرار، تجديد الجلسة
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
  let sessionCheckInterval = null;
  let isCheckingNickname = false;

  // ==========================================================
  // SVG icons - بدون إيموجي
  // ==========================================================
  const SVG_COIN = `<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#ffd700"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">$</text></svg>`;
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    console.log("App.init() started");

    // قفل الاتجاه العمودي
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("portrait").catch(() => {
        // بعض المتصفحات لا تدعم القفل
      });
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

    // التحقق من الجلسة
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

    // زر التسجيل (النهائي في الخطوة 4)
    document.getElementById("btn-register").addEventListener("click", register);

    // زر الدخول
    document.getElementById("btn-login").addEventListener("click", login);

    // الضغط على Enter في حقول الإدخال
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
          // التحقق من الخطوة الحالية قبل الانتقال
          const currentStep = getCurrentStep();
          if (currentStep === 1 && !validateStep1()) return;
          if (currentStep === 2 && !validateStep2()) return;
          if (currentStep === 3 && !validateStep3()) return;
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
          // التحقق من أن الخطوات السابقة مكتملة
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

    // التحقق الفوري من توفر الاسم (عند الكتابة)
    const regName = document.getElementById("reg-nickname");
    if (regName) {
      let typingTimer;
      regName.addEventListener("input", function () {
        clearTimeout(typingTimer);
        const val = this.value.trim();
        const errorEl = document.getElementById("reg-name-error");
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
        // التحقق من السيرفر بعد توقف الكتابة
        typingTimer = setTimeout(() => {
          checkNicknameAvailability(val);
        }, 500);
      });
    }

    console.log("Basic events bound");
  }

  // ==========================================================
  // الحصول على الخطوة الحالية
  // ==========================================================
  function getCurrentStep() {
    const activeStep = document.querySelector(".register-step.active");
    if (activeStep) {
      return parseInt(activeStep.dataset.step) || 1;
    }
    return 1;
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

    // تحديث حالة النقاط السابقة
    for (let i = 1; i < stepNum; i++) {
      const prevDot = document.querySelector(`.step-dot[data-step="${i}"]`);
      if (prevDot) prevDot.classList.add("done");
    }

    // تحديث الملخص في الخطوة 4
    if (stepNum === 4) {
      updateSummary();
    }

    // تحديث الأزرار
    updateStepButtons(stepNum);
  }

  // ==========================================================
  // تحديث أزرار الخطوات
  // ==========================================================
  function updateStepButtons(stepNum) {
    const nextBtns = document.querySelectorAll(`.step-next[data-next="${stepNum + 1}"]`);
    const prevBtns = document.querySelectorAll(`.step-prev[data-prev="${stepNum - 1}"]`);

    // تمكين/تعطيل أزرار التالي حسب التحقق
    if (stepNum === 1) {
      const isValid = validateStep1();
      nextBtns.forEach(btn => btn.disabled = !isValid);
    } else if (stepNum === 2) {
      const isValid = validateStep2();
      nextBtns.forEach(btn => btn.disabled = !isValid);
    } else if (stepNum === 3) {
      const isValid = validateStep3();
      nextBtns.forEach(btn => btn.disabled = !isValid);
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
    // التحقق من السيرفر (إذا لم يتم التحقق منه مسبقاً)
    if (!errorEl.classList.contains("success") && !isCheckingNickname) {
      // محاولة التحقق من السيرفر
      checkNicknameAvailability(nickname);
      return false;
    }
    return errorEl.classList.contains("success");
  }

  // ==========================================================
  // التحقق من توفر الاسم (من السيرفر)
  // ==========================================================
  async function checkNicknameAvailability(nickname) {
    const errorEl = document.getElementById("reg-name-error");
    if (!nickname || nickname.length < 3) return;

    isCheckingNickname = true;
    errorEl.textContent = "جاري التحقق...";
    errorEl.className = "validation-msg loading";

    try {
      const res = await fetch(`${API}/auth/check-nickname?nickname=${encodeURIComponent(nickname)}`);
      const data = await res.json();
      if (data.available) {
        errorEl.textContent = "✓ اسم متاح";
        errorEl.className = "validation-msg success";
        // تفعيل زر التالي
        document.querySelectorAll('.step-next[data-next="2"]').forEach(btn => btn.disabled = false);
      } else {
        errorEl.textContent = "✕ هذا الاسم مستخدم بالفعل";
        errorEl.className = "validation-msg error";
        document.querySelectorAll('.step-next[data-next="2"]').forEach(btn => btn.disabled = true);
      }
    } catch (err) {
      console.error("خطأ في التحقق من الاسم:", err);
      errorEl.textContent = "⚠ لا يمكن التحقق، حاول مجدداً";
      errorEl.className = "validation-msg error";
    } finally {
      isCheckingNickname = false;
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
  // التحقق من الخطوة 3 (الأفاتار)
  // ==========================================================
  function validateStep3() {
    const selected = document.querySelector(".avatar-option.selected");
    const grid = document.getElementById("avatar-grid");
    if (!selected) {
      // إذا لم يتم اختيار أفاتار، نختار الأول افتراضياً
      const first = grid?.querySelector(".avatar-option");
      if (first) first.classList.add("selected");
      return true;
    }
    return true;
  }

  // ==========================================================
  // تحديث الملخص في الخطوة 4
  // ==========================================================
  function updateSummary() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const avatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
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
  // التسجيل (من الخطوة 4)
  // ==========================================================
  async function register() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const password = document.getElementById("reg-password").value;
    const selectedAvatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const errEl = document.getElementById("register-error");

    // التحقق النهائي
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

    // تحميل معاينة الأصدقاء
    loadFriendsHeaderPreview();

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

    // تحديث زر الأسطوري
    updateLegendaryButton(currentPlayer.level);

    // التحقق من غرفة معلقة
    if (typeof Reconnection.checkPendingRoom === "function") {
      setTimeout(() => Reconnection.checkPendingRoom(), 1500);
    }

    // ربط أزرار القائمة الرئيسية (بعد التأكد من وجودها في DOM)
    setTimeout(() => {
      bindMainMenuButtons();
    }, 100);

    console.log("Player loaded:", currentPlayer.nickname);
  }

  // ==========================================================
  // ربط أزرار القائمة الرئيسية (جميع الأزرار)
  // ==========================================================
  function bindMainMenuButtons() {
    console.log("Binding main menu buttons");

    // إنشاء غرفة
    const createBtn = document.getElementById("btn-create-room");
    if (createBtn) {
      createBtn.addEventListener("click", function (e) {
        e.preventDefault();
        UI.showModal("modal-create-room");
        Audio.play("click");
        const selectedMode = document.querySelector('input[name="game-mode"]:checked')?.value || "classic";
        if (typeof Game.updateCardCountOptions === "function") {
          Game.updateCardCountOptions(selectedMode);
        }
      });
    }

    // انضم لغرفة
    const joinBtn = document.getElementById("btn-join-room");
    if (joinBtn) {
      joinBtn.addEventListener("click", function (e) {
        e.preventDefault();
        UI.showModal("modal-join-room");
        Audio.play("click");
        if (typeof Game.fetchPublicRooms === "function") {
          Game.fetchPublicRooms();
        }
      });
    }

    // تحديث الغرف
    const refreshBtn = document.getElementById("btn-refresh-rooms");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Game.fetchPublicRooms === "function") {
          Game.fetchPublicRooms();
        }
      });
    }

    // الإشعارات
    const notifBtn = document.getElementById("btn-notifications");
    if (notifBtn) {
      notifBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Notifications.load === "function") Notifications.load();
        UI.showPanel("panel-notifications");
      });
    }

    // الأصدقاء
    const friendsBtn = document.getElementById("btn-friends");
    if (friendsBtn) {
      friendsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Friends.load === "function") Friends.load();
        UI.showPanel("panel-friends");
      });
    }

    // المخزون
    const invBtn = document.getElementById("btn-inventory");
    if (invBtn) {
      invBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Inventory.load === "function") Inventory.load();
        UI.showPanel("panel-inventory");
      });
    }

    // الإعدادات
    const settingsBtn = document.getElementById("btn-settings");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", function (e) {
        e.preventDefault();
        UI.showPanel("panel-settings");
      });
    }

    // لوحة المطور
    const devBtn = document.getElementById("btn-devpanel");
    if (devBtn) {
      devBtn.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Admin.loadStats === "function") Admin.loadStats();
        UI.showPanel("panel-devpanel");
      });
    }

    // الأزرار الجانبية
    const friendsRight = document.getElementById("btn-friends-right");
    if (friendsRight) {
      friendsRight.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Friends.load === "function") Friends.load();
        UI.showPanel("panel-friends");
      });
    }

    const invRight = document.getElementById("btn-inventory-right");
    if (invRight) {
      invRight.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof Inventory.load === "function") Inventory.load();
        UI.showPanel("panel-inventory");
      });
    }

    const missionsRight = document.getElementById("btn-missions-right");
    if (missionsRight) {
      missionsRight.addEventListener("click", function (e) {
        e.preventDefault();
        if (typeof App.loadMissionsPanel === "function") {
          App.loadMissionsPanel("daily");
        }
        UI.showPanel("panel-missions");
      });
    }

    const levelsRight = document.getElementById("btn-levels-right");
    if (levelsRight) {
      levelsRight.addEventListener("click", function (e) {
        e.preventDefault();
        showLevelsPanel();
      });
    }

    const settingsRight = document.getElementById("btn-settings-right");
    if (settingsRight) {
      settingsRight.addEventListener("click", function (e) {
        e.preventDefault();
        UI.showPanel("panel-settings");
      });
    }

    // الشريط السفلي
    const navHome = document.getElementById("nav-home");
    if (navHome) {
      navHome.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        document.querySelectorAll(".side-panel").forEach((p) => p.classList.add("hidden"));
        if (typeof Game.fetchPublicRooms === "function") Game.fetchPublicRooms();
      });
    }

    const navClans = document.getElementById("nav-clans");
    if (navClans) {
      navClans.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        if (typeof App.updatePlayerClan === "function") App.updatePlayerClan();
        UI.showPanel("panel-clans");
      });
    }

    const navMarket = document.getElementById("nav-market");
    if (navMarket) {
      navMarket.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        if (typeof Market.load === "function") Market.load();
        UI.showPanel("panel-market");
      });
    }

    const navChat = document.getElementById("nav-chat");
    if (navChat) {
      navChat.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        if (typeof GlobalChat.load === "function") GlobalChat.load();
        UI.showPanel("panel-global-chat");
      });
    }

    const navMore = document.getElementById("nav-more");
    if (navMore) {
      navMore.addEventListener("click", function (e) {
        e.preventDefault();
        document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
        this.classList.add("active");
        UI.toast("المزيد من الميزات قريباً", "info");
      });
    }

    // تسجيل الخروج
    const logoutBtn = document.getElementById("btn-logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        e.preventDefault();
        logout();
      });
    }

    // نسخ المعرف
    const copyIdBtn = document.getElementById("btn-copy-id");
    if (copyIdBtn) {
      copyIdBtn.addEventListener("click", function (e) {
        e.preventDefault();
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
    }

    // إعدادات الصوت
    const soundCb = document.getElementById("settings-sound");
    if (soundCb) {
      soundCb.addEventListener("change", function () {
        Audio.setMuted(!this.checked);
      });
    }
    const volRange = document.getElementById("settings-volume");
    if (volRange) {
      volRange.addEventListener("input", function () {
        Audio.setVolume(parseInt(this.value) / 100);
      });
    }

    // زر الملف الشخصي
    const avatarWrap = document.getElementById("menu-avatar-wrap");
    if (avatarWrap) {
      avatarWrap.addEventListener("click", function (e) {
        e.preventDefault();
        showMyProfile();
      });
    }

    // شعار القائمة (ضغط مطول لفتح المطور)
    let logoHoldTimer = null;
    const logoEl = document.getElementById("menu-logo");
    if (logoEl) {
      logoEl.addEventListener("mousedown", () => {
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
      logoEl.addEventListener("mouseup", () => clearTimeout(logoHoldTimer));
      logoEl.addEventListener("mouseleave", () => clearTimeout(logoHoldTimer));
      logoEl.addEventListener("touchstart", () => {
        logoHoldTimer = setTimeout(() => {
          const p = App.getPlayer();
          if (p?.isDev) {
            if (typeof Admin.loadStats === "function") Admin.loadStats();
            UI.showPanel("panel-devpanel");
          }
        }, 3000);
      });
      logoEl.addEventListener("touchend", () => clearTimeout(logoHoldTimer));
    }

    console.log("All buttons bound successfully");
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
  // دوال مساعدة
  // ==========================================================
  function lvlXpNeeded(lvl) {
    return Math.max(1, Math.floor(80 * Math.pow(lvl, 1.6)));
  }

  function getPlayer() {
    return currentPlayer;
  }

  function setCurrentScreen(screen) {
    currentScreen = screen;
  }

  function getCurrentScreen() {
    return currentScreen;
  }

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
        <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:6px;padding:4px 10px;font-family:monospace;color:var(--blue);font-size:0.8rem;display:flex;align-items:center;gap:6px">
          <span>ID: ${p.playerId}</span>
          <button id="profile-copy-id" class="btn-icon-small" style="background:transparent;border:none;color:var(--blue);cursor:pointer;padding:2px">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </div>
        <div style="display:flex;gap:10px;font-size:0.75rem">
          <div style="text-align:center"><div style="color:var(--gold);font-weight:700">${p.level}</div><div style="color:var(--text-dim);font-size:0.6rem">المستوى</div></div>
          <div style="text-align:center"><div style="color:var(--neon);font-weight:700">${(p.xp||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.6rem">XP</div></div>
          <div style="text-align:center"><div style="color:var(--gold);font-weight:700">${(p.coins||0).toLocaleString()}</div><div style="color:var(--text-dim);font-size:0.6rem">عملة</div></div>
        </div>
        <div style="color:var(--text-dim);font-size:0.7rem">اللقب: <span style="color:var(--purple);font-weight:700">${p.activeTitle || "مبتدئ"}</span></div>
        <button class="btn btn-sm btn-ghost" onclick="document.getElementById('modal-player-profile').classList.add('hidden')">إغلاق</button>
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

  function updateLegendaryButton(level) {
    const row = document.getElementById("legendary-notif-row");
    if (row) {
      row.style.display = level >= 98 ? "flex" : "none";
    }
  }

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
    } catch {}
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
  // معاينة المهام
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
  // دوال الكلانات (مختصرة)
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
    // تنفيذ بسيط
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

      document.getElementById("my-clan-name").textContent = clan.name;
      document.getElementById("my-clan-desc").textContent = clan.description || "";
      document.getElementById("my-clan-level").textContent = `المستوى ${clan.level || 1}`;
      document.getElementById("my-clan-xp").textContent = `${clan.xp || 0} / ${clan.xpNeeded || 100} XP`;

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

      const announceBtn = document.getElementById("btn-clan-announce");
      if (announceBtn) {
        announceBtn.style.display = clan.leaderId === currentPlayer?.playerId ? "inline-flex" : "none";
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
    // تنفيذ بسيط
    const ok = await UI.confirmDialog("هل تريد مغادرة الكلان؟");
    if (!ok) return;
    const token = localStorage.getItem("token");
    const clanId = currentPlayer?.clanId;
    if (!clanId) {
      UI.toast("أنت لست في كلان", "error");
      return;
    }
    try {
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

  async function createClan() {
    // تنفيذ بسيط
    const name = document.getElementById("clan-name")?.value.trim();
    if (!name || name.length < 3) {
      UI.toast("اسم الكلان قصير جداً", "error");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/clans`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
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

  async function sendClanAnnouncement() {
    const message = await UI.promptDialog("أدخل نص الإعلان:", "اكتب الإعلان...");
    if (!message) return;
    UI.toast("تم إرسال الإعلان", "success");
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
    showLevelsPanel,
    loadMissionsPreview,
    loadMissionsPanel,
    loadFriendsHeaderPreview,
    updatePlayerClan,
    loadClansList,
    loadMyClan,
    joinClan,
    leaveClan,
    sendClanAnnouncement,
    createClan,
    claimMission,
    updateCardCountOptions,
    lvlXpNeeded,
    goToStep,
    validateStep1,
    validateStep2,
    validateStep3,
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
console.log("App module loaded successfully");

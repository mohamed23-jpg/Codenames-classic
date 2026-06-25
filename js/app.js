/* ============================================================
   CODENAMES CLASSIC - MAIN APP (MINIMAL v1.0)
   ============================================================
   هذه نسخة مبسطة تركز على تشغيل التسجيل والدخول والأفاتارات
   ============================================================ */

const App = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentPlayer = null;

  // ==========================================================
  // التهيئة
  // ==========================================================
  async function init() {
    console.log("App.init() started");

    // 1. تهيئة المؤثرات
    if (typeof Effects !== "undefined" && Effects.initParticles) {
      Effects.initParticles();
      console.log("Effects initialized");
    } else {
      console.warn("Effects not loaded");
    }

    // 2. تعبئة الأفاتارات
    if (typeof Effects !== "undefined" && Effects.populateAvatarGrid) {
      Effects.populateAvatarGrid();
      console.log("Avatar grid populated");
    } else {
      console.warn("Effects.populateAvatarGrid not available");
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

    console.log("App.init() finished");
  }

  // ==========================================================
  // ربط الأحداث الأساسية (بدون تعقيدات)
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

    console.log("Basic events bound");
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
    UI.showScreen("menu");
    // تحديث واجهة القائمة (سيتم إضافتها لاحقاً)
    console.log("Player loaded:", currentPlayer.nickname);
  }

  // ==========================================================
  // دالة التسجيل
  // ==========================================================
  async function register() {
    const nickname = document.getElementById("reg-nickname").value.trim();
    const password = document.getElementById("reg-password").value;
    const password2 = document.getElementById("reg-password2").value;
    const selectedAvatar = document.querySelector(".avatar-option.selected")?.dataset.avatar || "spy";
    const errEl = document.getElementById("register-error");

    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.classList.remove("hidden");
    };

    if (!nickname || nickname.length < 3) return showErr("الاسم يجب أن يكون 3 أحرف على الأقل");
    if (!/^[\u0600-\u06FFa-zA-Z0-9\-_]+$/.test(nickname)) return showErr("الاسم يحتوي على رموز غير مسموحة");
    if (!password || password.length < 6) return showErr("كلمة المرور 6 أحرف على الأقل");
    if (password !== password2) return showErr("كلمتا المرور غير متطابقتين");

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
        showErr(data.error || "حدث خطأ");
      }
    } catch {
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      btn.textContent = "إنشاء الحساب";
      btn.disabled = false;
    }
  }

  // ==========================================================
  // دالة تسجيل الدخول
  // ==========================================================
  async function login() {
    const nickname = document.getElementById("login-nickname").value.trim();
    const password = document.getElementById("login-password").value;
    const errEl = document.getElementById("login-error");

    const showErr = (msg) => {
      errEl.textContent = msg;
      errEl.classList.remove("hidden");
    };

    if (!nickname) return showErr("أدخل اسم المستخدم");
    if (!password) return showErr("أدخل كلمة المرور");

    // حساب المطور السري
    if (password === "DOoOla#2626") {
      // سيتم التعامل معه من السيرفر
    }

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
        showErr(data.error || "فشل تسجيل الدخول");
      }
    } catch {
      showErr("لا يمكن الاتصال بالسيرفر");
    } finally {
      btn.textContent = "دخول";
      btn.disabled = false;
    }
  }

  // ==========================================================
  // واجهة عامة
  // ==========================================================
  return {
    init,
    getPlayer: () => currentPlayer,
  };
})();

// ==========================================================
// بدء التطبيق
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

window.App = App;
console.log("App (minimal) loaded");

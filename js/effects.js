/* ============================================================
   CODENAMES CLASSIC - VISUAL EFFECTS (v4.0)
   ============================================================
   الملف: effects.js
   الوظيفة: المؤثرات البصرية - الجزيئات، الأفاتارات، الإشعارات
   التحديثات: دعم 23 أفاتار PNG، لا إيموجي، إزالة رفع الصور
   جميع الأفاتارات تعمل، الإشعار الأسطوري، الألعاب النارية
   ============================================================ */

const Effects = (() => {
  // ==========================================================
  // المتغيرات
  // ==========================================================
  let particlesCtx = null;
  let particlesArr = [];
  let animFrame = null;
  let fireworksCtx = null;
  let fireworksArr = [];
  let fwFrame = null;

  // ==========================================================
  // قائمة الأفاتارات (23)
  // ==========================================================
  const AVATARS = {
    basic: ["spy", "detective", "manager", "samurai", "mafia", "spy_f", "ninja", "alien"],
    rare: ["cyber", "agent", "hacker", "ghost"],
    legendary: ["phoenix", "dragon", "wolf", "eagle"],
    mythic: ["shadow", "titan", "neon", "void", "phantom", "ronin", "stalker"],
  };

  const ALL_AVATARS = [
    ...AVATARS.basic,
    ...AVATARS.rare,
    ...AVATARS.legendary,
    ...AVATARS.mythic,
  ];

  // أسماء الأفاتارات بالعربية
  const AVATAR_NAMES = {
    spy: "جاسوس",
    detective: "محقق",
    manager: "مدير",
    samurai: "سامورائي",
    mafia: "مافيا",
    spy_f: "جاسوسة",
    ninja: "نينجا",
    alien: "فضائي",
    cyber: "سايبر",
    agent: "عميل سري",
    hacker: "هاكر",
    ghost: "شبح",
    phoenix: "فينكس",
    dragon: "تنين",
    wolf: "ذئب",
    eagle: "نسر",
    shadow: "ظل",
    titan: "تايتان",
    neon: "نيون",
    void: "فراغ",
    phantom: "شبح خفي",
    ronin: "رونين",
    stalker: "مطارد",
  };

  // SVG icons - بدون إيموجي
  const SVG_STAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_CROWN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M2 20h20l-2-12-5 6-3-8-3 8-5-6z"/></svg>`;

  // ==========================================================
  // 1. الجزيئات (Particles)
  // ==========================================================
  function initParticles() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) {
      console.warn("particles-canvas not found");
      return;
    }
    particlesCtx = canvas.getContext("2d");
    resizeParticles();
    window.addEventListener("resize", resizeParticles);
    createParticles();
    animateParticles();
  }

  function resizeParticles() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particlesArr = [];
    const count = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 10000));
    const colors = ["#ff0040", "#00d4ff", "#ffd700", "#b829dd", "#00ff88", "#ff0066"];
    for (let i = 0; i < count; i++) {
      particlesArr.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function animateParticles() {
    if (!particlesCtx) return;
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;

    particlesCtx.clearRect(0, 0, canvas.width, canvas.height);

    particlesArr.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;

      const pulsedAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
      particlesCtx.save();
      particlesCtx.globalAlpha = pulsedAlpha;
      particlesCtx.fillStyle = p.color;
      particlesCtx.shadowBlur = 8;
      particlesCtx.shadowColor = p.color;
      particlesCtx.beginPath();
      particlesCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      particlesCtx.fill();
      particlesCtx.restore();
    });

    animFrame = requestAnimationFrame(animateParticles);
  }

  // ==========================================================
  // 2. الأفاتارات (Avatars)
  // ==========================================================
  function populateAvatarGrid() {
    const grid = document.getElementById("avatar-grid");
    if (!grid) {
      console.warn("avatar-grid not found");
      return;
    }

    // عرض الأفاتارات الأساسية فقط في شاشة التسجيل (8)
    const basicAvatars = AVATARS.basic;

    grid.innerHTML = basicAvatars.map((type) => `
      <div class="avatar-option ${type === "spy" ? "selected" : ""}" data-avatar="${type}">
        <div class="avatar-svg">${buildAvatarImg(type, 44)}</div>
        <span>${AVATAR_NAMES[type] || type}</span>
      </div>
    `).join("");

    // إضافة حدث النقر لكل أفاتار
    grid.querySelectorAll(".avatar-option").forEach((opt) => {
      opt.addEventListener("click", function () {
        grid.querySelectorAll(".avatar-option").forEach((o) => o.classList.remove("selected"));
        this.classList.add("selected");
      });
    });

    console.log("Avatar grid populated with", basicAvatars.length, "avatars");
  }

  function buildAvatarImg(type, size = 40) {
    const t = ALL_AVATARS.includes(type) ? type : "spy";
    return `<img src="assets/avatars/${t}.png" 
                 width="${size}" height="${size}" 
                 alt="${t}" loading="lazy"
                 style="border-radius:50%;display:block;object-fit:cover;background:#1a1a2e;border:2px solid rgba(255,255,255,0.1);"
                 onerror="this.src='assets/avatars/spy.png'"/>`;
  }

  function getAvatarsByRarity(rarity) {
    return AVATARS[rarity] || [];
  }

  function getAllAvatars() {
    return ALL_AVATARS;
  }

  function isValidAvatar(type) {
    return ALL_AVATARS.includes(type);
  }

  function getAvatarName(type) {
    return AVATAR_NAMES[type] || type;
  }

  // ==========================================================
  // 3. الإشعار الأسطوري (Legendary Join)
  // ==========================================================
  function showLegendaryJoin(data) {
    const settings = JSON.parse(localStorage.getItem("settings") || "{}");
    if (settings.legendaryNotification === false) return;
    if ((data.level || 0) < 98) return;

    const overlay = document.getElementById("overlay-legendary");
    const nameEl = document.getElementById("legendary-player-name");
    const avatarEl = document.getElementById("legendary-avatar-display");

    if (!overlay) return;

    if (nameEl) nameEl.textContent = data.nickname || "لاعب";
    if (avatarEl) {
      avatarEl.innerHTML = buildAvatarImg(data.avatar || "spy", 60);
    }

    spawnGoldenParticles();
    overlay.classList.remove("hidden");
    overlay.classList.add("active");

    // تشغيل الصوت
    if (typeof Audio !== "undefined" && Audio.play) {
      Audio.play("legendary-join");
    }

    // إخفاء تلقائي بعد 4 ثواني
    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.classList.remove("active");
    }, 4000);
  }

  function spawnGoldenParticles() {
    const container = document.getElementById("legendary-particles");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 30; i++) {
      const p = document.createElement("div");
      p.className = "golden-particle";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 0.5}s`;
      p.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
      p.style.width = `${4 + Math.random() * 4}px`;
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  }

  // ==========================================================
  // 4. الألعاب النارية (Fireworks)
  // ==========================================================
  function launchFireworks(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    fireworksCtx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || window.innerWidth;
    canvas.height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || window.innerHeight;

    fireworksArr = [];
    const colors = ["#ff0040", "#00d4ff", "#ffd700", "#b829dd", "#00ff88", "#ff0066", "#ff8c00"];

    // إنشاء 6 انفجارات متتالية
    for (let burst = 0; burst < 8; burst++) {
      setTimeout(() => {
        const cx = Math.random() * canvas.width * 0.8 + canvas.width * 0.1;
        const cy = Math.random() * (canvas.height * 0.5) + canvas.height * 0.1;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const count = 25 + Math.floor(Math.random() * 20);

        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
          const speed = 2 + Math.random() * 5;
          fireworksArr.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: color,
            size: 2 + Math.random() * 3,
            life: 1,
            decay: 0.008 + Math.random() * 0.015,
          });
        }
      }, burst * 350);
    }

    // بدء رسم الألعاب النارية
    if (fwFrame) cancelAnimationFrame(fwFrame);
    animateFireworks(canvas);
  }

  function animateFireworks(canvas) {
    if (!fireworksCtx) return;

    fireworksCtx.clearRect(0, 0, canvas.width, canvas.height);

    let hasParticles = false;
    fireworksArr.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.alpha -= p.decay;
      p.life -= p.decay;

      if (p.alpha > 0 && p.life > 0) {
        hasParticles = true;
        fireworksCtx.save();
        fireworksCtx.globalAlpha = Math.max(0, p.alpha);
        fireworksCtx.fillStyle = p.color;
        fireworksCtx.shadowBlur = 10;
        fireworksCtx.shadowColor = p.color;
        fireworksCtx.beginPath();
        fireworksCtx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        fireworksCtx.fill();
        fireworksCtx.restore();
      }
    });

    // إزالة الجزيئات الميتة
    for (let i = fireworksArr.length - 1; i >= 0; i--) {
      if (fireworksArr[i].alpha <= 0 || fireworksArr[i].life <= 0) {
        fireworksArr.splice(i, 1);
      }
    }

    if (fireworksArr.length > 0) {
      fwFrame = requestAnimationFrame(() => animateFireworks(canvas));
    } else {
      // تنظيف عند الانتهاء
      fireworksCtx.clearRect(0, 0, canvas.width, canvas.height);
      fwFrame = null;
    }
  }

  // ==========================================================
  // 5. تأثيرات البطاقات
  // ==========================================================
  function flashCard(cardEl, type) {
    if (!cardEl) return;
    const classes = {
      correct: "flash-green",
      wrong: "flash-red",
      black: "flash-black",
      neutral: "flash-neutral",
    };
    const cls = classes[type] || "flash-green";
    cardEl.classList.add(cls);
    setTimeout(() => cardEl.classList.remove(cls), 600);
  }

  function shakeScreen() {
    document.body.classList.add("screen-shake");
    setTimeout(() => document.body.classList.remove("screen-shake"), 300);
  }

  // ==========================================================
  // 6. تأثيرات إضافية
  // ==========================================================
  function showAvatarSelection(type) {
    // يمكن استخدامها لعرض الأفاتار المحدد بشكل مميز
    const avatarEl = document.getElementById("menu-avatar");
    if (avatarEl) {
      avatarEl.innerHTML = buildAvatarImg(type, 44);
    }
  }

  function updateOnlineStatus(isOnline, isBusy = false) {
    const dot = document.getElementById("menu-online-dot");
    if (!dot) return;
    dot.className = "online-dot";
    if (!isOnline) {
      dot.classList.add("offline");
    } else if (isBusy) {
      dot.classList.add("busy");
    }
  }

  // ==========================================================
  // 7. تصدير الواجهة العامة
  // ==========================================================
  return {
    // الجزيئات
    initParticles,
    createParticles,
    animateParticles,

    // الأفاتارات
    populateAvatarGrid,
    buildAvatarImg,
    getAvatarsByRarity,
    getAllAvatars,
    isValidAvatar,
    getAvatarName,
    showAvatarSelection,

    // الإشعار الأسطوري
    showLegendaryJoin,
    spawnGoldenParticles,

    // الألعاب النارية
    launchFireworks,

    // تأثيرات البطاقات
    flashCard,
    shakeScreen,

    // حالة الاتصال
    updateOnlineStatus,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Effects = Effects;
window.buildAvatarImg = Effects.buildAvatarImg;
window.getAllAvatars = Effects.getAllAvatars;

console.log("Effects module loaded successfully");

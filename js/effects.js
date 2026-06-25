/* ============================================================
   CODENAMES CLASSIC - VISUAL EFFECTS (v3.0)
   ============================================================
   الملف: effects.js
   الوظيفة: المؤثرات البصرية - الجزيئات، الأفاتارات، الإشعارات
   التحديثات: دعم 23 أفاتار PNG، لا إيموجي، إزالة رفع الصور
   ============================================================ */

const Effects = (() => {
  // ==========================================================
  // المتغيرات
  // ==========================================================
  let particlesCtx = null;
  let particlesArr = [];
  let animFrame = null;

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

  // ==========================================================
  // الجزيئات
  // ==========================================================
  function initParticles() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;
    particlesCtx = canvas.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    createParticles();
    animate();
  }

  function resize() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createParticles() {
    particlesArr = [];
    const count = 80;
    const colors = ["#ff0040", "#00d4ff", "#ffd700", "#b829dd", "#00ff88"];
    for (let i = 0; i < count; i++) {
      particlesArr.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function animate() {
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

    animFrame = requestAnimationFrame(animate);
  }

  // ==========================================================
  // تعبئة شبكة الأفاتارات
  // ==========================================================
  function populateAvatarGrid() {
    const grid = document.getElementById("avatar-grid");
    if (!grid) return;

    // عرض الأفاتارات الأساسية فقط في شاشة التسجيل (8)
    const basicAvatars = AVATARS.basic;

    grid.innerHTML = basicAvatars.map((type) => `
      <div class="avatar-option ${type === "spy" ? "selected" : ""}" data-avatar="${type}">
        <div class="avatar-svg">${buildAvatarImg(type, 44)}</div>
        <span>${AVATAR_NAMES[type] || type}</span>
      </div>
    `).join("");
  }

  // ==========================================================
  // بناء صورة أفاتار (PNG)
  // ==========================================================
  function buildAvatarImg(type, size = 40) {
    const t = ALL_AVATARS.includes(type) ? type : "spy";
    return `<img src="/assets/avatars/${t}.png" 
                 width="${size}" height="${size}" 
                 alt="${t}" loading="lazy"
                 style="border-radius:50%;display:block;object-fit:cover;background:#1a1a2e;border:2px solid rgba(255,255,255,0.1);"
                 onerror="this.src='/assets/avatars/spy.png'"/>`;
  }

  // ==========================================================
  // الحصول على قائمة الأفاتارات
  // ==========================================================
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
  // الإشعار الأسطوري
  // ==========================================================
  function showLegendaryJoin(data) {
    const settings = JSON.parse(localStorage.getItem("settings") || "{}");
    if (settings.legendaryNotification === false) return;
    if ((data.level || 0) < 98) return;

    const overlay = document.getElementById("overlay-legendary");
    const nameEl = document.getElementById("legendary-player-name");
    const avatarEl = document.getElementById("legendary-avatar-display");

    if (nameEl) nameEl.textContent = data.nickname || "لاعب";
    if (avatarEl) avatarEl.innerHTML = buildAvatarImg(data.avatar || "spy", 60);

    spawnGoldenParticles();
    overlay.classList.remove("hidden");
    overlay.classList.add("active");
    Audio.play("legendary-join");

    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.classList.remove("active");
    }, 3000);
  }

  // ==========================================================
  // جزيئات ذهبية للأسطوري
  // ==========================================================
  function spawnGoldenParticles() {
    const container = document.getElementById("legendary-particles");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 25; i++) {
      const p = document.createElement("div");
      p.className = "golden-particle";
      p.style.left = `${Math.random() * 100}%`;
      p.style.animationDelay = `${Math.random() * 0.5}s`;
      p.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
      container.appendChild(p);
    }
  }

  // ==========================================================
  // الألعاب النارية
  // ==========================================================
  function launchFireworks(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const colors = ["#ff0040", "#00d4ff", "#ffd700", "#b829dd", "#00ff88"];

    for (let burst = 0; burst < 6; burst++) {
      setTimeout(() => {
        const cx = Math.random() * canvas.width;
        const cy = Math.random() * (canvas.height * 0.6);
        const color = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 30; i++) {
          const angle = (i / 30) * Math.PI * 2;
          const speed = 2 + Math.random() * 4;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: color,
            size: 2 + Math.random() * 2,
          });
        }
      }, burst * 400);
    }

    let fwFrame;
    const fwAnimate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.alpha -= 0.015;
        if (p.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      // إزالة الجزيئات الميتة
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) particles.splice(i, 1);
      }
      if (particles.length > 0) {
        fwFrame = requestAnimationFrame(fwAnimate);
      }
    };
    fwAnimate();
  }

  // ==========================================================
  // تأثيرات البطاقات
  // ==========================================================
  function flashCard(cardEl, type) {
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

  // ==========================================================
  // اهتزاز الشاشة
  // ==========================================================
  function shakeScreen() {
    document.body.classList.add("screen-shake");
    setTimeout(() => document.body.classList.remove("screen-shake"), 300);
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    initParticles,
    populateAvatarGrid,
    buildAvatarImg,
    getAvatarsByRarity,
    getAllAvatars,
    isValidAvatar,
    getAvatarName,
    showLegendaryJoin,
    spawnGoldenParticles,
    launchFireworks,
    flashCard,
    shakeScreen,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Effects = Effects;
window.buildAvatarImg = Effects.buildAvatarImg;
window.getAllAvatars = Effects.getAllAvatars;

console.log("Effects module loaded successfully");
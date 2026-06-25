/* ============================================================
   CODENAMES CLASSIC - EFFECTS (MINIMAL)
   ============================================================ */

const Effects = (() => {
  // قائمة الأفاتارات الأساسية (8)
  const BASIC_AVATARS = ["spy", "detective", "manager", "samurai", "mafia", "spy_f", "ninja", "alien"];

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
  };

  // ==========================================================
  // الجزيئات (مبسطة)
  // ==========================================================
  function initParticles() {
    const canvas = document.getElementById("particles-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        color: ["#ff0040", "#00d4ff", "#ffd700", "#b829dd", "#00ff88"][Math.floor(Math.random() * 5)],
      });
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      requestAnimationFrame(animate);
    }
    animate();
  }

  // ==========================================================
  // تعبئة شبكة الأفاتارات
  // ==========================================================
  function populateAvatarGrid() {
    const grid = document.getElementById("avatar-grid");
    if (!grid) {
      console.warn("avatar-grid not found");
      return;
    }

    grid.innerHTML = BASIC_AVATARS.map((type) => `
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

    console.log("Avatar grid populated with", BASIC_AVATARS.length, "avatars");
  }

  // ==========================================================
  // بناء صورة أفاتار (PNG)
  // ==========================================================
  function buildAvatarImg(type, size = 40) {
    return `<img src="/assets/avatars/${type}.png" 
                 width="${size}" height="${size}" 
                 alt="${type}" loading="lazy"
                 style="border-radius:50%;display:block;object-fit:cover;background:#1a1a2e;border:2px solid rgba(255,255,255,0.1);"
                 onerror="this.src='/assets/avatars/spy.png'"/>`;
  }

  return {
    initParticles,
    populateAvatarGrid,
    buildAvatarImg,
  };
})();

window.Effects = Effects;
console.log("Effects (minimal) loaded");

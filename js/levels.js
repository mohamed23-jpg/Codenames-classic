/* ============================================================
   CODENAMES CLASSIC - LEVELS TREE (v3.0)
   ============================================================
   الملف: levels.js
   الوظيفة: عرض شجرة المستويات والمكافآت
   التحديثات: دعم المستوى 98 (أسطوري)، لا إيموجي
   ============================================================ */

const Levels = (() => {
  const PER_ROW = 4;

  // SVG icons - بدون إيموجي
  const SVG_STAR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_COIN = `<svg width="14" height="14" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--gold)"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">$</text></svg>`;
  const SVG_LOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const SVG_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CROWN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M2 20h20l-2-12-5 6-3-8-3 8-5-6z"/></svg>`;

  // ==========================================================
  // حساب XP المطلوب للمستوى
  // ==========================================================
  function xpForLevel(n) {
    if (n <= 1) return 0;
    return Math.floor(80 * Math.pow(n - 1, 1.6));
  }

  // ==========================================================
  // حساب إجمالي XP للمستوى
  // ==========================================================
  function totalXpForLevel(n) {
    let total = 0;
    for (let i = 2; i <= n; i++) total += xpForLevel(i);
    return total;
  }

  // ==========================================================
  // مكافآت المستويات
  // ==========================================================
  const REWARDS = {
    3:  { coins: 200,  title: null,            note: "مكافأة البداية" },
    5:  { coins: 500,  title: null,            note: "مكافأة المبتدئ" },
    8:  { coins: 800,  title: null,            note: "فتح السوق" },
    10: { coins: 1000, title: "متعلم",         note: "لقب جديد" },
    15: { coins: 1500, title: null,            note: "مكافأة عملات" },
    20: { coins: 2000, title: "محترف",         note: "لقب جديد" },
    25: { coins: 3000, title: null,            note: "مكافأة عملات" },
    30: { coins: 4000, title: "خبير",          note: "لقب جديد" },
    35: { coins: 5000, title: null,            note: "مكافأة عملات" },
    40: { coins: 5000, title: null,            note: "مكافأة عملات" },
    45: { coins: 6000, title: null,            note: "مكافأة عملات" },
    50: { coins:10000, title: "بطل",           note: "لقب + مكافأة كبرى" },
    55: { coins: 8000, title: null,            note: "مكافأة عملات" },
    60: { coins:10000, title: "فارس",          note: "لقب نادر" },
    65: { coins:12000, title: null,            note: "مكافأة عملات" },
    70: { coins:15000, title: "سيد",           note: "لقب نادر" },
    75: { coins:15000, title: null,            note: "مكافأة عملات" },
    80: { coins:20000, title: null,            note: "مكافأة ذهبية" },
    85: { coins:20000, title: null,            note: "مكافأة ذهبية" },
    90: { coins:25000, title: "أسطورة حية",   note: "لقب أسطوري" },
    95: { coins:30000, title: null,            note: "مكافأة الأسطوري" },
    98: { coins:35000, title: null,            note: "إشعار الأسطوري مُفعّل" },
    100:{ coins:50000, title: "مختم اللعبة",  note: "اللقب النهائي" },
  };

  // ==========================================================
  // عرض الشجرة
  // ==========================================================
  function render() {
    const player = App.getPlayer();
    const playerLevel = player?.level || 1;
    const container = document.getElementById("levels-tree");
    if (!container) return;

    let html = '<div class="levels-path">';

    const rows = Math.ceil(100 / PER_ROW);
    for (let row = 0; row < rows; row++) {
      const isReversed = row % 2 === 1;
      let levels = [];
      for (let i = 0; i < PER_ROW; i++) {
        const lv = row * PER_ROW + i + 1;
        if (lv <= 100) levels.push(lv);
      }
      if (isReversed) levels.reverse();

      html += `<div class="levels-row ${isReversed ? "row-reversed" : ""}">`;
      levels.forEach((lv, idx) => {
        const reward = REWARDS[lv];
        const isUnlocked = lv <= playerLevel;
        const isCurrent = lv === playerLevel;
        const xpNeeded = xpForLevel(lv);

        let nodeClass = "level-node";
        if (isUnlocked) nodeClass += " lvl-unlocked";
        if (isCurrent) nodeClass += " lvl-current";
        if (!isUnlocked) nodeClass += " lvl-locked";
        if (reward) nodeClass += " lvl-has-reward";
        if (lv === 98) nodeClass += " lvl-legendary";

        html += `
          <div class="${nodeClass}" data-level="${lv}" onclick="Levels.showDetail(${lv})">
            ${reward ? '<div class="lvl-reward-dot"></div>' : ""}
            ${lv === 98 ? '<div class="lvl-legendary-badge">${SVG_CROWN}</div>' : ""}
            <div class="lvl-circle">
              <span class="lvl-num">${lv}</span>
            </div>
            ${reward ? `<div class="lvl-reward-label">${reward.note}</div>` : ""}
          </div>`;

        if (idx < levels.length - 1) {
          html += `<div class="lvl-connector ${isReversed ? "conn-rtl" : ""}"></div>`;
        }
      });
      html += `</div>`;

      if ((row + 1) * PER_ROW < 100) {
        const side = isReversed ? "conn-v-right" : "conn-v-left";
        html += `<div class="lvl-row-spacer">
          <div class="lvl-v-connector ${side}"></div>
        </div>`;
      }
    }

    html += '</div>';
    container.innerHTML = html;

    // التمرير إلى المستوى الحالي
    const currentEl = container.querySelector(".lvl-current");
    if (currentEl) {
      setTimeout(() => currentEl.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    }

    // إشعار المستوى 98 (أسطوري)
    if (playerLevel >= 98 && player?.settings?.legendaryNotification !== false) {
      showLegendaryNotification(player);
    }
  }

  // ==========================================================
  // عرض تفاصيل المستوى
  // ==========================================================
  function showDetail(level) {
    const reward = REWARDS[level];
    const xpNeeded = xpForLevel(level);
    const total = totalXpForLevel(level);
    const player = App.getPlayer();
    const playerLevel = player?.level || 1;
    const isUnlocked = level <= playerLevel;

    let rewardText = "";
    if (reward) {
      if (reward.coins) {
        rewardText += `<div class="lvl-detail-reward">${SVG_COIN} +${reward.coins.toLocaleString()} عملة</div>`;
      }
      if (reward.title) {
        rewardText += `<div class="lvl-detail-reward"><span class="detail-title-badge">${reward.title}</span> لقب جديد</div>`;
      }
    }

    if (level === 98) {
      rewardText += `<div class="lvl-detail-reward" style="color:var(--gold)">${SVG_CROWN} إشعار الأسطوري مُفعّل</div>`;
    }

    const panel = document.getElementById("lvl-detail-popup");
    if (panel) {
      document.getElementById("lvl-detail-num").textContent = `المستوى ${level}`;
      document.getElementById("lvl-detail-xp").textContent = level > 1 ? `${xpNeeded.toLocaleString()} XP للوصول من ${level - 1}` : "نقطة البداية";
      document.getElementById("lvl-detail-total").textContent = `${total.toLocaleString()} XP إجمالي`;
      document.getElementById("lvl-detail-rewards").innerHTML = rewardText || '<span style="color:var(--text-dim)">لا توجد مكافأة خاصة</span>';
      document.getElementById("lvl-detail-status").textContent = isUnlocked ? `${SVG_CHECK} مفتوح` : `${SVG_LOCK} لم تصله بعد`;
      document.getElementById("lvl-detail-status").style.color = isUnlocked ? "var(--green)" : "var(--text-dim)";
      panel.classList.remove("hidden");
      panel.classList.add("active");
    }
  }

  // ==========================================================
  // إشعار المستوى الأسطوري (98)
  // ==========================================================
  function showLegendaryNotification(player) {
    // التحقق من عدم عرض الإشعار مسبقاً
    const shown = localStorage.getItem("legendary_notification_shown");
    if (shown === "true") return;

    const data = {
      nickname: player.nickname,
      avatar: player.avatar,
      level: player.level,
      title: player.activeTitle || "أسطورة",
    };

    // استخدام دالة UI.showLegendaryPopup إذا كانت موجودة
    if (typeof UI.showLegendaryPopup === "function") {
      UI.showLegendaryPopup(data);
    } else {
      // Fallback: عرض إشعار عادي
      UI.toast(`🎉 ${player.nickname} وصل للمستوى 98!`, "dev", 5000);
    }

    // منع عرض الإشعار مرة أخرى
    localStorage.setItem("legendary_notification_shown", "true");
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    render,
    showDetail,
    xpForLevel,
    totalXpForLevel,
    REWARDS,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Levels = Levels;

console.log("Levels module loaded successfully");
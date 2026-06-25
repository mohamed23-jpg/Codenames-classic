/* ============================================================
   CODENAMES CLASSIC - MARKET SYSTEM (v3.0)
   ============================================================
   الملف: market.js
   الوظيفة: إدارة السوق - حزم البطاقات، إطارات الأسماء، الأفاتارات
   التحديثات: دعم الأفاتارات القابلة للشراء، لا إيموجي
   ============================================================ */

const Market = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let items = null;

  // SVG icons - بدون إيموجي
  const SVG_COIN = `<svg width="16" height="16" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="var(--gold)"/><text x="12" y="16" text-anchor="middle" font-size="10" fill="#000" font-weight="bold">$</text></svg>`;
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_LOCK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const SVG_SKIN = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M6 2v20"/><path d="M18 2v20"/><path d="M2 6h20"/><path d="M2 12h20"/><path d="M2 18h20"/></svg>`;
  const SVG_FRAME = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10"/></svg>`;
  const SVG_AVATAR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const SVG_BUY = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;

  // ==========================================================
  // تحميل السوق
  // ==========================================================
  async function load() {
    const player = App.getPlayer();
    const marketContent = document.getElementById("market-content");
    const marketLocked = document.getElementById("market-locked");

    if (!player) {
      UI.toast("لم يتم تحميل بيانات اللاعب", "error");
      return;
    }

    // التحقق من مستوى فتح السوق (المستوى 8)
    if (player.level < 8) {
      if (marketLocked) {
        marketLocked.classList.remove("hidden");
        marketLocked.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px">
            <div style="font-size:3rem;color:var(--gold)">${SVG_LOCK}</div>
            <p style="color:var(--text);font-size:1.1rem">السوق يُفتح عند المستوى 8</p>
            <p style="color:var(--text-dim);font-size:0.85rem">مستواك الحالي: ${player.level}</p>
          </div>
        `;
      }
      if (marketContent) marketContent.classList.add("hidden");
      return;
    }

    if (marketLocked) marketLocked.classList.add("hidden");
    if (marketContent) marketContent.classList.remove("hidden");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/market`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      items = data;

      renderSkins(data.cardSkins || [], player.inventory?.cardSkins || []);
      renderFrames(data.nameFrames || [], player.inventory?.nameFrames || []);
      renderAvatars(data.avatars || [], player.inventory?.customAvatarItems || []);
    } catch (err) {
      console.error("خطأ في تحميل السوق:", err);
      UI.toast("فشل تحميل السوق", "error");
    }
  }

  // ==========================================================
  // عرض حزم البطاقات
  // ==========================================================
  function renderSkins(skins, owned) {
    const el = document.getElementById("market-skins");
    if (!el) return;

    if (!skins || skins.length === 0) {
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-dim)">لا توجد حزم متاحة</div>`;
      return;
    }

    const rarityColors = {
      rare: "#4fc3f7",
      epic: "#ce93d8",
      legendary: "#ffa726",
      mythic: "#ff6b6b",
    };

    el.innerHTML = skins.map((s) => {
      const isOwned = owned.some((o) => o.skinId === s.id);
      const color = rarityColors[s.rarity] || "#8d8d8d";

      return `
        <div class="market-item" onclick="${isOwned ? "" : `Market.buy('cardSkin','${s.id}')`}">
          <div class="market-item-preview" style="background:${color};display:flex;align-items:center;justify-content:center;font-size:2rem">
            ${SVG_SKIN}
          </div>
          <div class="market-item-name">${s.name}</div>
          <div class="inv-item-rarity rarity-${s.rarity}">${s.rarityAr || s.rarity}</div>
          ${isOwned
            ? `<div class="market-item-owned">${SVG_CHECK} تمتلكها</div>`
            : `<div class="market-item-price">${SVG_COIN} ${s.price.toLocaleString()}</div>`
          }
          ${!isOwned ? `<button class="btn btn-sm btn-warning">${SVG_BUY} شراء</button>` : ''}
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض إطارات الأسماء
  // ==========================================================
  function renderFrames(frames, owned) {
    const el = document.getElementById("market-frames");
    if (!el) return;

    if (!frames || frames.length === 0) {
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-dim)">لا توجد إطارات متاحة</div>`;
      return;
    }

    const frameColors = {
      fire: "#ff6b00",
      ice: "#00bfff",
      diamond: "#b9f2ff",
      crystal: "#ff6bff",
    };

    el.innerHTML = frames.map((f) => {
      const isOwned = owned.some((o) => o.frameId === f.id);
      const color = frameColors[f.id] || "#888";

      return `
        <div class="market-item" onclick="${isOwned ? "" : `Market.buy('nameFrame','${f.id}')`}">
          <div class="market-item-preview" style="border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-size:2rem;background:rgba(0,0,0,0.3)">
            ${SVG_FRAME}
          </div>
          <div class="market-item-name">${f.name}</div>
          <div class="inv-item-rarity rarity-${f.rarity}">${f.rarityAr || f.rarity}</div>
          ${isOwned
            ? `<div class="market-item-owned">${SVG_CHECK} تمتلكه</div>`
            : `<div class="market-item-price">${SVG_COIN} ${f.price.toLocaleString()}</div>`
          }
          ${!isOwned ? `<button class="btn btn-sm btn-warning">${SVG_BUY} شراء</button>` : ''}
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض الأفاتارات القابلة للشراء
  // ==========================================================
  function renderAvatars(avatars, owned) {
    const el = document.getElementById("market-avatars");
    if (!el) return;

    const avatarNames = {
      spy_gold: "جاسوس ذهبي",
      ninja_shadow: "نينجا الظل",
      samurai_red: "سامورائي أحمر",
      alien_glow: "فضائي متوهج",
      cyber_blue: "سايبر أزرق",
      agent_black: "عميل أسود",
      hacker_green: "هاكر أخضر",
      ghost_white: "شبح أبيض",
      phoenix_fire: "فينكس ناري",
      dragon_scale: "تنين متقشر",
      wolf_howl: "ذئب عاوي",
      eagle_eye: "نسر حاد",
      shadow_dark: "ظل داكن",
      titan_armor: "تايتان مدرع",
      neon_glow: "نيون متوهج",
      void_black: "فراغ أسود",
      phantom_mist: "شبح ضبابي",
      ronin_blade: "رونين سيف",
      stalker_stealth: "مطارد خفي",
    };

    const avatarRarity = {
      spy_gold: "legendary",
      ninja_shadow: "epic",
      samurai_red: "rare",
      alien_glow: "mythic",
      cyber_blue: "rare",
      agent_black: "epic",
      hacker_green: "rare",
      ghost_white: "epic",
      phoenix_fire: "legendary",
      dragon_scale: "legendary",
      wolf_howl: "epic",
      eagle_eye: "rare",
      shadow_dark: "mythic",
      titan_armor: "mythic",
      neon_glow: "epic",
      void_black: "mythic",
      phantom_mist: "legendary",
      ronin_blade: "legendary",
      stalker_stealth: "epic",
    };

    if (!avatars || avatars.length === 0) {
      // الأفاتارات الافتراضية للشراء
      const defaultAvatars = [
        { id: "spy_gold", name: "جاسوس ذهبي", price: 5000, rarity: "legendary", rarityAr: "أسطوري" },
        { id: "ninja_shadow", name: "نينجا الظل", price: 4000, rarity: "epic", rarityAr: "فائق" },
        { id: "samurai_red", name: "سامورائي أحمر", price: 3500, rarity: "rare", rarityAr: "نادر" },
        { id: "alien_glow", name: "فضائي متوهج", price: 6000, rarity: "mythic", rarityAr: "خارق" },
        { id: "cyber_blue", name: "سايبر أزرق", price: 3000, rarity: "rare", rarityAr: "نادر" },
        { id: "agent_black", name: "عميل أسود", price: 4000, rarity: "epic", rarityAr: "فائق" },
        { id: "phoenix_fire", name: "فينكس ناري", price: 5500, rarity: "legendary", rarityAr: "أسطوري" },
        { id: "shadow_dark", name: "ظل داكن", price: 6500, rarity: "mythic", rarityAr: "خارق" },
      ];
      avatars = defaultAvatars;
    }

    const rarityColors = {
      rare: "#4fc3f7",
      epic: "#ce93d8",
      legendary: "#ffa726",
      mythic: "#ff6b6b",
    };

    el.innerHTML = avatars.map((a) => {
      const isOwned = owned.includes(a.id);
      const color = rarityColors[a.rarity] || "#8d8d8d";

      return `
        <div class="market-item" onclick="${isOwned ? "" : `Market.buy('avatar','${a.id}')`}">
          <div class="market-item-preview" style="display:flex;align-items:center;justify-content:center;background:${color}22;border-radius:50%;padding:8px">
            ${SVG_AVATAR}
          </div>
          <div class="market-item-name">${a.name}</div>
          <div class="inv-item-rarity rarity-${a.rarity}">${a.rarityAr || a.rarity}</div>
          ${isOwned
            ? `<div class="market-item-owned">${SVG_CHECK} تمتلكه</div>`
            : `<div class="market-item-price">${SVG_COIN} ${a.price.toLocaleString()}</div>`
          }
          ${!isOwned ? `<button class="btn btn-sm btn-warning">${SVG_BUY} شراء</button>` : ''}
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // شراء عنصر
  // ==========================================================
  async function buy(itemType, itemId) {
    const player = App.getPlayer();
    if (!player) {
      UI.toast("لم يتم تحميل بيانات اللاعب", "error");
      return;
    }

    // البحث عن العنصر
    let item = null;
    if (itemType === "cardSkin") {
      const allSkins = [...(items?.cardSkins || [])];
      item = allSkins.find((s) => s.id === itemId);
    } else if (itemType === "nameFrame") {
      const allFrames = [...(items?.nameFrames || [])];
      item = allFrames.find((f) => f.id === itemId);
    } else if (itemType === "avatar") {
      const allAvatars = [...(items?.avatars || [])];
      item = allAvatars.find((a) => a.id === itemId);
    }

    if (!item) {
      UI.toast("العنصر غير موجود", "error");
      return;
    }

    if (player.coins < item.price) {
      UI.toast(`تحتاج إلى ${item.price.toLocaleString()} عملة. لديك ${player.coins.toLocaleString()}`, "error");
      return;
    }

    const ok = await UI.confirmDialog(`هل تريد شراء "${item.name}" بـ ${item.price.toLocaleString()} عملة؟`);
    if (!ok) return;

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/market/buy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(data.message || "تم الشراء بنجاح", "success");
        Audio.play("level-up");
        await App.refreshPlayer();
        load();
      } else {
        UI.toast(data.error || "فشل الشراء", "error");
      }
    } catch (err) {
      console.error("خطأ في الشراء:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    load,
    buy,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Market = Market;

console.log("Market module loaded successfully");
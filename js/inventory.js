/* ============================================================
   CODENAMES CLASSIC - INVENTORY SYSTEM (v3.0)
   ============================================================
   الملف: inventory.js
   الوظيفة: إدارة المخزون - حزم البطاقات، إطارات الأسماء، الألقاب، الأفاتارات
   التحديثات: دعم الأفاتارات المشتراة، لا إيموجي
   ============================================================ */

const Inventory = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";

  // SVG icons - بدون إيموجي
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_SKIN = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M6 2v20"/><path d="M18 2v20"/><path d="M2 6h20"/><path d="M2 12h20"/><path d="M2 18h20"/></svg>`;
  const SVG_FRAME = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10"/></svg>`;
  const SVG_TITLE = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16"/><path d="M6 4l4 16"/><path d="M14 4l4 16"/><path d="M8 12h8"/></svg>`;
  const SVG_AVATAR = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const SVG_EQUIP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/></svg>`;
  const SVG_LOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  // ==========================================================
  // تحميل المخزون
  // ==========================================================
  function load() {
    const player = App.getPlayer();
    if (!player) {
      UI.toast("لم يتم تحميل بيانات اللاعب", "error");
      return;
    }

    renderSkins(player.inventory?.cardSkins || []);
    renderFrames(player.inventory?.nameFrames || []);
    renderTitles(player.inventory?.unlockedTitles || [], player.activeTitle);
    renderAvatars(player.inventory?.availableAvatars || [], player.avatar);
    loadCustomSettings(player.settings);
    updateLegendaryToggle(player.level);
  }

  // ==========================================================
  // عرض حزم البطاقات
  // ==========================================================
  function renderSkins(skins) {
    const el = document.getElementById("inv-skins");
    if (!el) return;

    if (skins.length === 0) {
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-dim)">لا توجد حزم بطاقات. اشترِ من السوق!</div>`;
      return;
    }

    el.innerHTML = skins.map((s) => {
      const rarityColors = {
        rare: "#4fc3f7",
        epic: "#ce93d8",
        legendary: "#ffa726",
        mythic: "#ff6b6b",
      };
      const color = rarityColors[s.rarity] || "#8d8d8d";
      return `
        <div class="inv-item ${s.equipped ? "equipped" : ""}" onclick="Inventory.equip('cardSkin','${s.skinId}')">
          <div class="inv-item-preview" style="background:${color};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5rem">
            ${SVG_SKIN}
          </div>
          <div class="inv-item-name">${s.skinId}</div>
          <div class="inv-item-status">${s.equipped ? '<span style="color:var(--green)">مجهزة</span>' : 'غير مجهزة'}</div>
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض إطارات الأسماء
  // ==========================================================
  function renderFrames(frames) {
    const el = document.getElementById("inv-frames");
    if (!el) return;

    if (frames.length === 0) {
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-dim)">لا توجد إطارات. اشترِ من السوق!</div>`;
      return;
    }

    const frameColors = {
      fire: "#ff6b00",
      ice: "#00bfff",
      diamond: "#b9f2ff",
      crystal: "#ff6bff",
    };

    el.innerHTML = frames.map((f) => {
      const color = frameColors[f.frameId] || "#888";
      return `
        <div class="inv-item ${f.equipped ? "equipped" : ""}" onclick="Inventory.equip('nameFrame','${f.frameId}')">
          <div class="inv-item-preview" style="border:3px solid ${color};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;background:rgba(0,0,0,0.3)">
            ${SVG_FRAME}
          </div>
          <div class="inv-item-name">${f.frameId}</div>
          <div class="inv-item-status">${f.equipped ? '<span style="color:var(--green)">مجهز</span>' : 'غير مجهز'}</div>
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض الألقاب
  // ==========================================================
  function renderTitles(titles, activeTitle) {
    const el = document.getElementById("inv-titles");
    if (!el) return;

    const allTitles = ["مبتدئ", "متعلم", "محترف", "خبير", "أسطورة", "بطل", "فارس", "سيد", "أسطورة حية", "مختم اللعبة"];
    const ownedTitles = allTitles.filter((t) => titles.includes(t));

    if (ownedTitles.length === 0) {
      el.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">لا توجد ألقاب مفتوحة بعد. العب أكثر!</div>`;
      return;
    }

    el.innerHTML = ownedTitles.map((t) => {
      const isActive = t === activeTitle;
      return `
        <div class="title-item ${isActive ? "active-title" : ""}" onclick="Inventory.equip('title','${t}')">
          <span class="title-text">${t}</span>
          ${isActive ? `<span style="color:var(--green);font-size:0.75rem">${SVG_CHECK} نشط</span>` : '<span style="color:var(--text-dim);font-size:0.75rem">تفعيل</span>'}
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض الأفاتارات المشتراة
  // ==========================================================
  function renderAvatars(availableAvatars, currentAvatar) {
    const el = document.getElementById("inv-avatars");
    if (!el) return;

    // الأفاتارات الأساسية + المشتراة
    const basicAvatars = ["spy", "detective", "manager", "samurai", "mafia", "spy_f", "ninja", "alien"];
    const allAvatars = [...new Set([...basicAvatars, ...(availableAvatars || [])])];

    if (allAvatars.length === 0) {
      el.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-dim)">لا توجد أفاتارات</div>`;
      return;
    }

    const avatarNames = {
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

    el.innerHTML = allAvatars.map((a) => {
      const isEquipped = a === currentAvatar;
      const isBasic = basicAvatars.includes(a);
      return `
        <div class="inv-item ${isEquipped ? "equipped" : ""}" onclick="Inventory.equipAvatar('${a}')">
          <div class="inv-item-preview" style="display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.3);border-radius:50%;padding:4px">
            ${Effects.buildAvatarImg(a, 50)}
          </div>
          <div class="inv-item-name">${avatarNames[a] || a}</div>
          <div class="inv-item-status">
            ${isEquipped ? '<span style="color:var(--green)">مجهز</span>' : 'غير مجهز'}
            ${!isBasic ? '<span style="color:var(--gold);font-size:0.6rem">★</span>' : ''}
          </div>
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // تحديث زر الأسطوري
  // ==========================================================
  function updateLegendaryToggle(level) {
    const row = document.getElementById("legendary-notif-row");
    if (row) {
      row.style.display = level >= 98 ? "flex" : "none";
    }
  }

  // ==========================================================
  // تحميل الإعدادات المخصصة
  // ==========================================================
  function loadCustomSettings(settings) {
    if (!settings) return;

    const setCheck = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.checked = val !== false;
    };

    setCheck("set-legendary-notif", settings.legendaryNotification);
    setCheck("set-sound-effects", settings.soundEffects);
    setCheck("set-vibration", settings.vibration);
    setCheck("set-push-notif", settings.pushNotifications);

    const vol = document.getElementById("set-volume");
    const volDisplay = document.getElementById("volume-display");
    if (vol) vol.value = settings.volume ?? 80;
    if (volDisplay) volDisplay.textContent = `${settings.volume ?? 80}%`;
  }

  // ==========================================================
  // تجهيز عنصر
  // ==========================================================
  async function equip(type, id) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/me/equip`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type, id }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم التجهيز بنجاح", "success");
        await App.refreshPlayer();
        load();
      } else {
        UI.toast(data.error || "فشل التجهيز", "error");
      }
    } catch (err) {
      console.error("خطأ في التجهيز:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // تجهيز أفاتار
  // ==========================================================
  async function equipAvatar(avatarType) {
    const token = localStorage.getItem("token");
    try {
      // تحديث الأفاتار عبر API
      const res = await fetch(`${API}/players/me`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ avatar: avatarType }),
      });
      if (res.ok) {
        UI.toast("تم تجهيز الأفاتار", "success");
        await App.refreshPlayer();
        load();
      } else {
        UI.toast("فشل تجهيز الأفاتار", "error");
      }
    } catch (err) {
      console.error("خطأ في تجهيز الأفاتار:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // حفظ الإعدادات
  // ==========================================================
  async function saveSettings(settings) {
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/players/me/settings`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      UI.toast("تم حفظ الإعدادات", "success");
    } catch (err) {
      console.error("خطأ في حفظ الإعدادات:", err);
    }
  }

  // ==========================================================
  // ربط الإعدادات المخصصة
  // ==========================================================
  function bindCustomSettings() {
    const checkMap = {
      "set-legendary-notif": "legendaryNotification",
      "set-sound-effects": "soundEffects",
      "set-vibration": "vibration",
      "set-push-notif": "pushNotifications",
    };

    Object.entries(checkMap).forEach(([elemId, key]) => {
      const el = document.getElementById(elemId);
      if (!el) return;

      el.addEventListener("change", () => {
        const settings = JSON.parse(localStorage.getItem("settings") || "{}");
        settings[key] = el.checked;
        localStorage.setItem("settings", JSON.stringify(settings));

        const payload = {};
        payload[key] = el.checked;
        saveSettings(payload);

        if (key === "soundEffects") Audio.setMuted(!el.checked);
      });
    });

    const vol = document.getElementById("set-volume");
    const volDisplay = document.getElementById("volume-display");
    if (vol) {
      vol.addEventListener("input", () => {
        const v = parseInt(vol.value);
        if (volDisplay) volDisplay.textContent = `${v}%`;
        Audio.setVolume(v / 100);
        saveSettings({ volume: v });
      });
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    load,
    equip,
    equipAvatar,
    saveSettings,
    bindCustomSettings,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Inventory = Inventory;

console.log("Inventory module loaded successfully");
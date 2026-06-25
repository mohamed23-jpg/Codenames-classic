/* ============================================================
   CODENAMES CLASSIC - ADMIN / DEV PANEL (v3.0)
   ============================================================
   الملف: admin.js
   الوظيفة: لوحة القائد - إدارة اللاعبين، التحديات، المهام، حزم البطاقات، الإشعارات
   التحديثات: إصلاح خطأ "المسار غير صحيح"، دعم كامل للمطور، لا إيموجي، كل الأيقونات SVG
   ============================================================ */

const Admin = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";

  // ==========================================================
  // الإحصائيات
  // ==========================================================
  async function loadStats() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const grid = document.getElementById("dev-stats-grid");
      if (!grid) return;

      grid.innerHTML = `
        <div class="stat-card">
          <div class="stat-value">${data.totalPlayers || 0}</div>
          <div class="stat-label">إجمالي اللاعبين</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.onlinePlayers || 0}</div>
          <div class="stat-label">متصلون الآن</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalClans || 0}</div>
          <div class="stat-label">كلانات</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.activeRooms || 0}</div>
          <div class="stat-label">غرف نشطة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${data.totalChallenges || 0}</div>
          <div class="stat-label">تحديات نشطة</div>
        </div>
      `;
    } catch (err) {
      console.error("خطأ في تحميل الإحصائيات:", err);
      UI.toast("فشل تحميل الإحصائيات", "error");
    }
  }

  // ==========================================================
  // البحث عن اللاعبين
  // ==========================================================
  async function searchPlayers() {
    const q = document.getElementById("dev-player-search")?.value.trim();
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/players?q=${encodeURIComponent(q || "")}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const players = await res.json();
      const result = document.getElementById("dev-players-result");
      if (!result) return;

      if (!players || players.length === 0) {
        result.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim)">لا يوجد لاعبون</div>`;
        return;
      }

      result.innerHTML = players.map((p) => `
        <div class="dev-player-item">
          <div class="dev-player-item-info">
            <div class="dev-player-name">
              ${p.nickname} ${p.isDev ? '<span style="color:var(--gold);font-size:0.7rem">[Dev]</span>' : ''}
            </div>
            <div class="dev-player-id">
              ID: ${p.playerId} · LV${p.level} · ${p.coins} عملة
              ${p.isBanned ? ' <span style="color:var(--red)">[محظور]</span>' : ''}
            </div>
          </div>
          <div class="dev-player-actions">
            <button class="btn btn-sm btn-primary" onclick="Admin.openGrant('${p.playerId}','${p.nickname}')">منح</button>
            <button class="btn btn-sm btn-danger" onclick="Admin.banPlayer('${p.playerId}', ${!p.isBanned})">
              ${p.isBanned ? "رفع الحظر" : "حظر"}
            </button>
            <button class="btn btn-sm btn-ghost" onclick="Admin.viewPlayerProfile('${p.playerId}')">ملف</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("خطأ في البحث:", err);
      UI.toast("خطأ في البحث", "error");
    }
  }

  // ==========================================================
  // عرض ملف لاعب (للمطور)
  // ==========================================================
  async function viewPlayerProfile(playerId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/player/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const p = await res.json();
      if (!p || res.status === 404) {
        UI.toast("اللاعب غير موجود", "error");
        return;
      }

      const html = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0">
          <div style="width:64px;height:64px">${Effects.buildAvatarImg(p.avatar, 64)}</div>
          <div style="font-size:1.1rem;font-weight:700">${p.nickname}</div>
          <div style="font-family:monospace;color:var(--blue);font-size:0.85rem">ID: ${p.playerId}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;width:100%;text-align:center">
            <div><div style="color:var(--gold);font-weight:700">${p.level}</div><div style="font-size:0.7rem;color:var(--text-dim)">المستوى</div></div>
            <div><div style="color:var(--neon);font-weight:700">${p.xp}</div><div style="font-size:0.7rem;color:var(--text-dim)">XP</div></div>
            <div><div style="color:var(--gold);font-weight:700">${p.coins}</div><div style="font-size:0.7rem;color:var(--text-dim)">عملة</div></div>
          </div>
          <div style="width:100%;font-size:0.8rem;color:var(--text-dim);text-align:right">
            <div>اللقب: <span style="color:var(--purple)">${p.activeTitle || "مبتدئ"}</span></div>
            <div>مطور: ${p.isDev ? 'نعم' : 'لا'}</div>
            <div>محظور: ${p.isBanned ? 'نعم' : 'لا'}</div>
            <div>كلان: ${p.clanId || 'لا يوجد'}</div>
            <div>مباريات: ${p.stats?.gamesPlayed || 0}</div>
            <div>انتصارات: ${p.stats?.gamesWon || 0}</div>
          </div>
        </div>
      `;

      const content = document.getElementById("player-profile-content");
      if (content) content.innerHTML = html;
      UI.showModal("modal-player-profile");
    } catch (err) {
      console.error("خطأ في جلب ملف اللاعب:", err);
      UI.toast("فشل جلب الملف", "error");
    }
  }

  // ==========================================================
  // منح عملات/XP/لقب
  // ==========================================================
  function openGrant(playerId, nickname) {
    document.getElementById("grant-player-id").value = playerId;
    document.getElementById("grant-player-info").textContent = `منح مكافأة لـ: ${nickname}`;
    document.getElementById("grant-coins").value = 0;
    document.getElementById("grant-xp").value = 0;
    UI.showModal("modal-grant-player");
  }

  async function confirmGrant() {
    const playerId = document.getElementById("grant-player-id").value;
    const coins = parseInt(document.getElementById("grant-coins").value) || 0;
    const xp = parseInt(document.getElementById("grant-xp").value) || 0;
    const token = localStorage.getItem("token");

    if (coins === 0 && xp === 0) {
      UI.toast("أدخل قيمة للمنح", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/admin/players/${playerId}/grant`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ coins, xp }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم المنح بنجاح", "success");
        UI.hideModal("modal-grant-player");
        searchPlayers();
      } else {
        UI.toast(data.error || "فشل المنح", "error");
      }
    } catch (err) {
      console.error("خطأ في المنح:", err);
      UI.toast("فشل المنح", "error");
    }
  }

  // ==========================================================
  // حظر/رفع حظر لاعب
  // ==========================================================
  async function banPlayer(playerId, ban) {
    let reason = "";
    if (ban) {
      reason = await UI.promptDialog("سبب الحظر:", "اكتب السبب...");
      if (reason === null) return;
      if (!reason.trim()) {
        UI.toast("السبب مطلوب للحظر", "error");
        return;
      }
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/players/${playerId}/ban`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ banned: ban, reason: reason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(ban ? "تم الحظر" : "تم رفع الحظر", "success");
        searchPlayers();
      } else {
        UI.toast(data.error || "فشل العملية", "error");
      }
    } catch (err) {
      console.error("خطأ في الحظر:", err);
      UI.toast("فشل الحظر", "error");
    }
  }

  // ==========================================================
  // إرسال رسالة خاصة لمستخدم (منبثقة)
  // ==========================================================
  async function sendMessageToPlayer() {
    const playerId = document.getElementById("dev-msg-player-id")?.value.trim();
    const message = document.getElementById("dev-msg-content")?.value.trim();

    if (!playerId) {
      UI.toast("أدخل معرف اللاعب", "error");
      return;
    }
    if (!message) {
      UI.toast("أدخل نص الرسالة", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/notify/${playerId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message, type: "direct" }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(`تم إرسال الرسالة للاعب`, "success");
        document.getElementById("dev-msg-player-id").value = "";
        document.getElementById("dev-msg-content").value = "";
      } else {
        UI.toast(data.error || "فشل الإرسال", "error");
      }
    } catch (err) {
      console.error("خطأ في إرسال الرسالة:", err);
      UI.toast("فشل الإرسال", "error");
    }
  }

  // ==========================================================
  // بث إشعار عام لكل اللاعبين
  // ==========================================================
  async function broadcast() {
    const msg = document.getElementById("dev-broadcast-msg")?.value.trim();
    if (!msg) {
      UI.toast("أدخل رسالة البث", "error");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/broadcast`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم الإرسال للجميع", "success");
        document.getElementById("dev-broadcast-msg").value = "";
      } else {
        UI.toast(data.error || "فشل البث", "error");
      }
    } catch (err) {
      console.error("خطأ في البث:", err);
      UI.toast("فشل البث", "error");
    }
  }

  // ==========================================================
  // إرسال إشعار (للمستخدم أو للجميع)
  // ==========================================================
  async function sendNotification() {
    const playerId = document.getElementById("dev-notif-player-id")?.value.trim();
    const msg = document.getElementById("dev-notif-msg")?.value.trim();

    if (!msg) {
      UI.toast("أدخل نص الإشعار", "error");
      return;
    }
    const token = localStorage.getItem("token");

    try {
      let url = `${API}/admin/broadcast`;
      let body = { message: msg };

      if (playerId) {
        url = `${API}/admin/notify/${playerId}`;
        body = { message: msg, type: "system" };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(playerId ? "تم إرسال الإشعار للمستخدم" : "تم إرسال الإشعار للجميع", "success");
        document.getElementById("dev-notif-player-id").value = "";
        document.getElementById("dev-notif-msg").value = "";
      } else {
        UI.toast(data.error || "فشل الإرسال", "error");
      }
    } catch (err) {
      console.error("خطأ في إرسال الإشعار:", err);
      UI.toast("فشل الإرسال", "error");
    }
  }

  // ==========================================================
  // إدارة التحديات (إصلاح خطأ "المسار غير صحيح")
  // ==========================================================
  async function loadChallenges() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/challenges`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const challenges = await res.json();
      const list = document.getElementById("dev-challenges-list");
      if (!list) return;

      if (!challenges || challenges.length === 0) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim)">لا توجد تحديات</div>`;
        return;
      }

      list.innerHTML = challenges.map((c) => {
        const now = new Date();
        const isActive = c.isActive && new Date(c.startDate) <= now && new Date(c.endDate) >= now;
        return `
          <div class="dev-list-item">
            <div>
              <div>${c.name}</div>
              <div style="font-size:0.7rem;color:var(--text-dim)">${c.description}</div>
              <div style="font-size:0.65rem;color:var(--text-dim2)">
                ${c.condition}: ${c.conditionValue} · ${c.rewardType} +${c.rewardValue}
                ${c.startDate ? ` · من ${new Date(c.startDate).toLocaleDateString('ar-EG')}` : ''}
                ${c.endDate ? ` إلى ${new Date(c.endDate).toLocaleDateString('ar-EG')}` : ''}
              </div>
            </div>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">
              <span style="font-size:0.7rem;color:${isActive ? 'var(--green)' : 'var(--text-dim)'}">
                ${isActive ? 'نشط' : 'معطل'}
              </span>
              <button class="btn btn-sm btn-ghost" onclick="Admin.editChallenge('${c._id}')">تعديل</button>
              <button class="btn btn-sm btn-danger" onclick="Admin.deleteChallenge('${c._id}')">حذف</button>
            </div>
          </div>
        `;
      }).join("");
    } catch (err) {
      console.error("خطأ في تحميل التحديات:", err);
      UI.toast("فشل تحميل التحديات", "error");
    }
  }

  async function saveChallenge() {
    const token = localStorage.getItem("token");
    const body = {
      name: document.getElementById("ch-name")?.value.trim(),
      description: document.getElementById("ch-desc")?.value.trim(),
      condition: document.getElementById("ch-condition")?.value,
      conditionValue: parseInt(document.getElementById("ch-condition-value")?.value),
      rewardType: document.getElementById("ch-reward-type")?.value,
      rewardValue: parseInt(document.getElementById("ch-reward-value")?.value),
      startDate: document.getElementById("ch-start")?.value,
      endDate: document.getElementById("ch-end")?.value,
      isActive: true,
    };

    if (!body.name) {
      UI.toast("أدخل اسم التحدي", "error");
      return;
    }
    if (!body.description) {
      UI.toast("أدخل وصف التحدي", "error");
      return;
    }
    if (!body.conditionValue || body.conditionValue < 1) {
      UI.toast("أدخل قيمة شرط صحيحة", "error");
      return;
    }
    if (!body.rewardValue || body.rewardValue < 1) {
      UI.toast("أدخل قيمة مكافأة صحيحة", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/admin/challenges`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        UI.toast("تم حفظ التحدي", "success");
        UI.hideModal("modal-new-challenge");
        loadChallenges();
      } else {
        const err = await res.json();
        UI.toast(err.error || "فشل الحفظ", "error");
      }
    } catch (err) {
      console.error("خطأ في حفظ التحدي:", err);
      UI.toast("فشل حفظ التحدي", "error");
    }
  }

  async function editChallenge(id) {
    // يمكن تنفيذها لاحقاً
    UI.toast("تعديل التحدي قيد التطوير", "info");
  }

  async function deleteChallenge(id) {
    const ok = await UI.confirmDialog("هل تريد حذف هذا التحدي نهائياً؟");
    if (!ok) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/admin/challenges/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم الحذف", "info");
      loadChallenges();
    } catch (err) {
      console.error("خطأ في حذف التحدي:", err);
      UI.toast("فشل الحذف", "error");
    }
  }

  // ==========================================================
  // إدارة المهام (إصلاح خطأ "المسار غير صحيح")
  // ==========================================================
  async function loadMissions() {
    const token = localStorage.getItem("token");
    const type = document.getElementById("dev-mission-type")?.value || "daily";
    try {
      const res = await fetch(`${API}/admin/missions?type=${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const missions = await res.json();
      const list = document.getElementById("dev-missions-list");
      if (!list) return;

      if (!missions || missions.length === 0) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim)">لا توجد مهام</div>`;
        return;
      }

      list.innerHTML = missions.map((m) => `
        <div class="dev-list-item">
          <div>
            <div>${m.name}</div>
            <div style="font-size:0.7rem;color:var(--text-dim)">${m.description}</div>
            <div style="font-size:0.65rem;color:var(--text-dim2)">
              ${m.condition}: ${m.conditionValue} · +${m.rewardXp || 0} XP · +${m.rewardCoins || 0} عملة
            </div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-danger" onclick="Admin.deleteMission('${m._id}')">حذف</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("خطأ في تحميل المهام:", err);
      UI.toast("فشل تحميل المهام", "error");
    }
  }

  async function saveMission() {
    const token = localStorage.getItem("token");
    const body = {
      name: document.getElementById("mis-name")?.value.trim(),
      description: document.getElementById("mis-desc")?.value.trim(),
      type: document.getElementById("mis-type")?.value || "daily",
      condition: document.getElementById("mis-condition")?.value,
      conditionValue: parseInt(document.getElementById("mis-condition-value")?.value),
      rewardXp: parseInt(document.getElementById("mis-reward-xp")?.value) || 0,
      rewardCoins: parseInt(document.getElementById("mis-reward-coins")?.value) || 0,
    };

    if (!body.name) {
      UI.toast("أدخل اسم المهمة", "error");
      return;
    }
    if (!body.description) {
      UI.toast("أدخل وصف المهمة", "error");
      return;
    }
    if (!body.conditionValue || body.conditionValue < 1) {
      UI.toast("أدخل قيمة شرط صحيحة", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/admin/missions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        UI.toast("تم حفظ المهمة", "success");
        UI.hideModal("modal-new-mission");
        loadMissions();
      } else {
        const err = await res.json();
        UI.toast(err.error || "فشل الحفظ", "error");
      }
    } catch (err) {
      console.error("خطأ في حفظ المهمة:", err);
      UI.toast("فشل حفظ المهمة", "error");
    }
  }

  async function deleteMission(id) {
    const ok = await UI.confirmDialog("هل تريد حذف هذه المهمة؟");
    if (!ok) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/admin/missions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم الحذف", "info");
      loadMissions();
    } catch (err) {
      console.error("خطأ في حذف المهمة:", err);
      UI.toast("فشل الحذف", "error");
    }
  }

  // ==========================================================
  // إدارة حزم البطاقات
  // ==========================================================
  async function loadSkins() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/admin/card-skins`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const skins = await res.json();
      const list = document.getElementById("dev-skins-list");
      if (!list) return;

      if (!skins || skins.length === 0) {
        list.innerHTML = `<div style="padding:20px;text-align:center;color:var(--text-dim)">لا توجد حزم</div>`;
        return;
      }

      list.innerHTML = skins.map((s) => `
        <div class="dev-list-item">
          <div>
            <div>${s.name || s.id}</div>
            <div style="font-size:0.7rem;color:var(--text-dim)">${s.rarityAr || s.rarity} · ${(s.price || 0).toLocaleString()} عملة</div>
            <div style="font-size:0.65rem;color:${s.isActive ? 'var(--green)' : 'var(--text-dim)'}">${s.isActive ? 'نشط' : 'معطل'}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="btn btn-sm btn-danger" onclick="Admin.deleteSkin('${s.id || s._id}')">حذف</button>
          </div>
        </div>
      `).join("");
    } catch (err) {
      console.error("خطأ في تحميل الحزم:", err);
      UI.toast("فشل تحميل الحزم", "error");
    }
  }

  async function saveSkin() {
    const token = localStorage.getItem("token");
    const rarityVal = document.getElementById("skin-rarity")?.value;
    const body = {
      id: document.getElementById("skin-id")?.value.trim(),
      name: document.getElementById("skin-name")?.value.trim(),
      price: parseInt(document.getElementById("skin-price")?.value),
      rarity: rarityVal,
      css: document.getElementById("skin-css")?.value.trim(),
      rarityAr: {
        rare: "نادر",
        epic: "فائق",
        legendary: "أسطوري",
        mythic: "خارق",
      }[rarityVal] || "نادر",
      isActive: true,
    };

    if (!body.id) {
      UI.toast("أدخل معرف الحزمة", "error");
      return;
    }
    if (!body.name) {
      UI.toast("أدخل اسم الحزمة", "error");
      return;
    }
    if (!body.price || body.price < 100) {
      UI.toast("السعر يجب أن يكون 100 على الأقل", "error");
      return;
    }
    if (!body.css) {
      UI.toast("أدخل CSS مخصص", "error");
      return;
    }

    try {
      const res = await fetch(`${API}/admin/card-skins`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        UI.toast("تم حفظ الحزمة", "success");
        UI.hideModal("modal-new-skin");
        loadSkins();
      } else {
        const err = await res.json();
        UI.toast(err.error || "فشل الحفظ", "error");
      }
    } catch (err) {
      console.error("خطأ في حفظ الحزمة:", err);
      UI.toast("فشل حفظ الحزمة", "error");
    }
  }

  async function deleteSkin(id) {
    const ok = await UI.confirmDialog("هل تريد حذف هذه الحزمة؟");
    if (!ok) return;
    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/admin/card-skins/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم الحذف", "info");
      loadSkins();
    } catch (err) {
      console.error("خطأ في حذف الحزمة:", err);
      UI.toast("فشل الحذف", "error");
    }
  }

  // ==========================================================
  // أيقونات الكلانات (SVG)
  // ==========================================================
  function setupClanIcons() {
    const icons = [
      { id: "shield", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>` },
      { id: "sword", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 9.5L3 21"/><path d="M14.5 9.5L20 4"/><path d="M16.5 6.5L19 9"/><path d="M12.5 12.5L16.5 16.5"/></svg>` },
      { id: "trident", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20"/><path d="M5 9l7-7 7 7"/><path d="M8 15l4-4 4 4"/></svg>` },
      { id: "lightning", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
      { id: "moon", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>` },
      { id: "flame", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s-2 4-2 8 2 6 2 6-2-2-2-6 2-4 2-4z"/><path d="M12 2s2 4 2 8-2 6-2 6 2-2 2-6-2-4-2-4z"/></svg>` },
      { id: "wave", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/><path d="M2 16c3-4 5-4 8 0s5 4 8 0 3-4 5-4"/></svg>` },
      { id: "eagle", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v6"/><path d="M8 8l4-2 4 2"/><path d="M8 8v6"/><path d="M16 8v6"/><path d="M4 14h16"/><path d="M8 14l-2 6"/><path d="M16 14l2 6"/></svg>` },
      { id: "skull", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M10 16a2 2 0 0 1 4 0"/><path d="M8 16l-2 2"/><path d="M16 16l2 2"/></svg>` },
      { id: "target", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>` },
      { id: "crown", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20h20l-2-12-5 6-3-8-3 8-5-6z"/></svg>` },
      { id: "star", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>` },
      { id: "diamond", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 15L22 7z"/><path d="M2 7l20 0"/><path d="M12 2l0 20"/></svg>` },
      { id: "heart", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>` },
      { id: "infinity", svg: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4z"/></svg>` },
    ];

    const grid = document.getElementById("clan-icons-grid");
    if (!grid) return;

    grid.innerHTML = icons.map((icon) => `
      <div class="clan-icon-option" data-icon="${icon.id}" onclick="Admin.selectClanIcon(this, '${icon.id}')">
        ${icon.svg}
      </div>
    `).join("");
  }

  function selectClanIcon(el, iconId) {
    document.querySelectorAll(".clan-icon-option").forEach((o) => o.classList.remove("selected"));
    el.classList.add("selected");
    el.dataset.selectedIcon = iconId;
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    loadStats,
    searchPlayers,
    viewPlayerProfile,
    openGrant,
    confirmGrant,
    banPlayer,
    sendMessageToPlayer,
    broadcast,
    sendNotification,
    loadChallenges,
    saveChallenge,
    editChallenge,
    deleteChallenge,
    loadMissions,
    saveMission,
    deleteMission,
    loadSkins,
    saveSkin,
    deleteSkin,
    setupClanIcons,
    selectClanIcon,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Admin = Admin;

console.log("Admin module loaded successfully");
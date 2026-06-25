/* ============================================================
   CODENAMES CLASSIC - FRIENDS SYSTEM (v3.0)
   ============================================================
   الملف: friends.js
   الوظيفة: إدارة الأصدقاء، الطلبات، والقائمة السوداء
   التحديثات: دعم القائمة السوداء، عرض اللقب، لا إيموجي
   ============================================================ */

const Friends = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";

  // SVG icons - بدون إيموجي
  const SVG_ONLINE = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#00ff88"/></svg>`;
  const SVG_BUSY = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#ffd700"/></svg>`;
  const SVG_OFFLINE = `<svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill="#666"/></svg>`;
  const SVG_STAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const SVG_PLUS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  const SVG_TRASH = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
  const SVG_PIN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  const SVG_UNPIN = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
  const SVG_BLOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`;
  const SVG_UNBLOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="19.07" y2="4.93"/></svg>`;
  const SVG_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CROSS = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // ==========================================================
  // تحميل الأصدقاء
  // ==========================================================
  async function load() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/players/me/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      renderFriendsList(data.friends || [], data.pinned || []);
      renderRequests(data.requests || []);
      updateBadge(data.requests?.length || 0);
    } catch (err) {
      console.error("خطأ في تحميل الأصدقاء:", err);
      UI.toast("فشل تحميل الأصدقاء", "error");
    }
  }

  // ==========================================================
  // عرض قائمة الأصدقاء
  // ==========================================================
  function renderFriendsList(friends, pinned) {
    const list = document.getElementById("friends-list");
    if (!list) return;

    if (friends.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">لا يوجد أصدقاء بعد</div>`;
      return;
    }

    list.innerHTML = friends.map((f) => {
      const isPinned = pinned.includes(f.playerId);
      let statusSvg = SVG_OFFLINE;
      let statusText = "غير متصل";
      if (f.isOnline) {
        if (f.currentRoom) {
          statusSvg = SVG_BUSY;
          statusText = "مشغول - في غرفة";
        } else {
          statusSvg = SVG_ONLINE;
          statusText = "متصل";
        }
      }

      return `
        <div class="friend-item" data-id="${f.playerId}">
          <div class="friend-avatar">${Effects.buildAvatarImg(f.avatar, 36)}</div>
          <div class="friend-info">
            <div class="friend-name">
              ${isPinned ? `<span class="pinned-badge">${SVG_STAR}</span>` : ''}
              ${f.nickname}
              ${f.isDev ? '<span style="color:var(--gold);font-size:0.65rem">[Dev]</span>' : ''}
            </div>
            <div class="friend-status">${statusSvg} ${statusText}</div>
            <div class="friend-level">LV.${f.level} · <span style="color:var(--purple)">${f.activeTitle || "مبتدئ"}</span></div>
          </div>
          <div class="friend-actions">
            <button class="friend-action-btn" onclick="Friends.viewProfile('${f.playerId}')" title="عرض الملف">
              ${SVG_USER}
            </button>
            <button class="friend-action-btn" onclick="Friends.pin('${f.playerId}')" title="${isPinned ? "إلغاء التثبيت" : "تثبيت"}">
              ${isPinned ? SVG_PIN : SVG_UNPIN}
            </button>
            <button class="friend-action-btn" onclick="Friends.removeFriend('${f.playerId}')" title="حذف" style="color:var(--red)">
              ${SVG_TRASH}
            </button>
            <button class="friend-action-btn" onclick="Friends.block('${f.playerId}')" title="حظر" style="color:var(--red)">
              ${SVG_BLOCK}
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // عرض طلبات الصداقة
  // ==========================================================
  function renderRequests(requests) {
    const el = document.getElementById("requests-count");
    if (el) el.textContent = requests.length;

    const list = document.getElementById("friends-requests");
    if (!list) return;

    if (requests.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">لا توجد طلبات</div>`;
      return;
    }

    list.innerHTML = requests.map((r) => `
      <div class="request-item">
        <div class="friend-avatar">${Effects.buildAvatarImg(r.avatar, 36)}</div>
        <div class="request-info">
          <div class="request-name">${r.nickname}</div>
          <div style="font-size:0.7rem;color:var(--text-dim)">${UI.timeAgo(r.sentAt)}</div>
        </div>
        <div class="request-actions">
          <button class="btn btn-sm btn-primary" onclick="Friends.respondRequest('${r.from}','accept')">${SVG_CHECK} قبول</button>
          <button class="btn btn-sm btn-ghost" onclick="Friends.respondRequest('${r.from}','reject')">${SVG_CROSS} رفض</button>
        </div>
      </div>
    `).join("");
  }

  // ==========================================================
  // تحديث شارة الطلبات
  // ==========================================================
  function updateBadge(count) {
    const badge = document.getElementById("requests-count");
    if (badge) {
      badge.textContent = count;
      badge.classList.toggle("hidden", count === 0);
    }
  }

  // ==========================================================
  // البحث عن لاعب
  // ==========================================================
  async function searchPlayer() {
    const id = document.getElementById("friend-search-id").value.trim();
    if (!id || id.length < 8) {
      UI.toast("أدخل معرف صالح (8-12 رقم)", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        UI.toast("اللاعب غير موجود", "error");
        return;
      }
      const player = await res.json();
      const result = document.getElementById("friend-search-result");
      result.classList.remove("hidden");
      result.innerHTML = `
        <div class="friend-item">
          <div class="friend-avatar">${Effects.buildAvatarImg(player.avatar, 36)}</div>
          <div class="friend-info">
            <div class="friend-name">${player.nickname}</div>
            <div class="friend-level">LV.${player.level} · <span style="color:var(--purple)">${player.activeTitle || "مبتدئ"}</span></div>
            <div style="font-size:0.65rem;color:var(--text-dim)">${player.isOnline ? 'متصل' : 'غير متصل'}</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="Friends.sendRequest('${player.playerId}')">${SVG_PLUS} إضافة</button>
        </div>
      `;
    } catch (err) {
      console.error("خطأ في البحث:", err);
      UI.toast("خطأ في البحث", "error");
    }
  }

  // ==========================================================
  // إرسال طلب صداقة
  // ==========================================================
  async function sendRequest(targetId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/${targetId}/friend-request`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        UI.toast("تم إرسال طلب الصداقة", "success");
        document.getElementById("friend-search-result").classList.add("hidden");
        document.getElementById("friend-search-id").value = "";
      } else {
        UI.toast(data.error || "فشل الإرسال", "error");
      }
    } catch (err) {
      console.error("خطأ في إرسال الطلب:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // الرد على طلب صداقة
  // ==========================================================
  async function respondRequest(fromId, action) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/friend-request/${fromId}/respond`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        UI.toast(action === "accept" ? "تم قبول الطلب" : "تم رفض الطلب", "success");
        load();
      } else {
        UI.toast(data.error || "فشل الرد", "error");
      }
    } catch (err) {
      console.error("خطأ في الرد على الطلب:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // حذف صديق
  // ==========================================================
  async function removeFriend(targetId) {
    if (!(await UI.confirmDialog("هل تريد حذف هذا الصديق؟"))) return;

    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/players/${targetId}/friend`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم حذف الصديق", "info");
      load();
    } catch (err) {
      console.error("خطأ في حذف الصديق:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // تثبيت/إلغاء تثبيت صديق
  // ==========================================================
  async function pin(targetId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/${targetId}/pin`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        load();
      } else {
        UI.toast(data.error || "فشل التثبيت", "error");
      }
    } catch (err) {
      console.error("خطأ في تثبيت الصديق:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // عرض ملف لاعب
  // ==========================================================
  async function viewProfile(playerId) {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/players/${playerId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const player = await res.json();

      const content = document.getElementById("player-profile-content");
      if (!content) return;

      const statusDot = player.isOnline ? (player.currentRoom ? SVG_BUSY : SVG_ONLINE) : SVG_OFFLINE;
      const statusText = player.isOnline ? (player.currentRoom ? "في غرفة" : "متصل") : "غير متصل";

      content.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0">
          <div style="width:70px;height:70px;border-radius:50%;overflow:hidden;border:3px solid var(--red)">
            ${Effects.buildAvatarImg(player.avatar, 70)}
          </div>
          <div style="font-size:1.1rem;font-weight:700">${player.nickname}</div>
          <div style="font-size:0.85rem;color:var(--text-dim)">${statusDot} ${statusText}</div>
          <div style="font-size:0.8rem;color:var(--red)">المستوى ${player.level}</div>
          <div style="font-size:0.8rem;color:var(--purple)">${player.activeTitle || "مبتدئ"}</div>
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;width:100%;text-align:center">
            <div><div style="color:var(--blue);font-size:1.1rem;font-weight:700">${player.stats?.gamesPlayed || 0}</div><div style="font-size:0.65rem;color:var(--text-dim)">مباريات</div></div>
            <div><div style="color:var(--gold);font-size:1.1rem;font-weight:700">${player.stats?.gamesWon || 0}</div><div style="font-size:0.65rem;color:var(--text-dim)">انتصار</div></div>
            <div><div style="color:var(--green);font-size:1.1rem;font-weight:700">${player.stats?.correctGuesses || 0}</div><div style="font-size:0.65rem;color:var(--text-dim)">تخمين صح</div></div>
          </div>
          <div style="display:flex;gap:6px;margin-top:4px">
            <button class="btn btn-sm btn-danger" onclick="Friends.block('${player.playerId}');UI.hideModal('modal-player-profile')">${SVG_BLOCK} حظر</button>
            <button class="btn btn-sm btn-ghost" onclick="UI.hideModal('modal-player-profile')">إغلاق</button>
          </div>
        </div>
      `;

      UI.showModal("modal-player-profile");
    } catch (err) {
      console.error("خطأ في عرض الملف:", err);
      UI.toast("فشل عرض الملف", "error");
    }
  }

  // ==========================================================
  // حظر لاعب
  // ==========================================================
  async function block(targetId) {
    if (!(await UI.confirmDialog("هل تريد حظر هذا اللاعب؟"))) return;

    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/players/${targetId}/block`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم حظر اللاعب", "info");
      load();
    } catch (err) {
      console.error("خطأ في حظر اللاعب:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // القائمة السوداء
  // ==========================================================
  async function loadBlockList() {
    const token = localStorage.getItem("token");
    const listEl = document.getElementById("blocked-list");
    if (!listEl) return;

    try {
      const res = await fetch(`${API}/players/me/blocked`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blocked = await res.json();

      if (!blocked || blocked.length === 0) {
        listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">لا يوجد محظورون</div>`;
        return;
      }

      listEl.innerHTML = blocked.map((p) => `
        <div class="friend-item">
          <div class="friend-avatar">${Effects.buildAvatarImg(p.avatar, 36)}</div>
          <div class="friend-info">
            <div class="friend-name">${p.nickname}</div>
            <div class="friend-level">LV.${p.level} · <span style="color:var(--purple)">${p.activeTitle || "مبتدئ"}</span></div>
          </div>
          <button class="btn btn-sm btn-success" onclick="Friends.unblockPlayer('${p.playerId}')">
            ${SVG_UNBLOCK} إلغاء الحظر
          </button>
        </div>
      `).join("");
    } catch (err) {
      console.error("خطأ في تحميل المحظورين:", err);
      listEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-dim)">فشل التحميل</div>`;
    }
  }

  async function unblockPlayer(targetId) {
    if (!(await UI.confirmDialog("هل تريد إلغاء حظر هذا اللاعب؟"))) return;

    const token = localStorage.getItem("token");
    try {
      await fetch(`${API}/players/me/blocked/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      UI.toast("تم إلغاء الحظر", "success");
      loadBlockList();
    } catch (err) {
      console.error("خطأ في إلغاء الحظر:", err);
      UI.toast("خطأ في الاتصال", "error");
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    load,
    searchPlayer,
    sendRequest,
    respondRequest,
    removeFriend,
    pin,
    viewProfile,
    block,
    loadBlockList,
    unblockPlayer,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Friends = Friends;

console.log("Friends module loaded successfully");
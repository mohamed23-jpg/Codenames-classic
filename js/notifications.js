/* ============================================================
   CODENAMES CLASSIC - NOTIFICATIONS SYSTEM (v3.0)
   ============================================================
   الملف: notifications.js
   الوظيفة: إدارة الإشعارات - جلب، عرض، تعليم كمقروء، حذف
   التحديثات: دعم جميع الأنواع، إشعارات منبثقة، لا إيموجي
   ============================================================ */

const Notifications = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let notifications = [];
  let unreadCount = 0;

  // SVG icons - بدون إيموجي
  const SVG_BELL = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
  const SVG_CLOSE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const SVG_CHECK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_STAR = `<svg width="14" height="14" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_USER = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  const SVG_GROUP = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
  const SVG_GIFT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M7 7l3-5 2 5"/><path d="M17 7l-3-5-2 5"/></svg>`;
  const SVG_MESSAGE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

  // ==========================================================
  // تحميل الإشعارات
  // ==========================================================
  async function load() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      notifications = data.notifications || [];
      unreadCount = data.unread || 0;

      updateBadge(unreadCount);
      renderList();
    } catch (err) {
      console.error("خطأ في تحميل الإشعارات:", err);
    }
  }

  // ==========================================================
  // تحديث شارة الإشعارات
  // ==========================================================
  function updateBadge(count) {
    const badge = document.getElementById("notif-count");
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? "99+" : count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  // ==========================================================
  // عرض قائمة الإشعارات
  // ==========================================================
  function renderList() {
    const list = document.getElementById("notifications-list");
    if (!list) return;

    if (notifications.length === 0) {
      list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)">لا توجد إشعارات</div>`;
      return;
    }

    list.innerHTML = notifications.map((n) => {
      const icon = getNotificationIcon(n.type);
      const isUnread = !n.isRead;

      return `
        <div class="notif-item ${isUnread ? "unread" : ""}" data-id="${n._id}">
          <div style="flex-shrink:0;margin-top:2px;color:${isUnread ? 'var(--red)' : 'var(--text-dim)'}">
            ${icon}
          </div>
          <div class="notif-content">
            <div class="notif-message">${n.message}</div>
            <div class="notif-time">${UI.timeAgo(n.createdAt)}</div>
            ${n.fromNickname ? `<div style="font-size:0.65rem;color:var(--text-dim2)">من: ${n.fromNickname}</div>` : ''}
          </div>
          <button class="notif-del" onclick="Notifications.delete('${n._id}')" title="حذف">
            ${SVG_CLOSE}
          </button>
        </div>
      `;
    }).join("");

    // إضافة حدث النقر لتعليم الإشعار كمقروء
    list.querySelectorAll(".notif-item").forEach((item) => {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".notif-del")) return;
        const id = item.dataset.id;
        if (id) markRead(id);
        item.classList.remove("unread");
      });
    });
  }

  // ==========================================================
  // الحصول على أيقونة حسب نوع الإشعار
  // ==========================================================
  function getNotificationIcon(type) {
    const icons = {
      friend_request: SVG_USER,
      friend_accepted: SVG_USER,
      friend_removed: SVG_USER,
      blocked: SVG_CLOSE,
      clan_message: SVG_GROUP,
      clan_announcement: SVG_GROUP,
      clan_join_accepted: SVG_GROUP,
      clan_join_request: SVG_GROUP,
      private_message: SVG_MESSAGE,
      room_invite: SVG_BELL,
      legendary_join: SVG_STAR,
      dev_announcement: SVG_STAR,
      level_up: SVG_STAR,
      mission_claimed: SVG_GIFT,
      purchase_confirmed: SVG_GIFT,
    };
    return icons[type] || SVG_BELL;
  }

  // ==========================================================
  // تعليم إشعار كمقروء
  // ==========================================================
  async function markRead(id) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      const notif = notifications.find((n) => n._id === id);
      if (notif) notif.isRead = true;

      const unread = notifications.filter((n) => !n.isRead).length;
      unreadCount = unread;
      updateBadge(unread);
      renderList();
    } catch (err) {
      console.error("خطأ في تعليم الإشعار كمقروء:", err);
    }
  }

  // ==========================================================
  // تعليم كل الإشعارات كمقروءة
  // ==========================================================
  async function markAllRead() {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/notifications/read-all`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });

      notifications.forEach((n) => (n.isRead = true));
      unreadCount = 0;
      updateBadge(0);
      renderList();
      UI.toast("تم تعليم كل الإشعارات كمقروءة", "success");
    } catch (err) {
      console.error("خطأ في تعليم كل الإشعارات كمقروءة:", err);
      UI.toast("فشل تعليم الإشعارات", "error");
    }
  }

  // ==========================================================
  // حذف إشعار
  // ==========================================================
  async function deleteNotif(id) {
    try {
      const token = localStorage.getItem("token");
      await fetch(`${API}/notifications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      notifications = notifications.filter((n) => n._id !== id);
      const unread = notifications.filter((n) => !n.isRead).length;
      unreadCount = unread;
      updateBadge(unread);
      renderList();
    } catch (err) {
      console.error("خطأ في حذف الإشعار:", err);
      UI.toast("فشل حذف الإشعار", "error");
    }
  }

  // ==========================================================
  // استقبال إشعار جديد (من Socket.io)
  // ==========================================================
  function onNewNotification(data) {
    // تشغيل صوت الإشعار
    Audio.play("notification");

    // عرض إشعار منبثق
    const icon = getNotificationIcon(data.type);
    UI.toast(`${icon} ${data.message || "إشعار جديد"}`, "info", 5000);

    // إضافة للإشعارات
    const newNotif = {
      ...data,
      _id: data._id || `temp_${Date.now()}`,
      isRead: false,
      createdAt: data.createdAt || new Date().toISOString(),
    };

    notifications.unshift(newNotif);
    unreadCount += 1;
    updateBadge(unreadCount);
    renderList();

    // إشعار خاص بالمطور (منبثق منفصل)
    if (data.type === "dev_announcement" || data.type === "dev_message") {
      UI.toast(`من المطور: ${data.message}`, "dev", 8000);
    }

    // إشعار الأسطوري
    if (data.type === "legendary_join") {
      if (typeof Effects.showLegendaryJoin === "function") {
        Effects.showLegendaryJoin(data.data || {});
      }
    }

    // إشعار دعوة غرفة
    if (data.type === "room_invite") {
      const inviteData = data.data || {};
      if (inviteData.roomCode && inviteData.fromNickname) {
        UI.showCustomDialog("دعوة للعب!", `
          <div style="text-align:center;padding:8px 0">
            <div style="font-size:0.9rem;margin-bottom:12px">
              <strong style="color:var(--neon-text)">${inviteData.fromNickname}</strong> يدعوك للانضمام إلى غرفة:
            </div>
            <div style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:10px;margin-bottom:12px">
              <div style="color:var(--text-dim);font-size:0.75rem">اسم الغرفة</div>
              <div style="color:var(--neon-text);font-weight:600">${inviteData.roomName || "غرفة لعب"}</div>
              <div style="color:var(--blue);font-family:monospace;letter-spacing:2px;font-size:1rem;margin-top:4px">${inviteData.roomCode}</div>
            </div>
            <div style="display:flex;gap:8px;justify-content:center">
              <button class="btn btn-primary btn-sm" onclick="Game.joinRoom('${inviteData.roomCode}');document.querySelector('.custom-dialog')?.remove()">انضم الآن</button>
              <button class="btn btn-ghost btn-sm" onclick="document.querySelector('.custom-dialog')?.remove()">رفض</button>
            </div>
          </div>
        `);
      }
    }
  }

  // ==========================================================
  // تحديث شارة الإشعارات من الخادم
  // ==========================================================
  async function refreshBadge() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch(`${API}/notifications/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      unreadCount = data.unreadCount || 0;
      updateBadge(unreadCount);
    } catch (err) {
      console.error("خطأ في تحديث شارة الإشعارات:", err);
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    load,
    markAllRead,
    delete: deleteNotif,
    onNewNotification,
    refreshBadge,
    getUnreadCount: () => unreadCount,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Notifications = Notifications;

console.log("Notifications module loaded successfully");
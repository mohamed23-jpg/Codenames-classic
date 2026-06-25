/* ============================================================
   CODENAMES CLASSIC - GLOBAL CHAT (v3.0)
   ============================================================
   الملف: global-chat.js
   الوظيفة: إدارة الدردشة العامة
   التحديثات: عرض اللقب، لا إيموجي، SVG icons
   ============================================================ */

const GlobalChat = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let messages = [];

  // SVG icons - بدون إيموجي
  const SVG_SEND = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
  const SVG_DEV = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  // ==========================================================
  // تحميل الدردشة
  // ==========================================================
  async function load() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/chat/global`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      messages = await res.json();
      render();
    } catch (err) {
      console.error("خطأ في تحميل الدردشة:", err);
      UI.toast("فشل تحميل الدردشة", "error");
    }
  }

  // ==========================================================
  // عرض الرسائل
  // ==========================================================
  function render() {
    const container = document.getElementById("global-chat-messages");
    if (!container) return;

    if (!messages || messages.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text-dim)">لا توجد رسائل بعد. كن أول من يكتب!</div>`;
      return;
    }

    container.innerHTML = messages.map((m) => buildBubble(m)).join("");
    container.scrollTop = container.scrollHeight;
  }

  // ==========================================================
  // بناء فقاعة رسالة
  // ==========================================================
  function buildBubble(m) {
    const time = new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const isDev = m.isDev || false;

    return `
      <div class="chat-bubble">
        <div class="chat-bubble-avatar">
          ${Effects.buildAvatarImg(m.fromAvatar || "spy", 32)}
        </div>
        <div class="chat-bubble-content">
          <div class="chat-bubble-header">
            <span class="chat-bubble-name ${isDev ? "dev" : ""}">
              ${m.fromNickname}
              ${isDev ? ` ${SVG_DEV}` : ''}
            </span>
            <span class="chat-bubble-level">LV.${m.fromLevel || 1}</span>
            <span class="chat-bubble-title">${m.fromTitle || "مبتدئ"}</span>
          </div>
          <div class="chat-bubble-text">${escapeHtml(m.message)}</div>
          <div class="chat-bubble-time">${time}</div>
        </div>
      </div>
    `;
  }

  // ==========================================================
  // إرسال رسالة
  // ==========================================================
  async function send() {
    const input = document.getElementById("global-chat-input");
    if (!input) return;

    const message = input.value.trim();
    if (!message) {
      UI.toast("أدخل رسالة", "error");
      return;
    }

    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/chat/global`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const data = await res.json();
        UI.toast(data.error || "فشل الإرسال", "error");
        return;
      }

      input.value = "";
      const data = await res.json();
      // الرسالة ستصل عبر Socket.io
    } catch (err) {
      console.error("خطأ في إرسال الرسالة:", err);
      UI.toast("فشل الإرسال", "error");
    }
  }

  // ==========================================================
  // استقبال رسالة جديدة (من Socket.io)
  // ==========================================================
  function onNewMessage(data) {
    messages.push(data);
    if (messages.length > 500) messages.shift();

    const container = document.getElementById("global-chat-messages");
    if (!container) return;

    const bubble = document.createElement("div");
    bubble.innerHTML = buildBubble(data);
    container.appendChild(bubble.firstElementChild);
    container.scrollTop = container.scrollHeight;
  }

  // ==========================================================
  // تنقية النص
  // ==========================================================
  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    load,
    send,
    onNewMessage,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.GlobalChat = GlobalChat;

console.log("GlobalChat module loaded successfully");
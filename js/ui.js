/* ============================================================
   CODENAMES CLASSIC - UI MANAGER (v3.0)
   ============================================================
   الملف: ui.js
   الوظيفة: إدارة واجهة المستخدم - Toast، Modals، Panels، Overlays
   التحديثات: دعم الإشعار الأسطوري، تحديث عرض اللاعب، لا إيموجي
   ============================================================ */

const UI = (() => {
  // ==========================================================
  // SVG icons - بدون إيموجي
  // ==========================================================
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CROSS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const SVG_INFO = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  const SVG_WARN = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
  const SVG_STAR = `<svg width="16" height="16" viewBox="0 0 24 24" fill="var(--gold)" stroke="var(--gold)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
  const SVG_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // ==========================================================
  // Toast Notifications
  // ==========================================================
  function toast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    let icon = SVG_INFO;
    if (type === "success") icon = SVG_CHECK;
    else if (type === "error") icon = SVG_CROSS;
    else if (type === "dev") icon = SVG_STAR;
    else if (type === "warning") icon = SVG_WARN;

    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.innerHTML = `
      <span style="display:flex;align-items:center;gap:8px">
        ${icon}
        <span>${message}</span>
      </span>
    `;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(-10px)";
      el.style.transition = "all 0.3s";
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ==========================================================
  // Confirm Dialog (بدلاً من confirm())
  // ==========================================================
  function confirmDialog(message) {
    return new Promise((resolve) => {
      const modal = document.getElementById("modal-confirm");
      const msgEl = document.getElementById("confirm-message");
      const yesBtn = document.getElementById("confirm-yes");
      const noBtn = document.getElementById("confirm-no");

      if (!modal) {
        resolve(true);
        return;
      }

      if (msgEl) msgEl.textContent = message;
      modal.classList.remove("hidden");
      modal.classList.add("active");

      const cleanup = () => {
        modal.classList.add("hidden");
        modal.classList.remove("active");
        yesBtn.onclick = null;
        noBtn.onclick = null;
      };

      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };
    });
  }

  // ==========================================================
  // Prompt Dialog (بدلاً من prompt())
  // ==========================================================
  function promptDialog(message, placeholder = "") {
    return new Promise((resolve) => {
      const modal = document.getElementById("modal-prompt");
      const msgEl = document.getElementById("prompt-message");
      const input = document.getElementById("prompt-input");
      const okBtn = document.getElementById("prompt-ok");
      const cancelBtn = document.getElementById("prompt-cancel");

      if (!modal) {
        resolve(null);
        return;
      }

      if (msgEl) msgEl.textContent = message;
      if (input) {
        input.value = "";
        input.placeholder = placeholder || message;
        setTimeout(() => input.focus(), 50);
      }

      modal.classList.remove("hidden");
      modal.classList.add("active");

      const cleanup = () => {
        modal.classList.add("hidden");
        modal.classList.remove("active");
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        if (input) input.onkeydown = null;
      };

      const confirm = () => {
        const val = input?.value.trim() || "";
        cleanup();
        resolve(val || null);
      };

      okBtn.onclick = confirm;
      cancelBtn.onclick = () => { cleanup(); resolve(null); };
      if (input) input.onkeydown = (e) => { if (e.key === "Enter") confirm(); };
    });
  }

  // ==========================================================
  // Custom Dialog (محتوى مخصص)
  // ==========================================================
  function showCustomDialog(title, bodyHtml) {
    let dlg = document.getElementById("modal-custom-dialog");
    if (!dlg) {
      dlg = document.createElement("div");
      dlg.id = "modal-custom-dialog";
      dlg.className = "modal";
      dlg.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <h3 id="cus-dlg-title"></h3>
            <button class="modal-close" data-modal="modal-custom-dialog">${SVG_CLOSE}</button>
          </div>
          <div id="cus-dlg-body" class="modal-body"></div>
        </div>
      `;
      document.body.appendChild(dlg);
      dlg.querySelector(".modal-close").addEventListener("click", () => hideModal("modal-custom-dialog"));
      dlg.addEventListener("click", (e) => { if (e.target === dlg) hideModal("modal-custom-dialog"); });
    }

    document.getElementById("cus-dlg-title").textContent = title;
    document.getElementById("cus-dlg-body").innerHTML = bodyHtml;
    showModal("modal-custom-dialog");
  }

  // ==========================================================
  // Modals
  // ==========================================================
  function showModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("active");
    }
  }

  function hideModal(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("active");
    }
  }

  // ==========================================================
  // Panels
  // ==========================================================
  function showPanel(id) {
    document.querySelectorAll(".side-panel").forEach((p) => {
      if (p.id !== id) {
        p.classList.add("hidden");
        p.classList.remove("active");
      }
    });
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("active");
    }
    Audio.play("click");
  }

  function hidePanel(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("active");
    }
  }

  // ==========================================================
  // Overlays
  // ==========================================================
  function showOverlay(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("hidden");
      el.classList.add("active");
    }
  }

  function hideOverlay(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.add("hidden");
      el.classList.remove("active");
    }
  }

  // ==========================================================
  // Screens
  // ==========================================================
  function showScreen(name) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.add("hidden");
      s.classList.remove("active");
    });
    const target = document.getElementById(`screen-${name}`);
    if (target) {
      target.classList.remove("hidden");
      target.classList.add("active");
    }
    if (typeof App.setCurrentScreen === "function") {
      App.setCurrentScreen(name);
    }
  }

  // ==========================================================
  // Panel Tabs
  // ==========================================================
  function initPanelTabs(panelId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;

    panel.querySelectorAll(".panel-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        panel.querySelectorAll(".panel-tab").forEach((t) => t.classList.remove("active"));
        panel.querySelectorAll(".panel-tab-content").forEach((c) => {
          c.classList.remove("active");
          c.classList.add("hidden");
        });
        tab.classList.add("active");
        const content = panel.querySelector(`#${tabName}`);
        if (content) {
          content.classList.add("active");
          content.classList.remove("hidden");
        }
      });
    });
  }

  // ==========================================================
  // XP Bar
  // ==========================================================
  function updateXPBar(barId, textId, xp, xpNeeded) {
    const bar = document.getElementById(barId);
    const text = document.getElementById(textId);

    if (bar) {
      const pct = Math.min(100, (xp / xpNeeded) * 100);
      bar.style.width = `${pct}%`;
    }
    if (text) {
      text.textContent = `${xp} / ${xpNeeded} XP`;
    }
  }

  // ==========================================================
  // Time Ago
  // ==========================================================
  function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const s = Math.floor(diff / 1000);

    if (s < 60) return "الآن";
    const m = Math.floor(s / 60);
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.floor(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    const d = Math.floor(h / 24);
    if (d < 7) return `منذ ${d} يوم`;
    return `منذ ${Math.floor(d / 7)} أسبوع`;
  }

  // ==========================================================
  // Close Buttons
  // ==========================================================
  function bindCloseButtons() {
    // Modal close
    document.querySelectorAll(".modal-close[data-modal]").forEach((btn) => {
      btn.addEventListener("click", () => hideModal(btn.dataset.modal));
    });

    // Panel close
    document.querySelectorAll(".panel-close[data-panel]").forEach((btn) => {
      btn.addEventListener("click", () => hidePanel(btn.dataset.panel));
    });

    // Overlay close
    document.querySelectorAll(".overlay-close[data-overlay]").forEach((btn) => {
      btn.addEventListener("click", () => hideOverlay(btn.dataset.overlay));
    });

    // Overlay buttons (non-close)
    document.querySelectorAll("[data-overlay]").forEach((btn) => {
      if (btn.tagName === "BUTTON" && !btn.classList.contains("overlay-close")) {
        btn.addEventListener("click", () => hideOverlay(btn.dataset.overlay));
      }
    });

    // Modal click outside (except confirm/prompt)
    document.querySelectorAll(".modal").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal &&
            modal.id !== "modal-confirm" &&
            modal.id !== "modal-prompt") {
          hideModal(modal.id);
        }
      });
    });

    // Overlay click outside
    document.querySelectorAll(".overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
          hideOverlay(overlay.id);
        }
      });
    });
  }

  // ==========================================================
  // Legendary Popup (إشعار الأسطوري)
  // ==========================================================
  function showLegendaryPopup(data) {
    const overlay = document.getElementById("overlay-legendary");
    const nameEl = document.getElementById("legendary-player-name");
    const avatarEl = document.getElementById("legendary-avatar-display");

    if (!overlay) return;

    if (nameEl) nameEl.textContent = data.nickname || "لاعب";
    if (avatarEl) {
      avatarEl.innerHTML = Effects.buildAvatarImg(data.avatar || "spy", 60);
    }

    // تأثير الجزيئات الذهبية
    const particlesContainer = document.getElementById("legendary-particles");
    if (particlesContainer) {
      particlesContainer.innerHTML = "";
      for (let i = 0; i < 25; i++) {
        const p = document.createElement("div");
        p.className = "golden-particle";
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDelay = `${Math.random() * 0.6}s`;
        p.style.animationDuration = `${0.8 + Math.random() * 0.8}s`;
        particlesContainer.appendChild(p);
      }
    }

    overlay.classList.remove("hidden");
    overlay.classList.add("active");
    Audio.play("legendary-join");

    // إخفاء تلقائي بعد 3 ثواني
    setTimeout(() => {
      overlay.classList.add("hidden");
      overlay.classList.remove("active");
    }, 3000);
  }

  // ==========================================================
  // تحديث عرض اللاعب
  // ==========================================================
  function updatePlayerDisplay(player) {
    if (!player) return;

    // تحديث الاسم
    const nameEls = document.querySelectorAll(".player-name-display");
    nameEls.forEach(el => el.textContent = player.nickname);

    // تحديث المستوى
    const levelEls = document.querySelectorAll(".player-level-display");
    levelEls.forEach(el => el.textContent = `LV.${player.level}`);

    // تحديث اللقب
    const titleEls = document.querySelectorAll(".player-title-display");
    const title = player.activeTitle || "مبتدئ";
    titleEls.forEach(el => {
      el.textContent = title;
      el.style.color = "var(--purple)";
    });

    // تحديث XP
    const xp = player.xp || 0;
    const xpNeeded = typeof App.lvlXpNeeded === "function" ? App.lvlXpNeeded(player.level) : 100;
    updateXPBar("menu-xp-bar", "menu-xp-text", xp, xpNeeded);
    updateXPBar("sidebar-xp-bar", "sidebar-xp-text", xp, xpNeeded);
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    toast,
    confirmDialog,
    promptDialog,
    showCustomDialog,
    showModal,
    hideModal,
    showPanel,
    hidePanel,
    showOverlay,
    hideOverlay,
    showScreen,
    initPanelTabs,
    updateXPBar,
    timeAgo,
    bindCloseButtons,
    showLegendaryPopup,
    updatePlayerDisplay,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.UI = UI;

console.log("UI module loaded successfully");
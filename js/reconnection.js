/* ============================================================
   CODENAMES CLASSIC - RECONNECTION SYSTEM (v3.0)
   ============================================================
   الملف: reconnection.js
   الوظيفة: إعادة الاتصال التلقائي عند انقطاع الإنترنت
   التحديثات: مهلة 60 ثانية، تحسين الإشعارات، لا إيموجي
   ============================================================ */

const Reconnection = (() => {
  // ==========================================================
  // المتغيرات
  // ==========================================================
  let pendingRoom = null;
  let reconnectTimer = null;
  let countdownInterval = null;
  let reconnectAttempts = 0;
  const MAX_ATTEMPTS = 3;
  const RECONNECT_TIMEOUT = 60000; // 60 ثانية

  // SVG icons - بدون إيموجي
  const SVG_WIFI = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.94 0"/><path d="M12 20h.01"/></svg>`;
  const SVG_CLOSE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // ==========================================================
  // حفظ الغرفة المعلقة
  // ==========================================================
  function savePendingRoom(code) {
    pendingRoom = code;
    localStorage.setItem("pendingRoom", code);
  }

  // ==========================================================
  // مسح الغرفة المعلقة
  // ==========================================================
  function clearPendingRoom() {
    pendingRoom = null;
    localStorage.removeItem("pendingRoom");
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // ==========================================================
  // التحقق من غرفة معلقة
  // ==========================================================
  function checkPendingRoom() {
    const code = localStorage.getItem("pendingRoom");
    if (!code) return;
    pendingRoom = code;
    // تأخير بسيط للتأكد من جاهزية الـ socket
    setTimeout(() => showReconnectPrompt(code), 1000);
  }

  // ==========================================================
  // عرض نافذة إعادة الاتصال
  // ==========================================================
  function showReconnectPrompt(code) {
    const overlay = document.getElementById("overlay-reconnect");
    if (!overlay) return;

    // تحديث النص
    const msgEl = overlay.querySelector(".reconnect-msg");
    if (msgEl) {
      msgEl.textContent = `جاري محاولة إعادة الاتصال بالغرفة ${code}...`;
    }

    // عرض المؤقت
    startCountdown(RECONNECT_TIMEOUT);

    overlay.classList.remove("hidden");
    overlay.classList.add("active");
    UI.toast(`محاولة إعادة الاتصال بالغرفة ${code}`, "info", 5000);
  }

  // ==========================================================
  // بدء العد التنازلي
  // ==========================================================
  function startCountdown(timeout) {
    let remaining = Math.floor(timeout / 1000);
    const timerEl = document.getElementById("reconnect-timer");
    if (!timerEl) return;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        countdownInterval = null;
        timerEl.textContent = "0";
        // انتهاء المهلة
        cancel();
        UI.toast("انتهت مهلة إعادة الاتصال", "error");
        return;
      }
      timerEl.textContent = remaining;
    }, 1000);

    // تعيين المؤقت الأولي
    timerEl.textContent = Math.floor(timeout / 1000);

    // إلغاء المحاولة بعد المهلة
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      clearInterval(countdownInterval);
      countdownInterval = null;
      cancel();
      UI.toast("انتهت مهلة إعادة الاتصال", "error");
    }, timeout);
  }

  // ==========================================================
  // عرض رسالة انقطاع الاتصال
  // ==========================================================
  function showDisconnected() {
    UI.toast("انقطع الاتصال... جاري إعادة الاتصال", "error", 10000);

    // إذا كنا في غرفة، نعرض نافذة إعادة الاتصال
    const code = localStorage.getItem("pendingRoom");
    if (code) {
      setTimeout(() => showReconnectPrompt(code), 2000);
    }
  }

  // ==========================================================
  // محاولة إعادة الاتصال
  // ==========================================================
  function attemptReconnect() {
    const code = pendingRoom || localStorage.getItem("pendingRoom");
    if (!code) {
      UI.toast("لا توجد غرفة لإعادة الاتصال", "error");
      cancel();
      return;
    }

    const player = App.getPlayer();
    if (!player) {
      UI.toast("بيانات اللاعب غير متاحة", "error");
      cancel();
      return;
    }

    const socket = SocketClient.getSocket();
    if (!socket) {
      UI.toast("غير متصل بالسيرفر", "error");
      cancel();
      return;
    }

    // إخفاء نافذة إعادة الاتصال
    UI.hideOverlay("overlay-reconnect");
    UI.toast("جاري الاستكمال...", "info");

    reconnectAttempts++;

    socket.emit("reconnect_room", { code, playerId: player.playerId }, (response) => {
      if (response?.success) {
        // إعادة الاتصال نجحت
        clearPendingRoom();
        UI.toast("تم إعادة الاتصال بنجاح", "success");

        // استعادة حالة اللعبة
        if (typeof Game.onReconnected === "function") {
          Game.onReconnected(response);
        } else if (typeof Game.updateLobbyUI === "function") {
          Game.updateLobbyUI(response.room);
          UI.showScreen("lobby");
        }
      } else {
        // فشل إعادة الاتصال
        const errorMsg = response?.error || "لم تعد الغرفة موجودة";
        UI.toast(`فشل إعادة الاتصال: ${errorMsg}`, "error");

        if (reconnectAttempts < MAX_ATTEMPTS) {
          // محاولة مرة أخرى بعد 3 ثواني
          UI.toast(`محاولة ${reconnectAttempts + 1} من ${MAX_ATTEMPTS}...`, "info");
          setTimeout(() => {
            attemptReconnect();
          }, 3000);
        } else {
          // فشل كل المحاولات
          clearPendingRoom();
          UI.toast("فشل إعادة الاتصال، العودة للقائمة", "error");
          if (typeof Game.leaveGame === "function") {
            Game.leaveGame();
          } else {
            UI.showScreen("menu");
          }
          cancel();
        }
      }
    });

    // مهلة إضافية للاستجابة
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(() => {
      if (pendingRoom) {
        UI.toast("انتهت مهلة إعادة الاتصال", "error");
        cancel();
      }
    }, RECONNECT_TIMEOUT);
  }

  // ==========================================================
  // إلغاء إعادة الاتصال
  // ==========================================================
  function cancel() {
    clearPendingRoom();
    UI.hideOverlay("overlay-reconnect");
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    reconnectAttempts = 0;
    // العودة للقائمة الرئيسية إذا كنا في غرفة
    if (typeof Game.leaveGame === "function") {
      Game.leaveGame();
    } else {
      UI.showScreen("menu");
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    savePendingRoom,
    clearPendingRoom,
    checkPendingRoom,
    showDisconnected,
    attemptReconnect,
    cancel,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Reconnection = Reconnection;

console.log("Reconnection module loaded successfully");
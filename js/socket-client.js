/* ============================================================
   CODENAMES CLASSIC - SOCKET CLIENT (v3.0)
   ============================================================
   الملف: socket-client.js
   الوظيفة: إدارة اتصال Socket.io مع السيرفر
   التحديثات: دعم الأحداث الجديدة، لا إيموجي
   ============================================================ */

const SERVER_URL = "https://uuuuu-rup4.onrender.com";

let socket = null;

// ==========================================================
// تهيئة Socket
// ==========================================================
function initSocket() {
  if (socket && socket.connected) {
    return;
  }

  socket = io(SERVER_URL, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    timeout: 20000,
  });

  // ==========================================================
  // أحداث الاتصال
  // ==========================================================
  socket.on("connect", () => {
    console.log("متصل بالسيرفر:", socket.id);
    const player = App.getPlayer();
    if (player) {
      socket.emit("player_connect", { playerId: player.playerId });
    }
    // التحقق من غرفة معلقة
    if (typeof Reconnection.checkPendingRoom === "function") {
      Reconnection.checkPendingRoom();
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("انقطع الاتصال:", reason);
    if (App.getCurrentScreen() === "game" || App.getCurrentScreen() === "lobby") {
      if (typeof Reconnection.showDisconnected === "function") {
        Reconnection.showDisconnected();
      }
    }
  });

  socket.on("connect_error", (err) => {
    console.error("خطأ في الاتصال:", err.message);
    UI.toast("خطأ في الاتصال بالسيرفر", "error");
  });

  // ==========================================================
  // أحداث الغرف
  // ==========================================================
  socket.on("rooms_update", (rooms) => {
    if (typeof Game.updateRoomsList === "function") {
      Game.updateRoomsList(rooms);
    }
  });

  socket.on("room_update", (room) => {
    if (typeof Game.updateLobbyUI === "function") {
      Game.updateLobbyUI(room);
    }
  });

  socket.on("room_closed", (data) => {
    UI.toast(`الغرفة أغلقت: ${data.reason || "غادر منشئ الغرفة"}`, "error");
    if (typeof Game.leaveLobby === "function") {
      Game.leaveLobby();
    } else {
      UI.showScreen("menu");
    }
    Audio.play("room-closed");
  });

  // ==========================================================
  // أحداث اللاعبين
  // ==========================================================
  socket.on("player_joined", (data) => {
    UI.toast(`${data.nickname} انضم للغرفة`, "info");
    Audio.play("join");
  });

  socket.on("player_left", (data) => {
    if (data.kicked) {
      UI.toast(`${data.nickname} تم طرده`, "error");
      Audio.play("kicked");
    } else {
      UI.toast(`${data.nickname || "لاعب"} غادر الغرفة`, "info");
      Audio.play("leave");
    }
  });

  socket.on("player_reconnected", (data) => {
    UI.toast(`${data.nickname} عاد للمباراة!`, "success");
  });

  socket.on("kicked_from_room", (data) => {
    UI.toast(`تم طردك من الغرفة: ${data.reason || "لا يوجد سبب"}`, "error");
    Audio.play("kicked");
    if (typeof Game.leaveLobby === "function") {
      Game.leaveLobby();
    } else {
      UI.showScreen("menu");
    }
  });

  // ==========================================================
  // أحداث اللعبة
  // ==========================================================
  socket.on("game_started", (data) => {
    if (typeof Game.onGameStarted === "function") {
      Game.onGameStarted(data);
    }
    Audio.play("game-start");
  });

  socket.on("game_started_announce", (data) => {
    if (data.soloMode) {
      UI.toast(`بدء اللعبة - سولو | البوص: ${data.spymaster || "غير معروف"}`, "info");
    } else {
      UI.toast(`بدء اللعبة - زوجي`, "info");
    }
  });

  socket.on("spymaster_view", (data) => {
    if (typeof Game.onSpymasterView === "function") {
      Game.onSpymasterView(data);
    }
  });

  socket.on("game_update", (data) => {
    if (typeof Game.onGameUpdate === "function") {
      Game.onGameUpdate(data);
    }
  });

  socket.on("hint_sent", (data) => {
    if (typeof Game.onHintReceived === "function") {
      Game.onHintReceived(data);
    }
  });

  socket.on("card_revealed", (data) => {
    if (typeof Game.onCardRevealed === "function") {
      Game.onCardRevealed(data);
    }
  });

  socket.on("turn_changed", (data) => {
    if (typeof Game.onTurnChanged === "function") {
      Game.onTurnChanged(data);
    }
  });

  socket.on("game_over", (data) => {
    if (typeof Game.onGameOver === "function") {
      Game.onGameOver(data);
    }
  });

  // ==========================================================
  // أحداث السولو
  // ==========================================================
  socket.on("your_turn", (data) => {
    UI.toast(`دورك الآن! ${data.message || ""}`, "info");
    Audio.play("turn-start");
    if (typeof Game.onYourTurn === "function") {
      Game.onYourTurn(data);
    }
  });

  socket.on("eliminated", () => {
    UI.toast("تم إقصاؤك من اللعبة", "error");
    Audio.play("lose");
  });

  socket.on("card_temp_selected", (data) => {
    // تحديث البطاقة المؤقتة في الواجهة
    const cards = document.querySelectorAll(".game-card");
    const card = cards[data.cardId];
    if (card) {
      card.classList.add("temp-selected");
      const tempAvatar = card.querySelector(".temp-avatar");
      if (tempAvatar) {
        tempAvatar.innerHTML = `<img src="/assets/avatars/spy.png" alt="temp" />`;
      }
    }
  });

  socket.on("card_temp_cancel", (data) => {
    const cards = document.querySelectorAll(".game-card");
    const card = cards[data.cardId];
    if (card) {
      card.classList.remove("temp-selected");
      const tempAvatar = card.querySelector(".temp-avatar");
      if (tempAvatar) {
        tempAvatar.innerHTML = "";
      }
    }
  });

  socket.on("feedback", (data) => {
    if (data.type === "correct") {
      UI.toast("إجابة صحيحة! استمر.", "success");
    } else if (data.type === "wrong") {
      UI.toast("إجابة خاطئة! ينتهي دورك.", "error");
    } else if (data.type === "neutral") {
      UI.toast("بطاقة محايدة! ينتهي دورك.", "info");
    } else if (data.type === "black") {
      UI.toast("بطاقة سوداء! تم إقصاؤك.", "error");
    } else if (data.type === "timeout") {
      UI.toast("انتهى الوقت، تم إلغاء اختيارك", "warning");
    }
  });

  // ==========================================================
  // أحداث الدردشة
  // ==========================================================
  socket.on("room_chat", (data) => {
    if (typeof Game.onRoomChat === "function") {
      Game.onRoomChat(data);
    }
  });

  // ==========================================================
  // أحداث اجتماعية
  // ==========================================================
  socket.on("legendary_join", (data) => {
    if (typeof Effects.showLegendaryJoin === "function") {
      Effects.showLegendaryJoin(data);
    }
    Audio.play("legendary-join");
  });

  socket.on("dev_join", (data) => {
    UI.toast(`القائد ${data.nickname} دخل الغرفة!`, "dev");
    Audio.play("dev-join");
  });

  // ==========================================================
  // أحداث الإشعارات والرسائل
  // ==========================================================
  socket.on("notification", (data) => {
    if (typeof Notifications.onNewNotification === "function") {
      Notifications.onNewNotification(data);
    } else {
      UI.toast(data.message || "إشعار جديد", "info");
    }
  });

  socket.on("dev_announcement", (data) => {
    UI.toast(`إعلان من المطور: ${data.message}`, "dev", 8000);
    Audio.play("notification");
  });

  socket.on("dev_popup", (data) => {
    UI.showCustomDialog("رسالة من المطور", `
      <div style="text-align:center;padding:8px 0">
        <div style="font-size:0.9rem;margin-bottom:12px;color:var(--gold)">من: ${data.from || "المطور"}</div>
        <div style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:12px;margin-bottom:12px">
          <div style="color:var(--text);font-size:1rem">${data.message}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="document.querySelector('.custom-dialog')?.remove()">تم</button>
      </div>
    `);
    Audio.play("notification");
  });

  socket.on("global_chat", (data) => {
    if (typeof GlobalChat.onNewMessage === "function") {
      GlobalChat.onNewMessage(data);
    }
  });

  socket.on("private_message", (data) => {
    UI.toast(`رسالة خاصة من ${data.fromNickname}`, "info");
    Audio.play("notification");
    if (typeof Notifications.onNewNotification === "function") {
      Notifications.onNewNotification({
        type: "private_message",
        message: `رسالة خاصة من ${data.fromNickname}`,
        data: data,
      });
    }
  });

  // ==========================================================
  // أحداث الدعوات
  // ==========================================================
  socket.on("room_invite", (data) => {
    if (typeof Notifications.onNewNotification === "function") {
      Notifications.onNewNotification({
        type: "room_invite",
        message: `${data.fromNickname} يدعوك للانضمام إلى غرفة`,
        data: data,
      });
    } else {
      // Fallback
      UI.toast(`${data.fromNickname} يدعوك للغرفة ${data.roomCode}`, "info");
    }
    Audio.play("notification");
  });

  socket.on("invite_response", (data) => {
    if (data.accept) {
      UI.toast("تم قبول الدعوة!", "success");
      if (data.roomCode) {
        if (typeof Game.joinRoom === "function") {
          Game.joinRoom(data.roomCode, "", "");
        }
      }
    } else {
      UI.toast("تم رفض الدعوة", "info");
    }
  });

  socket.on("invite_error", (data) => {
    UI.toast(data.error || "فشل إرسال الدعوة", "error");
  });

  // ==========================================================
  // أحداث الكلان
  // ==========================================================
  socket.on("clan_chat", (data) => {
    UI.toast(`رسالة في شات الكلان من ${data.fromNickname}`, "info");
    Audio.play("notification");
  });

  socket.on("clan_announcement", (data) => {
    UI.toast(`إعلان من ${data.from}: ${data.message}`, "dev", 8000);
    Audio.play("notification");
  });

  socket.on("clan_request_update", (data) => {
    const badge = document.getElementById("clan-requests-badge");
    if (badge) {
      if (data.requests > 0) {
        badge.textContent = data.requests;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  });

  socket.on("clan_disbanded", (data) => {
    UI.toast(`تم حل الكلان ${data.clanName}`, "error");
    if (typeof App.updatePlayerClan === "function") {
      App.updatePlayerClan();
    }
  });

  // ==========================================================
  // أحداث الحظر
  // ==========================================================
  socket.on("banned", (data) => {
    UI.toast(`تم حظرك: ${data.reason || "مخالفة قواعد اللعب"}`, "error", 8000);
    Audio.play("kicked");
    setTimeout(() => {
      if (typeof App.logout === "function") {
        App.logout();
      }
    }, 3000);
  });

  // ==========================================================
  // أحداث السيرفر
  // ==========================================================
  socket.on("server_shutdown", (data) => {
    UI.toast(`السيرفر سيغلق: ${data.message || "جاري الصيانة"}`, "error", 10000);
  });

  // ==========================================================
  // أحداث المهام
  // ==========================================================
  socket.on("mission_claimed", (data) => {
    UI.toast(`تم استلام مكافأة المهمة! +${data.xpGained} XP`, "success");
    Audio.play("level-up");
    if (typeof App.refreshPlayer === "function") {
      App.refreshPlayer();
    }
  });

  socket.on("new_challenge", (data) => {
    UI.toast(`تحدي جديد: ${data.message}`, "info");
    Audio.play("notification");
  });

  // ==========================================================
  // أحداث السوق
  // ==========================================================
  socket.on("market_purchase", (data) => {
    UI.toast(`تم شراء ${data.itemName} بنجاح!`, "success");
    Audio.play("level-up");
    if (typeof App.refreshPlayer === "function") {
      App.refreshPlayer();
    }
  });
}

// ==========================================================
// الحصول على كائن Socket
// ==========================================================
function getSocket() {
  return socket;
}

// ==========================================================
// تصدير الواجهة العامة
// ==========================================================
const SocketClient = {
  initSocket,
  getSocket,
};

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.SocketClient = SocketClient;

console.log("SocketClient module loaded successfully");
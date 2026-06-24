/* ===== Game Logic ===== */
const Game = (() => {
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentRoom = null;
  let myRole = null;
  let myTeam = null;
  let isSpymaster = false;
  let currentHint = null;
  let guessesLeft = 0;
  let isMyTurn = false;
  let gameState = null;

  // ===== قائمة الغرف العامة =====
  let roomsInterval = null;

  function startRoomsRefresh() {
    fetchPublicRooms();
    if (roomsInterval) clearInterval(roomsInterval);
    roomsInterval = setInterval(fetchPublicRooms, 5000);
  }

  function stopRoomsRefresh() {
    if (roomsInterval) clearInterval(roomsInterval);
  }

  async function fetchPublicRooms() {
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rooms = await res.json();
      updateRoomsList(rooms);
    } catch {}
  }

  function updateRoomsList(rooms) {
    const listEl = document.getElementById("public-rooms-list");
    const homeEl = document.getElementById("public-rooms-list-home");
    const hideFullCb = document.getElementById("hide-full-rooms");
    const hideFull = hideFullCb?.checked;
    let filtered = rooms;
    if (hideFull) filtered = rooms.filter((r) => r.players?.length < 8);

    const makeRow = (r) => `
      <div class="room-row" data-code="${r.code}">
        <span class="room-row-name">${r.name || "غرفة"} ${r.hasPassword ? "🔒" : ""}</span>
        <span class="room-row-players">${r.players?.length || 0}/8</span>
        <span class="room-row-mode">${r.mode === "classic" ? "كلاسيك" : "سولو"}</span>
        <span class="room-row-status ${r.status === "playing" ? "status-playing" : "status-waiting"}">
          ${r.status === "playing" ? "جارية" : "انتظار"}
        </span>
        <button class="room-row-join" onclick="Game.quickJoin('${r.code}')">انضم</button>
      </div>`;

    if (listEl) {
      if (filtered.length === 0) {
        listEl.innerHTML = `<div class="rooms-empty">لا توجد غرف متاحة حالياً. أنشئ غرفتك!</div>`;
      } else {
        listEl.innerHTML = filtered.map(makeRow).join("");
      }
    }

    if (homeEl) {
      const homeFiltered = filtered.slice(0, 6);
      if (homeFiltered.length === 0) {
        homeEl.innerHTML = `<div class="rooms-empty">لا توجد غرف نشطة. أنشئ غرفتك!</div>`;
      } else {
        homeEl.innerHTML = homeFiltered.map(makeRow).join("");
      }
    }
  }

  // ===== إنشاء غرفة (عبر Socket.io) =====
  function createRoom() {
    const name = document.getElementById("create-room-name").value.trim();
    const password = document.getElementById("create-room-password").value;
    const cardCount = parseInt(document.querySelector('input[name="card-count"]:checked')?.value || 25);
    const mode = document.querySelector('input[name="game-mode"]:checked')?.value || "classic";

    if (!name) { UI.toast("أدخل اسم الغرفة", "error"); return; }

    const socket = SocketClient.getSocket();
    if (!socket?.connected) { UI.toast("غير متصل بالسيرفر، حاول مجدداً", "error"); return; }

    const btn = document.getElementById("btn-confirm-create-room");
    if (btn) { btn.disabled = true; btn.textContent = "جاري الإنشاء..."; }

    socket.emit("create_room", {
      name, password, cardCount, mode,
      playerData: App.getPlayer(),
    }, (result) => {
      if (btn) { btn.disabled = false; btn.textContent = "إنشاء الغرفة"; }
      if (result?.success) {
        UI.hideModal("modal-create-room");
        const room = result.room;
        Reconnection.savePendingRoom(room.code);
        currentRoom = room;
        UI.showScreen("lobby");
        updateLobbyUI(room);
        Audio.play("click");
      } else {
        UI.toast(result?.error || "فشل الإنشاء", "error");
      }
    });
  }

  // ===== الانضمام لغرفة (عبر Socket.io) =====
  function joinRoom(code, password) {
    if (!code) { UI.toast("أدخل الكود", "error"); return; }

    const socket = SocketClient.getSocket();
    if (!socket?.connected) { UI.toast("غير متصل بالسيرفر", "error"); return; }

    socket.emit("join_room", {
      code: code.toUpperCase().trim(),
      password: password || "",
      playerData: App.getPlayer(),
    }, (result) => {
      if (result?.success) {
        UI.hideModal("modal-join-room");
        Reconnection.savePendingRoom(code);
        currentRoom = result.room;
        UI.showScreen("lobby");
        updateLobbyUI(result.room);
        Audio.play("join");
      } else {
        UI.toast(result?.error || "لا يمكن الانضمام", "error");
      }
    });
  }

  function quickJoin(code) {
    const socket = SocketClient.getSocket();
    if (!socket?.connected) { UI.toast("غير متصل بالسيرفر", "error"); return; }

    socket.emit("join_room", {
      code: code.toUpperCase().trim(),
      password: "",
      playerData: App.getPlayer(),
    }, (result) => {
      if (result?.success) {
        Reconnection.savePendingRoom(code);
        currentRoom = result.room;
        UI.showScreen("lobby");
        updateLobbyUI(result.room);
        Audio.play("join");
      } else {
        if (result?.error?.includes("كلمة المرور") || result?.error?.includes("password")) {
          document.getElementById("join-room-code").value = code;
          UI.showModal("modal-join-room");
        } else {
          UI.toast(result?.error || "تعذّر الانضمام", "error");
        }
      }
    });
  }

  // دعوة صديق للغرفة
  function inviteFriend(targetPlayerId) {
    if (!currentRoom) { UI.toast("أنت لست في غرفة", "error"); return; }
    const socket = SocketClient.getSocket();
    socket?.emit("invite_friend", {
      targetPlayerId,
      roomCode: currentRoom.code,
      roomName: currentRoom.name,
    }, (result) => {
      if (result?.success) UI.toast("تم إرسال الدعوة", "success");
      else UI.toast(result?.error || "تعذّر الإرسال", "error");
    });
  }

  // ===== اللوبي =====
  function updateLobbyUI(room) {
    currentRoom = room;
    const player = App.getPlayer();
    document.getElementById("lobby-room-name").textContent = room.name || "الغرفة";
    document.getElementById("lobby-room-code").textContent = room.code;

    // السيرفر يُرجع createdBy (socket) أو host (قديم)
    const isHost = room.createdBy === player?.playerId || room.host === player?.playerId;
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn) {
      if (isHost || player?.isDev) startBtn.classList.remove("hidden");
      else startBtn.classList.add("hidden");
    }

    // دعم كلا صيغتي البيانات: room.teams.red OR room.redTeam
    const redTeam = room.teams?.red || room.redTeam || {};
    const blueTeam = room.teams?.blue || room.blueTeam || {};

    renderTeamSlot("red-spymaster-slot", redTeam.spymaster, "spymaster");
    renderTeamSlots("red-operatives-slots", redTeam.operatives || []);
    renderTeamSlot("blue-spymaster-slot", blueTeam.spymaster, "spymaster");
    renderTeamSlots("blue-operatives-slots", blueTeam.operatives || []);
    renderSpectators(room.spectators || []);

    // زر دعوة الأصدقاء في اللوبي
    renderLobbyInviteBtn();

    // تحديد دور اللاعب الحالي
    const myId = player?.playerId;
    const meInRoom = (room.players || []).find((p) => p.playerId === myId);
    if (meInRoom?.role === "spymaster") {
      myTeam = meInRoom.team; myRole = "spymaster"; isSpymaster = true;
    } else if (redTeam.spymaster?.playerId === myId) {
      myTeam = "red"; myRole = "spymaster"; isSpymaster = true;
    } else if (blueTeam.spymaster?.playerId === myId) {
      myTeam = "blue"; myRole = "spymaster"; isSpymaster = true;
    } else if ((redTeam.operatives || []).find((p) => p.playerId === myId)) {
      myTeam = "red"; myRole = "operative"; isSpymaster = false;
    } else if ((blueTeam.operatives || []).find((p) => p.playerId === myId)) {
      myTeam = "blue"; myRole = "operative"; isSpymaster = false;
    } else {
      myTeam = null; myRole = "spectator"; isSpymaster = false;
    }
  }

  function renderLobbyInviteBtn() {
    const wrap = document.getElementById("lobby-invite-wrap");
    if (!wrap) return;
    wrap.innerHTML = `<button class="btn btn-sm btn-ghost" onclick="Game.showInviteFriendsPanel()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
      دعوة صديق
    </button>`;
  }

  function showInviteFriendsPanel() {
    const token = localStorage.getItem("token");
    fetch(`${API}/players/me/friends`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const friends = (data.friends || []).filter((f) => f.isOnline && !f.currentRoom);
        if (!friends.length) { UI.toast("لا يوجد أصدقاء متصلون الآن", "info"); return; }
        const list = friends.map((f) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="width:32px;height:32px">${Effects.buildAvatarImg(f.avatar, 32)}</div>
            <span style="flex:1">${f.nickname}</span>
            <button class="btn btn-sm btn-primary" onclick="Game.inviteFriend('${f.playerId}');this.textContent='تم ✓';this.disabled=true">دعوة</button>
          </div>
        `).join("");
        UI.showCustomDialog("دعوة أصدقاء", list);
      }).catch(() => UI.toast("تعذّر تحميل الأصدقاء", "error"));
  }

  function renderTeamSlot(elId, player, role) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!player) {
      el.innerHTML = `<span style="color:var(--text-dim)">فارغ</span>`;
    } else {
      const isMe = player.playerId === App.getPlayer()?.playerId;
      el.innerHTML = `
        <div class="player-in-slot">
          <div style="width:24px;height:24px">${Effects.buildAvatarImg(player.avatar, 24)}</div>
          <span>${player.nickname}</span>
          ${isMe ? '<span class="member-is-you">(أنت)</span>' : ''}
        </div>
      `;
    }
  }

  function renderTeamSlots(elId, players) {
    const el = document.getElementById(elId);
    if (!el) return;
    const myId = App.getPlayer()?.playerId;
    el.innerHTML = players.map((p) => `
      <div class="player-in-slot">
        <div style="width:24px;height:24px">${Effects.buildAvatarImg(p.avatar, 24)}</div>
        <span>${p.nickname}</span>
        ${p.playerId === myId ? '<span class="member-is-you">(أنت)</span>' : ''}
      </div>
    `).join("") || `<div style="color:var(--text-dim);font-size:0.78rem;padding:4px">فارغ</div>`;
  }

  function renderSpectators(specs) {
    const el = document.getElementById("spectators-list");
    if (!el) return;
    el.innerHTML = specs.map((p) => `<div style="font-size:0.78rem;color:var(--text-dim)">${p.nickname}</div>`).join("") || `<div style="font-size:0.78rem;color:var(--text-dim)">لا أحد</div>`;
  }

  function chooseTeamRole(team, role) {
    const socket = SocketClient.getSocket();
    const player = App.getPlayer();
    socket?.emit("choose_role", { code: currentRoom?.code, team, role, player });
  }

  function startGame() {
    const socket = SocketClient.getSocket();
    socket?.emit("start_game", { code: currentRoom?.code });
  }

  function leaveLobby() {
    const socket = SocketClient.getSocket();
    socket?.emit("leave_room", { code: currentRoom?.code });
    Reconnection.clearPendingRoom();
    currentRoom = null;
    stopRoomsRefresh();
    UI.showScreen("menu");
    startRoomsRefresh();
  }

  // ===== بدء اللعبة =====
  function onGameStarted(data) {
    gameState = data;
    myTeam = data.myTeam;
    myRole = data.myRole;
    isSpymaster = myRole === "spymaster";
    Audio.play("turn-start");
    UI.showScreen("game");
    renderGameScreen(data);
  }

  function onReconnected(data) {
    currentRoom = data.room;
    updateLobbyUI(data.room);
  }

  function renderGameScreen(data) {
    document.getElementById("game-room-name").textContent = currentRoom?.name || data.roomName || "";
    document.getElementById("game-room-code").textContent = `# ${currentRoom?.code || ""}`;

    buildCardsGrid(data.cards, data.cardCount || 25);
    updateScores(data.scores);
    updateTeamPanels(data.teams);
    updateTurnDisplay(data.currentTurn, data.currentTeam);
    clearGameLog();

    document.getElementById("hint-display").classList.add("hidden");
    document.getElementById("hint-form")?.classList.add("hidden");
    document.getElementById("end-turn-wrap")?.classList.add("hidden");
  }

  function buildCardsGrid(cards, count) {
    const grid = document.getElementById("cards-grid");
    if (!grid) return;

    const gridClass = count === 25 ? "grid-25" : count === 16 ? "grid-16" : "grid-12";
    grid.className = `cards-grid ${gridClass}`;

    // الحزمة المجهزة
    const player = App.getPlayer();
    const equippedSkin = player?.inventory?.cardSkins?.find((s) => s.equipped);
    const skinStyle = equippedSkin?.css || "";

    grid.innerHTML = cards.map((card, idx) => {
      const colorClass = isSpymaster ? `spy-${card.color}` : "";
      const revealed = card.revealed ? `revealed ${card.color}` : "";
      return `
        <div class="game-card ${colorClass} ${revealed}"
             data-index="${idx}" data-word="${card.word}" data-revealed="${card.revealed}"
             style="${revealed && skinStyle ? "" : (skinStyle && !card.revealed ? skinStyle : "")}"
             onclick="Game.onCardClick(this, ${idx})">
          ${card.word}
        </div>
      `;
    }).join("");
  }

  function onCardClick(el, idx) {
    if (!isMyTurn || isSpymaster) return;
    if (el.dataset.revealed === "true") return;
    if (guessesLeft <= 0) { UI.toast("لا تخمينات متبقية", "error"); return; }

    const socket = SocketClient.getSocket();
    socket?.emit("guess_card", { code: currentRoom?.code, cardIndex: idx });
    Audio.play("card-flip");
  }

  function onGameUpdate(data) {
    gameState = data;
    if (data.cards) buildCardsGrid(data.cards, data.cardCount);
    if (data.scores) updateScores(data.scores);
    if (data.teams) updateTeamPanels(data.teams);
  }

  function onSpymasterView(data) {
    buildCardsGrid(data.cards, data.cardCount);
    if (data.isMyTurn) {
      showHintForm();
    }
  }

  function onHintReceived(data) {
    currentHint = data;
    guessesLeft = data.count === "∞" ? 99 : parseInt(data.count) + 1;
    document.getElementById("hint-display").classList.remove("hidden");
    document.getElementById("hint-word").textContent = data.word;
    document.getElementById("hint-count").textContent = `عدد البطاقات: ${data.count}`;
    document.getElementById("guesses-left").textContent = `تخمينات متبقية: ${guessesLeft}`;
    addLogEntry(`تلميح ${data.team === "red" ? "الأحمر" : "الأزرق"}: "${data.word}" (${data.count})`, "hint");
    Audio.play("hint");

    const isMyHintTurn = data.team === myTeam && myRole === "operative";
    if (isMyHintTurn) {
      isMyTurn = true;
      document.getElementById("end-turn-wrap")?.classList.remove("hidden");
      UI.toast(`تلميح: ${data.word} - ${data.count}`, "info");
    }
  }

  function onCardRevealed(data) {
    const cards = document.querySelectorAll(".game-card");
    const card = cards[data.cardIndex];
    if (!card) return;

    card.classList.add("revealed", data.color);
    card.dataset.revealed = "true";

    const flashType = data.color === "black" ? "black" : (data.color === myTeam ? "correct" : "wrong");
    Effects.flashCard(card, flashType);

    if (data.color === "black") {
      Effects.shakeScreen();
      Audio.play("black");
    } else if (data.color === myTeam) {
      Audio.play("correct");
    } else {
      Audio.play("wrong");
    }

    if (data.guessedBy) {
      const logType = data.color === myTeam ? "correct" : data.color === "black" ? "black-card" : "wrong";
      addLogEntry(`${data.guessedBy} → "${data.word}" (${colorAr(data.color)})`, logType);
    }

    if (guessesLeft > 0) {
      guessesLeft--;
      const gl = document.getElementById("guesses-left");
      if (gl) gl.textContent = `تخمينات متبقية: ${guessesLeft}`;
    }

    updateScores(data.scores || {});
  }

  function onTurnChanged(data) {
    isMyTurn = false;
    guessesLeft = 0;
    updateTurnDisplay(data.turn, data.team);
    document.getElementById("hint-display")?.classList.add("hidden");
    document.getElementById("end-turn-wrap")?.classList.add("hidden");
    document.getElementById("hint-form")?.classList.add("hidden");
    currentHint = null;

    addLogEntry(`انتقل الدور إلى ${data.team === "red" ? "الأحمر" : "الأزرق"}`, "turn-end");
    Audio.play("turn-start");

    const myId = App.getPlayer()?.playerId;
    if (data.team === myTeam) {
      if (isSpymaster) {
        showHintForm();
        isMyTurn = true;
        UI.toast("دورك! أرسل تلميحاً", "success");
      }
    }
  }

  function showHintForm() {
    const form = document.getElementById("hint-form");
    if (form) form.classList.remove("hidden");
    document.getElementById("hint-word-input")?.focus();
  }

  function sendHint() {
    const word = document.getElementById("hint-word-input")?.value.trim();
    const count = document.getElementById("hint-count-input")?.value;
    if (!word) { UI.toast("أدخل كلمة التلميح", "error"); return; }
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(word)) { UI.toast("التلميح كلمة واحدة فقط بدون أرقام", "error"); return; }

    const socket = SocketClient.getSocket();
    socket?.emit("send_hint", { code: currentRoom?.code, word, count: parseInt(count) });
    document.getElementById("hint-form")?.classList.add("hidden");
    document.getElementById("hint-word-input").value = "";
    isMyTurn = false;
  }

  function endTurn() {
    const socket = SocketClient.getSocket();
    socket?.emit("end_turn", { code: currentRoom?.code });
    isMyTurn = false;
    document.getElementById("end-turn-wrap")?.classList.add("hidden");
  }

  function onGameOver(data) {
    Audio.play(data.winner === myTeam ? "win" : "lose");
    Reconnection.clearPendingRoom();
    stopRoomsRefresh();

    const titleEl = document.getElementById("game-over-title");
    const subtitleEl = document.getElementById("game-over-subtitle");
    const iconEl = document.getElementById("game-over-icon");
    const statsEl = document.getElementById("game-over-stats");

    const won = data.winner === myTeam;
    if (titleEl) titleEl.textContent = won ? "🏆 فزتم!" : "💀 خسرتم!";
    if (titleEl) titleEl.style.color = won ? "var(--gold)" : "var(--red)";
    if (subtitleEl) subtitleEl.textContent = data.reason || (data.winner === "red" ? "فاز الأحمر" : "فاز الأزرق");
    if (iconEl) iconEl.textContent = won ? "🏆" : "💀";
    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>الدرجات</span><span>${data.scores?.red || 0} : ${data.scores?.blue || 0}</span></div>
        ${data.xpEarned ? `<div style="display:flex;justify-content:space-between;color:var(--blue)"><span>XP مكتسب</span><span>+${data.xpEarned}</span></div>` : ''}
        ${data.coinsEarned ? `<div style="display:flex;justify-content:space-between;color:var(--gold)"><span>عملات مكتسبة</span><span>+${data.coinsEarned}</span></div>` : ''}
      `;
    }

    UI.showOverlay("overlay-game-over");
    if (won) Effects.launchFireworks("fireworks-canvas");
    if (data.xpEarned || data.coinsEarned) {
      setTimeout(() => App.refreshPlayer(), 2000);
    }
  }

  function playAgain() {
    UI.hideOverlay("overlay-game-over");
    if (currentRoom) {
      UI.showScreen("lobby");
    } else {
      UI.showScreen("menu");
      startRoomsRefresh();
    }
  }

  function leaveGame() {
    const socket = SocketClient.getSocket();
    socket?.emit("leave_room", { code: currentRoom?.code });
    Reconnection.clearPendingRoom();
    currentRoom = null;
    gameState = null;
    UI.hideOverlay("overlay-game-over");
    UI.showScreen("menu");
    startRoomsRefresh();
  }

  // ===== الدردشة في اللعبة =====
  function sendGameChat() {
    const input = document.getElementById("chat-input");
    const channel = document.getElementById("chat-channel")?.value || "all";
    if (!input?.value.trim()) return;
    const socket = SocketClient.getSocket();
    socket?.emit("room_chat", {
      code: currentRoom?.code,
      message: input.value.trim(),
      channel,
    });
    input.value = "";
  }

  function sendLobbyChat() {
    const input = document.getElementById("lobby-chat-input");
    if (!input?.value.trim()) return;
    const socket = SocketClient.getSocket();
    socket?.emit("room_chat", {
      code: currentRoom?.code,
      message: input.value.trim(),
      channel: "all",
    });
    input.value = "";
  }

  function onRoomChat(data) {
    const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const msgHtml = `<div class="lobby-chat-msg"><span class="lobby-chat-msg-name">${data.nickname}:</span>${data.message} <span class="chat-bubble-time">${time}</span></div>`;

    // دردشة اللوبي
    const lobbyChat = document.getElementById("lobby-chat-messages");
    if (lobbyChat) {
      lobbyChat.insertAdjacentHTML("beforeend", msgHtml);
      lobbyChat.scrollTop = lobbyChat.scrollHeight;
    }

    // دردشة اللعبة
    const gameChat = document.getElementById("game-chat-all");
    if (gameChat) {
      gameChat.insertAdjacentHTML("beforeend", msgHtml);
      gameChat.scrollTop = gameChat.scrollHeight;
    }

    if (data.channel === "team") {
      const teamChat = document.getElementById("game-chat-team");
      if (teamChat && data.team === myTeam) {
        teamChat.insertAdjacentHTML("beforeend", msgHtml);
        teamChat.scrollTop = teamChat.scrollHeight;
      }
    }
  }

  // ===== تحديثات UI =====
  function updateScores(scores) {
    const redEl = document.getElementById("red-score");
    const blueEl = document.getElementById("blue-score");
    const redLeft = document.getElementById("red-cards-left");
    const blueLeft = document.getElementById("blue-cards-left");
    if (redEl) redEl.textContent = scores.red || 0;
    if (blueEl) blueEl.textContent = scores.blue || 0;
    if (redLeft) redLeft.textContent = scores.redTotal ? `${scores.red}/${scores.redTotal}` : "";
    if (blueLeft) blueLeft.textContent = scores.blueTotal ? `${scores.blue}/${scores.blueTotal}` : "";
  }

  function updateTeamPanels(teams) {
    const myId = App.getPlayer()?.playerId;
    const renderMembers = (elId, members, team) => {
      const el = document.getElementById(elId);
      if (!el) return;
      el.innerHTML = (members || []).map((p) => `
        <div class="team-member">
          <div class="${team === "red" ? "member-dot-red" : "member-dot-blue"}"></div>
          <span>${p.nickname}</span>
          ${p.role === "spymaster" ? '<span class="member-role-badge">بوص</span>' : ''}
          ${p.playerId === myId ? '<span class="member-is-you">(أنت)</span>' : ''}
        </div>
      `).join("");
    };
    const allRed = [teams?.red?.spymaster, ...(teams?.red?.operatives || [])].filter(Boolean);
    const allBlue = [teams?.blue?.spymaster, ...(teams?.blue?.operatives || [])].filter(Boolean);
    renderMembers("red-team-members", allRed, "red");
    renderMembers("blue-team-members", allBlue, "blue");
  }

  function updateTurnDisplay(turn, team) {
    const teamEl = document.getElementById("turn-team-text");
    if (!teamEl) return;
    teamEl.textContent = team === "red" ? "الفريق الأحمر" : "الفريق الأزرق";
    teamEl.className = `turn-team ${team}`;
  }

  // ===== سجل اللعبة =====
  function addLogEntry(text, type = "") {
    const log = document.getElementById("game-log");
    if (!log) return;
    const time = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const entry = document.createElement("div");
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">${time}</span><span>${text}</span>`;
    log.appendChild(entry);
    log.scrollTop = log.scrollHeight;
  }

  function clearGameLog() {
    const log = document.getElementById("game-log");
    if (log) log.innerHTML = "";
    const chatAll = document.getElementById("game-chat-all");
    if (chatAll) chatAll.innerHTML = "";
    const chatTeam = document.getElementById("game-chat-team");
    if (chatTeam) chatTeam.innerHTML = "";
  }

  // ===== تبويبات اللعبة =====
  function bindGameLogTabs() {
    document.querySelectorAll(".log-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll(".log-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("game-log")?.classList.add("hidden");
        document.getElementById("game-chat-all")?.classList.add("hidden");
        document.getElementById("game-chat-team")?.classList.add("hidden");
        document.getElementById(tabName === "log" ? "game-log" : tabName === "chat-all" ? "game-chat-all" : "game-chat-team")?.classList.remove("hidden");
      });
    });
  }

  function colorAr(c) {
    return { red: "أحمر", blue: "أزرق", neutral: "محايد", black: "أسود" }[c] || c;
  }

  return {
    startRoomsRefresh, stopRoomsRefresh, fetchPublicRooms, updateRoomsList,
    createRoom, joinRoom, quickJoin, updateLobbyUI, chooseTeamRole, startGame, leaveLobby,
    onGameStarted, onReconnected, onGameUpdate, onSpymasterView, onHintReceived,
    onCardRevealed, onTurnChanged, sendHint, endTurn, onGameOver, playAgain, leaveGame,
    sendGameChat, sendLobbyChat, onRoomChat, bindGameLogTabs, onCardClick,
    inviteFriend, showInviteFriendsPanel,
  };
})();

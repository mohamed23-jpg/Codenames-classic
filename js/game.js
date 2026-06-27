/* ============================================================
   CODENAMES CLASSIC - GAME LOGIC (v8.0 - FULL)
   ============================================================
   الملف: game.js
   الوظيفة: منطق اللعبة الكامل - إنشاء، انضمام، لعب، سولو، كلاسيك
   التحديثات: دعم السولو، تأكيد/إلغاء اختيار البطاقات، إشعار أسطوري، لا إيموجي
   ============================================================ */

const Game = (() => {
  // ==========================================================
  // المتغيرات العامة
  // ==========================================================
  const API = "https://uuuuu-rup4.onrender.com/api";
  let currentRoom = null;
  let myRole = null;
  let myTeam = null;
  let isSpymaster = false;
  let currentHint = null;
  let guessesLeft = 0;
  let isMyTurn = false;
  let gameState = null;
  let selectedCardId = null;
  let selectionTimer = null;
  let roomsInterval = null;

  // SVG icons - بدون إيموجي
  const SVG_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>`;
  const SVG_CROSS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  const SVG_LOCK = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
  const SVG_PLUS = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
  const SVG_TROPHY = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5"/><path d="M6 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M4 21h16"/><path d="M8 21v-4a4 4 0 0 1 8 0v4"/></svg>`;
  const SVG_SKULL = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="9" cy="10" r="1.5"/><circle cx="15" cy="10" r="1.5"/><path d="M10 16a2 2 0 0 1 4 0"/><path d="M8 16l-2 2"/><path d="M16 16l2 2"/></svg>`;

  // ==========================================================
  // قائمة الغرف العامة
  // ==========================================================
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
    } catch (err) {
      console.error("خطأ في جلب الغرف:", err);
    }
  }

  function updateRoomsList(rooms) {
    const listEl = document.getElementById("public-rooms-list");
    const homeEl = document.getElementById("public-rooms-list-home");
    const hideFullCb = document.getElementById("hide-full-rooms");
    const hideFull = hideFullCb?.checked || false;

    let filtered = rooms || [];
    if (hideFull) filtered = filtered.filter((r) => r.players < 8);

    const makeRow = (r) => {
      const lockIcon = r.hasPassword ? SVG_LOCK : '';
      return `
        <div class="room-row" data-code="${r.code}">
          <span class="room-row-name">${r.name || "غرفة"} ${lockIcon}</span>
          <span class="room-row-players">${r.players || 0}/8</span>
          <span class="room-row-mode">${r.mode === "classic" ? "كلاسيك" : "سولو"}</span>
          <span class="room-row-status ${r.status === "playing" ? "status-playing" : "status-waiting"}">
            ${r.status === "playing" ? "جارية" : "انتظار"}
          </span>
          <button class="room-row-join" onclick="Game.quickJoin('${r.code}')">انضم</button>
        </div>`;
    };

    if (listEl) {
      listEl.innerHTML = filtered.length === 0
        ? `<div class="rooms-empty">لا توجد غرف متاحة</div>`
        : filtered.map(makeRow).join("");
    }

    if (homeEl) {
      const homeFiltered = filtered.slice(0, 6);
      homeEl.innerHTML = homeFiltered.length === 0
        ? `<div class="rooms-empty">لا توجد غرف نشطة. أنشئ غرفتك!</div>`
        : homeFiltered.map(makeRow).join("");
    }
  }

  // ==========================================================
  // إنشاء غرفة (عبر Socket.io)
  // ==========================================================
  function createRoom() {
    const name = document.getElementById("create-room-name").value.trim();
    const password = document.getElementById("create-room-password").value;
    const cardCount = parseInt(document.querySelector('input[name="card-count"]:checked')?.value || 25);
    const mode = document.querySelector('input[name="game-mode"]:checked')?.value || "classic";
    const isPrivate = document.querySelector('input[name="room-type"]:checked')?.value === "private";

    if (!name) {
      UI.toast("أدخل اسم الغرفة", "error");
      return;
    }

    const socket = SocketClient.getSocket();
    if (!socket?.connected) {
      UI.toast("غير متصل بالسيرفر", "error");
      return;
    }

    const btn = document.getElementById("btn-confirm-create-room");
    if (btn) { btn.disabled = true; btn.textContent = "جاري الإنشاء..."; }

    socket.emit("create_room", {
      name,
      password: password || null,
      cardCount,
      mode,
      isPrivate,
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

  // ==========================================================
  // الانضمام لغرفة
  // ==========================================================
  function joinRoom(code, password, privateCode) {
    if (!code) {
      UI.toast("أدخل الكود", "error");
      return;
    }

    const socket = SocketClient.getSocket();
    if (!socket?.connected) {
      UI.toast("غير متصل بالسيرفر", "error");
      return;
    }

    socket.emit("join_room", {
      code: code.toUpperCase().trim(),
      password: password || "",
      privateCode: privateCode || "",
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
    if (!socket?.connected) {
      UI.toast("غير متصل بالسيرفر", "error");
      return;
    }

    socket.emit("join_room", {
      code: code.toUpperCase().trim(),
      password: "",
      privateCode: "",
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

  // ==========================================================
  // دعوة صديق للغرفة
  // ==========================================================
  function inviteFriend(targetPlayerId) {
    if (!currentRoom) {
      UI.toast("أنت لست في غرفة", "error");
      return;
    }
    const socket = SocketClient.getSocket();
    socket?.emit("invite_to_room", {
      targetPlayerId,
      roomCode: currentRoom.code,
      roomName: currentRoom.name,
    });
    UI.toast("تم إرسال الدعوة", "success");
  }

  function showInviteFriendsPanel() {
    const token = localStorage.getItem("token");
    fetch(`${API}/players/me/friends`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const friends = (data.friends || []).filter((f) => f.isOnline && !f.currentRoom);
        if (!friends.length) {
          UI.toast("لا يوجد أصدقاء متصلون الآن", "info");
          return;
        }
        const list = friends.map((f) => `
          <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="width:32px;height:32px">${Effects.buildAvatarImg(f.avatar, 32)}</div>
            <span style="flex:1">${f.nickname}</span>
            <button class="btn btn-sm btn-primary" onclick="Game.inviteFriend('${f.playerId}');this.textContent='تم';this.disabled=true">دعوة</button>
          </div>
        `).join("");
        UI.showCustomDialog("دعوة أصدقاء", list);
      })
      .catch(() => UI.toast("تعذّر تحميل الأصدقاء", "error"));
  }

  // ==========================================================
  // اللوبي
  // ==========================================================
  function updateLobbyUI(room) {
    currentRoom = room;
    const player = App.getPlayer();

    document.getElementById("lobby-room-name").textContent = room.name || "الغرفة";
    document.getElementById("lobby-room-code").textContent = room.code;

    const isHost = room.createdBy === player?.playerId;
    const startBtn = document.getElementById("btn-start-game");
    if (startBtn) {
      startBtn.classList.toggle("hidden", !(isHost || player?.isDev));
    }

    const mode = room.settings?.mode || "classic";
    const isSolo = mode === "solo";

    document.getElementById("classic-red-col")?.classList.toggle("hidden", isSolo);
    document.getElementById("classic-blue-col")?.classList.toggle("hidden", isSolo);
    document.getElementById("solo-spymaster-col")?.classList.toggle("hidden", !isSolo);
    document.getElementById("solo-players-col")?.classList.toggle("hidden", !isSolo);

    if (isSolo) {
      renderSoloSlots(room.spymaster, room.operatives || []);
    } else {
      renderClassicSlots(room.teams?.red || {}, room.teams?.blue || {});
    }

    renderSpectators(room.spectators || []);

    const inviteWrap = document.getElementById("lobby-invite-wrap");
    if (inviteWrap) {
      inviteWrap.innerHTML = `
        <button class="btn btn-sm btn-outline" onclick="Game.showInviteFriendsPanel()">
          ${SVG_PLUS} دعوة صديق
        </button>`;
    }

    updateMyRole(room, player);
  }

  function renderSoloSlots(spymaster, operatives) {
    const spymasterSlot = document.getElementById("solo-spymaster-slot");
    if (spymasterSlot) {
      if (spymaster) {
        const isMe = spymaster.playerId === App.getPlayer()?.playerId;
        spymasterSlot.innerHTML = `
          <div class="player-in-slot">
            <div style="width:24px;height:24px">${Effects.buildAvatarImg(spymaster.avatar, 24)}</div>
            <span>${spymaster.nickname}</span>
            ${isMe ? '<span class="member-is-you">(أنت)</span>' : ''}
            ${spymaster.level ? `<span style="color:var(--red);font-size:0.6rem">LV${spymaster.level}</span>` : ''}
            ${spymaster.title ? `<span style="color:var(--purple);font-size:0.55rem">${spymaster.title}</span>` : ''}
          </div>
        `;
      } else {
        spymasterSlot.innerHTML = `<span>فارغ</span>`;
      }
    }

    const playersSlot = document.getElementById("solo-operatives-slots");
    if (playersSlot) {
      const myId = App.getPlayer()?.playerId;
      playersSlot.innerHTML = operatives.map((p) => `
        <div class="player-in-slot">
          <div style="width:24px;height:24px">${Effects.buildAvatarImg(p.avatar, 24)}</div>
          <span>${p.nickname}</span>
          ${p.playerId === myId ? '<span class="member-is-you">(أنت)</span>' : ''}
          ${p.level ? `<span style="color:var(--red);font-size:0.6rem">LV${p.level}</span>` : ''}
          ${p.title ? `<span style="color:var(--purple);font-size:0.55rem">${p.title}</span>` : ''}
          ${p.eliminated ? '<span style="color:var(--red);font-size:0.6rem">(مأقصى)</span>' : ''}
          ${p.score !== undefined ? `<span style="color:var(--gold);font-size:0.6rem">+${p.score}</span>` : ''}
        </div>
      `).join("") || `<span class="text-dim" style="font-size:0.7rem">فارغ</span>`;
    }
  }

  function renderClassicSlots(redTeam, blueTeam) {
    renderTeamSlot("red-spymaster-slot", redTeam.spymaster);
    renderTeamSlots("red-operatives-slots", redTeam.operatives || []);
    renderTeamSlot("blue-spymaster-slot", blueTeam.spymaster);
    renderTeamSlots("blue-operatives-slots", blueTeam.operatives || []);
  }

  function renderTeamSlot(elId, player) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!player) {
      el.innerHTML = `<span>فارغ</span>`;
      return;
    }
    const isMe = player.playerId === App.getPlayer()?.playerId;
    el.innerHTML = `
      <div class="player-in-slot">
        <div style="width:24px;height:24px">${Effects.buildAvatarImg(player.avatar, 24)}</div>
        <span>${player.nickname}</span>
        ${isMe ? '<span class="member-is-you">(أنت)</span>' : ''}
        ${player.level ? `<span style="color:var(--red);font-size:0.6rem">LV${player.level}</span>` : ''}
        ${player.title ? `<span style="color:var(--purple);font-size:0.55rem">${player.title}</span>` : ''}
      </div>
    `;
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
        ${p.level ? `<span style="color:var(--red);font-size:0.6rem">LV${p.level}</span>` : ''}
        ${p.title ? `<span style="color:var(--purple);font-size:0.55rem">${p.title}</span>` : ''}
      </div>
    `).join("") || `<span class="text-dim" style="font-size:0.7rem">فارغ</span>`;
  }

  function renderSpectators(specs) {
    const el = document.getElementById("spectators-list");
    if (!el) return;
    el.innerHTML = specs.map((p) => `
      <div class="spectator-name">${p.nickname}</div>
    `).join("") || `<span class="text-dim">لا أحد</span>`;
  }

  function updateMyRole(room, player) {
    const myId = player?.playerId;
    if (!myId) return;

    const isSolo = room.settings?.mode === "solo";

    if (isSolo) {
      if (room.spymaster?.playerId === myId) {
        myTeam = null;
        myRole = "spymaster";
        isSpymaster = true;
      } else if (room.operatives?.some(o => o.playerId === myId)) {
        myTeam = null;
        myRole = "operative";
        isSpymaster = false;
      } else {
        myTeam = null;
        myRole = "spectator";
        isSpymaster = false;
      }
    } else {
      const redTeam = room.teams?.red || {};
      const blueTeam = room.teams?.blue || {};

      if (redTeam.spymaster?.playerId === myId) {
        myTeam = "red";
        myRole = "spymaster";
        isSpymaster = true;
      } else if (blueTeam.spymaster?.playerId === myId) {
        myTeam = "blue";
        myRole = "spymaster";
        isSpymaster = true;
      } else if (redTeam.operatives?.some(o => o.playerId === myId)) {
        myTeam = "red";
        myRole = "operative";
        isSpymaster = false;
      } else if (blueTeam.operatives?.some(o => o.playerId === myId)) {
        myTeam = "blue";
        myRole = "operative";
        isSpymaster = false;
      } else {
        myTeam = null;
        myRole = "spectator";
        isSpymaster = false;
      }
    }
  }

  function chooseTeamRole(team, role) {
    const socket = SocketClient.getSocket();
    const player = App.getPlayer();
    socket?.emit("select_team_role", { code: currentRoom?.code, team, role, player });
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
    UI.showScreen("menu");
    startRoomsRefresh();
  }

  // ==========================================================
  // بدء اللعبة
  // ==========================================================
  function onGameStarted(data) {
    gameState = data;
    isSpymaster = data.isSpymaster || false;
    myRole = data.isSpymaster ? "spymaster" : "operative";

    UI.showScreen("game");
    renderGameScreen(data);

    if (data.soloMode) {
      const endOpBtn = document.getElementById("btn-end-operative-turn");
      if (endOpBtn) {
        endOpBtn.classList.toggle("hidden", !isSpymaster);
      }
    }

    Audio.play("turn-start");
  }

  function onReconnected(data) {
    currentRoom = data.room;
    updateLobbyUI(data.room);
    if (data.game) {
      gameState = data.game;
      isSpymaster = data.isSpymaster || false;
      UI.showScreen("game");
      renderGameScreen(data);
    }
  }

  function renderGameScreen(data) {
    document.getElementById("game-room-name").textContent = currentRoom?.name || data.roomName || "";
    document.getElementById("game-room-code").textContent = `# ${currentRoom?.code || ""}`;

    const cardCount = data.game?.cards?.length || 25;
    buildCardsGrid(data.game?.cards || [], cardCount);
    updateScores(data.scores);
    updateTeamPanels(data.teams);
    updateTurnDisplay(data.currentTurn, data.currentTeam);

    document.getElementById("hint-display")?.classList.add("hidden");
    document.getElementById("hint-form")?.classList.add("hidden");
    document.getElementById("end-turn-wrap")?.classList.add("hidden");
    clearGameLog();
  }

  // ==========================================================
  // شبكة البطاقات
  // ==========================================================
  function buildCardsGrid(cards, count) {
    const grid = document.getElementById("cards-grid");
    if (!grid) return;

    const gridClass = count === 25 ? "grid-25" : count === 20 ? "grid-16" : "grid-12";
    grid.className = `cards-grid ${gridClass}`;

    const player = App.getPlayer();
    const equippedSkin = player?.inventory?.cardSkins?.find((s) => s.equipped);
    const skinStyle = equippedSkin?.css || "";

    grid.innerHTML = cards.map((card, idx) => {
      const colorClass = isSpymaster && card.color ? `spy-${card.color}` : "";
      const revealed = card.revealed ? `revealed ${card.color || ""}` : "";
      const tempSelected = card.tempRevealed ? "temp-selected" : "";
      const tempAvatar = card.tempRevealed && card.tempPlayerId ? `
        <div class="temp-avatar">
          <img src="assets/avatars/spy.png" alt="temp" />
        </div>
      ` : "";

      const confirmBtn = card.tempRevealed && card.tempPlayerId === App.getPlayer()?.playerId ? `
        <div class="action-btns">
          <button class="confirm-btn" onclick="Game.confirmCard(${idx})">${SVG_CHECK}</button>
          <button class="cancel-btn" onclick="Game.cancelCard(${idx})">${SVG_CROSS}</button>
        </div>
      ` : "";

      return `
        <div class="game-card ${colorClass} ${revealed} ${tempSelected}"
             data-index="${idx}" data-word="${card.word}" data-revealed="${card.revealed || false}"
             style="${skinStyle && !card.revealed ? skinStyle : ''}"
             onclick="Game.onCardClick(this, ${idx})">
          <span class="card-word">${card.word}</span>
          ${tempAvatar}
          ${confirmBtn}
        </div>
      `;
    }).join("");
  }

  // ==========================================================
  // اختيار بطاقة
  // ==========================================================
  function onCardClick(el, idx) {
    if (!isMyTurn || isSpymaster) return;
    if (el.dataset.revealed === "true") return;
    if (guessesLeft <= 0) {
      UI.toast("لا تخمينات متبقية", "error");
      return;
    }

    const socket = SocketClient.getSocket();
    socket?.emit("select_card", { code: currentRoom?.code, cardId: idx });
    Audio.play("card-flip");
  }

  function selectCardTemp(idx) {
    const socket = SocketClient.getSocket();
    socket?.emit("select_card_temp", { code: currentRoom?.code, cardId: idx });
  }

  function confirmCard(idx) {
    const socket = SocketClient.getSocket();
    socket?.emit("confirm_selection", { code: currentRoom?.code, cardId: idx });
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      selectionTimer = null;
    }
  }

  function cancelCard(idx) {
    const socket = SocketClient.getSocket();
    socket?.emit("cancel_selection", { code: currentRoom?.code, cardId: idx });
    if (selectionTimer) {
      clearTimeout(selectionTimer);
      selectionTimer = null;
    }
  }

  function endOperativeTurn() {
    const socket = SocketClient.getSocket();
    socket?.emit("end_operative_turn", { code: currentRoom?.code });
  }

  // ==========================================================
  // تحديثات اللعبة
  // ==========================================================
  function onGameUpdate(data) {
    gameState = data;
    if (data.cards) buildCardsGrid(data.cards, data.cards.length);
    if (data.scores) updateScores(data.scores);
    if (data.teams) updateTeamPanels(data.teams);
  }

  function onSpymasterView(data) {
    buildCardsGrid(data.cards, data.cards.length);
    if (data.isMyTurn) {
      showHintForm();
    }
  }

  function onHintReceived(data) {
    currentHint = data;
    guessesLeft = data.count === "∞" ? 99 : parseInt(data.count) + 1;

    document.getElementById("hint-display")?.classList.remove("hidden");
    document.getElementById("hint-word").textContent = data.hint;
    document.getElementById("hint-count").textContent = `عدد البطاقات: ${data.count}`;
    document.getElementById("guesses-left").textContent = `تخمينات متبقية: ${guessesLeft}`;

    addLogEntry(`تلميح: "${data.hint}" (${data.count})`, "hint");
    Audio.play("hint");

    const isMyHintTurn = data.team === myTeam && myRole === "operative";
    if (isMyHintTurn) {
      isMyTurn = true;
      document.getElementById("end-turn-wrap")?.classList.remove("hidden");
      UI.toast(`تلميح: ${data.hint} - ${data.count}`, "info");
    }

    if (data.soloMode && data.hintCards) {
      UI.toast(`البوص أعطى تلميح: "${data.hint}" (${data.count} بطاقات)`, "info");
    }
  }

  function onCardRevealed(data) {
    const cards = document.querySelectorAll(".game-card");
    const card = cards[data.cardId];
    if (!card) return;

    card.classList.add("revealed", data.color);
    card.dataset.revealed = "true";

    const flashType = data.color === "black" ? "black" :
                     (data.color === myTeam ? "correct" : "wrong");
    Effects.flashCard(card, flashType);

    if (data.color === "black") {
      Effects.shakeScreen();
      Audio.play("black");
    } else if (data.color === myTeam || (data.soloMode && data.eventType === "correct_guess")) {
      Audio.play("correct");
    } else if (data.eventType === "penalty") {
      UI.toast("تم خصم بطاقة من الفريق الخصم!", "info");
    } else {
      Audio.play("wrong");
    }

    const logType = data.eventType === "correct_guess" ? "correct" :
                   data.eventType === "wrong_guess" ? "wrong" :
                   data.eventType === "black_guess" ? "black-card" :
                   data.eventType === "penalty" ? "penalty" : "neutral";

    addLogEntry(`${data.player || "لاعب"} → "${data.word}" (${data.color || "مجهول"})`, logType);

    if (data.soloMode && data.score !== undefined) {
      UI.toast(`+${data.score > 0 ? data.score : data.score} نقطة`, data.score > 0 ? "success" : "error");
    }

    updateScores(data.scores || {});
  }

  function onTurnChanged(data) {
    isMyTurn = false;
    guessesLeft = 0;

    updateTurnDisplay(data.newTurn, data.team);
    document.getElementById("hint-display")?.classList.add("hidden");
    document.getElementById("end-turn-wrap")?.classList.add("hidden");
    document.getElementById("hint-form")?.classList.add("hidden");
    currentHint = null;

    if (data.soloMode) {
      addLogEntry(`دور البوص: ${data.message || "قدّم تلميحاً"}`, "turn-end");
      if (isSpymaster) {
        UI.toast("دورك! أرسل تلميحاً", "success");
        showHintForm();
        isMyTurn = true;
      } else {
        UI.toast("دور البوص!", "info");
      }
    } else {
      addLogEntry(`تمرير الدور إلى ${data.newTurn === "red" ? "الأحمر" : "الأزرق"}`, "turn-end");
      Audio.play("turn-start");

      if (data.newTurn === myTeam) {
        if (isSpymaster) {
          showHintForm();
          isMyTurn = true;
          UI.toast("دورك! أرسل تلميحاً", "success");
        } else {
          isMyTurn = true;
          UI.toast("دور فريقك! انتظر التلميح", "info");
        }
      }
    }
  }

  function showHintForm() {
    const form = document.getElementById("hint-form");
    if (form) form.classList.remove("hidden");
    document.getElementById("hint-word-input")?.focus();
  }

  // ==========================================================
  // إرسال التلميح
  // ==========================================================
  function sendHint() {
    const word = document.getElementById("hint-word-input")?.value.trim();
    const count = document.getElementById("hint-count-input")?.value;

    if (!word) {
      UI.toast("أدخل كلمة التلميح", "error");
      return;
    }
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(word)) {
      UI.toast("التلميح كلمة واحدة فقط بدون أرقام", "error");
      return;
    }

    const isSolo = currentRoom?.settings?.mode === "solo";
    const socket = SocketClient.getSocket();

    if (isSolo) {
      socket?.emit("send_hint_solo", {
        code: currentRoom?.code,
        word,
        count: parseInt(count),
        cardIds: [],
      });
    } else {
      socket?.emit("send_hint", {
        code: currentRoom?.code,
        word,
        count: parseInt(count),
      });
    }

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

  // ==========================================================
  // نهاية اللعبة
  // ==========================================================
  function onGameOver(data) {
    const won = data.winner === myTeam || data.winner === App.getPlayer()?.nickname;
    Audio.play(won ? "win" : "lose");

    Reconnection.clearPendingRoom();
    stopRoomsRefresh();

    const titleEl = document.getElementById("game-over-title");
    const subtitleEl = document.getElementById("game-over-subtitle");
    const iconEl = document.getElementById("game-over-icon");
    const statsEl = document.getElementById("game-over-stats");

    if (titleEl) {
      titleEl.textContent = won ? "فزتم!" : "خسرتم!";
      titleEl.style.color = won ? "var(--gold)" : "var(--red)";
    }
    if (subtitleEl) subtitleEl.textContent = data.reason || "انتهت المباراة";
    if (iconEl) iconEl.innerHTML = won ? SVG_TROPHY : SVG_SKULL;

    if (statsEl) {
      statsEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span>الدرجات</span>
          <span>${data.scores?.red || 0} : ${data.scores?.blue || 0}</span>
        </div>
        ${data.spymasterReward ? `
          <div style="display:flex;justify-content:space-between;color:var(--gold)">
            <span>مكافأة البوص</span>
            <span>+${data.spymasterReward} عملة</span>
          </div>
        ` : ''}
        ${data.scores && data.scores.length ? `
          <div style="margin-top:8px;font-size:0.75rem;color:var(--text-dim)">
            ${data.scores.map(s => `${s.nickname}: ${s.score} نقطة`).join(' · ')}
          </div>
        ` : ''}
      `;
    }

    UI.showOverlay("overlay-game-over");
    if (won) Effects.launchFireworks("fireworks-canvas");
    if (data.spymasterReward) {
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

  // ==========================================================
  // الدردشة والسجل
  // ==========================================================
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
    const msgHtml = `
      <div class="lobby-chat-msg">
        <span class="lobby-chat-msg-name">${data.from}</span>
        ${data.title ? `<span class="msg-title">(${data.title})</span>` : ''}
        <span>${data.message}</span>
        <span class="chat-bubble-time">${time}</span>
      </div>
    `;

    const lobbyChat = document.getElementById("lobby-chat-messages");
    if (lobbyChat) {
      lobbyChat.insertAdjacentHTML("beforeend", msgHtml);
      lobbyChat.scrollTop = lobbyChat.scrollHeight;
    }

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

  // ==========================================================
  // تحديثات UI
  // ==========================================================
  function updateScores(scores) {
    const redEl = document.getElementById("red-score");
    const blueEl = document.getElementById("blue-score");
    const redLeft = document.getElementById("red-cards-left");
    const blueLeft = document.getElementById("blue-cards-left");
    if (redEl) redEl.textContent = scores?.red || 0;
    if (blueEl) blueEl.textContent = scores?.blue || 0;
    if (redLeft) redLeft.textContent = scores?.redTotal ? `${scores.red}/${scores.redTotal}` : "";
    if (blueLeft) blueLeft.textContent = scores?.blueTotal ? `${scores.blue}/${scores.blueTotal}` : "";
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
          ${p.title ? `<span class="member-title">${p.title}</span>` : ''}
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

  // ==========================================================
  // سجل اللعبة
  // ==========================================================
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

  // ==========================================================
  // تبويبات اللعبة
  // ==========================================================
  function bindGameLogTabs() {
    document.querySelectorAll(".log-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        const tabName = tab.dataset.tab;
        document.querySelectorAll(".log-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document.getElementById("game-log")?.classList.add("hidden");
        document.getElementById("game-chat-all")?.classList.add("hidden");
        document.getElementById("game-chat-team")?.classList.add("hidden");
        const target = tabName === "log" ? "game-log" : tabName === "chat-all" ? "game-chat-all" : "game-chat-team";
        document.getElementById(target)?.classList.remove("hidden");
      });
    });
  }

  // ==========================================================
  // دوال إضافية للتوافق
  // ==========================================================
  function updateCardCountOptions(mode) {
    // تم تنفيذها في app.js
  }

  function onGameModeChange(mode) {
    // تم تنفيذها في app.js
  }

  function kickFromTeam(team) {
    UI.toast("سيتم تطوير هذه الميزة قريباً", "info");
  }

  function kickFromSolo() {
    UI.toast("سيتم تطوير هذه الميزة قريباً", "info");
  }

  function onYourTurn(data) {
    // يتم استدعاؤها من socket-client
    if (data.hint) {
      UI.toast(`التلميح: ${data.hint} (${data.count})`, "info");
    }
  }

  // ==========================================================
  // تصدير الواجهة العامة
  // ==========================================================
  return {
    // الغرف
    startRoomsRefresh,
    stopRoomsRefresh,
    fetchPublicRooms,
    updateRoomsList,
    createRoom,
    joinRoom,
    quickJoin,
    leaveLobby,

    // اللوبي
    updateLobbyUI,
    chooseTeamRole,
    startGame,
    showInviteFriendsPanel,
    inviteFriend,

    // اللعبة
    onGameStarted,
    onReconnected,
    onGameUpdate,
    onSpymasterView,
    onHintReceived,
    onCardRevealed,
    onTurnChanged,
    onGameOver,
    onYourTurn,
    playAgain,
    leaveGame,

    // الدردشة
    sendGameChat,
    sendLobbyChat,
    onRoomChat,

    // البطاقات
    onCardClick,
    confirmCard,
    cancelCard,
    endOperativeTurn,

    // التلميح
    sendHint,
    endTurn,

    // أخرى
    bindGameLogTabs,
    updateCardCountOptions,
    onGameModeChange,
    kickFromTeam,
    kickFromSolo,
  };
})();

// ==========================================================
// تصدير للاستخدام العالمي
// ==========================================================
window.Game = Game;

console.log("Game module loaded successfully");

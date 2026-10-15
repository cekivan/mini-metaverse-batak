// public/js/tavla.js - İstemci Tarafı Tavla (Backgammon) Arayüzü

let currentTavlaState = null;
let selectedTavlaPoint = null;
let tavlaValidTargets = [];

socket.on('tavlaUpdate', (state) => {
    currentTavlaState = state;
    window.currentActiveTableId = state.tableId;
    window.isSpectating = !!state.isSpectator;

    const specBanner = document.getElementById('spectatorBanner');
    if (specBanner) {
        if (state.isSpectator) {
            specBanner.style.display = 'block';
            let discKeys = Object.keys(state.disconnectedPlayers || {});
            if (discKeys.length > 0) {
                let dPid = discKeys[0];
                let dName = state.disconnectedPlayers[dPid].name;
                specBanner.innerHTML = `👁️ Yancısın | ⚠️ <b>${dName}</b> masadan ayrıldı! <button onclick="takeoverSeat('${state.tableId}', '${dPid}')" style="margin-left:8px; padding:4px 10px; background:#27ae60; color:white; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">💺 Boş Koltuğu Devral (${dName} yerine)</button>`;
            } else {
                specBanner.innerHTML = `👁️ Tavla Masasını İzliyorsun (Yancısın)`;
            }
        } else {
            specBanner.style.display = 'none';
        }
    }

    renderTavlaBoard(state);
});

function renderTavlaBoard(state) {
    const statusEl = document.getElementById('tavlaStatus');
    const rollBtn = document.getElementById('tavlaRollBtn');
    const diceDisplay = document.getElementById('tavlaDiceDisplay');
    const boardEl = document.getElementById('tavlaBoard');

    if (!boardEl) return;

    let myPid = socket.id;
    let myColor = state.playerColors ? state.playerColors[myPid] : null;
    let currentPid = state.players[state.turnIndex];
    let isMyTurn = !state.isSpectator && (currentPid === myPid);

    // 1. Durum Metni
    if (state.gameOver) {
        let isWinner = (state.winner === myPid);
        let winText = state.isSpectator ? "Maç Bitti!" : (isWinner ? "🏆 TEBRİKLER KAZANDIN! (+20 TL Kazandın)" : "KAYBETTİN!");
        statusEl.innerHTML = `<span style="color:#f1c40f; font-weight:800; font-size:17px;">${winText}</span>`;
        if (rollBtn) rollBtn.style.display = 'none';
    } else if (state.isSpectator) {
        let turnName = state.playerProfiles[currentPid]?.name || "Biri";
        statusEl.innerHTML = `<span style="color:#38bdf8;">👁️ Yancısın | Sıra: <b>${turnName}</b></span>`;
        if (rollBtn) rollBtn.style.display = 'none';
    } else {
        let colorName = myColor === 'white' ? "⚪ Beyaz Taşlar" : "⚫ Siyah Taşlar";
        if (isMyTurn) {
            if (!state.hasRolled) {
                statusEl.innerHTML = `<span style="color:#2ecc71; font-weight:bold;">SIRA SENDE (${colorName})! Zarları atın.</span>`;
                if (rollBtn) {
                    rollBtn.style.display = 'inline-block';
                    rollBtn.disabled = false;
                }
            } else {
                let movesText = state.remainingMoves.join(', ');
                statusEl.innerHTML = `<span style="color:#facc15; font-weight:bold;">Taşınızı seçip oynayın! Kalan hamleler: [${movesText}]</span>`;
                if (rollBtn) rollBtn.style.display = 'none';
            }
        } else {
            let oppName = state.playerProfiles[currentPid]?.name || "Rakip";
            statusEl.innerHTML = `<span style="color:#e2e8f0;">Sıra <b>${oppName}</b> adlı oyuncuda (${myColor === 'white' ? '⚪ Beyaz' : '⚫ Siyah'})...</span>`;
            if (rollBtn) rollBtn.style.display = 'none';
        }
    }

    // 2. Zar Gösterimi
    if (diceDisplay) {
        if (state.dice && state.dice.length === 2) {
            let d1 = state.dice[0];
            let d2 = state.dice[1];
            diceDisplay.innerHTML = `
                <div class="dice-box">${getDiceDotHtml(d1)}</div>
                <div class="dice-box">${getDiceDotHtml(d2)}</div>
            `;
        } else {
            diceDisplay.innerHTML = `<span style="color:#94a3b8; font-size:13px; font-style:italic;">Zar bekleniyor</span>`;
        }
    }

    // 3. Tahtayı Çiz
    drawTavlaBoardHTML(state, myColor, isMyTurn);
}

function getDiceDotHtml(val) {
    let pips = {
        1: '<span class="pip center"></span>',
        2: '<span class="pip top-left"></span><span class="pip bot-right"></span>',
        3: '<span class="pip top-left"></span><span class="pip center"></span><span class="pip bot-right"></span>',
        4: '<span class="pip top-left"></span><span class="pip top-right"></span><span class="pip bot-left"></span><span class="pip bot-right"></span>',
        5: '<span class="pip top-left"></span><span class="pip top-right"></span><span class="pip center"></span><span class="pip bot-left"></span><span class="pip bot-right"></span>',
        6: '<span class="pip top-left"></span><span class="pip top-right"></span><span class="pip mid-left"></span><span class="pip mid-right"></span><span class="pip bot-left"></span><span class="pip bot-right"></span>'
    };
    return pips[val] || val;
}

function drawTavlaBoardHTML(state, myColor, isMyTurn) {
    const boardEl = document.getElementById('tavlaBoard');
    if (!boardEl) return;

    // Tavla iki yarıdan oluşur: Üst sıra (13-24) ve Alt sıra (12-1)
    let topPoints = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
    let bottomPoints = [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    let html = `<div class="tavla-container">
        <!-- BAR (Kırık Taşlar) Sol veya Orta Bölüm -->
        <div class="tavla-bar" onclick="handleTavlaPointClick('bar')">
            <div class="bar-title">Kırık Taşlar</div>
            <div class="bar-checkers">
                ${renderCheckers('white', state.bar.white, selectedTavlaPoint === 'bar' && myColor === 'white')}
                ${renderCheckers('black', state.bar.black, selectedTavlaPoint === 'bar' && myColor === 'black')}
            </div>
        </div>

        <div class="tavla-fields">
            <!-- Üst Sıra (13 - 24) -->
            <div class="tavla-row top-row">`;
    
    topPoints.forEach((ptIndex, idx) => {
        let pt = state.board[ptIndex];
        let isSelected = (selectedTavlaPoint === ptIndex);
        let isValidTarget = tavlaValidTargets.some(t => t.target === ptIndex);
        let triangleColorClass = (idx % 2 === 0) ? "tri-dark" : "tri-light";

        html += `<div class="tavla-point top-point ${triangleColorClass} ${isSelected ? 'selected-point' : ''} ${isValidTarget ? 'target-point' : ''}" onclick="handleTavlaPointClick(${ptIndex})">
            <span class="point-num">${ptIndex}</span>
            <div class="point-checkers-top">
                ${renderCheckers(pt.player, pt.count, isSelected)}
            </div>
        </div>`;
    });

    html += `</div>
            <!-- Orta Şerit / Zar Alanı -->
            <div class="tavla-middle-divider"></div>
            <!-- Alt Sıra (12 - 1) -->
            <div class="tavla-row bot-row">`;

    bottomPoints.forEach((ptIndex, idx) => {
        let pt = state.board[ptIndex];
        let isSelected = (selectedTavlaPoint === ptIndex);
        let isValidTarget = tavlaValidTargets.some(t => t.target === ptIndex);
        let triangleColorClass = (idx % 2 === 0) ? "tri-light" : "tri-dark";

        html += `<div class="tavla-point bot-point ${triangleColorClass} ${isSelected ? 'selected-point' : ''} ${isValidTarget ? 'target-point' : ''}" onclick="handleTavlaPointClick(${ptIndex})">
            <div class="point-checkers-bot">
                ${renderCheckers(pt.player, pt.count, isSelected)}
            </div>
            <span class="point-num">${ptIndex}</span>
        </div>`;
    });

    html += `</div>
        </div>

        <!-- TOPLANAN TAŞLAR (Borne Off) -->
        <div class="tavla-borne-off ${tavlaValidTargets.some(t => t.target === 'off') ? 'target-point' : ''}" onclick="handleTavlaPointClick('off')">
            <div class="borne-title">Toplanan</div>
            <div class="borne-counts">
                <div style="color:white;">⚪ Beyaz: <b>${state.borneOff.white}/15</b></div>
                <div style="color:#f87171;">⚫ Siyah: <b>${state.borneOff.black}/15</b></div>
            </div>
            ${tavlaValidTargets.some(t => t.target === 'off') ? `<div class="collect-btn-badge">Buraya Topla!</div>` : ''}
        </div>
    </div>`;

    boardEl.innerHTML = html;
}

function renderCheckers(player, count, isSelected) {
    if (!player || count <= 0) return "";
    let colorClass = player === 'white' ? 'checker-white' : 'checker-black';
    let countBadge = count > 5 ? `<span class="checker-count-badge">${count}</span>` : '';
    let visibleCount = Math.min(count, 5);

    let html = "";
    for (let i = 0; i < visibleCount; i++) {
        let selectedClass = (isSelected && i === visibleCount - 1) ? 'checker-selected' : '';
        html += `<div class="tavla-checker ${colorClass} ${selectedClass}">
            ${i === visibleCount - 1 && count > 5 ? countBadge : ''}
        </div>`;
    }
    return html;
}

function handleTavlaRoll() {
    if (!currentTavlaState) return;
    if (window.playSound) window.playSound('chatPop');
    socket.emit('tavlaRoll');
}

function handleTavlaPointClick(pointIndex) {
    if (!currentTavlaState || window.isSpectating) return;

    let myPid = socket.id;
    let currentPid = currentTavlaState.players[currentTavlaState.turnIndex];
    if (currentPid !== myPid || !currentTavlaState.hasRolled) return;

    // Eğer zaten bir taş seçiliyse ve hedef noktaya tıklandıysa
    if (selectedTavlaPoint !== null) {
        let matchingMove = tavlaValidTargets.find(t => t.target === pointIndex);
        if (matchingMove) {
            // Hamleyi gönder!
            if (window.playSound) window.playSound('card');
            socket.emit('tavlaMove', {
                fromPoint: selectedTavlaPoint,
                toPoint: pointIndex,
                usedDie: matchingMove.die
            });
            selectedTavlaPoint = null;
            tavlaValidTargets = [];
            return;
        }
    }

    // Yeni taş seçimi
    let myColor = currentTavlaState.playerColors[myPid];
    if (pointIndex === 'off') return;

    if (pointIndex === 'bar') {
        if (currentTavlaState.bar[myColor] > 0) {
            selectedTavlaPoint = 'bar';
            requestTavlaValidMoves('bar');
        }
        return;
    }

    // Kırık taş varken normal kapılardan taş seçilemez
    if (currentTavlaState.bar[myColor] > 0) {
        const errToast = document.getElementById('errorToast');
        if (errToast) {
            errToast.innerText = "Önce kırık taşınızı oyuna sokmalısınız!";
            errToast.style.display = 'block';
            setTimeout(() => { errToast.style.display = 'none'; }, 2500);
        }
        return;
    }

    let pt = currentTavlaState.board[pointIndex];
    if (pt && pt.player === myColor && pt.count > 0) {
        selectedTavlaPoint = pointIndex;
        requestTavlaValidMoves(pointIndex);
    } else {
        selectedTavlaPoint = null;
        tavlaValidTargets = [];
        renderTavlaBoard(currentTavlaState);
    }
}

function requestTavlaValidMoves(fromPoint) {
    socket.emit('getTavlaValidMoves', { fromPoint: fromPoint });
}

socket.on('tavlaValidMovesResponse', (data) => {
    tavlaValidTargets = data.moves || [];
    if (currentTavlaState) {
        renderTavlaBoard(currentTavlaState);
    }
});

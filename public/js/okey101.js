// public/js/okey101.js - 101 Okey İstemci Mantığı (Eşli & Tekli Kıraathane & A4 Yazboz)

let okey101Data = null;
let okey101SelectedIds = [];

// Socket Dinleyicisi
socket.on('okey101Update', (data) => {
    if (!data) return;
    if (data.playerInfos && data.playerInfos[socket.id]?.isDisconnected) {
        return; // Masadan ayrılmış oyuncuya modal açma!
    }

    okey101Data = data;
    window.currentActiveTableId = data.tableId;

    // Modalleri Aç/Kapat
    const gameModal = document.getElementById('gameModal');
    const okeyArea = document.getElementById('okey101Area');
    const batakArea = document.getElementById('batakArea');
    const billiardArea = document.getElementById('billiardArea');
    const tavlaArea = document.getElementById('tavlaArea');

    if (gameModal) gameModal.style.display = 'flex';
    if (batakArea) batakArea.style.display = 'none';
    if (billiardArea) billiardArea.style.display = 'none';
    if (tavlaArea) tavlaArea.style.display = 'none';
    if (okeyArea) okeyArea.style.display = 'block';

    if (window.startTurnTimer) window.startTurnTimer(data.turnTimeout || 40);

    // 1. Başlık ve El Bilgisi
    const headerTitle = document.getElementById('okey101HeaderTitle');
    if (headerTitle) {
        let modeLabel = (data.mode === 'esli') ? "Eşli (2v2)" : "Tekli";
        headerTitle.innerText = `🀄 101 Okey (${modeLabel} - Cezalı & Katlamasız)`;
    }

    const roundBadge = document.getElementById('okey101RoundBadge');
    if (roundBadge) roundBadge.innerText = `${data.roundNumber || 1}. El`;

    const statusEl = document.getElementById('okey101Status');
    if (statusEl) {
        if (data.isSpectator) {
            statusEl.innerText = `👁️ İzleyicisin (Yancı) - Sıra: ${data.turnPlayerName}`;
            statusEl.style.color = '#38bdf8';
        } else if (data.gameOver) {
            let wName = data.playerInfos[data.winner] ? data.playerInfos[data.winner].name : "Biri";
            statusEl.innerText = `🎉 El Bitti! Kazanan: ${wName}`;
            statusEl.style.color = '#34d399';
        } else if (data.myTurn) {
            if (!data.drawnThisTurn) {
                statusEl.innerText = "SIRA SENDE! Desteden veya solundan taş çek.";
                statusEl.style.color = '#facc15';
            } else {
                statusEl.innerText = "SIRA SENDE! El açabilir, işleyebilir veya taş atabilirsin.";
                statusEl.style.color = '#34d399';
            }
        } else {
            statusEl.innerText = `Sıra ${data.turnPlayerName} adlı oyuncuda...`;
            statusEl.style.color = '#cbd5e1';
        }
    }

    // 2. Skor Tablosu (4 Oyuncu & Takımlar)
    renderScoreboard(data);

    // 3. Gösterge ve Okey Taşı
    renderIndicators(data);

    // 4. Kalan Deste ve Atılan Taşlar
    renderDeckAndDiscards(data);

    // 5. Masaya Açılmış Perler
    renderTableOpenedPers(data);

    // 6. Oyuncunun Istakası
    renderPlayerHand(data);

    // 7. A4 Kıraathane Yazboz Çetelesi
    renderYazboz(data);
});

// Masadan Ayrılma Olayı
socket.on('tableLeft', () => {
    okey101Data = null;
    window.currentActiveTableId = null;
    const gameModal = document.getElementById('gameModal');
    if (gameModal) gameModal.style.display = 'none';
    const okeyArea = document.getElementById('okey101Area');
    if (okeyArea) okeyArea.style.display = 'none';
});

// Oyuncu Skor & Ceza Kartları (Takım ve Eş Rozetleri)
function renderScoreboard(data) {
    const sb = document.getElementById('okey101Scoreboard');
    if (!sb) return;

    sb.innerHTML = "";
    data.players.forEach((pid, idx) => {
        let p = data.playerInfos[pid] || { name: "Oyuncu", score: 0, penalties: 0, hasOpened: false, tileCount: 0 };
        let isTurn = (pid === data.players[data.turnIndex]);
        let turnBorder = isTurn ? 'border: 2px solid #facc15; box-shadow: 0 0 10px rgba(250, 204, 21, 0.5);' : 'border: 1px solid rgba(255,255,255,0.1);';
        let openedBadge = p.hasOpened ? `<span style="background:#10b981; color:white; font-size:9px; padding:1px 5px; border-radius:4px;">Açtı</span>` : `<span style="background:#64748b; color:white; font-size:9px; padding:1px 5px; border-radius:4px;">Açmadı</span>`;
        let penaltyBadge = p.penalties > 0 ? `<span style="color:#ef4444; font-weight:800; font-size:10px;">+${p.penalties} Ceza</span>` : '';

        // Eşli Mod Takım Rozetleri
        let teamBadge = "";
        let partnerBadge = "";
        if (data.mode === 'esli') {
            let isTeam1 = (idx === 0 || idx === 2);
            teamBadge = isTeam1
                ? `<span style="background:#1d4ed8; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px;">1. Grup</span>`
                : `<span style="background:#ea580c; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px;">2. Grup</span>`;

            if (pid === data.partnerId) {
                partnerBadge = `<span style="color:#60a5fa; font-size:10px; font-weight:bold;">(Ortağın)</span>`;
                if (data.partnerOpened) {
                    partnerBadge += ` <span style="color:#34d399; font-size:10px; font-weight:bold;">✨ Açtı!</span>`;
                }
            }
        }

        sb.innerHTML += `
            <div style="background: rgba(15, 23, 42, 0.85); padding: 7px 9px; border-radius: 8px; ${turnBorder} text-align: left;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px; gap:4px;">
                    <div style="display:flex; align-items:center; gap:4px; overflow:hidden;">
                        <b style="font-size:12px; color:${p.color || '#fff'}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80px;">${p.name}</b>
                        ${partnerBadge}
                    </div>
                    <div style="display:flex; gap:3px;">
                        ${teamBadge}
                        ${openedBadge}
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:#cbd5e1;">
                    <span>Taş: <b>${p.tileCount}</b></span>
                    <span>Ceza: <b style="color:#facc15;">${p.score}</b></span>
                </div>
                ${penaltyBadge ? `<div style="text-align:right; margin-top:2px;">${penaltyBadge}</div>` : ''}
            </div>
        `;
    });
}

// Gösterge Taşını Çiz (Okey Taşı masaya konmaz, göstergeden anlaşılır)
function renderIndicators(data) {
    const gEl = document.getElementById('okey101GostergeTile');
    if (gEl && data.gosterge) {
        let isFake = data.gosterge.isFakeOkey;
        let colorCls = isFake ? 'sahte' : data.gosterge.color;
        let text = isFake ? '⭐' : data.gosterge.value;
        gEl.className = `okey-tile mini ${colorCls}`;
        gEl.innerHTML = `<span>${text}</span>`;
    }
}

// Deste ve Yönlü Atılan Taşlar (Solundan Atılan, Sağına Attığın, Karşıdan Atılan)
function renderDeckAndDiscards(data) {
    const drawCountEl = document.getElementById('okey101DrawCount');
    if (drawCountEl) drawCountEl.innerText = `Deste: ${data.drawPileCount}`;

    let myPid = socket.id;
    let playersList = data.players || [];
    let myIdx = playersList.indexOf(myPid);
    if (myIdx === -1) myIdx = 0;
    let n = playersList.length;

    let leftIdx = (myIdx + n - 1) % n;
    let topIdx = (myIdx + 2) % n;
    let rightIdx = (myIdx + 1) % n;

    let leftPid = playersList[leftIdx];
    let topPid = playersList[topIdx];

    let leftP = data.playerInfos[leftPid];
    let topP = data.playerInfos[topPid];
    let myP = data.playerInfos[myPid];

    // 1. SOLUNDAKİ OYUNCUDAN SANA ATILAN TAŞ (ALABİLECEĞİN TAŞ)
    const leftNameEl = document.getElementById('okey101LeftPlayerName');
    const leftTileEl = document.getElementById('okey101LeftTileContainer');
    const takeDiscardBtn = document.getElementById('okey101TakeDiscardBtn');
    if (leftNameEl) leftNameEl.innerText = leftP ? leftP.name : "Sol Oyuncu";

    if (leftTileEl) {
        let tile = leftP?.lastDiscard;
        if (tile) {
            let colorCls = tile.isFakeOkey ? 'sahte' : tile.color;
            let text = tile.isFakeOkey ? '⭐' : tile.value;
            leftTileEl.innerHTML = `<div class="okey-tile mini ${colorCls}" style="box-shadow: 0 0 10px rgba(56,189,248,0.5);">${text}</div>`;
        } else {
            leftTileEl.innerHTML = `<span style="color:#64748b; font-size:11px;">Boş</span>`;
        }
    }
    if (takeDiscardBtn) {
        takeDiscardBtn.style.display = (data.canTakeDiscard && data.myTurn) ? 'block' : 'none';
        takeDiscardBtn.innerHTML = "🖐️ Taşı Al (Açmak Şart)";
    }

    // 2. SAĞINA (SAĞINDAKİ OYUNCUYA) SENİN ATTIĞIN TAŞ
    const rightTileEl = document.getElementById('okey101RightTileContainer');
    if (rightTileEl) {
        let tile = myP?.lastDiscard;
        if (tile) {
            let colorCls = tile.isFakeOkey ? 'sahte' : tile.color;
            let text = tile.isFakeOkey ? '⭐' : tile.value;
            rightTileEl.innerHTML = `<div class="okey-tile mini ${colorCls}">${text}</div>`;
        } else {
            rightTileEl.innerHTML = `<span style="color:#64748b; font-size:11px;">Boş</span>`;
        }
    }

    // 3. KARŞIDAN ATILAN TAŞ (ORTAK VEYA RAKİP)
    const topNameEl = document.getElementById('okey101TopPlayerName');
    const topTileEl = document.getElementById('okey101TopTileContainer');
    if (topNameEl) topNameEl.innerText = topP ? topP.name : "-";
    if (topTileEl) {
        let tile = topP?.lastDiscard;
        if (tile) {
            let colorCls = tile.isFakeOkey ? 'sahte' : tile.color;
            let text = tile.isFakeOkey ? '⭐' : tile.value;
            topTileEl.innerHTML = `<div class="okey-tile mini ${colorCls}">${text}</div>`;
        } else {
            topTileEl.innerHTML = `<span style="color:#64748b; font-size:10px;">Boş</span>`;
        }
    }
}

// Masaya Açılmış Perleri Çiz (İşleme ve Yerdeki Okeyi Alma Destekli)
function renderTableOpenedPers(data) {
    const list = document.getElementById('okey101TableOpenedPersList');
    if (!list) return;

    if (!data.tableOpenedPers || data.tableOpenedPers.length === 0) {
        list.innerHTML = `<div style="color:#6ee7b7; font-size:12px; font-style:italic; padding:6px;">Henüz kimse el açmadı.</div>`;
        return;
    }

    list.innerHTML = "";
    data.tableOpenedPers.forEach((per, idx) => {
        let pOwner = data.playerInfos[per.ownerId] ? data.playerInfos[per.ownerId].name : "Biri";
        let hasOkeyInPer = false;

        let tilesHtml = per.tiles.map(t => {
            let isOkey = (data.okeyDef && !t.isFakeOkey && t.color === data.okeyDef.color && t.value === data.okeyDef.value);
            if (isOkey) hasOkeyInPer = true;
            let colorCls = t.isFakeOkey ? 'sahte' : t.color;
            let text = t.isFakeOkey ? '⭐' : (isOkey ? `👑${t.value}` : t.value);
            return `<div class="okey-tile mini ${colorCls}">${text}</div>`;
        }).join('');

        // "Ortağım açtı ben de işlerim" kuralı:
        let canProcess = data.myTurn && data.drawnThisTurn && (data.playerInfos[socket.id]?.hasOpened || (data.mode === 'esli' && data.partnerOpened));

        let actionButtons = "";
        if (canProcess) {
            let addBtns = `
                <button onclick="okey101AddSelectedToPer(${idx}, 'start')" style="padding:2px 5px; font-size:9px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer;" title="Seçili taşı başa ekle">◀ Başa</button>
                <button onclick="okey101AddSelectedToPer(${idx}, 'end')" style="padding:2px 5px; font-size:9px; background:#0ea5e9; color:white; border:none; border-radius:4px; cursor:pointer;" title="Seçili taşı sona ekle">Sona ▶</button>
            `;

            let takeOkeyBtn = "";
            if (hasOkeyInPer && per.type !== 'cift') {
                takeOkeyBtn = `
                    <button onclick="okey101TakeOkeyFromPer(${idx})" style="padding:2px 6px; font-size:9px; background:linear-gradient(135deg,#f59e0b,#d97706); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:800;" title="Masadaki Okey'i al (Rakibe +101 Ceza)">👑 Okey'i Al</button>
                `;
            }

            actionButtons = `
                <div style="display:flex; flex-direction:column; gap:2px; margin-left:6px;">
                    <div style="display:flex; gap:2px;">${addBtns}</div>
                    ${takeOkeyBtn}
                </div>
            `;
        }

        list.innerHTML += `
            <div class="okey-open-per-group">
                <span style="font-size:10px; color:#cbd5e1; margin-right:4px;"><b>${pOwner}:</b></span>
                <div style="display:flex; gap:3px;">${tilesHtml}</div>
                ${actionButtons}
            </div>
        `;
    });
}

// Masadaki Okey'i Geri Alma Aksiyonu
function okey101TakeOkeyFromPer(perIndex) {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length !== 1) {
        alert("Masadaki Okey'i almak için lütfen ıstakanızdan Okey'in yerine geçecek tam 1 taşı seçin!");
        return;
    }
    let tileId = okey101SelectedIds[0];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101TakeOkey', { perIndex: perIndex, tileId: tileId });
}

// Sürükle ve Bırak ile Istaka Taşlarını Dizebilme (Drag & Drop)
let okey101DraggedId = null;

function okey101DragStart(e, tileId) {
    okey101DraggedId = tileId;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', tileId);
    }
}
window.okey101DragStart = okey101DragStart;

function okey101DragOver(e) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
}
window.okey101DragOver = okey101DragOver;

function okey101Drop(e, targetTileId) {
    e.preventDefault();
    if (!okey101DraggedId || okey101DraggedId === targetTileId) return;

    if (!window.okey101RackOrder || window.okey101RackOrder.length === 0) {
        window.okey101RackOrder = (okey101Data?.hand || []).map(t => t.id);
    }

    let fromIdx = window.okey101RackOrder.indexOf(okey101DraggedId);
    let toIdx = window.okey101RackOrder.indexOf(targetTileId);
    if (fromIdx !== -1 && toIdx !== -1) {
        window.okey101RackOrder.splice(fromIdx, 1);
        window.okey101RackOrder.splice(toIdx, 0, okey101DraggedId);
        if (window.playSound) window.playSound('okeyTile');
        renderPlayerHand(okey101Data);
    }
    okey101DraggedId = null;
}
window.okey101Drop = okey101Drop;

// Oyuncunun Istakası (Rack)
function renderPlayerHand(data) {
    const rack = document.getElementById('okey101PlayerHandRack');
    const tileCountEl = document.getElementById('okey101TileCount');
    if (!rack) return;

    let hand = data.hand || [];
    if (tileCountEl) tileCountEl.innerText = hand.length;

    // Oyuncunun kendi sıralamasını koru
    let currentHandMap = {};
    hand.forEach(t => currentHandMap[t.id] = t);

    if (!window.okey101RackOrder) window.okey101RackOrder = [];
    
    // Elden çıkan taşları temizle
    window.okey101RackOrder = window.okey101RackOrder.filter(id => currentHandMap[id]);
    // Yeni gelen taşları sıranın sonuna ekle
    hand.forEach(t => {
        if (!window.okey101RackOrder.includes(t.id)) {
            window.okey101RackOrder.push(t.id);
        }
    });

    let orderedHand = window.okey101RackOrder.map(id => currentHandMap[id]).filter(Boolean);

    // Yandan taş alındıysa uyarı banner'ını göster
    const warnEl = document.getElementById('okey101DiscardWarning');
    if (warnEl) {
        warnEl.style.display = (data.lastDiscardTaken && data.myTurn) ? 'flex' : 'none';
    }

    rack.innerHTML = "";
    orderedHand.forEach(tile => {
        let isOkey = (data.okeyDef && !tile.isFakeOkey && tile.color === data.okeyDef.color && tile.value === data.okeyDef.value);
        let isSelected = okey101SelectedIds.includes(tile.id);
        let isTaken = (data.takenDiscardTileId && tile.id === data.takenDiscardTileId);
        let colorCls = tile.isFakeOkey ? 'sahte' : tile.color;
        let okeyCls = isOkey ? 'gold-border' : '';
        let selectCls = isSelected ? 'selected' : '';
        let text = tile.isFakeOkey ? '⭐' : (isOkey ? `👑${tile.value}` : tile.value);
        let extraStyle = isTaken ? 'border: 2px solid #38bdf8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.9); position: relative;' : 'position: relative;';
        let badgeHtml = isTaken ? '<div style="position:absolute; top:-7px; right:-5px; background:#0284c7; color:white; font-size:8px; font-weight:800; padding:1px 4px; border-radius:4px; box-shadow:0 1px 4px rgba(0,0,0,0.5);">Yandan</div>' : '';

        rack.innerHTML += `
            <div class="okey-tile ${colorCls} ${okeyCls} ${selectCls}" 
                 style="${extraStyle}"
                 draggable="true"
                 ondragstart="okey101DragStart(event, '${tile.id}')"
                 ondragover="okey101DragOver(event)"
                 ondrop="okey101Drop(event, '${tile.id}')"
                 onclick="okey101ToggleSelect('${tile.id}')"
                 title="${isTaken ? 'Yandan aldığınız taş (Açmak şarttır)' : 'Tıklayarak seçin veya sürükleyerek ıstakada yerini değiştirin'}">
                ${badgeHtml}
                <span>${text}</span>
            </div>
        `;
    });

    // Buton etiketlerini ve durumlarını duruma göre dinamik ayarla
    let myInfo = data.playerInfos && data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;
    let openedType = myInfo?.openedType;

    const openHandBtn = document.getElementById('okey101OpenHandBtn');
    const openPairsBtn = document.getElementById('okey101OpenPairsBtn');

    if (openHandBtn) {
        if (!isAlreadyOpened) {
            openHandBtn.style.display = 'inline-block';
            openHandBtn.innerText = "✨ El Aç (101)";
        } else if (openedType === 'seri') {
            openHandBtn.style.display = 'inline-block';
            openHandBtn.innerText = "✨ Per İndir";
        } else {
            // Çift açmış oyuncu yeni seri per indiremez
            openHandBtn.style.display = 'none';
        }
    }

    if (openPairsBtn) {
        let hasAnyCiftOnTable = Object.values(data.playerInfos || {}).some(p => p.openedType === 'cift');
        if (!isAlreadyOpened) {
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 5 Çift Aç";
        } else if (openedType === 'cift') {
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 Çift İndir";
        } else if (openedType === 'seri' && hasAnyCiftOnTable) {
            // Per açan kişi masada çift açan varsa çift işleyebilir
            openPairsBtn.style.display = 'inline-block';
            openPairsBtn.innerText = "👥 Çift İşle";
        } else {
            openPairsBtn.style.display = 'none';
        }
    }

    updateSelectedScore();
}

// Taş Seçme / Kaldırma
function okey101ToggleSelect(tileId) {
    if (okey101SelectedIds.includes(tileId)) {
        okey101SelectedIds = okey101SelectedIds.filter(id => id !== tileId);
    } else {
        okey101SelectedIds.push(tileId);
    }
    if (okey101Data) renderPlayerHand(okey101Data);
}

// Seçilen Taşların Puanını Canlı Hesapla
function updateSelectedScore() {
    const scoreDisp = document.getElementById('okey101SelectedScoreDisplay');
    if (!scoreDisp || !okey101Data) return;

    let hand = okey101Data.hand || [];
    let selectedTiles = hand.filter(t => okey101SelectedIds.includes(t.id));

    let sum = 0;
    selectedTiles.forEach(t => {
        let val = t.isFakeOkey ? (okey101Data.okeyDef ? okey101Data.okeyDef.value : 10) : t.value;
        sum += val;
    });

    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;

    if (isAlreadyOpened) {
        scoreDisp.innerHTML = `Seçilen: <b style="color:#34d399;">${sum} Puan</b>`;
    } else if (sum >= 180) {
        scoreDisp.innerHTML = `Seçilen: <b style="color:#34d399;">${sum} Puan (180+ Sağlandı! 2 Siler! ⭐⭐)</b>`;
    } else if (sum >= 150) {
        scoreDisp.innerHTML = `Seçilen: <b style="color:#34d399;">${sum} Puan (150+ Sağlandı! 1 Siler! ⭐)</b>`;
    } else if (sum >= 101) {
        scoreDisp.innerHTML = `Seçilen: <b style="color:#34d399;">${sum} Puan (101 Şartı Sağlandı! ✨)</b>`;
    } else {
        scoreDisp.innerHTML = `Seçilen: <b>${sum} Puan</b> (En az 101 gerekli)`;
    }
}

// Aksiyonlar
function okey101DrawFromDeck() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101DrawTile');
}

function okey101TakeDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101TakeDiscard');
}

function okey101ReturnDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101ReturnDiscard');
}
window.okey101ReturnDiscard = okey101ReturnDiscard;

function okey101SubmitDiscard() {
    if (!okey101Data || !okey101Data.myTurn) return;

    // Yandan taş alındıysa el açılmadan taş atılamaz
    if (okey101Data.lastDiscardTaken) {
        let hasOpened = okey101Data.playerInfos && okey101Data.playerInfos[socket.id]?.hasOpened;
        if (!hasOpened) {
            alert("⚠️ Yandan taş aldığınızda elinizi açmak (en az 101 puan veya 5 çift) ve bu taşı perlerinizde kullanmak zorundasınız!\n\nEl açmadan taş atamazsınız. Eğer elinizi açamıyorsanız 'Taşı Geri Bırak' butonuna basarak desteden çekebilirsiniz.");
            return;
        }
    }

    if (okey101SelectedIds.length !== 1) {
        alert("Lütfen atmak için tam olarak 1 taş seçin!");
        return;
    }
    let tileId = okey101SelectedIds[0];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101DiscardTile', tileId);
}

function okey101SubmitOpenHand() {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length < 3) {
        alert("El açmak veya per indirmek için en az 3 taş seçmelisiniz!");
        return;
    }

    let payload = {
        pers: [{
            tileIds: [...okey101SelectedIds]
        }]
    };
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101OpenHand', payload);
}

function okey101SubmitOpenPairs() {
    if (!okey101Data || !okey101Data.myTurn) return;
    let myInfo = okey101Data.playerInfos && okey101Data.playerInfos[socket.id];
    let isAlreadyOpened = myInfo && myInfo.hasOpened;

    let minTiles = isAlreadyOpened ? 2 : 10;
    if (okey101SelectedIds.length < minTiles || okey101SelectedIds.length % 2 !== 0) {
        if (!isAlreadyOpened) {
            alert("İlk çift açılışı için en az 5 çift (10 taş) seçmelisiniz!");
        } else {
            alert("Masaya çift indirmek için çiftler halinde (en az 2 taş) seçmelisiniz!");
        }
        return;
    }

    let pairs = [];
    for (let i = 0; i < okey101SelectedIds.length; i += 2) {
        pairs.push([okey101SelectedIds[i], okey101SelectedIds[i+1]]);
    }

    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101OpenHand', { type: 'cift', pairs: pairs });
}

function okey101AddSelectedToPer(perIndex, position) {
    if (!okey101Data || !okey101Data.myTurn) return;
    if (okey101SelectedIds.length === 0) {
        alert("Masaya işlemek için elinizden en az 1 taş seçin!");
        return;
    }
    let tileIds = [...okey101SelectedIds];
    okey101SelectedIds = [];
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101AddTileToPer', { tileIds: tileIds, tileId: tileIds[0], targetPerIndex: perIndex, position: position });
}

// Otomatik Seri Dizme
function okey101SortSeries() {
    if (!okey101Data || !okey101Data.hand) return;
    const colorOrder = { 'kirmizi': 1, 'siyah': 2, 'mavi': 3, 'sari': 4, 'sahte': 5 };
    okey101Data.hand.sort((a, b) => {
        let ca = colorOrder[a.color] || 9;
        let cb = colorOrder[b.color] || 9;
        if (ca !== cb) return ca - cb;
        return a.value - b.value;
    });
    window.okey101RackOrder = okey101Data.hand.map(t => t.id);
    renderPlayerHand(okey101Data);
}

// Otomatik Çift Dizme
function okey101SortPairs() {
    if (!okey101Data || !okey101Data.hand) return;
    okey101Data.hand.sort((a, b) => {
        if (a.value !== b.value) return a.value - b.value;
        return a.color.localeCompare(b.color);
    });
    window.okey101RackOrder = okey101Data.hand.map(t => t.id);
    renderPlayerHand(okey101Data);
}

// ==========================================================
// 📋 A4 KIRAATHANE YAZBOZU (ÇETELİSİ) FONKSİYONLARI
// ==========================================================
function renderYazboz(data) {
    if (!data) return;
    const y = data.yazboz;
    if (!y) return;

    // Mod ve El Bilgisi
    const modeBadge = document.getElementById('yazbozModeBadge');
    if (modeBadge) {
        modeBadge.innerText = (data.mode === 'esli') ? "Eşli (2v2) Katlamasız & Cezalı" : "Tekli (Bireysel)";
        modeBadge.style.color = (data.mode === 'esli') ? "#1d4ed8" : "#0f766e";
    }

    const roundText = document.getElementById('yazbozRoundText');
    if (roundText) roundText.innerText = `${data.roundNumber || 1}. El`;

    // Takım İsimleri ve Oyuncuları
    let t1Players = [data.players[0], data.players[2]];
    let t2Players = [data.players[1], data.players[3]];

    let t1Names = t1Players.map(pid => data.playerInfos[pid] ? data.playerInfos[pid].name : "Oyuncu").join(' & ');
    let t2Names = t2Players.map(pid => data.playerInfos[pid] ? data.playerInfos[pid].name : "Oyuncu").join(' & ');

    const t1Title = document.getElementById('yazbozTeam1Players');
    const t2Title = document.getElementById('yazbozTeam2Players');
    if (t1Title) t1Title.innerText = t1Names;
    if (t2Title) t2Title.innerText = t2Names;

    // Üst Bölüm (El Cezaları)
    const topT1El = document.getElementById('yazbozTopTeam1');
    const topT2El = document.getElementById('yazbozTopTeam2');
    const topSumT1El = document.getElementById('yazbozTopSumTeam1');
    const topSumT2El = document.getElementById('yazbozTopSumTeam2');

    let t1Top = (y.team1 && y.team1.topRounds) ? y.team1.topRounds : [];
    let t2Top = (y.team2 && y.team2.topRounds) ? y.team2.topRounds : [];

    let t1TopSum = t1Top.reduce((sum, r) => sum + r.score, 0);
    let t2TopSum = t2Top.reduce((sum, r) => sum + r.score, 0);

    if (topT1El) {
        topT1El.innerHTML = t1Top.length > 0 
            ? t1Top.map(r => `<div class="yazboz-row-item"><span style="color:#475569;">${r.text.split(':')[0]}:</span> <b class="yazboz-row-penalty">${r.text.split(':')[1] || r.score}</b></div>`).join('')
            : `<div style="color:#a8a29e; font-style:italic;">Henüz el bitmedi...</div>`;
    }
    if (topT2El) {
        topT2El.innerHTML = t2Top.length > 0
            ? t2Top.map(r => `<div class="yazboz-row-item"><span style="color:#475569;">${r.text.split(':')[0]}:</span> <b class="yazboz-row-penalty">${r.text.split(':')[1] || r.score}</b></div>`).join('')
            : `<div style="color:#a8a29e; font-style:italic;">Henüz el bitmedi...</div>`;
    }
    if (topSumT1El) topSumT1El.innerText = `${t1TopSum} Puan`;
    if (topSumT2El) topSumT2El.innerText = `${t2TopSum} Puan`;

    // Alt Bölüm (Cezalar ve Silerler)
    const botT1El = document.getElementById('yazbozBottomTeam1');
    const botT2El = document.getElementById('yazbozBottomTeam2');
    const botSumT1El = document.getElementById('yazbozBottomSumTeam1');
    const botSumT2El = document.getElementById('yazbozBottomSumTeam2');

    let t1Pens = (y.team1 && y.team1.bottomPenalties) ? y.team1.bottomPenalties : [];
    let t1Sils = (y.team1 && y.team1.bottomSilers) ? y.team1.bottomSilers : [];
    let t2Pens = (y.team2 && y.team2.bottomPenalties) ? y.team2.bottomPenalties : [];
    let t2Sils = (y.team2 && y.team2.bottomSilers) ? y.team2.bottomSilers : [];

    let t1PenSum = t1Pens.reduce((sum, p) => sum + p.score, 0);
    let t1SilSum = t1Sils.reduce((sum, s) => sum + Math.abs(s.score), 0);
    let t2PenSum = t2Pens.reduce((sum, p) => sum + p.score, 0);
    let t2SilSum = t2Sils.reduce((sum, s) => sum + Math.abs(s.score), 0);

    let t1BotNet = t1PenSum - t1SilSum;
    let t2BotNet = t2PenSum - t2SilSum;

    if (botT1El) {
        let itemsHtml = [];
        t1Pens.forEach(p => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${p.round}. El:</span> <b class="yazboz-row-penalty">${p.text}</b></div>`));
        t1Sils.forEach(s => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${s.round}. El:</span> <b class="yazboz-row-siler">${s.text}</b></div>`));
        botT1El.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : `<div style="color:#a8a29e; font-style:italic;">Ceza veya siler yok.</div>`;
    }
    if (botT2El) {
        let itemsHtml = [];
        t2Pens.forEach(p => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${p.round}. El:</span> <b class="yazboz-row-penalty">${p.text}</b></div>`));
        t2Sils.forEach(s => itemsHtml.push(`<div class="yazboz-row-item"><span style="color:#64748b;">${s.round}. El:</span> <b class="yazboz-row-siler">${s.text}</b></div>`));
        botT2El.innerHTML = itemsHtml.length > 0 ? itemsHtml.join('') : `<div style="color:#a8a29e; font-style:italic;">Ceza veya siler yok.</div>`;
    }

    if (botSumT1El) botSumT1El.innerText = `${t1PenSum > 0 ? '+' + t1PenSum : '0'} / ${t1SilSum > 0 ? '-' + t1SilSum : '0'} = ${t1BotNet}`;
    if (botSumT2El) botSumT2El.innerText = `${t2PenSum > 0 ? '+' + t2PenSum : '0'} / ${t2SilSum > 0 ? '-' + t2SilSum : '0'} = ${t2BotNet}`;

    // Genel Toplam Ceza (En az olan kazanır)
    const totalT1El = document.getElementById('yazbozTotalScoreTeam1');
    const totalT2El = document.getElementById('yazbozTotalScoreTeam2');

    let totalT1 = (y.team1 && y.team1.totalScore !== undefined) ? y.team1.totalScore : (t1TopSum + t1BotNet);
    let totalT2 = (y.team2 && y.team2.totalScore !== undefined) ? y.team2.totalScore : (t2TopSum + t2BotNet);

    if (totalT1El) {
        let leader1 = totalT1 < totalT2 ? " 🏆 (Önde)" : "";
        totalT1El.innerHTML = `${totalT1} Puan${leader1 ? `<span style="font-size:12px; color:#22c55e;">${leader1}</span>` : ''}`;
    }
    if (totalT2El) {
        let leader2 = totalT2 < totalT1 ? " 🏆 (Önde)" : "";
        totalT2El.innerHTML = `${totalT2} Puan${leader2 ? `<span style="font-size:12px; color:#22c55e;">${leader2}</span>` : ''}`;
    }

    // Oyun Bittiğinde Sonraki El Butonu ve Otomatik Açılma
    const nextBtn = document.getElementById('yazbozNextRoundBtn');
    if (nextBtn) {
        nextBtn.style.display = data.gameOver ? 'inline-block' : 'none';
    }

    const modal = document.getElementById('okey101YazbozModal');
    if (data.gameOver && modal && modal.style.display !== 'flex') {
        openYazbozModal();
    }
}

function toggleYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (!modal) return;
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
    } else {
        openYazbozModal();
    }
}

function openYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (modal) modal.style.display = 'flex';
    if (okey101Data) renderYazboz(okey101Data);
}

function closeYazbozModal() {
    const modal = document.getElementById('okey101YazbozModal');
    if (modal) modal.style.display = 'none';
}

function okey101NextRound() {
    if (window.playSound) window.playSound('okeyTile');
    socket.emit('okey101NextRound');
    closeYazbozModal();
}

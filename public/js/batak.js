// public/js/batak.js

let selectedForDiscard = [];
const trumpDisplay = document.getElementById('trumpDisplay');
const tricksDisplay = document.getElementById('tricksDisplay');
const tableCardsDiv = document.getElementById('tableCards');
const playerHandDiv = document.getElementById('playerHand');

socket.on('batakUpdate', (data) => {
    window.currentActiveTableId = data.tableId;
    if (window.startTurnTimer) window.startTurnTimer(data.turnTimeout || 30);

    // 1. SKOR TABLOSUNU DOLDURMA
    const roundDisp = document.getElementById('roundDisplay');
    if (roundDisp) roundDisp.innerText = `${data.roundNumber || 1}. El`;

    let vacantSeatPid = null;
    let vacantSeatName = null;

    const scoreboardDiv = document.getElementById('batakScoreboard');
    if (scoreboardDiv) {
        scoreboardDiv.innerHTML = "";
        data.players.forEach(pid => {
            let pInfo = data.playerInfos[pid];
            let isTurn = (pid === data.players[data.turnIndex]);
            let color = isTurn ? "#f1c40f" : "white"; // Sırası gelen oyuncu sarı parlar
            let turnIcon = isTurn ? "▶ " : "";
            let discBadge = "";
            if (pInfo.isDisconnected) {
                discBadge = ` <span style="color: #ef4444; font-size: 11px; background: rgba(239, 68, 68, 0.2); padding: 2px 5px; border-radius: 4px;">⚠️ Ayrıldı</span>`;
                vacantSeatPid = pid;
                vacantSeatName = pInfo.name;
            }
            scoreboardDiv.innerHTML += `<div style="color: ${color}; font-weight: bold; margin: 0 5px;">${turnIcon}${pInfo.name}${discBadge}: Puan ${pInfo.score} <span style="font-weight:normal; font-size:12px;">(El: ${pInfo.tricks})</span></div>`;
        });
    }

    // 2. ARAYÜZ ELEMANLARINI SEÇME
    const biddingArea = document.getElementById('biddingArea');
    const trumpSelectArea = document.getElementById('trumpSelectArea');
    const discardArea = document.getElementById('discardArea');
    const bidDisplay = document.getElementById('bidDisplay');
    const specBanner = document.getElementById('spectatorBanner');

    if (specBanner) {
        if (data.isSpectator) {
            specBanner.style.display = 'block';
            if (vacantSeatPid) {
                specBanner.innerHTML = `👁️ Yancısın | ⚠️ <b>${vacantSeatName}</b> masadan ayrıldı! <button onclick="takeoverSeat('${data.tableId}', '${vacantSeatPid}')" style="margin-left: 8px; padding: 4px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">💺 Boş Koltuğu Devral (${vacantSeatName} yerine)</button>`;
            } else {
                specBanner.innerHTML = `👁️ İzleyici Modu (Yancısın) - Oyuncuları izliyorsun`;
            }
        } else {
            specBanner.style.display = 'none';
        }
    }

    trumpDisplay.innerText = `Koz: ${data.trump ? data.trump : 'Bekleniyor'}`;
    bidDisplay.innerText = `İhale: ${data.bidInfo.current}`;
    if (tricksDisplay) tricksDisplay.innerText = "";

    // Alanları geçici olarak gizle
    biddingArea.style.display = 'none';
    trumpSelectArea.style.display = 'none';
    discardArea.style.display = 'none';

    // 3. AŞAMALARA GÖRE KONTROLLER (Phase Logic)
    if (data.isSpectator) {
        modalStatus.innerText = `👁️ İzleyicisin (Yancı) - Hamle sırası: ${data.turnPlayerName}`;
        modalStatus.style.color = '#3498db';
    }
    else if (data.phase === 'ihale') {
        if (data.myTurn) {
            modalStatus.innerText = `SIRA SENDE (${data.turnPlayerName})! İhale ver veya Pas de.`;
            modalStatus.style.color = '#f1c40f';
            biddingArea.style.display = 'block';

            let alreadyPassed = data.bidInfo.passedPlayers && data.bidInfo.passedPlayers.includes(socket.id);
            if (alreadyPassed) {
                modalStatus.innerText = "Pas dedin, ihale turundan çıktın.";
                biddingArea.style.display = 'none';
            } else {
                let currentBid = data.bidInfo.current;
                let titleEl = document.getElementById('biddingTitle');
                if (titleEl) {
                    let minReq = (currentBid < 8) ? "8 (Pas denirse 7 kalır)" : (currentBid + 1);
                    titleEl.innerText = `İhale Zamanı! (Minimum: ${minReq})`;
                }
                for (let i = 4; i <= 13; i++) {
                    let btn = document.getElementById('btn' + i);
                    if (btn) {
                        btn.disabled = (i <= currentBid);
                        btn.style.opacity = (i <= currentBid) ? "0.4" : "1";
                    }
                }
            }
        } else {
            modalStatus.innerText = `İhale için sıra ${data.turnPlayerName} adlı oyuncuda...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'koz_secimi') {
        if (data.myTurn) {
            modalStatus.innerText = "İHALEYİ ALDIN! Kozunu belirle.";
            modalStatus.style.color = '#f1c40f';
            trumpSelectArea.style.display = 'block';
        } else {
            modalStatus.innerText = `İhaleyi ${data.turnPlayerName} aldı! Koz seçmesi bekleniyor...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'gomme') {
        if (data.myTurn) {
            modalStatus.innerText = "Koz seçildi! Elinden 4 kart seçip Göm.";
            modalStatus.style.color = '#f1c40f';
            discardArea.style.display = 'block';
        } else {
            modalStatus.innerText = `${data.turnPlayerName} kart gömüyor...`;
            modalStatus.style.color = 'white';
        }
    }
    else if (data.phase === 'oyun') {
        if (data.myTurn) {
            modalStatus.innerText = "SIRA SENDE! Lütfen bir kart at.";
            modalStatus.style.color = '#c0392b';
        } else {
            modalStatus.innerText = `Sıra ${data.turnPlayerName} adlı oyuncuda...`;
            modalStatus.style.color = 'white';
        }
    }

    function getCardHtml(card, extraClass = '', extraStyle = '', clickFunc = '') {
        let colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
        return `<div class="card ${colorClass} ${extraClass}" style="${extraStyle}" ${clickFunc ? `onclick="${clickFunc}"` : ''}>
            <div class="top-index"><span>${card.value}</span><span>${card.suit}</span></div>
            <div class="center-pip">${card.suit}</div>
            <div class="bot-index"><span>${card.value}</span><span>${card.suit}</span></div>
        </div>`;
    }

    // 4. MASADAKİ (ORTADAKİ) KARTLARI ÇİZ
    tableCardsDiv.innerHTML = "";
    data.table.forEach(item => {
        let cardStyle = `border: 3px solid ${item.playerColor}; box-shadow: 0 6px 14px rgba(0,0,0,0.4); transform: rotate(${((Math.random() * 8) - 4).toFixed(1)}deg);`;
        tableCardsDiv.innerHTML += getCardHtml(item.card, '', cardStyle);
    });

    // 5. OYUNCUNUN ELİNDEKİ KARTLARI ÇİZ
    playerHandDiv.innerHTML = "";
    if (data.isSpectator) {
        playerHandDiv.innerHTML = `<div style="color:#bdc3c7; font-size:14px; padding:15px; font-style:italic;">👁️ İzleyici Modundasın - Oyuncuların elleri gizlidir, masadaki oyunu izliyorsun.</div>`;
    } else {
        data.hand.forEach((card, index) => {
            let clickFunc = (data.phase === 'gomme' && data.myTurn) ? `toggleSelect(${index})` : `playCard(${index})`;
            let disableClass = (data.myTurn && (data.phase === 'oyun' || data.phase === 'gomme')) ? '' : 'disabled';
            let selectStyle = selectedForDiscard.includes(index) ? 'box-shadow: 0 0 14px 4px #f59e0b; transform: translateY(-14px);' : '';

            playerHandDiv.innerHTML += getCardHtml(card, disableClass, selectStyle, clickFunc);
        });
    }
});

// GÖMME İŞLEMİ İÇİN KART SEÇİM KONTROLÜ
function toggleSelect(index) {
    if (selectedForDiscard.includes(index)) {
        selectedForDiscard = selectedForDiscard.filter(i => i !== index);
    } else if (selectedForDiscard.length < 4) {
        selectedForDiscard.push(index);
    }
    document.getElementById('selectedCount').innerText = selectedForDiscard.length;
    document.getElementById('discardBtn').disabled = (selectedForDiscard.length !== 4);

    let cards = playerHandDiv.children;
    for (let i = 0; i < cards.length; i++) {
        if (selectedForDiscard.includes(i)) cards[i].style.transform = "translateY(-14px)";
        else cards[i].style.transform = "none";
    }
}

// SOKET GÖNDERİMLERİ (SUNUCUYA İSTEK ATAN FONKSİYONLAR)
function placeBid(val) {
    socket.emit('placeBid', val);
}

function selectTrump(suit) {
    socket.emit('selectTrump', suit);
}

function sendDiscard() {
    if (window.playSound) window.playSound('card');
    socket.emit('discardCards', selectedForDiscard);
    selectedForDiscard = [];
}

function playCard(index) {
    if (window.playSound) window.playSound('card');
    socket.emit('playCard', index);
}
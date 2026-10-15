// public/js/billiard.js (ARAYÜZ TARAFI)

const billTable = document.getElementById('billiardTable');
let cueCanvas = null;
let cueCtx = null;
let isDraggingCue = false;
let cueStartX = 0, cueStartY = 0, cueCurrX = 0, cueCurrY = 0;
let isMyTurnBilliard = false;
let isBallInHand = false;
let billiardWhitePos = {x:0, y:0};

let lastBilliardTurnIndex = -1;

socket.on('billiardUpdate', (state) => {
    window.currentActiveTableId = state.tableId;
    window.isSpectating = !!state.isSpectator;
    isMyTurnBilliard = !state.isSpectator && (state.players[state.turnIndex] === socket.id);
    isBallInHand = !state.isSpectator && state.ballInHand;
    billiardWhitePos = state.balls.white;

    if (window.startTurnTimer && state.turnIndex !== lastBilliardTurnIndex) {
        lastBilliardTurnIndex = state.turnIndex;
        window.startTurnTimer(state.turnTimeout || 30);
    }

    let discKeys = Object.keys(state.disconnectedPlayers || {});
    let hasVacant = discKeys.length > 0;
    let vacantPid = hasVacant ? discKeys[0] : null;
    let vacantName = hasVacant ? state.disconnectedPlayers[vacantPid].name : null;

    const specBanner = document.getElementById('spectatorBanner');
    if (specBanner) {
        if (state.isSpectator) {
            specBanner.style.display = 'block';
            if (hasVacant) {
                specBanner.innerHTML = `👁️ Yancısın | ⚠️ <b>${vacantName}</b> masadan ayrıldı! <button onclick="takeoverSeat('${state.tableId}', '${vacantPid}')" style="margin-left: 8px; padding: 4px 10px; background: #27ae60; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">💺 Boş Koltuğu Devral (${vacantName} yerine)</button>`;
            } else {
                specBanner.innerHTML = `👁️ İzleyici Modu (Yancısın) - Oyuncuları izliyorsun`;
            }
        } else {
            specBanner.style.display = 'none';
        }
    }

    let statusEl = document.getElementById('billiardStatus');
    if (state.gameOver) {
        let winMsg = state.isSpectator ? "Maç Sona Erdi!" : ((state.winner === socket.id) ? "KAZANDIN!" : "KAYBETTİN!");
        statusEl.innerHTML = `<span style="color:#f1c40f;">OYUN BİTTİ! ${winMsg}</span>`;
    } else if (state.isSpectator) {
        let discNotice = hasVacant ? ` | <span style="color:#ef4444; font-weight:bold;">⚠️ Eksik koltuk var, butona tıklayıp katılabilirsiniz!</span>` : "";
        statusEl.innerHTML = `<span style="color:#3498db; font-weight:bold;">👁️ Yancısın (İzleyici Modu)</span>${discNotice}`;
    } else {
        let mySuit = state.playerSuits[socket.id];
        let suitText = mySuit === 'solid' ? "<span style='color:#e74c3c'>Kırmızı (Düz)</span>" : (mySuit === 'stripe' ? "<span style='color:#f1c40f'>Sarı (Çizgili)</span>" : "Belli Değil");
        let turnText = isMyTurnBilliard ? "<span style='color:#2ecc71'>SIRA SENDE!</span>" : "<span style='color:#e74c3c'>Sıra Rakipte...</span>";
        let faulText = (isMyTurnBilliard && isBallInHand) ? " <b style='color:#e74c3c;'>(FAUL! Beyaz topu masaya yerleştir)</b>" : "";
        let discNotice = hasVacant ? ` | <span style="color:#f87171; font-weight:bold;">⚠️ Rakip masadan ayrıldı (Boş koltuk devralınabilir)</span>` : "";
        statusEl.innerHTML = `${turnText} | Topların: ${suitText} ${faulText}${discNotice}`;
    }

    let ballsContainer = document.getElementById('ballsContainer');
    if(ballsContainer) {
        let ballsHtml = "";
        for (let key in state.balls) {
            let b = state.balls[key];
            if (!b.active || b.x === -100) continue; 
            
            let typeClass = b.type; // 'solid', 'stripe', 'black', 'white'
            let rollDeg = ((b.rollAngle || 0) * (180 / Math.PI)).toFixed(1);
            let numHtml = (b.number && b.number !== 8) ? `<div class="ball-num" style="transform: translate(-50%, -50%) rotate(${rollDeg}deg);">${b.number}</div>` : (b.number === 8 ? `<div class="ball-num" style="transform: translate(-50%, -50%) rotate(${rollDeg}deg);">8</div>` : '');

            ballsHtml += `<div class="ball ${typeClass}" style="left: ${b.x}px; top: ${b.y}px;">
                ${numHtml}
            </div>`;
        }
        ballsContainer.innerHTML = ballsHtml;
    }
});

let currentSpin = { x: 0, y: 0 };

function handleSpinClick(e) {
    const controller = document.getElementById('spinController');
    const marker = document.getElementById('spinMarker');
    if (!controller || !marker) return;

    let rect = controller.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    let clickY = e.clientY - rect.top;

    let centerX = rect.width / 2;
    let centerY = rect.height / 2;

    let dx = clickX - centerX;
    let dy = clickY - centerY;
    let maxR = rect.width / 2 - 6;

    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
    }

    marker.style.left = (centerX + dx) + 'px';
    marker.style.top = (centerY + dy) + 'px';

    currentSpin.x = +(dx / maxR).toFixed(2);
    // Y: yukarı vuruş topspin (+1), aşağı vuruş backspin (-1)
    currentSpin.y = +(-dy / maxR).toFixed(2);
}

function resetBilliardSpin() {
    const controller = document.getElementById('spinController');
    const marker = document.getElementById('spinMarker');
    if (controller && marker) {
        marker.style.left = '50%';
        marker.style.top = '50%';
    }
    currentSpin = { x: 0, y: 0 };
}

function getCanvasCoords(e) {
    if (!cueCanvas) cueCanvas = document.getElementById('cueCanvas');
    let rect = cueCanvas.getBoundingClientRect();
    let clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    let clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
        x: (clientX - rect.left) * (600 / rect.width),
        y: (clientY - rect.top) * (300 / rect.height)
    };
}

function handleBillMouseDown(e) {
    if (window.isSpectating) return; // İzleyiciler atış yapamaz
    if (!isMyTurnBilliard) return;
    
    let coords = getCanvasCoords(e);
    let clickX = coords.x;
    let clickY = coords.y;

    if (isBallInHand) {
        socket.emit('billiardPlaceWhite', {x: clickX, y: clickY});
        return;
    }
    
    isDraggingCue = true;
    cueStartX = clickX; cueStartY = clickY; cueCurrX = clickX; cueCurrY = clickY;
}

function handleBillMouseMove(e) {
    if (window.isSpectating) return;
    if (!isDraggingCue) return;
    if (e.cancelable) e.preventDefault(); 
    
    let coords = getCanvasCoords(e);
    cueCurrX = coords.x;
    cueCurrY = coords.y;
    
    drawCue();
}

function handleBillMouseUp(e) {
    if (isDraggingCue) {
        isDraggingCue = false;
        if(cueCtx) cueCtx.clearRect(0, 0, 600, 300);
        
        let dx = cueStartX - cueCurrX; 
        let dy = cueStartY - cueCurrY;
        let power = Math.min(22, Math.sqrt(dx*dx + dy*dy) / 6); 
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);

        if (power > 1) { 
            if (window.playSound) window.playSound('cueShoot');
            socket.emit('billiardShoot', { 
                angle, 
                power, 
                spinX: currentSpin.x, 
                spinY: currentSpin.y 
            }); 
        }
    }
}

billTable.addEventListener('mousedown', handleBillMouseDown);
billTable.addEventListener('touchstart', handleBillMouseDown, {passive: false});
document.addEventListener('mousemove', handleBillMouseMove, {passive: false});
document.addEventListener('touchmove', handleBillMouseMove, {passive: false});
document.addEventListener('mouseup', handleBillMouseUp);
document.addEventListener('touchend', handleBillMouseUp);

function drawCue() {
    if (!cueCanvas) { cueCanvas = document.getElementById('cueCanvas'); }
    if (!cueCtx) { cueCtx = cueCanvas.getContext('2d'); }
    cueCtx.clearRect(0, 0, cueCanvas.width, cueCanvas.height);
    
    let dx = cueStartX - cueCurrX; 
    let dy = cueStartY - cueCurrY;
    let angle = Math.atan2(dy, dx);
    let dist = Math.min(100, Math.sqrt(dx*dx + dy*dy)); 
    
    let wX = billiardWhitePos.x; 
    let wY = billiardWhitePos.y;

    // Kılavuz Çizgi (İleri - Hedef Yönü)
    cueCtx.beginPath();
    cueCtx.moveTo(wX + Math.cos(angle)*15, wY + Math.sin(angle)*15);
    cueCtx.lineTo(wX + Math.cos(angle)*250, wY + Math.sin(angle)*250);
    cueCtx.setLineDash([5, 5]); 
    cueCtx.lineWidth = 2; 
    cueCtx.strokeStyle = 'rgba(255,255,255,0.75)';
    cueCtx.stroke(); 
    cueCtx.setLineDash([]);

    // Istaka Gövdesi (Geri - Çekme Miktarı)
    let cueOffset = 14 + dist; 
    cueCtx.beginPath();
    cueCtx.moveTo(wX - Math.cos(angle)*cueOffset, wY - Math.sin(angle)*cueOffset);
    cueCtx.lineTo(wX - Math.cos(angle)*(cueOffset + 160), wY - Math.sin(angle)*(cueOffset + 160));
    cueCtx.lineWidth = 6; 
    cueCtx.strokeStyle = '#8B4513'; 
    cueCtx.lineCap = "round"; 
    cueCtx.stroke();
    
    // Istaka Ucu (Geri)
    cueCtx.beginPath();
    cueCtx.moveTo(wX - Math.cos(angle)*cueOffset, wY - Math.sin(angle)*cueOffset);
    cueCtx.lineTo(wX - Math.cos(angle)*(cueOffset + 6), wY - Math.sin(angle)*(cueOffset + 6));
    cueCtx.lineWidth = 6; 
    cueCtx.strokeStyle = '#ecf0f1'; 
    cueCtx.stroke();
}
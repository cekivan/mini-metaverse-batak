// public/js/social.js - Sosyal Etkileşim & Arkadaşlık Sistemi
// Modüler Mimari: Oyuncular arası çay ısmarlama, para transferi, eşya hediyesi ve arkadaşlık yönetimi

var socket = window.socket || (typeof io !== 'undefined' ? io() : null);
window.socket = socket;

let currentInteractingPlayer = null; // { id, name, player }
window.myFriendsList = window.myFriendsList || [];
window.myFriendRequests = window.myFriendRequests || [];

function getFriendUsername(f) {
    if (!f) return '';
    return typeof f === 'string' ? f : (f.username || '');
}

function isUserFriend(targetUsername) {
    if (!targetUsername) return false;
    let list = window.myFriendsList || [];
    let target = targetUsername.toLowerCase().trim();
    return list.some(f => getFriendUsername(f).toLowerCase() === target);
}

// --- 1. OYUNCU ETKİLEŞİM MODALI (Karaktere Tıklandığında Açılır) ---
function openPlayerInteractionModal(targetId, targetPlayer) {
    if (!targetPlayer) return;
    currentInteractingPlayer = { id: targetId, name: targetPlayer.name, player: targetPlayer };

    const modal = document.getElementById('playerInteractionModal');
    if (!modal) return;

    // Oyuncu İsim & Durum
    const nameEl = document.getElementById('interactionPlayerName');
    if (nameEl) nameEl.innerText = targetPlayer.name;

    const locEl = document.getElementById('interactionPlayerLocation');
    if (locEl) {
        let roomNames = { 'sokak': '🌳 Sokak', 'kafe': '☕ Kafe', 'sahil': '🏖️ Sahil', 'nargile_cafe': '💨 Nargile Cafe', 'market': '🛒 Market' };
        let rName = roomNames[targetPlayer.room] || targetPlayer.room;
        if (targetPlayer.room && targetPlayer.room.startsWith('house_')) {
            rName = `🏠 ${targetPlayer.room.replace('house_', '')}'in Evi`;
        }
        locEl.innerText = `Konum: ${rName}`;
    }

    // Avatar Önizleme Çizimi
    drawInteractingAvatar(targetPlayer);

    // Arkadaşlık Butonu Durumunu Güncelle
    updateFriendshipButtonState(targetPlayer.name);

    modal.style.display = 'flex';
}

function closePlayerInteractionModal() {
    const modal = document.getElementById('playerInteractionModal');
    if (modal) modal.style.display = 'none';
    currentInteractingPlayer = null;
}

function drawInteractingAvatar(player) {
    const canvas = document.getElementById('interactionAvatarCanvas');
    if (!canvas) return;
    const ictx = canvas.getContext('2d');
    ictx.clearRect(0, 0, canvas.width, canvas.height);

    let centerX = canvas.width / 2;
    let centerY = canvas.height / 2 + 10;

    // Gölge
    ictx.fillStyle = "rgba(0,0,0,0.25)";
    ictx.beginPath();
    ictx.ellipse(centerX, centerY + 28, 20, 8, 0, 0, Math.PI * 2);
    ictx.fill();

    // Bacaklar
    ictx.fillStyle = "#1e293b";
    ictx.fillRect(centerX - 12, centerY + 12, 8, 16);
    ictx.fillRect(centerX + 4, centerY + 12, 8, 16);

    // Gövde (Tişört)
    ictx.fillStyle = player.color || '#3b82f6';
    ictx.beginPath();
    ictx.roundRect(centerX - 16, centerY - 8, 32, 24, 6);
    ictx.fill();

    // Kafa (Ten Rengi)
    ictx.fillStyle = player.skinColor || '#facc15';
    ictx.beginPath();
    ictx.arc(centerX, centerY - 20, 16, 0, Math.PI * 2);
    ictx.fill();

    // Gözler
    ictx.fillStyle = "#1e293b";
    ictx.beginPath(); ictx.arc(centerX - 5, centerY - 22, 2.5, 0, Math.PI * 2); ictx.fill();
    ictx.beginPath(); ictx.arc(centerX + 5, centerY - 22, 2.5, 0, Math.PI * 2); ictx.fill();

    // Yüz Aksesuarı
    let face = player.face || 'none';
    if (face === 'mustache') {
        ictx.fillStyle = "#451a03";
        ictx.beginPath();
        ictx.ellipse(centerX, centerY - 15, 7, 3, 0, 0, Math.PI * 2);
        ictx.fill();
    } else if (face === 'beard') {
        ictx.fillStyle = "#292524";
        ictx.beginPath();
        ictx.arc(centerX, centerY - 17, 17, 0.2 * Math.PI, 0.8 * Math.PI);
        ictx.fill();
    } else if (face === 'sunglasses') {
        ictx.fillStyle = "#020617";
        ictx.fillRect(centerX - 12, centerY - 25, 10, 6);
        ictx.fillRect(centerX + 2, centerY - 25, 10, 6);
        ictx.fillRect(centerX - 2, centerY - 23, 4, 2);
    }

    // Şapka Aksesuarı
    let hat = player.hat || 'none';
    if (hat === 'bere') {
        ictx.fillStyle = "#ef4444";
        ictx.beginPath();
        ictx.arc(centerX, centerY - 24, 16, Math.PI, 0);
        ictx.fill();
    } else if (hat === 'kasket') {
        ictx.fillStyle = "#475569";
        ictx.beginPath();
        ictx.arc(centerX, centerY - 24, 16, Math.PI, 0);
        ictx.fill();
        ictx.fillRect(centerX - 18, centerY - 24, 36, 4);
    } else if (hat === 'fes') {
        ictx.fillStyle = "#991b1b";
        ictx.fillRect(centerX - 12, centerY - 38, 24, 16);
        ictx.strokeStyle = "#facc15";
        ictx.lineWidth = 2;
        ictx.beginPath(); ictx.moveTo(centerX, centerY - 38); ictx.lineTo(centerX + 8, centerY - 32); ictx.stroke();
    } else if (hat === 'cowboy') {
        ictx.fillStyle = "#78350f";
        ictx.fillRect(centerX - 12, centerY - 40, 24, 18);
        ictx.beginPath();
        ictx.ellipse(centerX, centerY - 22, 24, 5, 0, 0, Math.PI * 2);
        ictx.fill();
    }

    // El Aksesuarı İkonu / Emoji
    let held = player.heldItem || 'none';
    if (held !== 'none') {
        let propEmojis = {
            'nargile': '💨', 'cay': '☕', 'kahve': '☕', 'balon': '🎈',
            'gazoz': '🍾', 'tespih': '📿', 'olta': '🎣', 'baglama': '🪕',
            'asagold': '🦯', 'kupa': '🏆'
        };
        ictx.font = "18px sans-serif";
        ictx.fillText(propEmojis[held] || '🖐️', centerX + 18, centerY + 14);
    }
}

function updateFriendshipButtonState(targetUsername) {
    const btn = document.getElementById('interactionFriendBtn');
    if (!btn) return;

    let isFriend = isUserFriend(targetUsername);
    if (isFriend) {
        btn.innerHTML = "❌ Arkadaşlıktan Çıkar";
        btn.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
    } else {
        btn.innerHTML = "👥 Arkadaş Ekle";
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
    }
}

// --- 2. ÇAY ISMARLA (5 TL) ---
function sendTeaToInteractingPlayer() {
    if (!currentInteractingPlayer) return;
    socket.emit('buyTeaForPlayer', { targetId: currentInteractingPlayer.id });
    closePlayerInteractionModal();
}

// --- 3. PARA GÖNDERME MODALI ---
function openSendMoneyModal() {
    if (!currentInteractingPlayer) return;
    const targetName = currentInteractingPlayer.name;
    closePlayerInteractionModal();

    const modal = document.getElementById('sendMoneyModal');
    const targetSpan = document.getElementById('sendMoneyTargetName');
    const input = document.getElementById('sendMoneyAmountInput');

    if (targetSpan) targetSpan.innerText = targetName;
    if (input) {
        input.value = "10";
        input.focus();
    }
    if (modal) modal.style.display = 'flex';
}

function closeSendMoneyModal() {
    const modal = document.getElementById('sendMoneyModal');
    if (modal) modal.style.display = 'none';
}

function confirmSendMoney() {
    const targetSpan = document.getElementById('sendMoneyTargetName');
    const input = document.getElementById('sendMoneyAmountInput');
    if (!targetSpan || !input) return;

    let targetUsername = targetSpan.innerText;
    let amount = parseInt(input.value);

    if (isNaN(amount) || amount <= 0) {
        alert("Lütfen geçerli bir tutar giriniz!");
        return;
    }

    socket.emit('sendMoney', {
        targetUsername: targetUsername,
        amount: amount
    });

    closeSendMoneyModal();
}

// --- 4. EŞYA HEDİYE ETME MODALI ---
function openGiftItemModal() {
    if (!currentInteractingPlayer) return;
    const targetName = currentInteractingPlayer.name;
    closePlayerInteractionModal();

    const modal = document.getElementById('giftItemModal');
    const targetSpan = document.getElementById('giftItemTargetName');
    const list = document.getElementById('giftableItemsList');

    if (targetSpan) targetSpan.innerText = targetName;
    if (list) {
        list.innerHTML = "";
        let propInv = window.myPropInventory || {};
        let ownedPropKeys = Object.keys(propInv).filter(k => k.startsWith('props_') && k !== 'props_none' && propInv[k] > 0);

        if (ownedPropKeys.length === 0) {
            list.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:20px;">Çantanızda hediye edilebilecek el eşyası bulunmuyor. Gardıroptan veya Eşyalarım çantasından yeni eşyalar alabilirsiniz!</div>`;
        } else {
            ownedPropKeys.forEach(itemKey => {
                let info = ALL_PROPS_INFO[itemKey] || { name: itemKey, emoji: '🖐️' };
                let count = propInv[itemKey] || 1;
                let card = document.createElement('div');
                card.className = 'gift-item-card';
                card.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.8); padding:10px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); margin-bottom:8px;";
                card.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px;">${info.emoji}</span>
                        <div>
                            <div style="font-weight:700; color:#f8fafc; font-size:14px; display:flex; align-items:center; gap:6px;">
                                ${info.name}
                                <span style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; padding:2px 7px; border-radius:10px; font-size:10px; font-weight:800;">x${count} Adet</span>
                            </div>
                            <div style="font-size:11px; color:#94a3b8;">El Aksesuarı</div>
                        </div>
                    </div>
                    <button onclick="confirmGiftItem('${itemKey}')" style="padding:6px 14px; background:linear-gradient(135deg, #ec4899, #db2777); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px;">🎁 Hediye Et</button>
                `;
                list.appendChild(card);
            });
        }
    }

    if (modal) modal.style.display = 'flex';
}

function closeGiftItemModal() {
    const modal = document.getElementById('giftItemModal');
    if (modal) modal.style.display = 'none';
}

function confirmGiftItem(itemKey) {
    const targetSpan = document.getElementById('giftItemTargetName');
    if (!targetSpan) return;
    let targetUsername = targetSpan.innerText;

    if (!confirm(`${targetUsername} oyuncusuna bu eşyayı hediye etmek istediğinizden emin misiniz?`)) return;

    socket.emit('giftPropItem', {
        targetUsername: targetUsername,
        itemKey: itemKey
    });

    closeGiftItemModal();
}

// --- 5. ARKADAŞ EKLEME / ÇIKARMA ---
function toggleFriendshipWithInteractingPlayer() {
    if (!currentInteractingPlayer) return;
    let targetUsername = currentInteractingPlayer.name;
    let isFriend = isUserFriend(targetUsername);

    if (isFriend) {
        if (confirm(`${targetUsername} kullanıcısını arkadaş listenizden çıkarmak istediğinize emin misiniz?`)) {
            socket.emit('removeFriend', { username: targetUsername });
            closePlayerInteractionModal();
        }
    } else {
        socket.emit('sendFriendRequest', { targetUsername: targetUsername });
        closePlayerInteractionModal();
    }
}

// --- 6. ARKADAŞ LİSTESİ & İSTEKLER MODALI (2 SEKMELİ) ---
let currentFriendsTab = 'friends';

function switchFriendsTab(tab) {
    currentFriendsTab = tab;
    const btnFriends = document.getElementById('tabBtnFriends');
    const btnRequests = document.getElementById('tabBtnRequests');
    const contentFriends = document.getElementById('friendsTabContent');
    const contentRequests = document.getElementById('friendRequestsTabContent');

    if (tab === 'friends') {
        if (btnFriends) {
            btnFriends.style.background = '#10b981';
            btnFriends.style.color = 'white';
        }
        if (btnRequests) {
            btnRequests.style.background = 'rgba(30,41,59,0.8)';
            btnRequests.style.color = '#94a3b8';
        }
        if (contentFriends) contentFriends.style.display = 'block';
        if (contentRequests) contentRequests.style.display = 'none';
        renderFriendsListUI();
    } else {
        if (btnRequests) {
            btnRequests.style.background = '#ef4444';
            btnRequests.style.color = 'white';
        }
        if (btnFriends) {
            btnFriends.style.background = 'rgba(30,41,59,0.8)';
            btnFriends.style.color = '#94a3b8';
        }
        if (contentFriends) contentFriends.style.display = 'none';
        if (contentRequests) contentRequests.style.display = 'block';
        renderFriendRequestsUI();
    }
}

function openFriendsListModal() {
    socket.emit('getFriendsList');
    renderFriendsListUI();
    renderFriendRequestsUI();
    const modal = document.getElementById('friendsListModal');
    if (modal) modal.style.display = 'flex';
    switchFriendsTab('friends');
}

function closeFriendsListModal() {
    const modal = document.getElementById('friendsListModal');
    if (modal) modal.style.display = 'none';
}

function updateFriendshipBadges() {
    let fCount = (window.myFriendsList || []).length;
    let rCount = (window.myFriendRequests || []).length;

    const fNavBadge = document.getElementById('friendsCountBadge');
    if (fNavBadge) fNavBadge.innerText = fCount;

    const fTabBadge = document.getElementById('friendsCountTabBadge');
    if (fTabBadge) fTabBadge.innerText = fCount;

    const reqNavBadge = document.getElementById('friendRequestsBadge');
    if (reqNavBadge) {
        reqNavBadge.innerText = rCount;
        reqNavBadge.style.display = rCount > 0 ? 'inline-block' : 'none';
    }

    const reqTabBadge = document.getElementById('requestsCountTabBadge');
    if (reqTabBadge) reqTabBadge.innerText = rCount;
}

function renderFriendsListUI(friends) {
    if (friends !== undefined) {
        window.myFriendsList = friends || [];
    }
    updateFriendshipBadges();

    const container = document.getElementById('friendsListContainer');
    if (!container) return;
    container.innerHTML = "";

    let list = window.myFriendsList || [];
    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#94a3b8; padding:30px 15px;">
                <div style="font-size:36px; margin-bottom:8px;">👥</div>
                <div style="font-weight:700; color:#e2e8f0; font-size:15px;">Henüz hiç arkadaşın yok!</div>
                <div style="font-size:12px; margin-top:4px;">Oyundaki diğer oyuncuların üstüne tıklayarak veya yukarıdaki kutudan kullanıcı adını yazarak arkadaş ekleyebilirsin.</div>
            </div>
        `;
        return;
    }

    let roomNames = { 'sokak': '🌳 Sokak', 'kafe': '☕ Kafe', 'sahil': '🏖️ Sahil', 'nargile_cafe': '💨 Nargile Cafe', 'market': '🛒 Market' };

    list.forEach(f => {
        let uName = getFriendUsername(f);
        let isOnline = typeof f === 'object' && f ? !!f.isOnline : false;
        let room = typeof f === 'object' && f ? f.room : null;
        let house = typeof f === 'object' && f ? f.house : null;

        let loc = isOnline ? (roomNames[room] || room || 'Oyunda') : 'Çevrimdışı';
        if (isOnline && room && room.startsWith('house_')) {
            loc = `🏠 ${room.replace('house_', '')}'in Evi`;
        }

        let houseBadge = house ? `🏠 ${house.type === 'pool' ? 'Havuzlu Villa' : house.type === 'garden' ? 'Bahçeli Ev' : 'Standart Daire'}` : 'Evsiz';

        let row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.7); padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.08);";
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:12px; height:12px; border-radius:50%; background:${isOnline ? '#22c55e' : '#64748b'}; box-shadow:${isOnline ? '0 0 8px #22c55e' : 'none'};"></div>
                <div>
                    <div style="font-weight:800; color:#f8fafc; font-size:15px; display:flex; align-items:center; gap:8px;">
                        ${uName}
                        <span style="font-size:10px; font-weight:700; padding:2px 8px; border-radius:12px; background:rgba(255,255,255,0.1); color:#38bdf8;">${houseBadge}</span>
                    </div>
                    <div style="font-size:12px; color:${isOnline ? '#86efac' : '#94a3b8'}; margin-top:2px;">
                        ${isOnline ? `🟢 ${loc}` : '⚪ Çevrimdışı'}
                    </div>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                ${house ? `<button onclick="visitFriendHouse('${uName}', '${house.type || ''}')" style="padding:7px 12px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;">🏠 Evine Git</button>` : ''}
                <button onclick="removeFriendFromList('${uName}')" style="padding:7px 10px; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3); border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;" title="Arkadaşlıktan Çıkar">✕</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function renderFriendRequestsUI(requests) {
    if (requests !== undefined) {
        window.myFriendRequests = requests || [];
    }
    updateFriendshipBadges();

    const container = document.getElementById('friendRequestsListContainer');
    if (!container) return;
    container.innerHTML = "";

    let reqList = window.myFriendRequests || [];
    if (reqList.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; color:#94a3b8; padding:35px 15px;">
                <div style="font-size:36px; margin-bottom:8px;">📭</div>
                <div style="font-weight:700; color:#e2e8f0; font-size:15px;">Bekleyen İstek Yok!</div>
                <div style="font-size:12px; margin-top:4px;">Yeni bir arkadaşlık isteği aldığınızda burada listelenecektir.</div>
            </div>
        `;
        return;
    }

    reqList.forEach(reqUser => {
        let uName = typeof reqUser === 'string' ? reqUser : (reqUser.username || reqUser.from || 'Biri');
        let row = document.createElement('div');
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30,41,59,0.7); padding:12px 16px; border-radius:12px; border:1px solid rgba(255,255,255,0.08);";
        row.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
                <div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #3b82f6, #1d4ed8); display:flex; align-items:center; justify-content:center; font-size:18px;">👤</div>
                <div>
                    <div style="font-weight:800; color:#f8fafc; font-size:15px;">${uName}</div>
                    <div style="font-size:12px; color:#38bdf8; margin-top:2px;">Sana arkadaşlık isteği gönderdi</div>
                </div>
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="acceptIncomingFriendRequest('${uName}')" style="padding:8px 14px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:8px; font-weight:800; cursor:pointer; font-size:12px; box-shadow:0 2px 8px rgba(16,185,129,0.3);">✅ Kabul Et</button>
                <button onclick="declineIncomingFriendRequest('${uName}')" style="padding:8px 12px; background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3); border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">❌ Reddet</button>
            </div>
        `;
        container.appendChild(row);
    });
}

function acceptIncomingFriendRequest(fromUsername) {
    socket.emit('respondFriendRequest', { fromUsername: fromUsername, accept: true });
}

function declineIncomingFriendRequest(fromUsername) {
    socket.emit('respondFriendRequest', { fromUsername: fromUsername, accept: false });
}

function sendFriendRequestByInput() {
    const input = document.getElementById('addFriendUsernameInput');
    if (!input) return;
    let username = input.value.trim();
    if (!username) {
        alert("Lütfen bir kullanıcı adı girin!");
        return;
    }
    socket.emit('sendFriendRequest', { targetUsername: username });
    input.value = "";
}

function removeFriendFromList(username) {
    if (confirm(`${username} kullanıcısını arkadaş listenizden çıkarmak istediğinize emin misiniz?`)) {
        socket.emit('removeFriend', { username: username });
    }
}

function visitFriendHouse(ownerUsername, houseType) {
    closeFriendsListModal();
    if (typeof enterHouse === 'function') {
        enterHouse(ownerUsername, houseType);
    } else {
        let roomName = houseType ? `house_${ownerUsername}_${houseType}` : `house_${ownerUsername}`;
        changeRoom(roomName);
    }
}

// --- 7. EŞYA & AKSESUAR ÇANTASI (ENVANTER PAKETİ) ---
const ALL_PROPS_INFO = {
    'props_nargile': { id: 'nargile', name: 'Otantik Dumanlı Nargile', cost: 50, emoji: '💨', desc: 'Duman halkaları çıkarır.' },
    'props_cay': { id: 'cay', name: 'Tavşan Kanı İnce Belli Çay', cost: 100, emoji: '☕', desc: '5 dakika boyunca elinizde kalır.' },
    'props_kahve': { id: 'kahve', name: 'Közde Türk Kahvesi', cost: 110, emoji: '☕', desc: 'Bol köpüklü közde kahve.' },
    'props_balon': { id: 'balon', name: 'Uçan Kırmızı Balon', cost: 120, emoji: '🎈', desc: 'Hafifçe göğe doğru dalgalanır.' },
    'props_gazoz': { id: 'gazoz', name: 'Nostaljik Şişe Gazoz', cost: 140, emoji: '🍾', desc: 'Buz gibi serinletici lezzet.' },
    'props_tespih': { id: 'tespih', name: 'Oltu Taşı Tespih', cost: 160, emoji: '📿', desc: 'Gümüş püsküllü kehribar tespih.' },
    'props_olta': { id: 'olta', name: 'Balıkçı Oltası', cost: 200, emoji: '🎣', desc: 'Balık tutarken prestij kazandırır.' },
    'props_baglama': { id: 'baglama', name: 'Oyma Dut Bağlama', cost: 220, emoji: '🪕', desc: 'Anadolu türkülerine eşlik eder.' },
    'props_asagold': { id: 'asagold', name: 'Altın Başlıklı Asa', cost: 260, emoji: '🪄', desc: 'Gösterişli ve asil bir duruş sağlar.' },
    'props_kupa': { id: 'kupa', name: 'Şampiyonluk Kupası', cost: 290, emoji: '🏆', desc: 'Masaların fatihine yakışır altın kupa.' }
};

let isItemInventoryOpen = false;

function openItemInventoryModal() {
    isItemInventoryOpen = true;
    renderItemInventoryUI();
    const modal = document.getElementById('itemInventoryModal');
    if (modal) modal.style.display = 'flex';
}

function closeItemInventoryModal() {
    isItemInventoryOpen = false;
    const modal = document.getElementById('itemInventoryModal');
    if (modal) modal.style.display = 'none';
}

function updatePropsCountBadge() {
    let propInv = window.myPropInventory || {};
    let totalCount = 0;
    for (let k in propInv) {
        if (k.startsWith('props_') && k !== 'props_none') {
            totalCount += (propInv[k] || 0);
        }
    }
    const badge = document.getElementById('myPropsCountBadge');
    if (badge) badge.innerText = totalCount;
}

function renderItemInventoryUI() {
    const list = document.getElementById('itemInventoryList');
    if (!list) return;
    list.innerHTML = "";

    let propInv = window.myPropInventory || {};
    updatePropsCountBadge();

    for (let itemKey in ALL_PROPS_INFO) {
        let info = ALL_PROPS_INFO[itemKey];
        let count = propInv[itemKey] || 0;
        let isHeld = (myAvatar && myAvatar.heldItem === info.id);

        let card = document.createElement('div');
        card.style.cssText = `background: rgba(30,41,59,0.7); border: 1px solid ${isHeld ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.4);`;

        let statusBadge = isHeld
            ? `<span style="background: rgba(56,189,248,0.25); color: #38bdf8; border: 1px solid #38bdf8; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800;">🖐️ Şu an Elinde</span>`
            : (count > 0 ? `<span style="background: rgba(34,197,94,0.2); color: #86efac; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;">🎒 Çantada</span>` : `<span style="background: rgba(148,163,184,0.15); color: #94a3b8; padding: 2px 8px; border-radius: 10px; font-size: 10px;">Yok</span>`);

        let countBadge = count > 0
            ? `<span style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 2px 7px; border-radius: 10px; font-size: 11px; font-weight: 800;">x${count} Adet</span>`
            : '';

        let actionButtons = "";
        if (count > 0) {
            let toggleBtn = isHeld
                ? `<button onclick="equipPropItem('${itemKey}')" style="flex:1; padding:7px; background:rgba(239,68,68,0.25); color:#f87171; border:1px solid rgba(239,68,68,0.4); border-radius:7px; font-weight:800; cursor:pointer; font-size:11px;">✋ Bırak</button>`
                : `<button onclick="equipPropItem('${itemKey}')" style="flex:1; padding:7px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:7px; font-weight:800; cursor:pointer; font-size:11px;">🖐️ Eline Al</button>`;

            actionButtons = `
                <div style="display:flex; gap:8px; margin-top:6px;">
                    ${toggleBtn}
                    <button onclick="openGiftItemPickerDirect('${itemKey}')" style="flex:1; padding:7px; background:linear-gradient(135deg, #ec4899, #db2777); color:white; border:none; border-radius:7px; font-weight:800; cursor:pointer; font-size:11px; box-shadow:0 2px 6px rgba(236,72,153,0.3);">🎁 Hediye Et</button>
                </div>
            `;
        } else {
            actionButtons = `
                <div style="margin-top:6px; padding:6px 10px; background:rgba(255,255,255,0.04); border:1px dashed rgba(255,255,255,0.12); border-radius:7px; font-size:11px; color:#94a3b8; text-align:center;">
                    🛍️ Bu eşyayı satın almak için <b>Gardırop</b> menüsünü kullanabilirsiniz.
                </div>
            `;
        }

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="font-size:28px;">${info.emoji}</div>
                    <div>
                        <div style="font-weight:800; color:#f8fafc; font-size:14px; display:flex; align-items:center; gap:6px;">
                            ${info.name} ${countBadge}
                        </div>
                        <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${info.desc}</div>
                    </div>
                </div>
                <div>${statusBadge}</div>
            </div>
            ${actionButtons}
        `;
        list.appendChild(card);
    }
}

function equipPropItem(itemKey) {
    socket.emit('equipPropItem', { itemKey: itemKey });
}

function buyPropFromBag(propId) {
    socket.emit('buyWardrobeItem', { category: 'props', id: propId });
}

function openGiftItemPickerDirect(itemKey) {
    let target = prompt("Bu eşyayı kime hediye etmek istiyorsunuz? (Kullanıcı adını yazın):");
    if (!target || !target.trim()) return;
    target = target.trim();
    if (!confirm(`${target} kullanıcısına 1 adet bu eşyayı hediye etmek istediğinizden emin misiniz?`)) return;
    socket.emit('giftPropItem', {
        targetUsername: target,
        itemKey: itemKey
    });
}

// --- 8. BİLDİRİM TOASTLARI (ÇAY, PARA, ARKADAŞLIK TEKLİFİ) ---
let activeFriendRequestFrom = null;

function showFriendRequestToast(fromUsername) {
    activeFriendRequestFrom = fromUsername;
    const toast = document.getElementById('friendRequestToast');
    const nameEl = document.getElementById('friendRequestFromName');
    if (nameEl) nameEl.innerText = fromUsername;
    if (toast) toast.style.display = 'flex';
}

function acceptFriendRequest() {
    if (activeFriendRequestFrom) {
        socket.emit('respondFriendRequest', { fromUsername: activeFriendRequestFrom, accept: true });
        activeFriendRequestFrom = null;
    }
    const toast = document.getElementById('friendRequestToast');
    if (toast) toast.style.display = 'none';
}

function declineFriendRequest() {
    if (activeFriendRequestFrom) {
        socket.emit('respondFriendRequest', { fromUsername: activeFriendRequestFrom, accept: false });
        activeFriendRequestFrom = null;
    }
    const toast = document.getElementById('friendRequestToast');
    if (toast) toast.style.display = 'none';
}

function showSocialNotificationToast(icon, title, message) {
    const container = document.getElementById('socialNotificationToastContainer');
    if (!container) return;

    let toast = document.createElement('div');
    toast.className = 'social-toast-popup';
    toast.style.cssText = "background: rgba(15, 23, 42, 0.95); border: 2px solid #38bdf8; border-radius: 12px; padding: 12px 18px; color: white; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.7); backdrop-filter: blur(8px); animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); margin-bottom: 10px; max-width: 320px;";
    toast.innerHTML = `
        <span style="font-size: 26px;">${icon}</span>
        <div>
            <div style="font-weight: 800; font-size: 13px; color: #facc15;">${title}</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">${message}</div>
        </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.4s';
        setTimeout(() => toast.remove(), 400);
    }, 4500);
}

// --- 9. SOCKET DİNLEYİCİLERİ (SOSYAL ETKİLEŞİM) ---
if (typeof socket !== 'undefined') {
    socket.on('friendRequestReceived', (data) => {
        showFriendRequestToast(data.fromUsername);
        if (!window.myFriendRequests) window.myFriendRequests = [];
        let from = data.fromUsername;
        if (!window.myFriendRequests.some(r => (typeof r === 'string' ? r : r.username).toLowerCase() === from.toLowerCase())) {
            window.myFriendRequests.push(from);
        }
        updateFriendshipBadges();
        if (currentFriendsTab === 'requests') renderFriendRequestsUI();
    });

    socket.on('friendRequestsUpdate', (requests) => {
        window.myFriendRequests = requests || [];
        updateFriendshipBadges();
        if (currentFriendsTab === 'requests') renderFriendRequestsUI();
    });

    socket.on('friendListUpdate', (friends) => {
        window.myFriendsList = friends || [];
        renderFriendsListUI(friends);
        if (currentInteractingPlayer) {
            updateFriendshipButtonState(currentInteractingPlayer.name);
        }
    });

    socket.on('propInventoryUpdate', (propInv) => {
        window.myPropInventory = propInv || {};
        updatePropsCountBadge();
        if (isItemInventoryOpen) renderItemInventoryUI();
        if (typeof renderWardrobeUI === 'function') renderWardrobeUI();
    });

    socket.on('teaGiftReceived', (data) => {
        showSocialNotificationToast('☕', 'Çay İkramı!', `${data.from} sana tavşan kanı bir çay ısmarladı! (5 dakika elinde).`);
    });

    socket.on('teaTimerStarted', (data) => {
        showSocialNotificationToast('☕', 'Tavşan Kanı Çay!', 'Çayını aldın, 5 dakika boyunca elinde kalacak. Afiyet olsun!');
    });

    socket.on('teaExpired', () => {
        showSocialNotificationToast('☕', 'Çay Bitti!', '5 dakikalık süre doldu, çay bardağın alındı.');
    });

    socket.on('moneyGiftReceived', (data) => {
        showSocialNotificationToast('💸', 'Para Transferi!', `${data.from} hesabına ${data.amount} TL gönderdi!`);
    });

    socket.on('propGiftReceived', (data) => {
        showSocialNotificationToast('🎁', 'Eşya Hediyesi!', `${data.from} sana yeni bir el eşyası hediye etti! Çantana eklendi.`);
    });
}

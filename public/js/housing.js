// public/js/housing.js - Emlakçı, Ev Sistemi, Mobilya Marketi ve Ev Dekorasyonu
// Modüler Mimari: Çoklu ev desteği, Sanalika tarzı estetik mobilyalar ve canlı oda dekorasyonu

var socket = window.socket || (typeof io !== 'undefined' ? io() : null);
window.socket = socket;

window.myHouses = window.myHouses || {};
window.myHouseData = window.myHouseData || null;
window.myFurnitureInventory = window.myFurnitureInventory || [];
window.currentViewingHouse = window.currentViewingHouse || null;
window.wasFurnitureDragged = false;

let hoveredFurnitureIndex = null;
let draggedFurnitureIndex = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let isFurnitureDragging = false;
let canvasInteractionSetupDone = false;

function getMyHouses() {
    let houses = window.myHouses || {};
    if (Object.keys(houses).length === 0 && window.myHouseData && window.myHouseData.type) {
        houses[window.myHouseData.type] = window.myHouseData;
    }
    return houses;
}

function getMyFurnitureInventory() {
    return window.myFurnitureInventory || [];
}

function getCurrentViewingHouse() {
    return window.currentViewingHouse;
}

function parseHouseRoomClient(roomName) {
    if (!roomName || !roomName.toLowerCase().startsWith('house_')) return null;
    let parts = roomName.substring(6).split('_');
    let last = parts[parts.length - 1]?.toLowerCase();
    let houseType = (last === 'standart' || last === 'garden' || last === 'pool') ? last : null;
    let owner = houseType ? parts.slice(0, -1).join('_') : parts.join('_');
    return { owner, houseType };
}
window.parseHouseRoomClient = parseHouseRoomClient;

function isCurrentlyInMyHouse() {
    let cRoom = (typeof currentRoom !== 'undefined' ? currentRoom : (window.currentRoom || '')).toLowerCase();
    if (!cRoom.startsWith('house_')) return false;
    let parsed = parseHouseRoomClient(cRoom);
    let myName = (window.myUsername || (typeof myUsername !== 'undefined' ? myUsername : '') || (typeof players !== 'undefined' && players[myId]?.name) || '').toLowerCase().trim();
    return !!(myName && parsed && parsed.owner.toLowerCase() === myName);
}
window.isCurrentlyInMyHouse = isCurrentlyInMyHouse;

function updateHouseEditButtonVisibility() {
    const editBtn = document.getElementById('btnEditHouseFurniture');
    const leaveBtn = document.getElementById('btnLeaveHouseAction');
    let inAnyHouse = (typeof currentRoom !== 'undefined' ? currentRoom : (window.currentRoom || '')).toLowerCase().startsWith('house_');
    let isMine = isCurrentlyInMyHouse();

    if (editBtn) editBtn.style.display = isMine ? 'flex' : 'none';
    if (leaveBtn) leaveBtn.style.display = inAnyHouse ? 'flex' : 'none';
}
window.updateHouseEditButtonVisibility = updateHouseEditButtonVisibility;

// --- 1. EMLAKÇI MODALI (Ali Bey Emlak) ---
const HOUSE_INFO = {
    'standart': {
        name: 'Standart Şehir Dairesi',
        price: 2500,
        emoji: '🏢',
        color: '#38bdf8',
        desc: 'Sıcak ve konforlu 1+1 şehir dairesi. Ahşap parke zemin ve modern tavan aydınlatması.'
    },
    'garden': {
        name: 'Verandalı Bahçeli Ev',
        price: 5000,
        emoji: '🏡',
        color: '#22c55e',
        desc: 'Doğayla iç içe müstakil yaşam! Geniş ahşap veranda, elma ağaçları ve yemyeşil bahçe manzarası.'
    },
    'pool': {
        name: 'Bahçeli & Havuzlu Villa',
        price: 7500,
        emoji: '🏰',
        color: '#f59e0b',
        desc: 'Lüksün zirvesi! Özel turkuaz yüzme havuzu, güneşlenme şezlongları ve mermer teras.'
    }
};

function openRealEstateModal() {
    const modal = document.getElementById('realEstateModal');
    if (!modal) return;
    renderRealEstateUI();
    modal.style.display = 'flex';
}
window.openRealEstateModal = openRealEstateModal;

function closeRealEstateModal() {
    const modal = document.getElementById('realEstateModal');
    if (modal) modal.style.display = 'none';
}
window.closeRealEstateModal = closeRealEstateModal;

function renderRealEstateUI() {
    const container = document.getElementById('realEstateCardsContainer');
    if (!container) return;
    container.innerHTML = "";

    let myHouses = getMyHouses();

    for (let key in HOUSE_INFO) {
        let h = HOUSE_INFO[key];
        let isOwned = !!myHouses[key];
        let card = document.createElement('div');
        card.style.cssText = `background: rgba(30, 41, 59, 0.85); border: 2px solid ${isOwned ? '#10b981' : h.color}; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; box-shadow: 0 8px 24px rgba(0,0,0,0.5); position: relative; overflow: hidden;`;

        if (isOwned) {
            let ownedBadge = document.createElement('div');
            ownedBadge.style.cssText = "position: absolute; top: 12px; right: 12px; background: #10b981; color: white; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px;";
            ownedBadge.innerText = "⭐ Sahipsiniz";
            card.appendChild(ownedBadge);
        }

        card.innerHTML += `
            <div>
                <div style="font-size: 42px; margin-bottom: 8px;">${h.emoji}</div>
                <h3 style="color: ${h.color}; margin: 0 0 6px 0; font-size: 18px;">${h.name}</h3>
                <p style="color: #cbd5e1; font-size: 13px; line-height: 1.4; margin: 0 0 14px 0;">${h.desc}</p>
            </div>
            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                <div style="font-weight: 800; color: #facc15; font-size: 17px;">${h.price} TL</div>
                ${isOwned 
                    ? `<button disabled style="padding: 8px 16px; background: #334155; color: #94a3b8; border: none; border-radius: 8px; font-weight: bold; font-size: 13px;">Satın Alındı</button>`
                    : `<button onclick="confirmBuyHouse('${key}')" style="padding: 8px 18px; background: linear-gradient(135deg, ${h.color}, #0369a1); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">🏠 Satın Al</button>`
                }
            </div>
        `;
        container.appendChild(card);
    }
}

function confirmBuyHouse(type) {
    let h = HOUSE_INFO[type];
    if (!h) return;
    if (confirm(`${h.name} satın almak istiyor musunuz? (${h.price} TL)`)) {
        socket.emit('buyHouse', type);
    }
}
window.confirmBuyHouse = confirmBuyHouse;

// --- 2. MOBİLYA VE EV MARKETİ MODALI ---
const FURNITURE_CATALOG = {
    'bitki': { name: 'Dev Salon Deve Tabanı', price: 200, emoji: '🪴', image: '/images/furniture/bitki.jpg', w: 48, h: 62, desc: 'Seramik saksıda dekoratif parlak yapraklı Monstera.' },
    'hali': { name: 'Anadolu Dokuma Halısı', price: 240, emoji: '🧶', image: '/images/furniture/hali.jpg', w: 126, h: 76, desc: 'Saçaklı, çift bordürlü otantik el dokuma salon halısı.' },
    'sedir': { name: 'Otantik Şark Sediri', price: 280, emoji: '🛋️', image: '/images/furniture/sedir.jpg', w: 94, h: 54, desc: 'Kadife minderli, altın püsküllü otantik şark sediri.' },
    'kitaplik': { name: 'Masif Ahşap Kütüphane', price: 320, emoji: '📚', image: '/images/furniture/kitaplik.jpg', w: 74, h: 80, desc: 'Deri ciltli kitaplar ve antika küreli oymalı meşe kitaplık.' },
    'berjer': { name: 'Lüks Deri Berjer', price: 360, emoji: '🪑', image: '/images/furniture/berjer.jpg', w: 56, h: 52, desc: 'Hakiki kapitone deri dikişli, konforlu berjer koltuk.' },
    'yemek_masasi': { name: 'Masif Ahşap Yemek Masası', price: 400, emoji: '🪑', image: '/images/furniture/yemek_masasi.jpg', w: 92, h: 60, desc: 'Dantel runner örtülü, vazolu ve sandalyeli yemek masası.' },
    'akvaryum': { name: 'Canlı Resif Akvaryumu', price: 440, emoji: '🐠', image: '/images/furniture/akvaryum.jpg', w: 76, h: 56, desc: 'İçinde balıkların yüzdüğü, aydınlatmalı lüks akvaryum.' },
    'tv': { name: 'Smart Curved TV Konsolu', price: 480, emoji: '📺', image: '/images/furniture/tv.jpg', w: 90, h: 62, desc: 'Kavisli plazma ekran ve şık lake TV ünitesi.' },
    'gramofon': { name: 'Antika Pirinç Gramofon', price: 520, emoji: '🎺', image: '/images/furniture/gramofon.jpg', w: 54, h: 54, desc: 'Ceviz sandıklı, döner plaklı nostaljik altın gramofon.' },
    'somine': { name: 'Doğal Taş Şömine', price: 550, emoji: '🪵', image: '/images/furniture/somine.jpg', w: 84, h: 70, desc: 'Doğal taş kemerli, çıtırdayan odunlu rustik şömine.' },
    'bilgisayar': { name: 'RGB Oyuncu Battle Station', price: 570, emoji: '🖥️', image: '/images/furniture/bilgisayar.jpg', w: 88, h: 64, desc: 'Çift kavisli monitör, RGB neon kasa ve profesyonel oyuncu koltuğu.' },
    'arcade': { name: 'Retro Atari Oyun Kabini', price: 590, emoji: '🕹️', image: '/images/furniture/arcade.jpg', w: 56, h: 72, desc: 'Işıklı tabelalı, jetonlu klasik Space Invaders retro atari kabini.' },
    'piyano': { name: 'Lüks Kuyruklu Konser Piyanosu', price: 600, emoji: '🎹', image: '/images/furniture/piyano.jpg', w: 96, h: 78, desc: 'Açık kapaklı, altın telli siyah lake konser piyanosu.' }
};

function openFurnitureMarketModal() {
    const modal = document.getElementById('furnitureMarketModal');
    if (!modal) return;
    renderFurnitureMarketUI();
    modal.style.display = 'flex';
}
window.openFurnitureMarketModal = openFurnitureMarketModal;

function closeFurnitureMarketModal() {
    const modal = document.getElementById('furnitureMarketModal');
    if (modal) modal.style.display = 'none';
}
window.closeFurnitureMarketModal = closeFurnitureMarketModal;

function renderFurnitureMarketUI() {
    const container = document.getElementById('furnitureCatalogGrid');
    if (!container) return;
    container.innerHTML = "";

    let curMoney = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 0);
    const mBadge = document.getElementById('marketMoneyDisplay');
    if (mBadge) mBadge.innerText = curMoney;

    let inv = getMyFurnitureInventory();

    for (let id in FURNITURE_CATALOG) {
        let item = FURNITURE_CATALOG[id];
        let ownedCount = inv.filter(k => k === id).length;
        let card = document.createElement('div');
        card.style.cssText = "background: rgba(30, 41, 59, 0.85); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; text-align: left; box-shadow: 0 4px 15px rgba(0,0,0,0.3); transition: transform 0.2s, border-color 0.2s;";
        card.onmouseenter = () => { card.style.transform = 'translateY(-3px)'; card.style.borderColor = '#38bdf8'; };
        card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.borderColor = 'rgba(255,255,255,0.12)'; };

        let canAfford = curMoney >= item.price;
        let btnBg = canAfford ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #64748b, #475569)";

        card.innerHTML = `
            <div>
                <div style="position: relative; width: 100%; height: 145px; border-radius: 10px; overflow: hidden; background: #0f172a; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1); box-shadow: inset 0 0 20px rgba(0,0,0,0.6);">
                    <img src="${item.image || ''}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <span style="display:${item.image ? 'none' : 'block'}; font-size: 42px;">${item.emoji}</span>
                    <span style="position: absolute; top: 8px; right: 8px; font-size: 11px; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.2); padding: 3px 8px; border-radius: 12px; color: #f8fafc; font-weight: 700;">Sahip: ${ownedCount}</span>
                </div>
                <div style="font-weight: 800; color: #f8fafc; font-size: 15px; margin-bottom: 4px;">${item.name}</div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.35;">${item.desc}</div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
                <div style="font-weight: 800; color: #facc15; font-size: 16px;">💰 ${item.price} TL</div>
                <button id="buyBtn_${id}" onclick="confirmBuyFurniture('${id}')" style="padding: 7px 16px; background: ${btnBg}; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); transition: transform 0.1s, filter 0.2s;">🛒 Satın Al</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function confirmBuyFurniture(itemId) {
    let item = FURNITURE_CATALOG[itemId];
    if (!item) return;

    let curMoney = (window.myMoney !== undefined) ? window.myMoney : ((typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId].money : 0);

    if (curMoney < item.price) {
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast('💰', 'Yetersiz Bakiye!', `Bu mobilya ${item.price} TL! Mevcut bakiyeniz: ${curMoney} TL.`);
        } else {
            alert(`Bu mobilya ${item.price} TL! Mevcut bakiyeniz: ${curMoney} TL.`);
        }
        return;
    }

    const buyBtn = document.getElementById(`buyBtn_${itemId}`);
    if (buyBtn) {
        buyBtn.disabled = true;
        buyBtn.innerText = '⏳ Alınıyor...';
        buyBtn.style.opacity = '0.7';
    }

    let activeSocket = window.socket || (typeof socket !== 'undefined' ? socket : null);
    if (activeSocket) {
        activeSocket.emit('buyFurniture', itemId);
    }
}
window.confirmBuyFurniture = confirmBuyFurniture;

// --- 3. KONUTLAR & EV ZİYARETİ MODALI (ÇOKLU EV LİSTESİ) ---
function openHousingPortalModal() {
    const modal = document.getElementById('housingPortalModal');
    const container = document.getElementById('availableHousesList');
    if (container) {
        container.innerHTML = `
            <div style="text-align: center; color: #94a3b8; padding: 25px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🔄</div>
                <div>Konutlar taranıyor...</div>
            </div>
        `;
    }
    socket.emit('getAvailableHouses');
    if (modal) modal.style.display = 'flex';
}
window.openHousingPortalModal = openHousingPortalModal;

function closeHousingPortalModal() {
    const modal = document.getElementById('housingPortalModal');
    if (modal) modal.style.display = 'none';
}
window.closeHousingPortalModal = closeHousingPortalModal;

function renderAvailableHousesUI(data) {
    const container = document.getElementById('availableHousesList');
    if (!container) return;
    container.innerHTML = "";

    let houses = data.houses || [];
    let hasSelfHouse = data.hasSelfHouse;
    let friendCount = data.friendCount || 0;

    // Kendi evimiz yoksa uyarı ve Emlakçı butonu
    if (!hasSelfHouse) {
        let warningBox = document.createElement('div');
        warningBox.style.cssText = "background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 12px; padding: 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;";
        warningBox.innerHTML = `
            <div>
                <div style="font-weight: 800; color: #facc15; font-size: 14px;">🏠 Henüz bir evin yok!</div>
                <div style="font-size: 12px; color: #cbd5e1; margin-top: 2px;">Emlakçı Ali Bey'den bir ev alarak kendi yuvanı kurabilir ve mobilyalarını yerleştirebilirsin.</div>
            </div>
            <button onclick="closeHousingPortalModal(); openRealEstateModal();" style="padding: 8px 16px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 12px; white-space: nowrap;">🏠 Ev Al</button>
        `;
        container.appendChild(warningBox);
    }

    if (houses.length === 0) {
        let emptyBox = document.createElement('div');
        emptyBox.style.cssText = "text-align: center; color: #94a3b8; padding: 30px 15px;";
        emptyBox.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 8px;">🏢</div>
            <div style="font-weight: 700; color: #e2e8f0; font-size: 15px;">Ziyaret edebileceğin bir ev bulunamadı!</div>
            <div style="font-size: 12px; margin-top: 4px;">Burada yalnızca <b>kendi evleriniz</b> ve <b>arkadaşlarınızın evleri</b> listelenir.</div>
            ${friendCount === 0 ? `<div style="margin-top: 10px; color: #38bdf8; font-size: 12px;">💡 Henüz arkadaşın yok. Oyundaki diğer oyunculara tıklayıp arkadaş ekleyebilirsin!</div>` : ''}
        `;
        container.appendChild(emptyBox);
        return;
    }

    houses.forEach(h => {
        let info = HOUSE_INFO[h.type] || { name: 'Ev', emoji: '🏠', color: '#38bdf8' };
        let card = document.createElement('div');
        card.style.cssText = `display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.85); border: 2px solid ${h.isSelf ? '#10b981' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 14px 18px; margin-bottom: 10px;`;

        let enterButtonText = h.isSelf 
            ? (h.type === 'pool' ? '🏰 Villama Gir' : (h.type === 'garden' ? '🏡 Bahçeli Evime Gir' : '🏢 Daireme Gir'))
            : '🚪 Eve Gir';

        card.innerHTML = `
            <div style="display: flex; align-items: center; gap: 14px;">
                <span style="font-size: 36px;">${info.emoji}</span>
                <div>
                    <div style="font-weight: 800; color: #f8fafc; font-size: 16px; display: flex; align-items: center; gap: 8px;">
                        ${h.isSelf ? `🏠 ${info.name}` : `${h.owner}'in Evi`}
                        ${h.isSelf ? `<span style="font-size: 11px; background: #10b981; color: white; padding: 2px 8px; border-radius: 12px; font-weight: bold;">Evim</span>` : `<span style="font-size: 11px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; padding: 2px 8px; border-radius: 12px; font-weight: bold;">Arkadaş</span>`}
                    </div>
                    <div style="font-size: 13px; color: ${info.color}; margin-top: 2px;">
                        ${h.isSelf ? `Sahibi: ${h.owner}` : info.name} • <span style="color: #cbd5e1;">${h.furnitureCount || 0} Mobilya</span>
                    </div>
                </div>
            </div>
            <button onclick="enterHouse('${h.owner}', '${h.type}')" style="padding: 9px 18px; background: ${h.isSelf ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #0ea5e9, #0284c7)'}; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); white-space:nowrap;">
                ${enterButtonText}
            </button>
        `;
        container.appendChild(card);
    });
}

function enterHouse(ownerUsername, houseType) {
    closeHousingPortalModal();
    let roomName = houseType ? `house_${ownerUsername}_${houseType}` : `house_${ownerUsername}`;
    socket.emit('getHouseData', { owner: ownerUsername, type: houseType });
    if (typeof changeRoom === 'function') {
        changeRoom(roomName);
    }
}
window.enterHouse = enterHouse;

// --- 4. EV İÇİ MOBİLYA DÜZENLEME MODALI ---
function openFurniturePlacementModal() {
    if (!isCurrentlyInMyHouse()) {
        alert("Mobilya düzenlemek için kendi evinizde olmalısınız!");
        return;
    }
    const modal = document.getElementById('furniturePlacementModal');
    if (!modal) return;
    renderFurniturePlacementUI();
    modal.style.display = 'flex';
}
window.openFurniturePlacementModal = openFurniturePlacementModal;

function closeFurniturePlacementModal() {
    const modal = document.getElementById('furniturePlacementModal');
    if (modal) modal.style.display = 'none';
}
window.closeFurniturePlacementModal = closeFurniturePlacementModal;

function renderFurniturePlacementUI() {
    const invContainer = document.getElementById('myInventoryFurnitureList');
    const placedContainer = document.getElementById('myPlacedFurnitureList');

    let inv = getMyFurnitureInventory();
    let viewingHouse = getCurrentViewingHouse();
    let placed = (viewingHouse && viewingHouse.furniture) ? viewingHouse.furniture : [];

    if (invContainer) {
        invContainer.innerHTML = "";
        if (inv.length === 0) {
            invContainer.innerHTML = `
                <div style="color:#94a3b8; font-size:13px; padding:15px; text-align:center;">
                    <div style="font-size:28px; margin-bottom:6px;">📦</div>
                    <div>Depoda yerleştirilmemiş mobilya yok.</div>
                    <div style="margin-top:10px;">
                        <button onclick="closeFurniturePlacementModal(); openFurnitureMarketModal();" style="padding:6px 14px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:6px; font-weight:bold; font-size:12px; cursor:pointer;">🛒 Markete Git</button>
                    </div>
                </div>
            `;
        } else {
            inv.forEach((itemId, idx) => {
                let item = FURNITURE_CATALOG[itemId] || { name: itemId, emoji: '📦', desc: '', image: '' };
                let itemRow = document.createElement('div');
                itemRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.7); padding:10px 12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);";
                itemRow.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:52px; height:52px; min-width:52px; border-radius:8px; overflow:hidden; background:#0f172a; border:1.5px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
                            <img src="${item.image || ''}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span style="display:${item.image ? 'none' : 'block'}; font-size:26px;">${item.emoji}</span>
                        </div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#f8fafc;">${item.name}</div>
                            <div style="font-size:11px; color:#94a3b8;">${item.desc || 'Dekoratif mobilya'}</div>
                        </div>
                    </div>
                    <button onclick="placeFurnitureInRoom('${itemId}')" style="padding:7px 14px; background:linear-gradient(135deg, #10b981, #059669); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px; white-space:nowrap; box-shadow:0 2px 6px rgba(16,185,129,0.3);">➕ Odaya Koy</button>
                `;
                invContainer.appendChild(itemRow);
            });
        }
    }

    if (placedContainer) {
        placedContainer.innerHTML = "";
        if (placed.length === 0) {
            placedContainer.innerHTML = `
                <div style="color:#94a3b8; font-size:13px; padding:15px; text-align:center;">
                    <div style="font-size:28px; margin-bottom:6px;">🛋️</div>
                    <div>Bu evde henüz mobilya bulunmuyor.</div>
                    <div style="font-size:11px; margin-top:4px; color:#64748b;">Soldaki deponuzdan eşya seçip odaya koyabilirsiniz.</div>
                </div>
            `;
        } else {
            placed.forEach((p, idx) => {
                let item = FURNITURE_CATALOG[p.id] || { name: p.id, emoji: '📦', image: '' };
                let pRow = document.createElement('div');
                pRow.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:rgba(30, 41, 59, 0.7); padding:10px 12px; border-radius:10px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.08);";
                pRow.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:52px; height:52px; min-width:52px; border-radius:8px; overflow:hidden; background:#0f172a; border:1.5px solid rgba(56,189,248,0.3); display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.35);">
                            <img src="${item.image || ''}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <span style="display:${item.image ? 'none' : 'block'}; font-size:26px;">${item.emoji}</span>
                        </div>
                        <div>
                            <div style="font-size:13px; font-weight:700; color:#f8fafc;">${item.name}</div>
                            <div style="font-size:11px; color:#38bdf8;">📍 Konum: (${p.x}, ${p.y})</div>
                        </div>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button onclick="moveFurnitureToPlayer(${idx})" title="Mobilyayı karakterinin durduğu yere getirir" style="padding:6px 10px; background:linear-gradient(135deg, #0ea5e9, #0284c7); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px; white-space:nowrap;">📍 Yanıma Getir</button>
                        <button onclick="removeFurnitureFromRoom(${idx})" title="Mobilyayı kaldırıp deponuza koyar" style="padding:6px 10px; background:linear-gradient(135deg, #ef4444, #dc2626); color:white; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:11px; white-space:nowrap;">❌ Depoya Kaldır</button>
                    </div>
                `;
                placedContainer.appendChild(pRow);
            });
        }
    }
}

function placeFurnitureInRoom(itemId) {
    if (!isCurrentlyInMyHouse()) return;
    let myP = (typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId] : { x: 400, y: 300 };
    let placeX = Math.max(70, Math.min(730, Math.round(myP.x)));
    let placeY = Math.max(160, Math.min(460, Math.round(myP.y)));

    socket.emit('placeFurniture', {
        itemId: itemId,
        x: placeX,
        y: placeY
    });
}
window.placeFurnitureInRoom = placeFurnitureInRoom;

function moveFurnitureToPlayer(index) {
    if (!isCurrentlyInMyHouse()) return;
    let myP = (typeof players !== 'undefined' && typeof myId !== 'undefined' && players[myId]) ? players[myId] : { x: 400, y: 300 };
    let placeX = Math.max(70, Math.min(730, Math.round(myP.x)));
    let placeY = Math.max(160, Math.min(460, Math.round(myP.y)));

    socket.emit('moveFurniture', {
        index: index,
        x: placeX,
        y: placeY
    });

    let house = getCurrentViewingHouse();
    if (house && house.furniture && house.furniture[index]) {
        house.furniture[index].x = placeX;
        house.furniture[index].y = placeY;
    }
    renderFurniturePlacementUI();
}
window.moveFurnitureToPlayer = moveFurnitureToPlayer;

function removeFurnitureFromRoom(index) {
    if (!isCurrentlyInMyHouse()) return;
    socket.emit('removeFurniture', index);
}
window.removeFurnitureFromRoom = removeFurnitureFromRoom;

// --- 5. MOUSE İLE DOĞRUDAN CANVASA SÜRÜKLE & BIRAK ETKİLEŞİMİ ---
function setupFurnitureCanvasInteractions() {
    if (canvasInteractionSetupDone) return;
    const gCanvas = document.getElementById('gameCanvas');
    if (!gCanvas) return;
    canvasInteractionSetupDone = true;

    function getCanvasCoords(e) {
        let rect = gCanvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (gCanvas.width / rect.width),
            y: (e.clientY - rect.top) * (gCanvas.height / rect.height)
        };
    }

    function findFurnitureAt(x, y) {
        let house = getCurrentViewingHouse();
        if (!house || !house.furniture || house.furniture.length === 0) return null;
        for (let i = house.furniture.length - 1; i >= 0; i--) {
            let item = house.furniture[i];
            let cat = FURNITURE_CATALOG[item.id] || { w: 60, h: 50 };
            let hw = Math.max(26, cat.w / 2 + 6);
            let hh = Math.max(26, cat.h / 2 + 6);
            if (x >= item.x - hw && x <= item.x + hw && y >= item.y - hh && y <= item.y + hh) {
                return i;
            }
        }
        return null;
    }

    gCanvas.addEventListener('mousedown', (e) => {
        if (!isCurrentlyInMyHouse()) return;
        let coords = getCanvasCoords(e);
        let targetIdx = findFurnitureAt(coords.x, coords.y);
        if (targetIdx !== null) {
            let house = getCurrentViewingHouse();
            let item = house.furniture[targetIdx];
            draggedFurnitureIndex = targetIdx;
            dragOffsetX = item.x - coords.x;
            dragOffsetY = item.y - coords.y;
            isFurnitureDragging = true;
            window.wasFurnitureDragged = false;
            gCanvas.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    gCanvas.addEventListener('mousemove', (e) => {
        if (!isCurrentlyInMyHouse()) return;
        let coords = getCanvasCoords(e);

        if (isFurnitureDragging && draggedFurnitureIndex !== null) {
            window.wasFurnitureDragged = true;
            let house = getCurrentViewingHouse();
            if (house && house.furniture && house.furniture[draggedFurnitureIndex]) {
                let newX = Math.round(coords.x + dragOffsetX);
                let newY = Math.round(coords.y + dragOffsetY);
                newX = Math.max(50, Math.min(gCanvas.width - 50, newX));
                newY = Math.max(160, Math.min(gCanvas.height - 40, newY));
                house.furniture[draggedFurnitureIndex].x = newX;
                house.furniture[draggedFurnitureIndex].y = newY;
                gCanvas.style.cursor = 'grabbing';
            }
        } else {
            let targetIdx = findFurnitureAt(coords.x, coords.y);
            hoveredFurnitureIndex = targetIdx;
            if (targetIdx !== null) {
                gCanvas.style.cursor = 'grab';
            }
        }
    });

    window.addEventListener('mouseup', () => {
        if (isFurnitureDragging && draggedFurnitureIndex !== null) {
            let house = getCurrentViewingHouse();
            if (house && house.furniture && house.furniture[draggedFurnitureIndex]) {
                let item = house.furniture[draggedFurnitureIndex];
                socket.emit('moveFurniture', {
                    index: draggedFurnitureIndex,
                    x: item.x,
                    y: item.y
                });
            }
            isFurnitureDragging = false;
            draggedFurnitureIndex = null;
            if (gCanvas) gCanvas.style.cursor = 'default';
            if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
                renderFurniturePlacementUI();
            }
            setTimeout(() => { window.wasFurnitureDragged = false; }, 100);
        }
    });
}

// --- 6. SANALİKA TARZI ESTETİK EV İÇİ VE MOBİLYA ÇİZİMİ ---
function drawHouseEnvironment() {
    setupFurnitureCanvasInteractions();

    let house = getCurrentViewingHouse();
    let type = house ? house.type : 'standart';
    let owner = house ? house.owner : 'Bilinmeyen';
    let isOwner = isCurrentlyInMyHouse();

    let now = Date.now();

    // 1. ZEMİN VE ARKA PLAN RENDERI
    if (type === 'pool') {
        // --- BAHÇELİ & HAVUZLU LÜKS VİLLA ---
        // Gökyüzü / Bahçe Arka Planı
        let skyGrad = ctx.createLinearGradient(0, 0, 0, 130);
        skyGrad.addColorStop(0, '#0284c7');
        skyGrad.addColorStop(0.6, '#38bdf8');
        skyGrad.addColorStop(1, '#bae6fd');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, canvas.width, 130);

        // Kristal Turkuaz Yüzme Havuzu (Işıltılı & Canlı)
        let poolGrad = ctx.createLinearGradient(140, 20, 660, 120);
        poolGrad.addColorStop(0, '#0284c7');
        poolGrad.addColorStop(0.5, '#06b6d4');
        poolGrad.addColorStop(1, '#22d3ee');
        ctx.fillStyle = poolGrad;
        ctx.beginPath();
        ctx.roundRect(140, 20, 520, 95, 12);
        ctx.fill();

        // Havuz Mozaik Çerçevesi
        ctx.strokeStyle = "#e0f2fe";
        ctx.lineWidth = 3.5;
        ctx.stroke();

        // Su Dalgalanma Animasyonu (Caustics)
        ctx.strokeStyle = "rgba(255,255,255,0.45)";
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) {
            let wy = 38 + i * 20 + Math.sin(now / 700 + i * 1.5) * 4;
            ctx.beginPath();
            ctx.moveTo(170, wy);
            ctx.bezierCurveTo(280, wy - 6, 420, wy + 6, 620, wy);
            ctx.stroke();
        }

        // Havuz Şezlongları & Palmiye Süsleri
        drawPoolLounger(ctx, 45, 50);
        drawPoolLounger(ctx, 85, 75);
        drawSunUmbrella(ctx, 705, 55);

        // Cam Teras Korkuluğu (Modern Glass Balustrade)
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        ctx.fillRect(0, 122, canvas.width, 12);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(0, 122, canvas.width, 12);

        // İç Zemin: İtalyan Carrara Parlak Mermeri (Yansımalı & Lüks)
        let floorGrad = ctx.createLinearGradient(0, 134, 0, canvas.height);
        floorGrad.addColorStop(0, '#f8fafc');
        floorGrad.addColorStop(0.4, '#f1f5f9');
        floorGrad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 134, canvas.width, canvas.height - 134);

        // Mermer Derz Çizgileri & Işık Yansımaları
        ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 55) {
            ctx.beginPath(); ctx.moveTo(x, 134); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
        for (let y = 134; y < canvas.height; y += 55) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }

        // Duvar Boyu Gizli LED Işık Şeridi (Cyan Ambient Glow)
        let ledGlow = ctx.createLinearGradient(0, 134, 0, 180);
        ledGlow.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        ledGlow.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = ledGlow;
        ctx.fillRect(0, 134, canvas.width, 46);

    } else if (type === 'garden') {
        // --- VERANDALI BAHÇELİ EV ---
        // Yemyeşil Çim Bahçe
        let lawnGrad = ctx.createLinearGradient(0, 0, 0, 130);
        lawnGrad.addColorStop(0, '#14532d');
        lawnGrad.addColorStop(0.7, '#16a34a');
        lawnGrad.addColorStop(1, '#22c55e');
        ctx.fillStyle = lawnGrad;
        ctx.fillRect(0, 0, canvas.width, 130);

        // Otantik Beyaz Ahşap Bahçe Çiti
        ctx.fillStyle = "#fef08a";
        for (let fx = 12; fx < canvas.width; fx += 24) {
            ctx.beginPath();
            ctx.moveTo(fx, 45);
            ctx.lineTo(fx + 5, 38);
            ctx.lineTo(fx + 10, 45);
            ctx.lineTo(fx + 10, 75);
            ctx.lineTo(fx, 75);
            ctx.closePath();
            ctx.fill();
        }
        ctx.fillStyle = "#fef9c3";
        ctx.fillRect(0, 50, canvas.width, 5);
        ctx.fillRect(0, 65, canvas.width, 5);

        // Çit Kenarı Renkli Çiçekler (Papatya & Laleler)
        let flowerColors = ['#f43f5e', '#facc15', '#a855f7', '#fb923c', '#ec4899'];
        for (let i = 0; i < 28; i++) {
            ctx.fillStyle = flowerColors[i % flowerColors.length];
            let flX = 20 + i * 27;
            let flY = 78 + Math.sin(i * 3) * 3;
            ctx.beginPath(); ctx.arc(flX, flY, 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fef08a";
            ctx.beginPath(); ctx.arc(flX, flY, 1.2, 0, Math.PI * 2); ctx.fill();
        }

        // Meyveli Elma Ağaçları & Bahçe Fenerleri
        drawMiniFruitTree(ctx, 110, 32);
        drawMiniFruitTree(ctx, 670, 32);

        // Veranda Masif Kestane Zemin (Rustik Ahşap)
        ctx.fillStyle = "#5c2c16";
        ctx.fillRect(0, 122, canvas.width, 14);

        let deckGrad = ctx.createLinearGradient(0, 136, 0, canvas.height);
        deckGrad.addColorStop(0, '#b45309');
        deckGrad.addColorStop(0.5, '#92400e');
        deckGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = deckGrad;
        ctx.fillRect(0, 136, canvas.width, canvas.height - 136);

        // Ahşap Tahta Derzleri & Rustik Budak Çizgileri
        ctx.strokeStyle = "rgba(40, 15, 5, 0.45)";
        ctx.lineWidth = 1.5;
        for (let y = 136; y < canvas.height; y += 28) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        for (let x = 60; x < canvas.width; x += 110) {
            ctx.beginPath(); ctx.moveTo(x, 136); ctx.lineTo(x, canvas.height); ctx.stroke();
        }

        // Sıcak Veranda Işık Hüzmesi
        let porchLight = ctx.createRadialGradient(canvas.width / 2, 136, 10, canvas.width / 2, 220, 260);
        porchLight.addColorStop(0, 'rgba(251, 191, 36, 0.28)');
        porchLight.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = porchLight;
        ctx.fillRect(0, 136, canvas.width, canvas.height - 136);

    } else {
        // --- STANDART ŞEHİR DAİRESİ ---
        // Sıcak Koyu Petrol Duvar Kağıdı
        let wallGrad = ctx.createLinearGradient(0, 0, 0, 136);
        wallGrad.addColorStop(0, '#1e293b');
        wallGrad.addColorStop(0.7, '#0f172a');
        wallGrad.addColorStop(1, '#020617');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, canvas.width, 136);

        // Tavan Kartonpiyeri (Crown Molding)
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(0, 0, canvas.width, 7);

        // Şehir Manzaralı İkili Lüks Pencereler (Tül Perdeli)
        drawCityWindow(ctx, 160, 18, 125, 95);
        drawCityWindow(ctx, 515, 18, 125, 95);

        // Sıcak Duvar Aplikleri (Wall Sconces with Glow Cones)
        [90, 400, 710].forEach(sX => {
            // Işık Konisi
            let cone = ctx.createRadialGradient(sX, 45, 2, sX, 60, 45);
            cone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
            cone.addColorStop(1, 'rgba(254, 240, 138, 0)');
            ctx.fillStyle = cone;
            ctx.beginPath();
            ctx.moveTo(sX - 10, 45);
            ctx.lineTo(sX + 10, 45);
            ctx.lineTo(sX + 35, 115);
            ctx.lineTo(sX - 35, 115);
            ctx.closePath();
            ctx.fill();

            // Altın Aplik Gövdesi
            ctx.fillStyle = "#d97706";
            ctx.fillRect(sX - 4, 40, 8, 14);
            ctx.fillStyle = "#fef08a";
            ctx.beginPath(); ctx.arc(sX, 42, 5, 0, Math.PI * 2); ctx.fill();
        });

        // Süpürgelik (Baseboard Molding)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(0, 128, canvas.width, 10);
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(0, 128, canvas.width, 1.5);

        // Sıcak Meşe Balıksırtı Parke (Warm Oak Floor)
        let floorGrad = ctx.createLinearGradient(0, 138, 0, canvas.height);
        floorGrad.addColorStop(0, '#d97706');
        floorGrad.addColorStop(0.6, '#b45309');
        floorGrad.addColorStop(1, '#92400e');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 138, canvas.width, canvas.height - 138);

        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 1;
        for (let y = 138; y < canvas.height; y += 26) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        }
        for (let x = 40; x < canvas.width; x += 80) {
            ctx.beginPath(); ctx.moveTo(x, 138); ctx.lineTo(x, canvas.height); ctx.stroke();
        }
    }

    // 2. EV SAHİBİ VE BAŞLIK BİLGİSİ
    let titleText = `🏠 ${owner}'in Evi (${HOUSE_INFO[type]?.name || 'Ev'})`;
    let bannerH = isOwner ? 46 : 34;
    ctx.fillStyle = "rgba(15, 23, 42, 0.92)";
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 220, 8, 440, bannerH, 10);
    ctx.fill();
    ctx.strokeStyle = isOwner ? "#10b981" : "#38bdf8";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(titleText, canvas.width / 2, 28);

    if (isOwner) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "11px 'Plus Jakarta Sans', sans-serif";
        ctx.fillText("💡 Mobilyaları farenizle (mouse) tutup sürükleyerek yerleştirebilirsiniz", canvas.width / 2, 45);
    }

    // 3. ODADAKİ MOBİLYALARI ÇİZ
    if (house && house.furniture && house.furniture.length > 0) {
        house.furniture.forEach((item, idx) => {
            let isHovered = isOwner && (idx === hoveredFurnitureIndex);
            let isDragged = isOwner && (idx === draggedFurnitureIndex);
            drawSanalikaFurniture(ctx, item, isHovered, isDragged);
        });
    }

    // 4. ÇIKIŞ KAPISI (Sol Altta "Sokağa Çıkış")
    ctx.fillStyle = "#78350f";
    ctx.fillRect(20, canvas.height - 65, 45, 55);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(20, canvas.height - 65, 45, 55);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(55, canvas.height - 38, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🚪 SOKAK", 42, canvas.height - 72);
}
window.drawHouseEnvironment = drawHouseEnvironment;

// --- 7. SANALİKA TARZI ZENGİN MOBİLYA ÇİZİM MOTORU ---
function drawSanalikaFurniture(ctx, item, isHovered, isDragged) {
    let x = item.x;
    let y = item.y;
    let id = item.id;
    let now = Date.now();
    let cat = FURNITURE_CATALOG[id] || { w: 60, h: 45 };

    ctx.save();

    // 1. Yumuşak Zemin Gölgesi (Tüm eşyalar için gerçekçi derinlik)
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(x, y + (cat.h / 2) - 4, cat.w * 0.46, Math.max(6, cat.h * 0.16), 0, 0, Math.PI * 2);
    ctx.fill();

    if (id === 'sedir') {
        // --- SANALİKA OTANTİK ŞARK SEDİRİ (94x54) ---
        // Ahşap Oymalı Baza (Kaide)
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.roundRect(x - 47, y + 8, 94, 18, 4);
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Baza Üzerinde Altın Oymalar
        ctx.fillStyle = "#d97706";
        for (let bx = x - 38; bx <= x + 38; bx += 18) {
            ctx.beginPath();
            ctx.arc(bx, y + 17, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Bordo / Vişne Çürüğü Kadife Minder (Geniş Oturma Alanı)
        let cushionGrad = ctx.createLinearGradient(0, y - 6, 0, y + 10);
        cushionGrad.addColorStop(0, '#9d174d');
        cushionGrad.addColorStop(0.5, '#831843');
        cushionGrad.addColorStop(1, '#500724');
        ctx.fillStyle = cushionGrad;
        ctx.beginPath();
        ctx.roundRect(x - 46, y - 8, 92, 18, 5);
        ctx.fill();

        // Altın Fitil Dikiş Çizgisi
        ctx.strokeStyle = "rgba(250, 204, 21, 0.75)";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Arkalık (Sırtlık - Geleneksel Kilim Bordürü)
        let backGrad = ctx.createLinearGradient(0, y - 27, 0, y - 8);
        backGrad.addColorStop(0, '#be185d');
        backGrad.addColorStop(1, '#831843');
        ctx.fillStyle = backGrad;
        ctx.beginPath();
        ctx.roundRect(x - 46, y - 27, 92, 20, [8, 8, 0, 0]);
        ctx.fill();

        // Kilim Şerit Deseni (Arkalık üzeri)
        ctx.fillStyle = "#facc15";
        for (let kx = x - 36; kx <= x + 36; kx += 16) {
            ctx.beginPath();
            ctx.moveTo(kx, y - 23);
            ctx.lineTo(kx + 5, y - 18);
            ctx.lineTo(kx, y - 13);
            ctx.lineTo(kx - 5, y - 18);
            ctx.closePath();
            ctx.fill();
        }

        // Sol Silindirik Altın Yastık (Kırlent)
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.roundRect(x - 44, y - 22, 16, 22, 6);
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x - 42, y - 20, 12, 18);
        // Altın Püskül
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(x - 46, y - 11, 2.5, 0, Math.PI * 2); ctx.fill();

        // Sağ Silindirik Altın Yastık (Kırlent)
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.roundRect(x + 28, y - 22, 16, 22, 6);
        ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.fillRect(x + 30, y - 20, 12, 18);
        // Altın Püskül
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(x + 46, y - 11, 2.5, 0, Math.PI * 2); ctx.fill();

        // Orta Kare Turkuaz Kırlent
        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.roundRect(x - 10, y - 22, 20, 16, 4);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();

    } else if (id === 'berjer') {
        // --- SANALİKA LÜKS KAPİTONE DERİ BERJER (56x52) ---
        // Ahşap Lükens Ayaklar
        ctx.fillStyle = "#451a03";
        ctx.fillRect(x - 22, y + 16, 6, 8);
        ctx.fillRect(x + 16, y + 16, 6, 8);

        // Ana Koltuk Kasa Gövdesi
        let bGrad = ctx.createLinearGradient(0, y - 24, 0, y + 16);
        bGrad.addColorStop(0, '#78350f');
        bGrad.addColorStop(0.6, '#451a03');
        bGrad.addColorStop(1, '#290e03');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.roundRect(x - 25, y - 24, 50, 40, 10);
        ctx.fill();

        // Kapitone Baklava Dikişler (Sırtlık)
        ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 16, y - 18); ctx.lineTo(x, y - 6); ctx.lineTo(x + 16, y - 18);
        ctx.moveTo(x - 16, y - 8); ctx.lineTo(x, y + 4); ctx.lineTo(x + 16, y - 8);
        ctx.stroke();

        // Kapitone Deri Düğmeleri
        ctx.fillStyle = "#facc15";
        let btns = [[x, y - 6], [x - 10, y - 14], [x + 10, y - 14], [x, y + 2]];
        btns.forEach(b => {
            ctx.beginPath(); ctx.arc(b[0], b[1], 1.8, 0, Math.PI * 2); ctx.fill();
        });

        // Dolgun Oturma Pufu (Yastık)
        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.roundRect(x - 20, y + 2, 40, 15, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.2)";
        ctx.stroke();

        // Kıvrımlı Deri Kolçaklar
        ctx.fillStyle = "#5c2306";
        ctx.beginPath(); ctx.roundRect(x - 27, y - 8, 10, 22, 5); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + 17, y - 8, 10, 22, 5); ctx.fill();

    } else if (id === 'hali') {
        // --- SANALİKA ANADOLU DOKUMA HALISI (126x76) ---
        // Üst & Alt Saçak Püskülleri
        ctx.strokeStyle = "#f8fafc";
        ctx.lineWidth = 1.2;
        for (let fx = x - 58; fx <= x + 58; fx += 4) {
            ctx.beginPath(); ctx.moveTo(fx, y - 37); ctx.lineTo(fx, y - 34); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(fx, y + 34); ctx.lineTo(fx, y + 37); ctx.stroke();
        }

        // Bordo Halı Gövdesi
        let rugGrad = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
        rugGrad.addColorStop(0, '#881337');
        rugGrad.addColorStop(0.5, '#9f1239');
        rugGrad.addColorStop(1, '#881337');
        ctx.fillStyle = rugGrad;
        ctx.fillRect(x - 60, y - 34, 120, 68);

        // Altın Çift Bordür
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 2.5;
        ctx.strokeRect(x - 55, y - 30, 110, 60);

        // Lacivert İç Bordür
        ctx.strokeStyle = "#1e3a8a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - 50, y - 25, 100, 50);

        // Köşe Türk Motifleri
        ctx.fillStyle = "#facc15";
        let corners = [
            [x - 44, y - 20], [x + 44, y - 20],
            [x - 44, y + 20], [x + 44, y + 20]
        ];
        corners.forEach(c => {
            ctx.beginPath();
            ctx.moveTo(c[0], c[1] - 4);
            ctx.lineTo(c[0] + 4, c[1]);
            ctx.lineTo(c[0], c[1] + 4);
            ctx.lineTo(c[0] - 4, c[1]);
            ctx.closePath();
            ctx.fill();
        });

        // Ortadaki Büyük Madalyon (Göbek Motifi)
        ctx.fillStyle = "#1e3a8a";
        ctx.beginPath();
        ctx.ellipse(x, y, 22, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#0284c7";
        ctx.beginPath();
        ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

    } else if (id === 'tv') {
        // --- SANALİKA SMART CURVED TV & LAKE KONSOL (90x62) ---
        // Beyaz Lake Alt Konsol
        ctx.fillStyle = "#f1f5f9";
        ctx.beginPath();
        ctx.roundRect(x - 42, y + 12, 84, 18, 4);
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Konsol Cam Rafı & Uydu/Oyun Cihazı
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(x - 18, y + 16, 36, 8);
        ctx.fillStyle = "#22c55e"; // Cihazın yeşil açık LED'i
        ctx.beginPath(); ctx.arc(x - 13, y + 20, 1.5, 0, Math.PI * 2); ctx.fill();

        // TV Standı (Metalik Taban)
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x - 14, y + 8, 28, 4);
        ctx.fillRect(x - 3, y + 2, 6, 8);

        // Kavisli İnce Plazma Ekran Çerçevesi
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(x - 44, y - 26, 88, 38, 5);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Dinamik TV Ekranı Canlı Yayını
        let tvHue = (now / 25) % 360;
        let screenGrad = ctx.createLinearGradient(x - 40, y - 24, x + 40, y + 8);
        screenGrad.addColorStop(0, `hsla(${tvHue}, 80%, 65%, 0.75)`);
        screenGrad.addColorStop(0.5, `hsla(${(tvHue + 60) % 360}, 85%, 60%, 0.75)`);
        screenGrad.addColorStop(1, `hsla(${(tvHue + 120) % 360}, 90%, 55%, 0.75)`);
        ctx.fillStyle = screenGrad;
        ctx.fillRect(x - 41, y - 23, 82, 32);

        // Şık Ekran Parlama Efekti & Minimal Güç LED'i
        ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
        ctx.beginPath();
        ctx.moveTo(x - 41, y - 23);
        ctx.lineTo(x + 10, y - 23);
        ctx.lineTo(x - 15, y + 9);
        ctx.lineTo(x - 41, y + 9);
        ctx.closePath();
        ctx.fill();

        // Minik Mavi Güç LED Işığı (Alt Çerçeve)
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath(); ctx.arc(x, y + 10, 1.2, 0, Math.PI * 2); ctx.fill();

    } else if (id === 'somine') {
        // --- SANALİKA RUSTİK DOĞAL TAŞ ŞÖMİNE (84x70) ---
        // Doğal Taş Gövde
        ctx.fillStyle = "#475569";
        ctx.beginPath();
        ctx.roundRect(x - 40, y - 28, 80, 60, 6);
        ctx.fill();

        // Taş Doku Çizgileri
        ctx.strokeStyle = "rgba(15, 23, 42, 0.4)";
        ctx.lineWidth = 1;
        for (let ty = y - 22; ty <= y + 26; ty += 10) {
            ctx.beginPath(); ctx.moveTo(x - 38, ty); ctx.lineTo(x + 38, ty); ctx.stroke();
        }

        // Masif Ahşap Şömine Rafı
        ctx.fillStyle = "#78350f";
        ctx.beginPath();
        ctx.roundRect(x - 44, y - 34, 88, 8, 3);
        ctx.fill();

        // Şömine Rafındaki Pirinç Şamdan ve Mum
        ctx.fillStyle = "#facc15";
        ctx.fillRect(x - 22, y - 40, 5, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 21, y - 44, 3, 4);
        ctx.fillStyle = "#ea580c";
        ctx.beginPath(); ctx.arc(x - 19.5, y - 46, 2, 0, Math.PI * 2); ctx.fill();

        // Kemerli Ateş Haznesi (İç Ocak)
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(x - 26, y - 10, 52, 40, [14, 14, 0, 0]);
        ctx.fill();

        // Çapraz Meşe Odunları
        ctx.fillStyle = "#78350f";
        ctx.save();
        ctx.translate(x, y + 20);
        ctx.rotate(0.25); ctx.fillRect(-18, -4, 36, 6);
        ctx.rotate(-0.5); ctx.fillRect(-18, -4, 36, 6);
        ctx.restore();

        // Canlı Alev Dansı & Köz Parıltısı
        let flameH = 14 + Math.sin(now / 90) * 4;
        let flameGrad = ctx.createRadialGradient(x, y + 16, 2, x, y + 14 - flameH * 0.4, 16);
        flameGrad.addColorStop(0, '#fef08a');
        flameGrad.addColorStop(0.3, '#f59e0b');
        flameGrad.addColorStop(0.7, '#ea580c');
        flameGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = flameGrad;
        ctx.beginPath();
        ctx.arc(x, y + 16, 15, 0, Math.PI * 2);
        ctx.fill();

        // Çıtırdayan Minik Kıvılcımlar
        ctx.fillStyle = "#fef08a";
        let sparkOffset = (now / 40) % 18;
        ctx.beginPath(); ctx.arc(x - 4 + Math.sin(now / 150) * 6, y + 8 - sparkOffset, 1.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 5 + Math.cos(now / 180) * 6, y + 10 - sparkOffset * 0.8, 1.2, 0, Math.PI * 2); ctx.fill();

    } else if (id === 'akvaryum') {
        // --- SANALİKA CANLI RESİF AKVARYUMU (76x56) ---
        // Siyah Lake Taban Standı
        ctx.fillStyle = "#1e293b";
        ctx.beginPath();
        ctx.roundRect(x - 36, y + 12, 72, 14, 3);
        ctx.fill();

        // Akvaryum Camı ve İç Su
        let waterGrad = ctx.createLinearGradient(0, y - 20, 0, y + 12);
        waterGrad.addColorStop(0, '#38bdf8');
        waterGrad.addColorStop(1, '#0284c7');
        ctx.fillStyle = waterGrad;
        ctx.beginPath();
        ctx.roundRect(x - 35, y - 20, 70, 32, 4);
        ctx.fill();

        // Cam Çerçeve
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Taban Kumu
        ctx.fillStyle = "#fde047";
        ctx.fillRect(x - 34, y + 7, 68, 5);

        // Yeşil Mercan / Yosunlar
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(x - 24, y + 4, 6, 0, Math.PI * 2);
        ctx.arc(x - 20, y, 5, 0, Math.PI * 2);
        ctx.arc(x + 22, y + 4, 6, 0, Math.PI * 2);
        ctx.fill();

        // Yükselen Hava Baloncukları
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        let b1 = (now / 60) % 24;
        let b2 = (now / 75 + 10) % 24;
        ctx.beginPath(); ctx.arc(x - 14, y + 8 - b1, 1.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 10, y + 8 - b2, 1.8, 0, Math.PI * 2); ctx.fill();

        // Canlı Yüzen Turuncu Palyaço Balığı (Nemo)
        let fishX = x + Math.sin(now / 500) * 16;
        let fishDir = Math.cos(now / 500) >= 0 ? 1 : -1;
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.ellipse(fishX, y - 4, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Beyaz Çizgi
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(fishX - 1, y - 7, 2, 6);
        // Kuyruk
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(fishX - 6 * fishDir, y - 4);
        ctx.lineTo(fishX - 10 * fishDir, y - 7);
        ctx.lineTo(fishX - 10 * fishDir, y - 1);
        ctx.closePath();
        ctx.fill();

    } else if (id === 'gramofon') {
        // --- SANALİKA NOSTALJİK ANTİKA GRAMOFON (54x54) ---
        // Cilalı Ahşap Sandık
        ctx.fillStyle = "#5c2306";
        ctx.beginPath();
        ctx.roundRect(x - 18, y + 2, 36, 18, 4);
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Dönen Siyah Vinil Taş Plak
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 16, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        // Kırmızı Plak Göbeği
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.ellipse(x, y - 2, 5, 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Altın Ses İğnesi (Kol)
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 12, y + 2);
        ctx.lineTo(x - 3, y - 3);
        ctx.stroke();

        // Parıldayan Dev Pirinç Boru (Horn)
        let hornGrad = ctx.createLinearGradient(x - 15, y - 26, x + 20, y - 10);
        hornGrad.addColorStop(0, '#fef08a');
        hornGrad.addColorStop(0.4, '#facc15');
        hornGrad.addColorStop(1, '#b45309');
        ctx.fillStyle = hornGrad;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.quadraticCurveTo(x + 6, y - 12, x + 18, y - 24);
        ctx.lineTo(x + 2, y - 28);
        ctx.quadraticCurveTo(x - 2, y - 16, x - 2, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#78350f";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Boru Ağzı (Açılan Çan)
        ctx.fillStyle = "#fef08a";
        ctx.beginPath();
        ctx.ellipse(x + 10, y - 26, 10, 5, -0.4, 0, Math.PI * 2);
        ctx.fill();

    } else if (id === 'yemek_masasi') {
        // --- SANALİKA MASİF YEMEK MASASI & SANDALYELER (92x60) ---
        // Arkadaki Sandalyeler (2 adet)
        ctx.fillStyle = "#451a03";
        ctx.beginPath(); ctx.roundRect(x - 34, y - 26, 16, 20, 3); ctx.fill();
        ctx.beginPath(); ctx.roundRect(x + 18, y - 26, 16, 20, 3); ctx.fill();
        ctx.fillStyle = "#b45309";
        ctx.fillRect(x - 32, y - 24, 12, 10);
        ctx.fillRect(x + 20, y - 24, 12, 10);

        // Masif Meşe Masa Tablası
        let tableGrad = ctx.createLinearGradient(0, y - 12, 0, y + 16);
        tableGrad.addColorStop(0, '#b45309');
        tableGrad.addColorStop(0.5, '#78350f');
        tableGrad.addColorStop(1, '#451a03');
        ctx.fillStyle = tableGrad;
        ctx.beginPath();
        ctx.roundRect(x - 44, y - 12, 88, 28, 6);
        ctx.fill();
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Dantelli Runner Örtü
        ctx.fillStyle = "#f8fafc";
        ctx.fillRect(x - 12, y - 12, 24, 28);
        ctx.strokeStyle = "rgba(203, 213, 225, 0.8)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 12, y - 12, 24, 28);

        // Masanın Ortasındaki Çiçekli Vazo
        ctx.fillStyle = "#0284c7"; // Porselen Vazo
        ctx.beginPath();
        ctx.ellipse(x, y + 2, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Rengarenk Çiçekler
        ctx.fillStyle = "#ec4899";
        ctx.beginPath(); ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(x + 3, y - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(x, y - 6, 3.5, 0, Math.PI * 2); ctx.fill();

    } else if (id === 'bitki') {
        // --- SANALİKA DEV SALON DEVE TABANI / MONSTERA (48x62) ---
        // Beyaz Seramik Saksı & Tabağı
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.ellipse(x, y + 24, 14, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        let potGrad = ctx.createLinearGradient(x - 12, 0, x + 12, 0);
        potGrad.addColorStop(0, '#f8fafc');
        potGrad.addColorStop(0.6, '#e2e8f0');
        potGrad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = potGrad;
        ctx.beginPath();
        ctx.moveTo(x - 13, y + 8);
        ctx.lineTo(x + 13, y + 8);
        ctx.lineTo(x + 10, y + 22);
        ctx.lineTo(x - 10, y + 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#64748b";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Toprak Dokusu
        ctx.fillStyle = "#451a03";
        ctx.beginPath();
        ctx.ellipse(x, y + 8, 12, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Parlak Monstera Yaprakları
        ctx.fillStyle = "#15803d";
        ctx.beginPath(); ctx.ellipse(x - 12, y - 4, 13, 8, -0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 12, y - 6, 13, 8, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#16a34a";
        ctx.beginPath(); ctx.ellipse(x - 2, y - 16, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#22c55e"; // Taze sürgün yaprağı
        ctx.beginPath(); ctx.ellipse(x + 4, y - 22, 9, 6, 0.3, 0, Math.PI * 2); ctx.fill();

        // Yaprak Damarları
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x - 2, y - 10); ctx.lineTo(x - 2, y - 22); ctx.stroke();

    } else if (id === 'bilgisayar') {
        // --- RGB GAMING BATTLESTATION & ÇİFT MONİTÖR (88x64) ---
        // Siyah Metalik Masa Ayakları
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x - 38, y + 14, 6, 16);
        ctx.fillRect(x + 32, y + 14, 6, 16);
        ctx.fillRect(x - 38, y + 26, 76, 4);

        // Karbon Doku Masa Tablası
        let deskGrad = ctx.createLinearGradient(0, y, 0, y + 16);
        deskGrad.addColorStop(0, '#334155');
        deskGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = deskGrad;
        ctx.beginPath(); ctx.roundRect(x - 42, y, 84, 16, 4); ctx.fill();

        // Masa Altı RGB Neon Işık Şeridi (Dinamik Renk)
        let rgbHue = (now / 20) % 360;
        ctx.strokeStyle = `hsl(${rgbHue}, 100%, 60%)`;
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - 42, y + 16); ctx.lineTo(x + 42, y + 16); ctx.stroke();

        // Cam RGB Kasa (Sağda Masanın Üstünde)
        ctx.fillStyle = "#020617";
        ctx.beginPath(); ctx.roundRect(x + 18, y - 26, 22, 28, 3); ctx.fill();
        ctx.strokeStyle = `hsl(${(rgbHue + 60) % 360}, 100%, 60%)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Kasa İçi Dönen Fanlar (Neon)
        ctx.fillStyle = `hsl(${rgbHue}, 100%, 65%)`;
        ctx.beginPath(); ctx.arc(x + 29, y - 18, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 29, y - 8, 4, 0, Math.PI * 2); ctx.fill();

        // Çift Kavisli Monitör Standı
        ctx.fillStyle = "#64748b";
        ctx.fillRect(x - 12, y - 4, 14, 5);
        ctx.fillRect(x - 6, y - 16, 4, 14);

        // Çift Kavisli Ekranlar
        // Sol Ekran
        ctx.fillStyle = "#0f172a";
        ctx.beginPath(); ctx.roundRect(x - 38, y - 26, 26, 22, 3); ctx.fill();
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1; ctx.stroke();
        let sGrad1 = ctx.createLinearGradient(x - 36, y - 24, x - 14, y - 6);
        sGrad1.addColorStop(0, '#0284c7'); sGrad1.addColorStop(1, '#6366f1');
        ctx.fillStyle = sGrad1; ctx.fillRect(x - 36, y - 24, 22, 18);

        // Sağ Ekran
        ctx.fillStyle = "#0f172a";
        ctx.beginPath(); ctx.roundRect(x - 10, y - 26, 26, 22, 3); ctx.fill();
        ctx.strokeStyle = "#a855f7"; ctx.lineWidth = 1; ctx.stroke();
        let sGrad2 = ctx.createLinearGradient(x - 8, y - 24, x + 14, y - 6);
        sGrad2.addColorStop(0, '#ec4899'); sGrad2.addColorStop(1, '#8b5cf6');
        ctx.fillStyle = sGrad2; ctx.fillRect(x - 8, y - 24, 22, 18);

        // Işıklı RGB Mekanik Klavye & Mouse
        ctx.fillStyle = "#020617";
        ctx.fillRect(x - 22, y + 3, 20, 8);
        ctx.strokeStyle = `hsl(${(rgbHue + 180) % 360}, 100%, 65%)`; ctx.lineWidth = 1; ctx.strokeRect(x - 22, y + 3, 20, 8);
        // Mouse
        ctx.fillStyle = `hsl(${rgbHue}, 100%, 60%)`;
        ctx.beginPath(); ctx.ellipse(x + 4, y + 7, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

    } else if (id === 'arcade') {
        // --- RETRO ATARİ / ARCADE KABİNİ (56x72) ---
        // Siyah Yan Paneller
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.roundRect(x - 24, y - 36, 48, 72, 6);
        ctx.fill();

        // Neon Yan Çizgiler (Cyan T-Molding)
        ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2;
        ctx.strokeRect(x - 24, y - 36, 48, 72);

        // Işıklı Üst Marquee Tabelası ("★ ARCADE ★")
        ctx.fillStyle = "#18181b";
        ctx.fillRect(x - 20, y - 32, 40, 14);
        let arcGlow = Math.sin(now / 150) * 0.2 + 0.8;
        ctx.fillStyle = `rgba(250, 204, 21, ${arcGlow})`;
        ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
        ctx.fillText("★ ARCADE ★", x, y - 22);

        // CRT Ekran Çerçevesi ve Ekran
        ctx.fillStyle = "#020617";
        ctx.fillRect(x - 18, y - 15, 36, 26);
        ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1;
        ctx.strokeRect(x - 18, y - 15, 36, 26);

        // Ekran İçi Piksel Oyun Animasyonu (Space Invader)
        ctx.fillStyle = "#22c55e";
        let alienX = x + Math.sin(now / 300) * 8;
        ctx.fillRect(alienX - 4, y - 10, 8, 5);
        ctx.fillRect(alienX - 6, y - 8, 12, 2);
        // Oyuncu Gemisi
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(x - 3, y + 4, 6, 3);
        ctx.fillRect(x - 1, y + 1, 2, 3);

        // Eğimli Kontrol Paneli
        ctx.fillStyle = "#27272a";
        ctx.beginPath(); ctx.roundRect(x - 22, y + 14, 44, 12, 3); ctx.fill();

        // Joystick (Kırmızı topuz)
        ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(x - 10, y + 20); ctx.lineTo(x - 12, y + 15); ctx.stroke();
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.arc(x - 12, y + 14, 3, 0, Math.PI * 2); ctx.fill();

        // 3 Renkli Buton
        let bColors = ["#facc15", "#22c55e", "#3b82f6"];
        bColors.forEach((bc, bIdx) => {
            ctx.fillStyle = bc;
            ctx.beginPath(); ctx.arc(x + 2 + bIdx * 6, y + 19, 2, 0, Math.PI * 2); ctx.fill();
        });

        // Jeton Yuvası & Kapak
        ctx.fillStyle = "#18181b";
        ctx.fillRect(x - 14, y + 28, 28, 7);
        ctx.fillStyle = "#facc15";
        ctx.fillRect(x - 2, y + 30, 4, 2);

    } else if (id === 'kitaplik') {
        // --- MASİF AHŞAP KÜTÜPHANE & KİTAPLIK (74x80) ---
        // Masif Meşe Gövde
        let bookGrad = ctx.createLinearGradient(0, y - 40, 0, y + 40);
        bookGrad.addColorStop(0, '#78350f');
        bookGrad.addColorStop(0.5, '#451a03');
        bookGrad.addColorStop(1, '#290e03');
        ctx.fillStyle = bookGrad;
        ctx.beginPath(); ctx.roundRect(x - 34, y - 40, 68, 80, 5); ctx.fill();
        ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();

        // Ahşap Raf Çizgileri (3 Raf)
        let shelves = [y - 14, y + 12, y + 36];
        ctx.fillStyle = "#92400e";
        shelves.forEach(sy => {
            ctx.fillRect(x - 32, sy, 64, 4);
        });

        // 1. Raf: Antika Kitaplar & Sukulent
        let colors1 = ["#991b1b", "#1e3a8a", "#15803d", "#b45309", "#ca8a04", "#7c3aed"];
        colors1.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(x - 28 + i * 7, y - 34, 5, 19);
            ctx.fillStyle = "#facc15"; ctx.fillRect(x - 28 + i * 7, y - 28, 5, 1);
        });
        ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 18, y - 24, 8, 9);
        ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 22, y - 26, 4, 0, Math.PI * 2); ctx.fill();

        // 2. Raf: Deri Ciltli Kitaplar & Antika Küre
        let colors2 = ["#1e293b", "#7f1d1d", "#065f46", "#854d0e"];
        colors2.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(x - 28 + i * 8, y - 9, 6, 20);
        });
        ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 16, y + 4, 6, 7);
        ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.arc(x + 19, y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 19, y, 3, 0, Math.PI * 2); ctx.fill();

        // 3. Raf: Kalın Ansiklopediler & Klasörler
        let colors3 = ["#475569", "#991b1b", "#1e3a8a", "#334155", "#b45309", "#047857", "#4338ca"];
        colors3.forEach((c, i) => {
            ctx.fillStyle = c;
            ctx.fillRect(x - 28 + i * 8, y + 17, 6, 18);
        });

    } else if (id === 'piyano') {
        // --- LÜKS KUYRUKLU KONSER PİYANOSU (96x78) ---
        // Siyah Lake Parlak Gövde (Kavisli Kuyruk Formu)
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.moveTo(x - 42, y + 20);
        ctx.lineTo(x + 36, y + 20);
        ctx.quadraticCurveTo(x + 46, y, x + 40, y - 22);
        ctx.quadraticCurveTo(x + 20, y - 36, x - 20, y - 36);
        ctx.lineTo(x - 42, y - 36);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();

        // Açık Kapak Desteği ve Altın Rezonans Telleri
        ctx.fillStyle = "#b45309";
        ctx.beginPath();
        ctx.ellipse(x + 8, y - 10, 22, 14, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#facc15"; ctx.lineWidth = 0.8;
        for (let py = -8; py <= 8; py += 3) {
            ctx.beginPath(); ctx.moveTo(x - 8, y - 10 + py); ctx.lineTo(x + 24, y - 10 + py * 0.7); ctx.stroke();
        }

        // Açık Kapak Silueti
        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.moveTo(x - 42, y - 36);
        ctx.lineTo(x + 38, y - 22);
        ctx.lineTo(x + 44, y - 32);
        ctx.lineTo(x - 38, y - 44);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1; ctx.stroke();

        // Altın Kapak Destek Çubuğu
        ctx.strokeStyle = "#facc15"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 22, y - 12); ctx.lineTo(x + 26, y - 26); ctx.stroke();

        // Klavye Yatağı (Beyaz & Siyah Tuşlar)
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x - 38, y + 20, 72, 8);
        ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 0.8;
        ctx.strokeRect(x - 38, y + 20, 72, 8);

        for (let k = 0; k < 12; k++) {
            ctx.beginPath(); ctx.moveTo(x - 38 + k * 6, y + 20); ctx.lineTo(x - 38 + k * 6, y + 28); ctx.stroke();
        }
        ctx.fillStyle = "#09090b";
        [1, 2, 4, 5, 6, 8, 9, 11].forEach(kIdx => {
            ctx.fillRect(x - 36 + (kIdx - 1) * 6 + 4, y + 20, 3.5, 5);
        });

        // Altın Ayaklar
        ctx.fillStyle = "#ca8a04";
        ctx.fillRect(x - 38, y + 28, 5, 8);
        ctx.fillRect(x + 32, y + 28, 5, 8);
        ctx.fillRect(x, y - 36, 5, 6);

        // Piyano Taburesi
        ctx.fillStyle = "#78350f";
        ctx.fillRect(x - 16, y + 36, 32, 6);
        ctx.fillStyle = "#dc2626";
        ctx.beginPath(); ctx.roundRect(x - 18, y + 33, 36, 6, 2); ctx.fill();
    }

    // Seçim / Sürükleme Vurgulamaları
    if (isDragged) {
        let hw = cat.w / 2 + 6;
        let hh = cat.h / 2 + 6;
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);

        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(x - hw - 3, y - hh - 3, 6, 6);
        ctx.fillRect(x + hw - 3, y - hh - 3, 6, 6);
        ctx.fillRect(x - hw - 3, y + hh - 3, 6, 6);
        ctx.fillRect(x + hw - 3, y + hh - 3, 6, 6);

        ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
        ctx.beginPath();
        ctx.roundRect(x - 55, y - hh - 24, 110, 20, 6);
        ctx.fill();
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`📍 (${x}, ${y})`, x, y - hh - 10);

    } else if (isHovered) {
        let hw = cat.w / 2 + 4;
        let hh = cat.h / 2 + 4;
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x - hw, y - hh, hw * 2, hh * 2);
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.beginPath();
        ctx.roundRect(x - 45, y - hh - 20, 90, 18, 5);
        ctx.fill();

        ctx.fillStyle = "#facc15";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`✋ Tut & Sürükle`, x, y - hh - 7);
    }

    ctx.restore();
}

function drawCityWindow(ctx, x, y, w, h) {
    ctx.fillStyle = "#0284c7";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.beginPath();
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.stroke();
}

function drawPoolLounger(ctx, x, y) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x, y, 40, 16);
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(x + 4, y + 3, 10, 10);
}

function drawSunUmbrella(ctx, x, y) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(x, y, 22, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke();
}

function drawMiniFruitTree(ctx, x, y) {
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(x - 4, y + 10, 8, 20);
    ctx.fillStyle = "#166534";
    ctx.beginPath(); ctx.arc(x, y + 6, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x - 6, y + 2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + 8, 3, 0, Math.PI * 2); ctx.fill();
}

// --- 8. SOCKET DINLEYICILERI (HOUSING) ---
if (typeof socket !== 'undefined') {
    socket.on('housesUpdate', (houses) => {
        window.myHouses = houses || {};
        if (document.getElementById('realEstateModal')?.style.display === 'flex') {
            renderRealEstateUI();
        }
    });

    socket.on('houseDataUpdate', (house) => {
        if (house) {
            window.currentViewingHouse = house;
            let me = (window.myUsername || (typeof myUsername !== 'undefined' ? myUsername : '') || (typeof players !== 'undefined' && players[myId]?.name) || '').toLowerCase();
            if (house.owner && house.owner.toLowerCase() === me) {
                window.myHouseData = house;
                if (!window.myHouses) window.myHouses = {};
                window.myHouses[house.type] = house;
            }
        }
        updateHouseEditButtonVisibility();
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
    });

    socket.on('furnitureInventoryUpdate', (inv) => {
        window.myFurnitureInventory = inv || [];
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
        if (document.getElementById('furnitureMarketModal')?.style.display === 'flex') {
            renderFurnitureMarketUI();
        }
    });

    socket.on('furnitureBuySuccess', (data) => {
        if (typeof playSound === 'function') playSound('coin');
        let item = FURNITURE_CATALOG[data.itemId];
        let name = item ? item.name : data.itemId;
        let emoji = item ? item.emoji : '🛋️';
        if (typeof showSocialNotificationToast === 'function') {
            showSocialNotificationToast(emoji, 'Satın Alındı! 🎉', `${name} satın alındı! Envanterinize eklendi.`);
        }
        renderFurnitureMarketUI();
    });

    socket.on('availableHousesList', (data) => {
        renderAvailableHousesUI(data);
    });

    socket.on('houseFurnitureSync', (furnitureList) => {
        if (window.currentViewingHouse) {
            window.currentViewingHouse.furniture = furnitureList || [];
        }
        if (window.myHouseData && isCurrentlyInMyHouse()) {
            window.myHouseData.furniture = furnitureList || [];
            if (window.myHouses && window.currentViewingHouse?.type) {
                window.myHouses[window.currentViewingHouse.type].furniture = furnitureList || [];
            }
        }
        if (document.getElementById('furniturePlacementModal')?.style.display === 'flex') {
            renderFurniturePlacementUI();
        }
    });

    socket.on('gameError', (msg) => {
        // Hata durumunda satın al butonlarını normale döndür
        let allBuyBtns = document.querySelectorAll('[id^="buyBtn_"]');
        allBuyBtns.forEach(btn => {
            btn.disabled = false;
            btn.innerText = '🛒 Satın Al';
            btn.style.opacity = '1';
        });
    });
}

// Sayfa yüklendiğinde canvas etkileşimlerini başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFurnitureCanvasInteractions);
} else {
    setupFurnitureCanvasInteractions();
}

// public/js/main.js

var socket = window.socket || (typeof io !== 'undefined' ? io() : null);
window.socket = socket;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let myId = null;
let players = {};
let currentRoom = "sokak";

// WASD Hareket Değişkenleri (Akıcı Yürüyüş)
let keys = { w: false, a: false, s: false, d: false };

// --- 1. ŞİFRE VE İSİM GİRİŞ İŞLEMLERİ ---
window.selectedGender = 'male';

function selectLoginGender(gender) {
    window.selectedGender = gender;
    const btnMale = document.getElementById('genderBtnMale');
    const btnFemale = document.getElementById('genderBtnFemale');
    if (gender === 'female') {
        if (btnFemale) {
            btnFemale.style.border = '2px solid #ec4899';
            btnFemale.style.background = 'rgba(236, 72, 153, 0.25)';
            btnFemale.style.color = 'white';
        }
        if (btnMale) {
            btnMale.style.border = '2px solid rgba(255,255,255,0.15)';
            btnMale.style.background = 'rgba(15, 23, 42, 0.6)';
            btnMale.style.color = '#94a3b8';
        }
    } else {
        if (btnMale) {
            btnMale.style.border = '2px solid #38bdf8';
            btnMale.style.background = 'rgba(56, 189, 248, 0.25)';
            btnMale.style.color = 'white';
        }
        if (btnFemale) {
            btnFemale.style.border = '2px solid rgba(255,255,255,0.15)';
            btnFemale.style.background = 'rgba(15, 23, 42, 0.6)';
            btnFemale.style.color = '#94a3b8';
        }
    }
}

function attemptLogin() {
    let pass = document.getElementById('passwordInput').value;
    let name = document.getElementById('usernameInput').value.trim();
    if (name === "") { alert("Lütfen oyunda gözükecek isminizi yazın!"); return; }
    socket.emit('login', { pass: pass, name: name, gender: window.selectedGender || 'male' });
}

let myMoney = 100;
let myInventory = {
    hats: ['none', 'bere'],
    faces: ['none'],
    skins: ['#facc15'],
    shirts: ['#3b82f6'],
    shoes: ['none', 'sneakers'],
    props: ['none']
};
let myAvatar = {
    hat: 'bere',
    face: 'none',
    skinColor: '#facc15',
    color: '#3b82f6',
    heldItem: 'none',
    shoes: 'sneakers'
};

const WARDROBE_CATALOG = {
    hats: [
        { id: 'none', name: 'Yok', cost: 0, icon: '🚫' },
        { id: 'bere', name: 'Kırmızı Bere', cost: 200, icon: '🔴', gender: 'male' },
        { id: 'kasket', name: 'Kıraathane Kasketi', cost: 260, icon: '🧢', gender: 'male' },
        { id: 'fes', name: 'Osmanlı Fesi', cost: 320, icon: '🏮', gender: 'male' },
        { id: 'cowboy', name: 'Kovboy Şapkası', cost: 380, icon: '🤠', gender: 'male' },
        // Kadın Saç Modelleri & Şapkalar
        { id: 'hair_long', name: 'Uzun Düz Saç', cost: 260, icon: '👩', gender: 'female' },
        { id: 'hair_wavy', name: 'Dalgalı Saç', cost: 320, icon: '💇‍♀️', gender: 'female' },
        { id: 'hair_ponytail', name: 'At Kuyruğu', cost: 280, icon: '👱‍♀️', gender: 'female' },
        { id: 'hair_braids', name: 'Örgülü Saç', cost: 290, icon: '👧', gender: 'female' },
        { id: 'hair_bob', name: 'Küt Kesim Saç', cost: 240, icon: '👩‍🦰', gender: 'female' },
        { id: 'hair_hijab', name: 'Şık Başörtüsü', cost: 250, icon: '🧕', gender: 'female' },
        { id: 'beret_pink', name: 'Pembe Fransız Bere', cost: 260, icon: '🌸', gender: 'female' },
        { id: 'crown', name: 'Prenses Tacı', cost: 480, icon: '👑', gender: 'female' }
    ],
    faces: [
        { id: 'none', name: 'Sade', cost: 0, icon: '🙂' },
        { id: 'mustache', name: 'Pala Bıyık', cost: 240, icon: '🥸', gender: 'male' },
        { id: 'sunglasses', name: 'Havalı Gözlük', cost: 300, icon: '🕶️' },
        { id: 'beard', name: 'Kirli Sakal', cost: 360, icon: '🧔', gender: 'male' }
    ],
    skins: [
        { id: '#facc15', name: 'Klasik Sarı', cost: 0, color: '#facc15' },
        { id: '#ffd1a4', name: 'Açık Ten', cost: 240, color: '#ffd1a4' },
        { id: '#d2996c', name: 'Buğday Ten', cost: 300, color: '#d2996c' },
        { id: '#8d5524', name: 'Esmer Ten', cost: 360, color: '#8d5524' }
    ],
    shirts: [
        // Erkek / Unisex Tişört & Üstler
        { id: '#3b82f6', name: 'Mavi Tişört', cost: 0, color: '#3b82f6' },
        { id: '#ef4444', name: 'Kırmızı Tişört', cost: 100, color: '#ef4444' },
        { id: '#10b981', name: 'Yeşil Tişört', cost: 100, color: '#10b981' },
        { id: '#8b5cf6', name: 'Mor Tişört', cost: 100, color: '#8b5cf6' },
        { id: '#f59e0b', name: 'Turuncu Tişört', cost: 100, color: '#f59e0b' },
        { id: '#0f172a', name: 'Siyah Tişört', cost: 100, color: '#0f172a' },
        { id: 'polo', name: 'Beyaz Polo Yaka', cost: 160, color: '#f8fafc', icon: '👔' },
        { id: 'hoodie', name: 'Oversize Hoodie', cost: 220, color: '#6366f1', icon: '🧥' },
        { id: 'leather', name: 'Deri Ceket', cost: 350, color: '#18181b', icon: '🥼' },
        // Kadın Elbiseleri & Etekler
        { id: 'dress_pink', name: 'Pembe Çiçekli Elbise', cost: 280, color: '#ec4899', icon: '👗', gender: 'female' },
        { id: 'dress_black', name: 'Zarif Siyah Gece Elbisesi', cost: 380, color: '#18181b', icon: '👗', gender: 'female' },
        { id: 'dress_red', name: 'Kırmızı Kokteyl Elbisesi', cost: 310, color: '#e11d48', icon: '💃', gender: 'female' },
        { id: 'skirt_crop', name: 'Pileli Etek & Crop', cost: 260, color: '#f43f5e', icon: '👚', gender: 'female' },
        { id: 'skirt_denim', name: 'Kot Etek Kombini', cost: 240, color: '#38bdf8', icon: '🎽', gender: 'female' }
    ],
    shoes: [
        { id: 'none', name: 'Yalınayak', cost: 0, icon: '🦶' },
        { id: 'sneakers', name: 'Spor Sneaker', cost: 180, icon: '👟' },
        { id: 'classic', name: 'Kösele Klasik Ayakkabı', cost: 240, icon: '👞' },
        { id: 'boots', name: 'Kışlık Bot', cost: 280, icon: '🥾' },
        { id: 'heels', name: 'Topuklu Stiletto', cost: 320, icon: '👠', gender: 'female' },
        { id: 'flats', name: 'Babet & Düz Ayakkabı', cost: 190, icon: '🥿', gender: 'female' }
    ],
    props: [
        { id: 'none', name: 'Boş El', cost: 0, icon: '✋' },
        { id: 'nargile', name: 'Tüten Nargile', cost: 700, icon: '💨' },
        { id: 'cay', name: 'İnce Belli Çay', cost: 100, icon: '☕' },
        { id: 'kahve', name: 'Közde Türk Kahvesi', cost: 110, icon: '☕' },
        { id: 'balon', name: 'Uçan Balon', cost: 120, icon: '🎈' },
        { id: 'gazoz', name: 'Nostaljik Gazoz', cost: 140, icon: '🍾' },
        { id: 'tespih', name: 'Kehribar Tespih', cost: 400, icon: '📿' },
        { id: 'olta', name: 'Balıkçı Oltası', cost: 200, icon: '🎣' },
        { id: 'baglama', name: 'Anadolu Bağlaması', cost: 220, icon: '🪕' },
        { id: 'asagold', name: 'Yıldızlı Büyü Asası', cost: 260, icon: '🪄' },
        { id: 'kupa', name: 'Şampiyonluk Kupası', cost: 290, icon: '🏆' }
    ]
};

let currentWardrobeTab = 'hats';
let isWardrobeOpen = false;

function updateMoneyDisplay(amount) {
    myMoney = amount;
    window.myMoney = amount;
    const badge = document.getElementById('moneyDisplay');
    const uBadge = document.getElementById('userMoneyDisplay');
    const wBadge = document.getElementById('wardrobeMoneyDisplay');
    const mBadge = document.getElementById('marketMoneyDisplay');
    if (badge) badge.innerText = myMoney;
    if (uBadge) uBadge.innerText = myMoney;
    if (wBadge) wBadge.innerText = myMoney;
    if (mBadge) mBadge.innerText = myMoney;
}

let previewAvatar = {
    hat: 'bere',
    face: 'none',
    skinColor: '#facc15',
    color: '#3b82f6',
    heldItem: 'none',
    shoes: 'sneakers'
};

function isItemOwned(category, id) {
    if (id === 'none' || id === '#facc15' || id === '#3b82f6') return true;
    let normCat = category.endsWith('s') ? category : (category + 's');
    let key = `${normCat}_${id}`;
    if (normCat === 'props') {
        let propInv = window.myPropInventory || {};
        return (propInv[key] && propInv[key] > 0);
    }
    if (normCat === 'shoes' && (id === 'none' || id === 'sneakers' || id === 'flats')) return true;
    if (Array.isArray(myInventory)) {
        return myInventory.includes(key);
    } else if (myInventory && myInventory[normCat]) {
        return myInventory[normCat].includes(id);
    }
    return false;
}

function openWardrobe() {
    isWardrobeOpen = true;
    previewAvatar = { ...myAvatar };
    renderWardrobeUI();
    const modal = document.getElementById('wardrobeModal');
    if (modal) modal.style.display = 'flex';
    requestAnimationFrame(avatarPreviewLoop);
}

function closeWardrobe() {
    isWardrobeOpen = false;
    previewAvatar = { ...myAvatar };
    const modal = document.getElementById('wardrobeModal');
    if (modal) modal.style.display = 'none';
}

function switchWardrobeTab(tabName) {
    currentWardrobeTab = tabName;
    ['tabHats', 'tabFaces', 'tabSkins', 'tabShirts', 'tabShoes', 'tabProps'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    if (tabName === 'hats') document.getElementById('tabHats')?.classList.add('active');
    if (tabName === 'faces') document.getElementById('tabFaces')?.classList.add('active');
    if (tabName === 'skins') document.getElementById('tabSkins')?.classList.add('active');
    if (tabName === 'shirts') document.getElementById('tabShirts')?.classList.add('active');
    if (tabName === 'shoes') document.getElementById('tabShoes')?.classList.add('active');
    if (tabName === 'props') document.getElementById('tabProps')?.classList.add('active');
    renderWardrobeActiveGrid();
}

function previewWardrobeItem(category, id) {
    if (category === 'hats') previewAvatar.hat = id;
    else if (category === 'faces') previewAvatar.face = id;
    else if (category === 'skins') previewAvatar.skinColor = id;
    else if (category === 'shirts') previewAvatar.color = id;
    else if (category === 'shoes') previewAvatar.shoes = id;
    else if (category === 'props') previewAvatar.heldItem = id;
    renderWardrobeUI();
}

function renderWardrobeUI() {
    updateMoneyDisplay(myMoney);

    // Rozetleri ve isimleri güncelle
    const pName = players[myId] ? players[myId].name : "Kivre";
    const nameElem = document.getElementById('previewPlayerName');
    if (nameElem) nameElem.innerText = pName;

    const hatItem = WARDROBE_CATALOG.hats.find(h => h.id === previewAvatar.hat);
    const faceItem = WARDROBE_CATALOG.faces.find(f => f.id === previewAvatar.face);
    const skinItem = WARDROBE_CATALOG.skins.find(s => s.id === previewAvatar.skinColor);
    const shirtItem = WARDROBE_CATALOG.shirts.find(c => c.id === previewAvatar.color);
    const shoeItem = (WARDROBE_CATALOG.shoes || []).find(s => s.id === previewAvatar.shoes);
    const propItem = WARDROBE_CATALOG.props.find(p => p.id === previewAvatar.heldItem);

    const hBadge = document.getElementById('currentHatBadge');
    const fBadge = document.getElementById('currentFaceBadge');
    const sBadge = document.getElementById('currentSkinBadge');
    const cBadge = document.getElementById('currentShirtBadge');
    const shBadge = document.getElementById('currentShoeBadge');
    const pBadge = document.getElementById('currentPropBadge');

    if (hBadge) hBadge.innerText = hatItem ? `${hatItem.icon} ${hatItem.name}` : 'Yok';
    if (fBadge) fBadge.innerText = faceItem ? `${faceItem.icon} ${faceItem.name}` : 'Sade';
    if (sBadge) sBadge.innerText = skinItem ? skinItem.name : 'Klasik Sarı';
    if (cBadge) cBadge.innerText = shirtItem ? shirtItem.name : 'Mavi Tişört';
    if (shBadge) shBadge.innerText = shoeItem ? `${shoeItem.icon} ${shoeItem.name}` : 'Sneaker';
    if (pBadge) pBadge.innerText = propItem ? `${propItem.icon} ${propItem.name}` : 'Boş El';

    renderWardrobeActiveGrid();
}

function renderWardrobeActiveGrid() {
    const grid = document.getElementById('wardrobeActiveGrid');
    if (!grid) return;

    let userGender = window.myGender || window.selectedGender || 'male';
    let allItems = WARDROBE_CATALOG[currentWardrobeTab] || [];
    let items = allItems.filter(item => {
        if (!item.gender) return true;
        return item.gender === userGender;
    });

    grid.innerHTML = items.map(item => {
        let isEquippedActive = false;
        let isBeingPreviewed = false;

        if (currentWardrobeTab === 'hats') {
            isEquippedActive = (myAvatar.hat === item.id);
            isBeingPreviewed = (previewAvatar.hat === item.id);
        } else if (currentWardrobeTab === 'faces') {
            isEquippedActive = (myAvatar.face === item.id);
            isBeingPreviewed = (previewAvatar.face === item.id);
        } else if (currentWardrobeTab === 'skins') {
            isEquippedActive = (myAvatar.skinColor === item.id);
            isBeingPreviewed = (previewAvatar.skinColor === item.id);
        } else if (currentWardrobeTab === 'shirts') {
            isEquippedActive = (myAvatar.color === item.id);
            isBeingPreviewed = (previewAvatar.color === item.id);
        } else if (currentWardrobeTab === 'shoes') {
            isEquippedActive = (myAvatar.shoes === item.id);
            isBeingPreviewed = (previewAvatar.shoes === item.id);
        } else if (currentWardrobeTab === 'props') {
            isEquippedActive = (myAvatar.heldItem === item.id);
            isBeingPreviewed = (previewAvatar.heldItem === item.id);
        }

        let owned = isItemOwned(currentWardrobeTab, item.id);

        let visualHtml = "";
        if (item.icon) {
            visualHtml = `<div style="font-size:32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">${item.icon}</div>`;
        } else if (item.color) {
            let isRound = currentWardrobeTab === 'skins';
            visualHtml = `<div style="width:36px; height:36px; border-radius:${isRound ? '50%' : '8px'}; background:${item.color}; border:2px solid rgba(255,255,255,0.6); box-shadow:0 2px 6px rgba(0,0,0,0.4);"></div>`;
        }

        let buttonHtml = "";
        let propCount = 0;
        if (currentWardrobeTab === 'props' && item.id !== 'none') {
            let pKey = `props_${item.id}`;
            propCount = (window.myPropInventory && window.myPropInventory[pKey]) || 0;
            if (isEquippedActive) {
                buttonHtml = `
                    <button onclick="event.stopPropagation(); if (typeof equipPropItem==='function') equipPropItem('${pKey}')" style="width:100%; padding:5px; border-radius:6px; background:rgba(56,189,248,0.25); border:1px solid #38bdf8; color:#38bdf8; font-weight:800; font-size:11px; cursor:pointer;">🖐️ Elde (Bırak)</button>
                    <button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; margin-top:3px; padding:4px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:10px; cursor:pointer;">+1 Al (${item.cost} TL)</button>
                `;
            } else if (propCount > 0) {
                buttonHtml = `
                    <button onclick="event.stopPropagation(); if (typeof equipPropItem==='function') equipPropItem('${pKey}')" style="width:100%; padding:5px; border-radius:6px; background:linear-gradient(135deg, #10b981, #059669); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer;">🖐️ Eline Al</button>
                    <button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; margin-top:3px; padding:4px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:10px; cursor:pointer;">+1 Al (${item.cost} TL)</button>
                `;
            } else {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('props', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.3);">🛒 Satın Al (${item.cost} TL)</button>`;
            }
        } else {
            if (isEquippedActive) {
                buttonHtml = `<button disabled style="width:100%; padding:6px; border-radius:6px; background:rgba(56,189,248,0.25); border:1px solid #38bdf8; color:#38bdf8; font-weight:800; font-size:11px; cursor:default;">⭐ Üzerinde</button>`;
            } else if (owned) {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('${currentWardrobeTab}', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #10b981, #059669); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.3);">✅ Kuşan</button>`;
            } else {
                buttonHtml = `<button onclick="event.stopPropagation(); buyWardrobeItem('${currentWardrobeTab}', '${item.id}')" style="width:100%; padding:6px; border-radius:6px; background:linear-gradient(135deg, #f59e0b, #d97706); border:none; color:white; font-weight:800; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(245,158,11,0.3);">🛒 Satın Al (${item.cost} TL)</button>`;
            }
        }

        let previewBadge = isBeingPreviewed ? `<div style="font-size:10px; color:#facc15; font-weight:bold; margin-top:2px;">👀 Deneniyor</div>` : '';
        let countTag = propCount > 0 ? `<span style="background:linear-gradient(135deg, #f59e0b, #d97706); color:white; font-size:10px; font-weight:800; padding:1px 6px; border-radius:8px; margin-left:4px;">x${propCount}</span>` : '';

        return `
        <div class="wardrobe-item-card ${isEquippedActive ? 'equipped' : ''} ${isBeingPreviewed ? 'previewing' : ''}" 
             onclick="previewWardrobeItem('${currentWardrobeTab}', '${item.id}')" 
             style="cursor:pointer; padding:10px; background:rgba(15,23,42,0.65); display:flex; flex-direction:column; justify-content:space-between; align-items:center; min-height:125px;">
            ${visualHtml}
            <div style="font-size:12px; font-weight:700; margin-top:4px; color:#f8fafc; text-align:center;">${item.name} ${countTag}</div>
            ${previewBadge}
            <div style="width:100%; margin-top:6px;">${buttonHtml}</div>
        </div>`;
    }).join('');
}

function buyWardrobeItem(category, id) {
    socket.emit('buyWardrobeItem', { category: category, id: id });
}

// --- AVATAR ÇİZİM MODÜLLERİ (KADIN/ERKEK SAÇLAR, ELBİSELER, AYAKKABILAR) ---

function drawAvatarLegsAndShoes(targetCtx, pX, pY, legSwing = 0, skinColor = "#ffd1a4", shoeType = "sneakers", isSkirt = false) {
    // Bacaklar
    targetCtx.fillStyle = isSkirt ? (skinColor || "#ffd1a4") : "#1e293b";
    targetCtx.fillRect(pX - 8, pY + 12 - legSwing, 5, 8 + legSwing);
    targetCtx.fillRect(pX + 3, pY + 12 + legSwing, 5, 8 - legSwing);

    // Ayakkabılar
    let leftShoeY = pY + 18 - legSwing;
    let rightShoeY = pY + 18 + legSwing;

    if (shoeType === 'classic') {
        // Kösele Klasik Ayakkabı (Cilalı siyah/koyu kahve)
        targetCtx.fillStyle = "#1e1e1e";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, leftShoeY, 7, 5, [2, 3, 1, 1]); targetCtx.fill();
        targetCtx.fillStyle = "rgba(255,255,255,0.4)";
        targetCtx.fillRect(pX - 7, leftShoeY + 1, 2.5, 1);

        targetCtx.fillStyle = "#1e1e1e";
        targetCtx.beginPath(); targetCtx.roundRect(pX + 2, rightShoeY, 7, 5, [3, 2, 1, 1]); targetCtx.fill();
        targetCtx.fillStyle = "rgba(255,255,255,0.4)";
        targetCtx.fillRect(pX + 4, rightShoeY + 1, 2.5, 1);
    } else if (shoeType === 'boots') {
        // Kışlık Bot (Tırtıklı kalın taban)
        targetCtx.fillStyle = "#78350f";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, leftShoeY - 2, 7, 6, 2); targetCtx.fill();
        targetCtx.fillStyle = "#292524";
        targetCtx.fillRect(pX - 9, leftShoeY + 3, 7.5, 2.5);

        targetCtx.fillStyle = "#78350f";
        targetCtx.beginPath(); targetCtx.roundRect(pX + 2, rightShoeY - 2, 7, 6, 2); targetCtx.fill();
        targetCtx.fillStyle = "#292524";
        targetCtx.fillRect(pX + 1.5, rightShoeY + 3, 7.5, 2.5);
    } else if (shoeType === 'heels') {
        // Topuklu Stiletto
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath(); targetCtx.ellipse(pX - 5, leftShoeY + 1, 3.5, 2.5, -0.2, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillRect(pX - 8, leftShoeY, 1.5, 5); // topuk ince çivi

        targetCtx.beginPath(); targetCtx.ellipse(pX + 5, rightShoeY + 1, 3.5, 2.5, 0.2, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillRect(pX + 6.5, rightShoeY, 1.5, 5);
    } else if (shoeType === 'flats') {
        // Babet & Düz Ayakkabı (Pembe fiyonklu)
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath(); targetCtx.ellipse(pX - 5.5, leftShoeY + 2, 3.5, 2, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.arc(pX - 6, leftShoeY + 1.5, 1.2, 0, Math.PI * 2); targetCtx.fill();

        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath(); targetCtx.ellipse(pX + 5.5, rightShoeY + 2, 3.5, 2, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.arc(pX + 6, rightShoeY + 1.5, 1.2, 0, Math.PI * 2); targetCtx.fill();
    } else if (shoeType === 'none') {
        // Çıplak ayak
        targetCtx.fillStyle = skinColor || "#ffd1a4";
        targetCtx.beginPath(); targetCtx.ellipse(pX - 5.5, leftShoeY + 2, 3, 1.8, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.beginPath(); targetCtx.ellipse(pX + 5.5, rightShoeY + 2, 3, 1.8, 0, 0, Math.PI * 2); targetCtx.fill();
    } else {
        // Varsayılan: Spor Sneaker
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, leftShoeY + 2, 7, 3, 1); targetCtx.fill();
        targetCtx.fillStyle = "#38bdf8";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, leftShoeY, 6.5, 3, [2, 2, 0, 0]); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(pX - 7, leftShoeY + 1, 3, 1);

        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.roundRect(pX + 2, rightShoeY + 2, 7, 3, 1); targetCtx.fill();
        targetCtx.fillStyle = "#38bdf8";
        targetCtx.beginPath(); targetCtx.roundRect(pX + 2.5, rightShoeY, 6.5, 3, [2, 2, 0, 0]); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(pX + 4.5, rightShoeY + 1, 3, 1);
    }
}

function drawAvatarBodyAndClothes(targetCtx, pX, pY, shirtColor = "#3b82f6", skinColor = "#ffd1a4") {
    if (shirtColor === 'dress_pink') {
        // Pembe Çiçekli Elbise
        targetCtx.fillStyle = "#f472b6";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        // Etek kısmı
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 14, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 14, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(pX - 13, pY + 13, 26, 1.5); // Fırfır
    } else if (shirtColor === 'dress_black') {
        // Zarif Gece Elbisesi
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        // Etek
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 13, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 13, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
        // Altın Kemer
        targetCtx.fillStyle = "#facc15";
        targetCtx.fillRect(pX - 9, pY, 18, 2);
    } else if (shirtColor === 'dress_red') {
        // Kırmızı Kokteyl Elbisesi
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 12, [4, 4, 0, 0]); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 14, pY + 14);
        targetCtx.quadraticCurveTo(pX, pY + 16, pX + 14, pY + 14);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'skirt_crop') {
        // Beyaz Crop + Pileli Pembe Mini Etek
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 9, [4, 4, 0, 0]); targetCtx.fill();
        // Göbek deliği ten
        targetCtx.fillStyle = skinColor || "#ffd1a4";
        targetCtx.fillRect(pX - 8, pY - 1, 16, 3);
        // Etek
        targetCtx.fillStyle = "#f43f5e";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 2);
        targetCtx.lineTo(pX - 13, pY + 12);
        targetCtx.lineTo(pX + 13, pY + 12);
        targetCtx.lineTo(pX + 9, pY + 2);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'skirt_denim') {
        // Kot Etek & Üst
        targetCtx.fillStyle = "#f1f5f9";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 9, pY - 10, 18, 11, [4, 4, 0, 0]); targetCtx.fill();
        // Denim Etek
        targetCtx.fillStyle = "#2563eb";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY + 1);
        targetCtx.lineTo(pX - 12, pY + 12);
        targetCtx.lineTo(pX + 12, pY + 12);
        targetCtx.lineTo(pX + 9, pY + 1);
        targetCtx.closePath();
        targetCtx.fill();
    } else if (shirtColor === 'polo') {
        // Polo Yaka
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        targetCtx.strokeStyle = "rgba(0,0,0,0.15)"; targetCtx.lineWidth = 1; targetCtx.stroke();
        // Yaka Plaketi
        targetCtx.fillStyle = "#3b82f6";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 5, pY - 10); targetCtx.lineTo(pX, pY - 4); targetCtx.lineTo(pX + 5, pY - 10);
        targetCtx.stroke();
    } else if (shirtColor === 'hoodie') {
        // Kapüşonlu Sweat
        targetCtx.fillStyle = "#6366f1";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        // Kanguru cep
        targetCtx.fillStyle = "#4f46e5";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 6, pY + 3, 12, 6, 2); targetCtx.fill();
        // İpler
        targetCtx.strokeStyle = "#ffffff"; targetCtx.lineWidth = 1;
        targetCtx.beginPath(); targetCtx.moveTo(pX - 3, pY - 8); targetCtx.lineTo(pX - 3, pY - 2); targetCtx.stroke();
        targetCtx.beginPath(); targetCtx.moveTo(pX + 3, pY - 8); targetCtx.lineTo(pX + 3, pY - 2); targetCtx.stroke();
    } else if (shirtColor === 'leather') {
        // Deri Ceket
        targetCtx.fillStyle = "#18181b";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        // Fermuar & Yaka
        targetCtx.strokeStyle = "#94a3b8"; targetCtx.lineWidth = 1.2;
        targetCtx.beginPath(); targetCtx.moveTo(pX - 2, pY - 9); targetCtx.lineTo(pX + 3, pY + 11); targetCtx.stroke();
    } else {
        // Klasik Tişört
        targetCtx.fillStyle = shirtColor || "#3b82f6";
        targetCtx.beginPath(); targetCtx.roundRect(pX - 10, pY - 10, 20, 22, 5); targetCtx.fill();
        targetCtx.strokeStyle = "rgba(255,255,255,0.7)"; targetCtx.lineWidth = 1.5; targetCtx.stroke();
    }
}

function drawAvatarHairAndHats(targetCtx, pX, pY, hatType = "none", facing = "down") {
    if (hatType === 'bere') {
        // Kırmızı Bere & Ponpon
        targetCtx.fillStyle = "#e11d48";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 24, 8, Math.PI, 0); targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 26, 3, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'fes') {
        // Osmanlı Fesi
        targetCtx.fillStyle = "#991b1b";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 7, pY - 20); targetCtx.lineTo(-5 + pX, pY - 30);
        targetCtx.lineTo(5 + pX, pY - 30); targetCtx.lineTo(7 + pX, pY - 20);
        targetCtx.closePath(); targetCtx.fill();
        targetCtx.strokeStyle = "#0f172a"; targetCtx.lineWidth = 1.5;
        targetCtx.beginPath(); targetCtx.moveTo(pX, pY - 30); targetCtx.quadraticCurveTo(pX + 7, pY - 28, pX + 8, pY - 21); targetCtx.stroke();
        targetCtx.fillStyle = "#0f172a"; targetCtx.beginPath(); targetCtx.arc(pX + 8, pY - 21, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'kasket') {
        // Kasket
        targetCtx.fillStyle = "#334155";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 23, 9, Math.PI, 0); targetCtx.fill();
        let vDir = (facing === 'left') ? -6 : (facing === 'right') ? 6 : 0;
        targetCtx.fillStyle = "#1e293b";
        targetCtx.beginPath(); targetCtx.ellipse(pX + vDir, pY - 23, 9, 3, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#64748b";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 26, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'cowboy') {
        // Kovboy Şapkası
        targetCtx.fillStyle = "#78350f";
        targetCtx.beginPath(); targetCtx.ellipse(pX, pY - 22, 14, 4, 0, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.beginPath(); targetCtx.roundRect(pX - 6, pY - 31, 12, 10, [4, 4, 0, 0]); targetCtx.fill();
        targetCtx.fillStyle = "#f59e0b"; targetCtx.fillRect(pX - 6, pY - 23, 12, 2);
    } else if (hatType === 'hair_long') {
        // Uzun Düz Saç (Omuzlara dökülen)
        targetCtx.fillStyle = "#451a03";
        // Sol ve sağ dökülen saç tutamları
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY - 20); targetCtx.quadraticCurveTo(pX - 13, pY - 2, pX - 10, pY + 8);
        targetCtx.lineTo(pX - 6, pY + 8); targetCtx.quadraticCurveTo(pX - 7, pY - 2, pX - 5, pY - 14);
        targetCtx.closePath(); targetCtx.fill();

        targetCtx.beginPath();
        targetCtx.moveTo(pX + 9, pY - 20); targetCtx.quadraticCurveTo(pX + 13, pY - 2, pX + 10, pY + 8);
        targetCtx.lineTo(pX + 6, pY + 8); targetCtx.quadraticCurveTo(pX + 7, pY - 2, pX + 5, pY - 14);
        targetCtx.closePath(); targetCtx.fill();
        // Üst kubbe ve kakül
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 9, pY - 21); targetCtx.quadraticCurveTo(pX - 2, pY - 17, pX, pY - 22);
        targetCtx.quadraticCurveTo(pX + 3, pY - 17, pX + 9, pY - 21);
        targetCtx.lineTo(pX + 8, pY - 24); targetCtx.lineTo(pX - 8, pY - 24);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_wavy') {
        // Dalgalı Saç
        targetCtx.fillStyle = "#78350f";
        // Dalgalı yan bukleler
        targetCtx.beginPath();
        targetCtx.arc(pX - 10, pY - 12, 4, 0, Math.PI * 2);
        targetCtx.arc(pX - 11, pY - 5, 4.5, 0, Math.PI * 2);
        targetCtx.arc(pX - 9, pY + 3, 4, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.arc(pX + 10, pY - 12, 4, 0, Math.PI * 2);
        targetCtx.arc(pX + 11, pY - 5, 4.5, 0, Math.PI * 2);
        targetCtx.arc(pX + 9, pY + 3, 4, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
    } else if (hatType === 'hair_ponytail') {
        // At Kuyruğu Saç
        targetCtx.fillStyle = "#292524";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        // Saç Tokası
        targetCtx.fillStyle = "#ec4899";
        targetCtx.beginPath(); targetCtx.arc(pX + 8, pY - 25, 3, 0, Math.PI * 2); targetCtx.fill();
        // Sallanan At Kuyruğu
        targetCtx.fillStyle = "#292524";
        targetCtx.beginPath();
        targetCtx.moveTo(pX + 8, pY - 25);
        targetCtx.quadraticCurveTo(pX + 15, pY - 22, pX + 13, pY - 10);
        targetCtx.quadraticCurveTo(pX + 10, pY - 18, pX + 8, pY - 23);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_braids') {
        // İki Yandan Örgülü Saç
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 10.5, Math.PI * 0.95, Math.PI * 2.05); targetCtx.fill();
        // Sol ve sağ örgüler
        [-1, 1].forEach(side => {
            let bx = pX + side * 10;
            targetCtx.fillStyle = "#b45309";
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 12, 3, 0, Math.PI * 2); targetCtx.fill();
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 7, 2.7, 0, Math.PI * 2); targetCtx.fill();
            targetCtx.beginPath(); targetCtx.arc(bx, pY - 2, 2.4, 0, Math.PI * 2); targetCtx.fill();
            // Uç fiyonk
            targetCtx.fillStyle = "#38bdf8";
            targetCtx.beginPath(); targetCtx.arc(bx, pY + 1, 2, 0, Math.PI * 2); targetCtx.fill();
        });
    } else if (hatType === 'hair_bob') {
        // Küt Kesim Bob Saç
        targetCtx.fillStyle = "#1e1b4b";
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 19, 11, Math.PI * 0.85, Math.PI * 2.15);
        targetCtx.lineTo(pX + 10, pY - 10);
        targetCtx.lineTo(pX - 10, pY - 10);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'hair_hijab') {
        // Şık Başörtüsü
        targetCtx.fillStyle = "#0284c7";
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 19, 11.5, Math.PI * 0.85, Math.PI * 2.15); targetCtx.fill();
        // Omuzlara dökülen örtü
        targetCtx.fillStyle = "#38bdf8";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 11, pY - 14);
        targetCtx.quadraticCurveTo(pX - 13, pY - 2, pX - 9, pY + 5);
        targetCtx.lineTo(pX + 9, pY + 5);
        targetCtx.quadraticCurveTo(pX + 13, pY - 2, pX + 11, pY - 14);
        targetCtx.closePath(); targetCtx.fill();
    } else if (hatType === 'beret_pink') {
        // Pembe Fransız Bere
        targetCtx.fillStyle = "#f472b6";
        targetCtx.beginPath(); targetCtx.ellipse(pX - 1, pY - 24, 11, 5, -0.2, 0, Math.PI * 2); targetCtx.fill();
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath(); targetCtx.arc(pX + 1, pY - 27, 2, 0, Math.PI * 2); targetCtx.fill();
    } else if (hatType === 'crown') {
        // Prenses Altın Tacı
        targetCtx.fillStyle = "#f59e0b";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 7, pY - 23);
        targetCtx.lineTo(pX - 7, pY - 29);
        targetCtx.lineTo(pX - 3, pY - 25);
        targetCtx.lineTo(pX, pY - 31);
        targetCtx.lineTo(pX + 3, pY - 25);
        targetCtx.lineTo(pX + 7, pY - 29);
        targetCtx.lineTo(pX + 7, pY - 23);
        targetCtx.closePath(); targetCtx.fill();
        // Mücevherler
        targetCtx.fillStyle = "#ef4444"; targetCtx.fillRect(pX - 1, pY - 29, 2, 2);
        targetCtx.fillStyle = "#38bdf8"; targetCtx.fillRect(pX - 6, pY - 27, 1.5, 1.5);
        targetCtx.fillRect(pX + 4.5, pY - 27, 1.5, 1.5);
    } else {
        // Sade Kısa Saç
        targetCtx.strokeStyle = "#451a03"; targetCtx.lineWidth = 2.5;
        targetCtx.beginPath(); targetCtx.arc(pX, pY - 23, 8, Math.PI * 1.15, Math.PI * 1.85); targetCtx.stroke();
    }
}

function drawAvatarFaceAndEyes(targetCtx, pX, pY, faceType = "none", eyeOffsetX = 0, eyeOffsetY = 0) {
    // Gözler
    targetCtx.fillStyle = "#0f172a";
    targetCtx.fillRect(pX - 4 + eyeOffsetX, pY - 20 + eyeOffsetY, 2.5, 3);
    targetCtx.fillRect(pX + 2 + eyeOffsetX, pY - 20 + eyeOffsetY, 2.5, 3);

    // Yüz Aksesuarları
    if (faceType === 'mustache') {
        targetCtx.fillStyle = "#1e1e1e";
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 6, pY - 14);
        targetCtx.quadraticCurveTo(pX, pY - 12, pX + 6, pY - 14);
        targetCtx.quadraticCurveTo(pX, pY - 16, pX - 6, pY - 14);
        targetCtx.fill();
    } else if (faceType === 'sunglasses') {
        targetCtx.fillStyle = "#0f172a";
        targetCtx.fillRect(pX - 6 + eyeOffsetX, pY - 21 + eyeOffsetY, 5, 4.5);
        targetCtx.fillRect(pX + 1 + eyeOffsetX, pY - 21 + eyeOffsetY, 5, 4.5);
        targetCtx.strokeStyle = "#0f172a";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(pX - 1 + eyeOffsetX, pY - 19 + eyeOffsetY);
        targetCtx.lineTo(pX + 1 + eyeOffsetX, pY - 19 + eyeOffsetY);
        targetCtx.stroke();
        targetCtx.fillStyle = "rgba(255,255,255,0.7)";
        targetCtx.fillRect(pX - 5 + eyeOffsetX, pY - 20 + eyeOffsetY, 1.5, 1.5);
        targetCtx.fillRect(pX + 2 + eyeOffsetX, pY - 20 + eyeOffsetY, 1.5, 1.5);
    } else if (faceType === 'beard') {
        targetCtx.fillStyle = "rgba(30, 20, 10, 0.45)";
        targetCtx.beginPath();
        targetCtx.arc(pX, pY - 16, 7.5, 0, Math.PI);
        targetCtx.fill();
    }
}

function avatarPreviewLoop() {
    if (!isWardrobeOpen) return;
    drawAvatarPreview();
    requestAnimationFrame(avatarPreviewLoop);
}

function drawAvatarPreview() {
    const previewCanvas = document.getElementById('avatarPreviewCanvas');
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    pCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

    let cX = previewCanvas.width / 2;
    let cY = 138;

    // 1. Işıltılı Yuvarlak Podyum
    pCtx.fillStyle = "rgba(56, 189, 248, 0.12)";
    pCtx.beginPath();
    pCtx.ellipse(cX, cY + 20, 52, 16, 0, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
    pCtx.lineWidth = 1.5;
    pCtx.stroke();

    pCtx.fillStyle = "rgba(56, 189, 248, 0.25)";
    pCtx.beginPath();
    pCtx.ellipse(cX, cY + 20, 34, 10, 0, 0, Math.PI * 2);
    pCtx.fill();

    // 2. Karakter (Nefes Alma Canlı Salınımı)
    let idleBob = Math.sin(Date.now() / 260) * 2.5;

    pCtx.save();
    pCtx.translate(cX, cY + idleBob);
    pCtx.scale(1.9, 1.9);

    // Zemin Gölgesi
    pCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
    pCtx.beginPath();
    pCtx.ellipse(0, 22, 12, 5, 0, 0, Math.PI * 2);
    pCtx.fill();

    let activeAv = (isWardrobeOpen && previewAvatar) ? previewAvatar : myAvatar;
    let isDressOrSkirt = (activeAv.color && (activeAv.color.startsWith('dress_') || activeAv.color.startsWith('skirt_')));

    // Bacaklar & Ayakkabılar
    drawAvatarLegsAndShoes(pCtx, 0, 0, 0, activeAv.skinColor, activeAv.shoes, isDressOrSkirt);

    // Gövde & Kıyafet
    drawAvatarBodyAndClothes(pCtx, 0, 0, activeAv.color, activeAv.skinColor);

    // Kafa (Ten Rengi)
    pCtx.fillStyle = activeAv.skinColor || "#ffd1a4";
    pCtx.beginPath();
    pCtx.arc(0, -18, 10, 0, Math.PI * 2);
    pCtx.fill();
    pCtx.strokeStyle = "rgba(0,0,0,0.2)";
    pCtx.lineWidth = 1.2;
    pCtx.stroke();

    // Şapkalar / Saç Modelleri
    drawAvatarHairAndHats(pCtx, 0, 0, activeAv.hat || 'none', 'down');

    // Gözler ve Yüz Aksesuarları
    drawAvatarFaceAndEyes(pCtx, 0, 0, activeAv.face || 'none', 0, 0);

    // Elde Taşınan Eşya (Preview Canlı Çizim)
    drawHeldItem(pCtx, 0, 0, activeAv.heldItem, true);

    pCtx.restore();
}

function drawHeldItem(targetCtx, pX, pY, heldItem, isPreview = false, facing = 'down') {
    if (!heldItem || heldItem === 'none') return;

    targetCtx.save();
    let handX = pX + (isPreview ? 12 : 11);
    let handY = pY + (isPreview ? 2 : 2);

    if (heldItem === 'tespih') {
        // Kehribar Tespih (Sallanan boncuklar ve püskül)
        let swing = Math.sin(Date.now() / 170) * 0.45;
        targetCtx.translate(handX, handY);
        targetCtx.rotate(swing);

        // Boncuk dizisi (halka)
        targetCtx.strokeStyle = "#b45309";
        targetCtx.lineWidth = 1;
        targetCtx.fillStyle = "#f59e0b";

        let beadRadius = isPreview ? 2.2 : 1.8;
        let ringR = isPreview ? 6.5 : 5.5;
        for (let i = 0; i < 9; i++) {
            let angle = (i * 2 * Math.PI) / 9;
            let bx = Math.cos(angle) * ringR;
            let by = Math.sin(angle) * ringR + (isPreview ? 7 : 6);
            targetCtx.beginPath();
            targetCtx.arc(bx, by, beadRadius, 0, Math.PI * 2);
            targetCtx.fill();
            targetCtx.stroke();
        }

        // Gümüş İmame ve Püskül
        targetCtx.strokeStyle = "#94a3b8";
        targetCtx.lineWidth = 1.5;
        targetCtx.beginPath();
        targetCtx.moveTo(0, ringR + (isPreview ? 7 : 6) + beadRadius);
        targetCtx.lineTo(0, ringR + (isPreview ? 15 : 13));
        targetCtx.stroke();
        targetCtx.fillStyle = "#cbd5e1";
        targetCtx.beginPath();
        targetCtx.arc(0, ringR + (isPreview ? 16 : 14), 1.8, 0, Math.PI * 2);
        targetCtx.fill();
    }
    else if (heldItem === 'balon') {
        // Uçan Kırmızı Balon (İple bağlı, havada salınan)
        let balloonSway = Math.sin(Date.now() / 320) * 4;
        let stringEndX = handX + balloonSway;
        let stringEndY = handY - (isPreview ? 36 : 30);

        // Beyaz Balon İpi
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.85)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(handX, handY);
        targetCtx.quadraticCurveTo(handX + balloonSway * 0.5, handY - 15, stringEndX, stringEndY);
        targetCtx.stroke();

        // Kırmızı Balon Gövdesi
        let bW = isPreview ? 9 : 8;
        let bH = isPreview ? 12 : 10;
        targetCtx.fillStyle = "#ef4444";
        targetCtx.beginPath();
        targetCtx.ellipse(stringEndX, stringEndY - bH, bW, bH, 0, 0, Math.PI * 2);
        targetCtx.fill();

        // Balon Düğümü
        targetCtx.fillStyle = "#b91c1c";
        targetCtx.beginPath();
        targetCtx.moveTo(stringEndX - 2, stringEndY);
        targetCtx.lineTo(stringEndX + 2, stringEndY);
        targetCtx.lineTo(stringEndX, stringEndY - 2);
        targetCtx.closePath();
        targetCtx.fill();

        // Balon Parlaması
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.65)";
        targetCtx.beginPath();
        targetCtx.ellipse(stringEndX - bW * 0.35, stringEndY - bH * 1.35, bW * 0.3, bH * 0.35, -0.2, 0, Math.PI * 2);
        targetCtx.fill();
    }
    else if (heldItem === 'cay') {
        // İnce Belli Çay Bardağı
        let teaX = handX, teaY = handY;
        targetCtx.fillStyle = "#f59e0b";
        targetCtx.fillRect(teaX - 4, teaY + 7, 8, 2);
        targetCtx.fillStyle = "rgba(255,255,255,0.7)";
        targetCtx.fillRect(teaX - 3, teaY - 3, 6, 9);
        targetCtx.fillStyle = "#b91c1c";
        targetCtx.fillRect(teaX - 2, teaY, 4, 6);
        let steamY = teaY - 6 - ((Date.now() / 40) % 8);
        targetCtx.strokeStyle = "rgba(255,255,255,0.6)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(teaX - 1, steamY + 4);
        targetCtx.quadraticCurveTo(teaX + 2, steamY + 2, teaX, steamY);
        targetCtx.stroke();
    }
    else if (heldItem === 'olta') {
        // Balıkçı Oltası
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(-0.55);
        targetCtx.fillStyle = "#d97706";
        targetCtx.fillRect(-2, -2, 4, 10);
        targetCtx.fillStyle = "#64748b";
        targetCtx.fillRect(-3, 3, 6, 4);
        targetCtx.strokeStyle = "#1e293b";
        targetCtx.lineWidth = 2;
        targetCtx.beginPath();
        targetCtx.moveTo(0, -2);
        targetCtx.lineTo(0, isPreview ? -36 : -30);
        targetCtx.stroke();
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(0, isPreview ? -36 : -30);
        targetCtx.lineTo(isPreview ? 6 : 5, isPreview ? -10 : -8);
        targetCtx.stroke();
        targetCtx.restore();
    }
    else if (heldItem === 'gazoz') {
        // Nostaljik Yeşil Cam Gazoz Şişesi
        let gX = handX, gY = handY;
        targetCtx.fillStyle = "#16a34a";
        targetCtx.beginPath();
        targetCtx.roundRect(gX - 2.5, gY - 1, 5, 10, 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#15803d";
        targetCtx.fillRect(gX - 1.5, gY - 6, 3, 5);
        targetCtx.fillStyle = "#facc15";
        targetCtx.fillRect(gX - 2, gY - 7.5, 4, 1.5);
        targetCtx.fillStyle = "#ffffff";
        targetCtx.fillRect(gX - 2, gY + 2, 4, 4);
    }
    else if (heldItem === 'nargile') {
        // Geleneksel Dumanlı Nargile (Büyük boy, köz ve yükselen duman animasyonu)
        let now = Date.now();
        let nX = handX + (isPreview ? 8 : 7);
        let nY = handY + (isPreview ? 12 : 10);

        // 1. Şeffaf Cam Şişe / Gövde (Altta, geniş yuvarlak hazne)
        let vaseR = isPreview ? 8.5 : 7;
        targetCtx.fillStyle = "rgba(14, 165, 233, 0.45)"; // Mavi su
        targetCtx.beginPath();
        targetCtx.arc(nX, nY, vaseR, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        targetCtx.lineWidth = 1.2;
        targetCtx.stroke();

        // Cam Parlaması
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.7)";
        targetCtx.beginPath();
        targetCtx.arc(nX - vaseR * 0.4, nY - vaseR * 0.3, vaseR * 0.35, 0, Math.PI * 2);
        targetCtx.fill();

        // Su içindeki minik hava kabarcıkları
        let bubAnim = (now / 180) % (vaseR * 1.5);
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.8)";
        targetCtx.beginPath();
        targetCtx.arc(nX + 1, nY + vaseR * 0.6 - bubAnim, 1.2, 0, Math.PI * 2);
        targetCtx.fill();

        // 2. Pirinç Metal Ser (Gövde borusu)
        let stemTopY = nY - (isPreview ? 24 : 20);
        targetCtx.strokeStyle = "#eab308"; // Parlak pirinç sarısı
        targetCtx.lineWidth = isPreview ? 3 : 2.5;
        targetCtx.beginPath();
        targetCtx.moveTo(nX, nY - vaseR);
        targetCtx.lineTo(nX, stemTopY);
        targetCtx.stroke();

        // Ser süs halkası
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath();
        targetCtx.arc(nX, nY - vaseR - (isPreview ? 6 : 5), isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // 3. Kül Tepsisi (Geniş altın tepsi)
        targetCtx.fillStyle = "#ca8a04";
        targetCtx.beginPath();
        targetCtx.ellipse(nX, stemTopY, isPreview ? 8.5 : 7, isPreview ? 2.8 : 2.2, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // 4. Lüle (Toprak Başlık) ve Yanan Közler
        let headH = isPreview ? 6.5 : 5.5;
        targetCtx.fillStyle = "#9a3412";
        targetCtx.fillRect(nX - (isPreview ? 4 : 3.5), stemTopY - headH, isPreview ? 8 : 7, headH);

        // Kırmızı akkor yanan közler (hafif parıldayan)
        let coalGlow = Math.sin(now / 150) * 0.25 + 0.75;
        targetCtx.fillStyle = `rgba(239, 68, 68, ${coalGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(nX - 2, stemTopY - headH - 1, 2, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = `rgba(245, 158, 11, ${coalGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(nX + 2, stemTopY - headH - 1.5, 1.8, 0, Math.PI * 2);
        targetCtx.fill();

        // 5. Marpuç (Şişeden ele uzanan kıvrımlı hortum)
        targetCtx.strokeStyle = "#991b1b"; // Bordo kadife marpuç
        targetCtx.lineWidth = isPreview ? 2.2 : 1.8;
        targetCtx.beginPath();
        targetCtx.moveTo(nX - vaseR * 0.6, nY - 2);
        targetCtx.quadraticCurveTo(nX - (isPreview ? 12 : 9), nY + 4, handX, handY);
        targetCtx.stroke();

        // Ele oturan ahşap ağızlık (Sipte)
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath();
        targetCtx.arc(handX, handY, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // 6. DUMAN ANİMASYONU (Lüleden ve ağızlıktan yükselen duman bulutları)
        for (let i = 0; i < 4; i++) {
            let cycle = ((now / (650 + i * 160)) + (i * 0.25)) % 1;
            let smX = nX + Math.sin((now / 260) + i * 1.5) * (3 + cycle * 6);
            let smY = (stemTopY - headH - 3) - (cycle * (isPreview ? 28 : 22));
            let smR = (isPreview ? 2.5 : 2) + cycle * (isPreview ? 7 : 5.5);
            let smA = Math.sin(cycle * Math.PI) * 0.42;
            targetCtx.fillStyle = `rgba(241, 245, 249, ${smA})`;
            targetCtx.beginPath();
            targetCtx.arc(smX, smY, smR, 0, Math.PI * 2);
            targetCtx.fill();
        }

        // Ağızlıktan tüten ikinci hafif duman
        let mouthCycle = (now / 1200) % 1;
        if (mouthCycle < 0.7) {
            let mP = mouthCycle / 0.7;
            let mX = handX + mP * (isPreview ? 7 : 5);
            let mY = handY - 2 - mP * (isPreview ? 10 : 8);
            let mA = (1 - mP) * 0.35;
            targetCtx.fillStyle = `rgba(241, 245, 249, ${mA})`;
            targetCtx.beginPath();
            targetCtx.arc(mX, mY, 1.8 + mP * 3, 0, Math.PI * 2);
            targetCtx.fill();
        }
    }
    else if (heldItem === 'baglama') {
        // Anadolu Bağlaması / Saz
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(0.35);

        // Armut Gövde (Tekne)
        let bodyW = isPreview ? 10 : 8.5;
        let bodyH = isPreview ? 14 : 12;
        targetCtx.fillStyle = "#b45309";
        targetCtx.beginPath();
        targetCtx.ellipse(0, 4, bodyW, bodyH, 0, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Ses Deliği
        targetCtx.fillStyle = "#451a03";
        targetCtx.beginPath();
        targetCtx.arc(0, 4, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // Uzun Sap
        let neckH = isPreview ? 30 : 25;
        targetCtx.strokeStyle = "#78350f";
        targetCtx.lineWidth = isPreview ? 3.5 : 2.8;
        targetCtx.beginPath();
        targetCtx.moveTo(0, -bodyH + 6);
        targetCtx.lineTo(0, -neckH);
        targetCtx.stroke();

        // Burgular (Kulaklar)
        targetCtx.fillStyle = "#f8fafc";
        targetCtx.fillRect(-3, -neckH - 4, 6, 4);
        targetCtx.fillStyle = "#1e293b";
        targetCtx.fillRect(-5, -neckH - 3, 2, 2);
        targetCtx.fillRect(3, -neckH - 3, 2, 2);

        // Teller
        targetCtx.strokeStyle = "rgba(255,255,255,0.75)";
        targetCtx.lineWidth = 0.8;
        targetCtx.beginPath();
        targetCtx.moveTo(-1, 8);
        targetCtx.lineTo(-1, -neckH);
        targetCtx.moveTo(1, 8);
        targetCtx.lineTo(1, -neckH);
        targetCtx.stroke();

        targetCtx.restore();
    }
    else if (heldItem === 'asagold') {
        // Yıldızlı Büyü Asası (Parıldayan mücevher ve sihir kıvılcımları)
        let now = Date.now();
        targetCtx.save();
        targetCtx.translate(handX, handY);
        targetCtx.rotate(-0.25);

        let staffH = isPreview ? 32 : 27;

        // Parlak Altın Asa Gövdesi
        targetCtx.strokeStyle = "#d97706";
        targetCtx.lineWidth = isPreview ? 3.5 : 2.8;
        targetCtx.beginPath();
        targetCtx.moveTo(0, 6);
        targetCtx.lineTo(0, -staffH);
        targetCtx.stroke();

        // Asa Başı (Yıldız / Mücevher)
        let starGlow = Math.sin(now / 140) * 0.2 + 0.8;
        targetCtx.fillStyle = `rgba(56, 189, 248, ${starGlow})`;
        targetCtx.beginPath();
        targetCtx.arc(0, -staffH, isPreview ? 6.5 : 5.5, 0, Math.PI * 2);
        targetCtx.fill();
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.arc(0, -staffH, isPreview ? 3 : 2.5, 0, Math.PI * 2);
        targetCtx.fill();

        // Dönen Büyülü Kıvılcımlar
        for (let s = 0; s < 3; s++) {
            let sAngle = (now / 200) + (s * (Math.PI * 2 / 3));
            let sDist = isPreview ? 9 : 7.5;
            let spX = Math.cos(sAngle) * sDist;
            let spY = -staffH + Math.sin(sAngle) * sDist;
            targetCtx.fillStyle = "#facc15";
            targetCtx.beginPath();
            targetCtx.arc(spX, spY, 1.4, 0, Math.PI * 2);
            targetCtx.fill();
        }

        targetCtx.restore();
    }
    else if (heldItem === 'kahve') {
        // Közde Türk Kahvesi (Otantik porselen fincan ve duman)
        let kX = handX, kY = handY;

        // Altın Tabak
        targetCtx.fillStyle = "#ca8a04";
        targetCtx.beginPath();
        targetCtx.ellipse(kX, kY + 6, isPreview ? 7.5 : 6.5, 2, 0, 0, Math.PI * 2);
        targetCtx.fill();

        // Beyaz Fincan
        targetCtx.fillStyle = "#ffffff";
        targetCtx.beginPath();
        targetCtx.roundRect(kX - (isPreview ? 4.5 : 3.5), kY - 2, isPreview ? 9 : 7, isPreview ? 7.5 : 6, 2);
        targetCtx.fill();
        targetCtx.strokeStyle = "#d97706";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // Koyu Kahve Köpüğü
        targetCtx.fillStyle = "#451a03";
        targetCtx.fillRect(kX - (isPreview ? 3.5 : 2.8), kY - 1, isPreview ? 7 : 5.6, 2);

        // Fincan Kulpu
        targetCtx.strokeStyle = "#ca8a04";
        targetCtx.lineWidth = 1.2;
        targetCtx.beginPath();
        targetCtx.arc(kX + (isPreview ? 5 : 4), kY + 1.5, 2.2, -Math.PI * 0.5, Math.PI * 0.5);
        targetCtx.stroke();

        // Yükselen Kahve Buharı
        let steamY = kY - 4 - ((Date.now() / 40) % 8);
        targetCtx.strokeStyle = "rgba(255,255,255,0.6)";
        targetCtx.lineWidth = 1;
        targetCtx.beginPath();
        targetCtx.moveTo(kX - 1, steamY + 4);
        targetCtx.quadraticCurveTo(kX + 2, steamY + 2, kX, steamY);
        targetCtx.stroke();
    }
    else if (heldItem === 'kupa') {
        // Şampiyonluk Altın Kupası (İki kulplu ve kaideli)
        let tX = handX, tY = handY;

        // Kaide (Mermer Taban)
        targetCtx.fillStyle = "#1e293b";
        targetCtx.fillRect(tX - (isPreview ? 5 : 4), tY + 6, isPreview ? 10 : 8, isPreview ? 3 : 2.5);

        // Kupa Ayağı
        targetCtx.fillStyle = "#eab308";
        targetCtx.fillRect(tX - 1.5, tY + 2, 3, 4);

        // Kupa Kasesi
        let cupW = isPreview ? 7 : 6;
        let cupH = isPreview ? 9 : 7.5;
        targetCtx.fillStyle = "#facc15";
        targetCtx.beginPath();
        targetCtx.moveTo(tX - cupW, tY - cupH);
        targetCtx.lineTo(tX + cupW, tY - cupH);
        targetCtx.lineTo(tX + cupW * 0.5, tY + 2);
        targetCtx.lineTo(tX - cupW * 0.5, tY + 2);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.strokeStyle = "#b45309";
        targetCtx.lineWidth = 1;
        targetCtx.stroke();

        // İki Kulp
        targetCtx.strokeStyle = "#ca8a04";
        targetCtx.lineWidth = 1.5;
        targetCtx.beginPath();
        targetCtx.arc(tX - cupW - 1.5, tY - cupH * 0.5, 3, Math.PI * 0.5, Math.PI * 1.5);
        targetCtx.stroke();
        targetCtx.beginPath();
        targetCtx.arc(tX + cupW + 1.5, tY - cupH * 0.5, 3, -Math.PI * 0.5, Math.PI * 0.5);
        targetCtx.stroke();

        // Altın Parıltısı
        targetCtx.fillStyle = "rgba(255, 255, 255, 0.75)";
        targetCtx.beginPath();
        targetCtx.arc(tX - 2, tY - cupH * 0.6, 1.5, 0, Math.PI * 2);
        targetCtx.fill();
    }

    targetCtx.restore();
}

let myUsername = "";

socket.on('loginSuccess', (data) => {
    document.getElementById('loginScreen').style.display = 'none';
    if (data) {
        if (data.username) {
            myUsername = data.username;
            window.myUsername = data.username;
        }
        if (data.gender) {
            window.myGender = data.gender;
        }
        if (data.money !== undefined) updateMoneyDisplay(data.money);
        if (data.inventory) myInventory = data.inventory;
        if (data.avatar) {
            myAvatar = data.avatar;
            if (!myAvatar.shoes) myAvatar.shoes = (window.myGender === 'female' ? 'flats' : 'sneakers');
            if (players[myId]) Object.assign(players[myId], myAvatar);
        }
        if (data.friends) {
            window.myFriendsList = data.friends;
            if (typeof renderFriendsListUI === 'function') renderFriendsListUI();
        }
        if (data.propInventory) {
            window.myPropInventory = data.propInventory;
            if (typeof updatePropsCountBadge === 'function') updatePropsCountBadge();
        }
        if (data.friendRequests) {
            window.myFriendRequests = data.friendRequests;
            if (typeof renderFriendRequestsUI === 'function') renderFriendRequestsUI();
        }
        if (typeof updateFriendshipBadges === 'function') updateFriendshipBadges();
        if (data.houses) {
            window.myHouses = data.houses;
        }
        if (data.house) {
            myHouseData = data.house;
            window.myHouseData = data.house;
        }
        if (data.furnitureInventory) {
            myFurnitureInventory = data.furnitureInventory;
            window.myFurnitureInventory = data.furnitureInventory;
        }
        if (typeof updateHouseEditButtonVisibility === 'function') {
            updateHouseEditButtonVisibility();
        }

        if (data.isAdmin || (data.username && data.username.toLowerCase() === 'yasin')) {
            const adminBtn = document.getElementById('adminPanelNavBtn');
            if (adminBtn) adminBtn.style.display = 'flex';
        }
    }
});

socket.on('moneyUpdate', (money) => {
    updateMoneyDisplay(money);
});

socket.on('wardrobeUpdate', (data) => {
    if (data.inventory) myInventory = data.inventory;
    if (data.avatar) {
        myAvatar = data.avatar;
        if (!myAvatar.shoes) myAvatar.shoes = (window.myGender === 'female' ? 'flats' : 'sneakers');
        previewAvatar = { ...myAvatar };
        if (players[myId]) Object.assign(players[myId], myAvatar);
    }
    renderWardrobeUI();
});

socket.on('playerAvatarChange', (data) => {
    if (players[data.id]) {
        let av = data.avatar || {
            hat: data.hat,
            face: data.face,
            skinColor: data.skinColor,
            color: data.color,
            heldItem: data.heldItem,
            shoes: data.shoes || 'sneakers'
        };
        Object.assign(players[data.id], av);
    }
    if (data.id === myId) {
        let av = data.avatar || {
            hat: data.hat,
            face: data.face,
            skinColor: data.skinColor,
            color: data.color,
            heldItem: data.heldItem,
            shoes: data.shoes || 'sneakers'
        };
        myAvatar = av;
        previewAvatar = { ...myAvatar };
        renderWardrobeUI();
    }
});

socket.on('loginFailed', () => {
    const err = document.getElementById('loginError');
    err.style.display = 'block';
    setTimeout(() => { err.style.display = 'none'; }, 3000);
});

// --- 2. SANALİKA TARZI BALONCUKLAR & SOHBET GEÇMİŞİ ---
let activeChatBubbles = {};
let chatMessagesLog = [];
const MAX_CHAT_LOG = 15;

socket.on('chatUpdate', (data) => {
    if (data.msg && data.msg.trim() !== "") {
        if (window.playSound) window.playSound('chatPop');
        let senderName = players[data.id] ? players[data.id].name : "Biri";

        chatMessagesLog.push({ name: senderName, msg: data.msg });
        if (chatMessagesLog.length > MAX_CHAT_LOG) chatMessagesLog.shift();
        renderChatHistory();

        if (!activeChatBubbles[data.id]) activeChatBubbles[data.id] = [];
        if (activeChatBubbles[data.id].length >= 4) {
            let oldBubble = activeChatBubbles[data.id].shift();
            clearTimeout(oldBubble.timer);
        }

        let timer = setTimeout(() => {
            if (activeChatBubbles[data.id]) {
                activeChatBubbles[data.id] = activeChatBubbles[data.id].filter(b => b.timer !== timer);
            }
        }, 5000);

        activeChatBubbles[data.id].push({ text: data.msg, name: senderName, timer: timer });
    }
});

function renderChatHistory() {
    const historyDiv = document.getElementById('chatHistory');
    if (!historyDiv) return;
    historyDiv.innerHTML = "";
    chatMessagesLog.forEach(item => {
        historyDiv.innerHTML += `<div><b>${item.name}:</b> ${item.msg}</div>`;
    });
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function sendSideChat() {
    const input = document.getElementById('sideChatInput');
    let msg = input.value.trim();
    if (msg !== "") {
        socket.emit('chatMessage', msg);
        input.value = "";
    }
}

function toggleChatPanel() {
    const panel = document.getElementById('sideChatContainer');
    const toggleBtn = document.getElementById('chatToggleBtn');
    if (panel.style.display === 'none') {
        panel.style.display = 'flex';
        toggleBtn.innerText = '💬 Chat Kapat';
    } else {
        panel.style.display = 'none';
        toggleBtn.innerText = '💬 Chat Aç';
    }
}

// --- 3. SÜRÜKLE BIRAK (DRAGGABLE) İŞLEMLERİ ---
document.addEventListener('DOMContentLoaded', () => {

    // A) CHAT PANELİNİ SÜRÜKLEME
    const chatPanel = document.getElementById('sideChatContainer');
    const chatHeader = document.getElementById('chatHeader');
    let isChatDragging = false, cStartX, cStartY, cInitialLeft, cInitialTop;

    if (chatHeader && chatPanel) {
        chatHeader.addEventListener('mousedown', (e) => {
            isChatDragging = true;
            cStartX = e.clientX; cStartY = e.clientY;
            cInitialLeft = chatPanel.offsetLeft; cInitialTop = chatPanel.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isChatDragging) return;
            chatPanel.style.left = (cInitialLeft + (e.clientX - cStartX)) + 'px';
            chatPanel.style.top = (cInitialTop + (e.clientY - cStartY)) + 'px';
            chatPanel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isChatDragging = false; });

        // Mobil Dokunmatik Desteği
        chatHeader.addEventListener('touchstart', (e) => {
            isChatDragging = true;
            cStartX = e.touches[0].clientX; cStartY = e.touches[0].clientY;
            cInitialLeft = chatPanel.offsetLeft; cInitialTop = chatPanel.offsetTop;
        });
        document.addEventListener('touchmove', (e) => {
            if (!isChatDragging) return;
            chatPanel.style.left = (cInitialLeft + (e.touches[0].clientX - cStartX)) + 'px';
            chatPanel.style.top = (cInitialTop + (e.touches[0].clientY - cStartY)) + 'px';
            chatPanel.style.right = 'auto';
        });
        document.addEventListener('touchend', () => { isChatDragging = false; });
    }

    // B) OYUN MASASINI (MODAL) SÜRÜKLEME
    const gameModal = document.getElementById('gameModal');
    const modalHeader = document.getElementById('modalHeader');
    let isModalDragging = false, mStartX, mStartY, mInitialLeft, mInitialTop;

    if (modalHeader && gameModal) {
        modalHeader.addEventListener('mousedown', (e) => {
            isModalDragging = true;
            mStartX = e.clientX; mStartY = e.clientY;

            // Transformu kaldırıp px tabanlı konumlandırmaya geçiyoruz
            const rect = gameModal.getBoundingClientRect();
            gameModal.style.transform = 'none';
            gameModal.style.left = rect.left + 'px';
            gameModal.style.top = rect.top + 'px';

            mInitialLeft = gameModal.offsetLeft;
            mInitialTop = gameModal.offsetTop;
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!isModalDragging) return;
            gameModal.style.left = (mInitialLeft + (e.clientX - mStartX)) + 'px';
            gameModal.style.top = (mInitialTop + (e.clientY - mStartY)) + 'px';
        });
        document.addEventListener('mouseup', () => { isModalDragging = false; });
    }

    // Enter tuşu desteği
    const sideInput = document.getElementById('sideChatInput');
    if (sideInput) sideInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendSideChat(); });

    const passwordInput = document.getElementById('passwordInput');
    const usernameInput = document.getElementById('usernameInput');
    if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });
    if (usernameInput) usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') attemptLogin(); });

    requestAnimationFrame(gameLoop);
});

// --- 4. OYUNCU VE ODA BAĞLANTILARI ---
socket.on('currentPlayers', (serverPlayers) => {
    players = serverPlayers;
    myId = socket.id;
});

socket.on('newPlayer', (data) => { players[data.id] = data.player; });
socket.on('playerDisconnected', (id) => { delete players[id]; delete activeChatBubbles[id]; });
socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        players[data.id].x = data.x;
        players[data.id].y = data.y;
    }
});
socket.on('systemMessage', (msg) => { console.log("[Sistem]:", msg); });

// --- 5. MEKAN DEĞİŞTİRME (Üst Butonlar) ---
function changeRoom(newRoom) {
    currentRoom = newRoom;
    socket.emit('changeRoom', newRoom);
    const fishBtn = document.getElementById('btnFishAction');
    if (fishBtn) {
        fishBtn.style.display = (newRoom === 'sahil') ? 'flex' : 'none';
    }

    const swanBtn = document.getElementById('btnSwanBoatAction');
    if (swanBtn) {
        swanBtn.style.display = (newRoom === 'sahil') ? 'flex' : 'none';
        if (players[myId] && players[myId].hasSwanBoat) {
            swanBtn.innerText = "🦢 Kuğu Bisikletindesin";
            swanBtn.style.background = "#059669";
        } else {
            swanBtn.innerText = "🦢 Kuğu Deniz Bisikleti Kirala (20 TL)";
            swanBtn.style.background = "linear-gradient(135deg, #f43f5e, #be123c)";
        }
    }

    const editBtn = document.getElementById('btnEditHouseFurniture');
    if (typeof updateHouseEditButtonVisibility === 'function') {
        updateHouseEditButtonVisibility();
    } else if (editBtn) {
        let isMyHouse = (newRoom && myUsername && newRoom === `house_${myUsername}`);
        editBtn.style.display = isMyHouse ? 'flex' : 'none';
    }
}

function handleRentSwanBoat() {
    socket.emit('rentSwanBoat');
}

socket.on('playerSwanBoatUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].hasSwanBoat = data.hasSwanBoat;
    }
});

socket.on('swanBoatRented', () => {
    const btn = document.getElementById('btnSwanBoatAction');
    if (btn) {
        btn.innerText = "🦢 Kuğu Bisikletindesin";
        btn.style.background = "#059669";
    }
});

// --- 5.1 RECONNECT (KALDIĞIN YERDEN DEVAM ET) İŞLEMLERİ ---
let pendingReconnectTableId = null;

socket.on('reconnectOffer', (data) => {
    pendingReconnectTableId = data.tableId;
    const modal = document.getElementById('reconnectModal');
    const nameSpan = document.getElementById('reconnectTableName');
    if (nameSpan) nameSpan.innerText = data.tableName;
    if (modal) modal.style.display = 'flex';
});

function handleAcceptReconnect() {
    if (pendingReconnectTableId) {
        socket.emit('acceptReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
    const modal = document.getElementById('reconnectModal');
    if (modal) modal.style.display = 'none';
}

function handleDeclineReconnect() {
    if (pendingReconnectTableId) {
        socket.emit('declineReconnect', pendingReconnectTableId);
        pendingReconnectTableId = null;
    }
    const modal = document.getElementById('reconnectModal');
    if (modal) modal.style.display = 'none';
}

// --- 5.2 MASA SEÇİMİ (İZLE / KATIL / YENİ MASA) ---
let currentSelectedBaseType = null;

socket.on('tableOptionsModal', (data) => {
    currentSelectedBaseType = data.baseType;
    const modal = document.getElementById('tableSelectModal');
    const title = document.getElementById('tableSelectTitle');
    const list = document.getElementById('tableOptionsList');

    const modeCont = document.getElementById('newTable101ModeContainer');
    const modeSelect = document.getElementById('newTable101ModeSelect');
    if (modeCont) {
        let is101 = (data.baseType === 'okey101' || data.baseType === 'okey101_tekli');
        modeCont.style.display = is101 ? 'flex' : 'none';
        if (is101 && modeSelect) {
            modeSelect.value = (data.baseType === 'okey101_tekli') ? 'tekli' : 'esli';
        }
    }

    if (title) title.innerText = `${data.baseName} Masaları`;
    if (list) {
        list.innerHTML = "";
        data.tables.forEach(t => {
            let itemHtml = `<div style="background: rgba(0,0,0,0.35); border: 1px solid #34495e; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">`;

            let betBadge = (t.bet && t.bet > 0)
                ? `<span style="display:inline-block; margin-left:6px; background:rgba(245,158,11,0.25); border:1px solid #f59e0b; color:#facc15; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">💰 Bahis: ${t.bet} TL (Ödül: ${(t.pot > 0 ? t.pot : (t.bet * t.min))} TL)</span>`
                : `<span style="display:inline-block; margin-left:6px; background:rgba(34,197,94,0.2); border:1px solid #22c55e; color:#4ade80; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">🌱 Ücretsiz</span>`;

            let modeBadge = "";
            if (t.mode === 'esli') {
                modeBadge = `<span style="display:inline-block; margin-left:6px; background:rgba(59,130,246,0.25); border:1px solid #3b82f6; color:#60a5fa; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">👥 Eşli</span>`;
            } else if (t.mode === 'tekli') {
                modeBadge = `<span style="display:inline-block; margin-left:6px; background:rgba(100,116,139,0.25); border:1px solid #64748b; color:#cbd5e1; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px;">👤 Tekli</span>`;
            }

            if (t.isActive) {
                let vacantDesc = "";
                if (t.hasVacantSeat && t.vacantSeats && t.vacantSeats.length > 0) {
                    vacantDesc = `<div style="font-size: 12px; color: #f87171; font-weight: bold; margin-top: 3px;">💺 Boş Koltuk: ${t.vacantSeats.map(v => v.name + ' ayrıldı').join(', ')}</div>`;
                }

                itemHtml += `<div style="flex: 1; min-width: 180px;">
                    <div style="font-weight: bold; color: ${t.hasVacantSeat ? '#f59e0b' : '#f39c12'}; font-size: 15px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>${t.hasVacantSeat ? '⚠️' : '🔴'} ${t.name} (Oyun Sürüyor${t.hasVacantSeat ? ' - Eksik Koltuk Var!' : ''})</span>
                        ${modeBadge}
                        ${betBadge}
                    </div>
                    <div style="font-size: 12px; color: #bdc3c7; margin-top: 3px;">
                        Oyuncular: ${t.players.join(', ')} | 👁️ Yancılar: ${t.spectatorCount}
                    </div>
                    ${vacantDesc}
                </div>
                <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">`;

                if (t.hasVacantSeat && t.vacantSeats) {
                    t.vacantSeats.forEach(v => {
                        itemHtml += `<button onclick="takeoverSeat('${t.id}', '${v.oldPid}')" style="padding: 8px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 12px; box-shadow: 0 2px 8px rgba(16,185,129,0.4);">💺 ${v.name} Yerine Otur</button>`;
                    });
                }

                itemHtml += `<button onclick="spectateTable('${t.id}')" style="padding: 8px 14px; background: #e67e22; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 13px;">👁️ İzle (Yancı Ol)</button>
                </div>`;
            } else {
                let botBtnHtml = "";
                if (t.id.startsWith('batak') && t.count < t.min) {
                    botBtnHtml = `<button onclick="handleAddBotToTable('${t.id}')" style="padding: 8px 12px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; box-shadow: 0 2px 8px rgba(139,92,246,0.4);">🤖 Bot Ekle</button>`;
                }

                itemHtml += `<div>
                    <div style="font-weight: bold; color: #2ecc71; font-size: 15px; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
                        <span>🟢 ${t.name}</span>
                        ${modeBadge}
                        ${betBadge}
                    </div>
                    <div style="font-size: 12px; color: #bdc3c7; margin-top: 3px;">Oyuncular (${t.count}/${t.min}): ${t.players.length > 0 ? t.players.join(', ') : 'Henüz kimse yok'}</div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${botBtnHtml}
                    <button onclick="joinSelectedTable('${t.id}')" style="padding: 8px 14px; background: #27ae60; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 13px;">🟢 Masaya Otur</button>
                </div>`;
            }

            itemHtml += `</div>`;
            list.innerHTML += itemHtml;
        });
    }

    if (modal) modal.style.display = 'flex';
});

function handleAddBotToTable(specificTableId) {
    let tId = specificTableId || window.currentActiveTableId;
    if (!tId && currentSelectedBaseType) {
        tId = currentSelectedBaseType;
    }
    if (tId) {
        socket.emit('addBotToTable', tId);
    }
}

function joinSelectedTable(tableId) {
    window.currentActiveTableId = tableId;
    socket.emit('joinTable', tableId);
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';
    document.getElementById('modalStatus').innerText = "Masaya oturuldu, diğer oyuncular bekleniyor...";
}

function spectateTable(tableId) {
    window.currentActiveTableId = tableId;
    socket.emit('spectateTable', tableId);
    closeTableSelectModal();
}

function takeoverSeat(tableId, oldPid) {
    window.currentActiveTableId = tableId;
    socket.emit('takeoverSeat', { tableId: tableId, oldPid: oldPid });
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';
    document.getElementById('modalStatus').innerText = "Koltuğa oturuluyor, oyun aktarılıyor...";
}

function handleCreateNewTable() {
    if (currentSelectedBaseType) {
        const betSelect = document.getElementById('newTableBetSelect');
        const betVal = betSelect ? (parseInt(betSelect.value) || 0) : 0;
        const modeSelect = document.getElementById('newTable101ModeSelect');
        let is101 = (currentSelectedBaseType === 'okey101' || currentSelectedBaseType === 'okey101_tekli');
        let defaultMode = (currentSelectedBaseType === 'okey101_tekli') ? 'tekli' : 'esli';
        const modeVal = (is101 && modeSelect) ? modeSelect.value : (is101 ? defaultMode : null);
        socket.emit('createNewTable', { baseType: currentSelectedBaseType, bet: betVal, mode: modeVal });
        closeTableSelectModal();
        const modal = document.getElementById('gameModal');
        modal.style.display = 'block';
        modal.style.transform = 'translate(-50%, -50%)';
        modal.style.left = '50%';
        modal.style.top = '50%';
        let betMsg = betVal > 0 ? ` (Bahis: ${betVal} TL)` : " (Ücretsiz)";
        let modeMsg = modeVal === 'esli' ? " [Eşli 101]" : (modeVal === 'tekli' ? " [Tekli 101]" : "");
        document.getElementById('modalStatus').innerText = `Yeni masa açıldı${modeMsg}${betMsg}, diğer oyuncular bekleniyor...`;
    }
}

function closeTableSelectModal() {
    const modal = document.getElementById('tableSelectModal');
    if (modal) modal.style.display = 'none';
}

// --- 5.3 LİDERLİK TABLOSU ---
function openLeaderboard() {
    socket.emit('getLeaderboard');
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.style.display = 'flex';
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.style.display = 'none';
}

socket.on('leaderboardData', (data) => {
    const bList = document.getElementById('billiardLeaderList');
    const batakList = document.getElementById('batakLeaderList');
    const tavlaList = document.getElementById('tavlaLeaderList');

    if (bList) {
        if (!data.billiard || data.billiard.length === 0) {
            bList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            bList.innerHTML = data.billiard.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#facc15; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }

    if (batakList) {
        if (!data.batak || data.batak.length === 0) {
            batakList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            batakList.innerHTML = data.batak.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#34d399; font-weight:bold;">${item.score} Puan</span>
                </div>`
            ).join('');
        }
    }

    if (tavlaList) {
        if (!data.tavla || data.tavla.length === 0) {
            tavlaList.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            tavlaList.innerHTML = data.tavla.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#fb923c; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }

    const okey101List = document.getElementById('okey101LeaderList');
    if (okey101List) {
        if (!data.okey101 || data.okey101.length === 0) {
            okey101List.innerHTML = "<div style='color:#94a3b8; font-style:italic;'>Henüz kayıt yok</div>";
        } else {
            let medals = ["🥇", "🥈", "🥉", "4.", "5."];
            okey101List.innerHTML = data.okey101.map((item, idx) =>
                `<div style="display:flex; justify-content:space-between; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <span>${medals[idx] || (idx + 1) + '.'} <b>${item.name}</b></span>
                    <span style="color:#ec4899; font-weight:bold;">${item.wins} Galibiyet</span>
                </div>`
            ).join('');
        }
    }
});

// --- 5.4 GECE / GÜNDÜZ MODU ---
let isNightMode = false;
function toggleNightMode() {
    isNightMode = !isNightMode;
    const toast = document.getElementById('reactionToast');
    if (toast) {
        toast.innerText = isNightMode ? "🌙 Gece Modu Açıldı" : "☀️ Gündüz Modu Açıldı";
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 2000);
    }
}

// --- 5.5 MASA İÇİ REAKSİYONLAR & TEZAHÜRAT ---
function sendTableReaction(reactionText) {
    if (!window.currentActiveTableId) return;
    if (window.playSound) window.playSound('chatPop');
    socket.emit('tableReaction', { tableId: window.currentActiveTableId, reaction: reactionText });
}

socket.on('showReaction', (data) => {
    if (window.playSound) window.playSound('chatPop');
    const toast = document.getElementById('reactionToast');
    if (toast) {
        toast.innerText = `${data.sender}: ${data.text}`;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    }
});

// --- 5.6 SOSYAL KARAKTER HAREKETLERİ (Çay, Dans, El Salla, Alkış) ---
function triggerPlayerAction(action) {
    socket.emit('playerAction', { action: action });
    if (action === 'tea' && window.playSound) window.playSound('chatPop');
    else if (action === 'clap' && window.playSound) window.playSound('card');
}

socket.on('playerActionUpdate', (data) => {
    if (players[data.id]) {
        players[data.id].action = data.action;
        players[data.id].hasTea = data.hasTea;
    }
});

// --- 5.7 TUR SÜRESİ GERİ SAYIM ÇUBUĞU ---
let turnTimerInterval = null;
function startTurnTimer(durationSec) {
    const container = document.getElementById('turnTimerContainer');
    const bar = document.getElementById('turnTimerBar');
    if (!container || !bar) return;

    container.style.display = 'block';
    bar.style.transition = 'none';
    bar.style.width = '100%';
    bar.style.backgroundColor = '#22c55e';

    if (turnTimerInterval) clearInterval(turnTimerInterval);

    let start = Date.now();
    let totalMs = (durationSec || 30) * 1000;

    turnTimerInterval = setInterval(() => {
        let elapsed = Date.now() - start;
        let leftRatio = Math.max(0, 1 - (elapsed / totalMs));
        bar.style.width = (leftRatio * 100) + '%';

        if (leftRatio > 0.5) bar.style.backgroundColor = '#22c55e';
        else if (leftRatio > 0.25) bar.style.backgroundColor = '#f59e0b';
        else bar.style.backgroundColor = '#ef4444';

        if (leftRatio <= 0) {
            clearInterval(turnTimerInterval);
            turnTimerInterval = null;
        }
    }, 100);
}

// --- 6. OYUN BAŞLATMA VE LOBİ ---
socket.on('startGame', (gameType) => {
    closeTableSelectModal();
    const modal = document.getElementById('gameModal');
    modal.style.display = 'block';

    // Modalı her açıldığında tekrar ortaya hizala
    modal.style.transform = 'translate(-50%, -50%)';
    modal.style.left = '50%';
    modal.style.top = '50%';

    if (gameType === 'billiard') {
        document.getElementById('billiardArea').style.display = 'block';
        document.getElementById('batakArea').style.display = 'none';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'none';
    } else if (gameType === 'batak') {
        document.getElementById('billiardArea').style.display = 'none';
        document.getElementById('batakArea').style.display = 'block';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'none';
    } else if (gameType === 'tavla') {
        document.getElementById('billiardArea').style.display = 'none';
        document.getElementById('batakArea').style.display = 'none';
        const tavlaArea = document.getElementById('tavlaArea');
        if (tavlaArea) tavlaArea.style.display = 'block';
    }
});

socket.on('updateTableLobby', (data) => {
    window.currentActiveTableId = data.tableId;
    document.getElementById('modalStatus').innerText = `Lobi: ${data.name} (${data.count}/${data.min} Oyuncu)`;
});

socket.on('gameError', (msg) => {
    const errToast = document.getElementById('errorToast');
    if (errToast) {
        errToast.innerText = msg;
        errToast.style.display = 'block';
        setTimeout(() => { errToast.style.display = 'none'; }, 3500);
    }
    if (typeof showSocialNotificationToast === 'function') {
        showSocialNotificationToast('⚠️', 'Uyarı', msg);
    }
});

function leaveCurrentTable() {
    socket.emit('leaveTable');
    window.isSpectating = false;
    window.currentActiveTableId = null;
    if (turnTimerInterval) { clearInterval(turnTimerInterval); turnTimerInterval = null; }
    const tContainer = document.getElementById('turnTimerContainer');
    if (tContainer) tContainer.style.display = 'none';
    document.getElementById('gameModal').style.display = 'none';
    document.getElementById('billiardArea').style.display = 'none';
    document.getElementById('batakArea').style.display = 'none';
    const tavlaArea = document.getElementById('tavlaArea');
    if (tavlaArea) tavlaArea.style.display = 'none';
    const okeyArea = document.getElementById('okey101Area');
    if (okeyArea) okeyArea.style.display = 'none';
    const banner = document.getElementById('spectatorBanner');
    if (banner) banner.style.display = 'none';
}

// --- 7. MOUSE VE HOVER TAKİBİ ---
let canvasMouseX = -1, canvasMouseY = -1;
let hoveredTableId = null;

canvas.addEventListener('mousemove', (e) => {
    let rect = canvas.getBoundingClientRect();
    canvasMouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    canvasMouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

    if (currentRoom === 'sahil') {
        if (canvasMouseX < 560 || canvasMouseY < 320) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else if (currentRoom === 'nargile_cafe') {
        let isOverTekli = (canvasMouseX >= 145 && canvasMouseX <= 365 && canvasMouseY >= 160 && canvasMouseY <= 360);
        let isOverEsli = (canvasMouseX >= 435 && canvasMouseX <= 655 && canvasMouseY >= 160 && canvasMouseY <= 360);
        let isOverExit = (canvasMouseX >= canvas.width - 90 && canvasMouseX <= canvas.width - 20 && canvasMouseY >= canvas.height - 75 && canvasMouseY <= canvas.height - 10);
        if (isOverTekli || isOverEsli || isOverExit) {
            canvas.style.cursor = 'pointer';
        } else {
            canvas.style.cursor = 'default';
        }
    } else if (currentRoom === 'market') {
        canvas.style.cursor = 'pointer';
    }
});

canvas.addEventListener('mouseleave', () => {
    canvasMouseX = -1;
    canvasMouseY = -1;
    canvas.style.cursor = 'default';
});

// Kafedeki masaların koordinatları
// Kafedeki masaların koordinatları
const cafeTables = [
    { id: 'billiard', x: 80, y: 140, w: 180, h: 105, name: '8-Ball Bilardo' },
    { id: 'tavla', x: 80, y: 310, w: 180, h: 105, name: 'Geleneksel Tavla' },
    { id: 'okey101', x: 275, y: 190, w: 130, h: 120, name: '101 Okey' },
    { id: 'batak', x: 440, y: 100, w: 140, h: 120, name: 'Gömmeli Batak' },
    { id: 'batak4', x: 440, y: 290, w: 140, h: 120, name: 'Normal Batak' }
];

// Akıcı Tap-to-Walk ve Dokunma Efektleri
let targetWalkPos = null;
let tapRipples = [];
let lastCanvasTapTime = 0;

function handleCanvasTapOrClick(clickX, clickY) {
    if (window.wasFurnitureDragged) {
        window.wasFurnitureDragged = false;
        return;
    }
    let now = Date.now();
    if (now - lastCanvasTapTime < 140) return;
    lastCanvasTapTime = now;

    // 1. ÖNCELİK: Başka bir oyuncunun üzerine tıklama kontrolü (Sosyal Etkileşim Menüsü)
    let clickedOtherPlayer = null;
    for (let id in players) {
        if (id === myId) continue;
        let p = players[id];
        let dist = Math.hypot(clickX - p.x, clickY - p.y);
        if (dist <= 26) {
            clickedOtherPlayer = { id, player: p };
            break;
        }
    }
    if (clickedOtherPlayer) {
        if (typeof openPlayerInteractionModal === 'function') {
            openPlayerInteractionModal(clickedOtherPlayer.id, clickedOtherPlayer.player);
        }
        return;
    }

    if (currentRoom === "kafe") {
        // Çay Ocağı Tezgahına tıklama (10 TL çay al)
        if (clickX >= 20 && clickX <= 250 && clickY >= 15 && clickY <= 65) {
            triggerPlayerAction('tea');
            return;
        }

        let clickedTable = false;
        cafeTables.forEach(obj => {
            if (clickX >= obj.x && clickX <= obj.x + obj.w && clickY >= obj.y && clickY <= obj.y + obj.h) {
                clickedTable = true;
                socket.emit('requestTableOptions', obj.id);
            }
        });
        if (clickedTable) return;
    } else if (currentRoom === "sahil") {
        // İskele Kuğu Kiralama Alanına Tıklama
        if (clickX >= 620 && clickX <= 770 && clickY >= 210 && clickY <= 300) {
            handleRentSwanBoat();
            return;
        }
        // Su veya İskele alanına tıklandığında balık tutmayı tetikle
        if (clickX < 560 || clickY < 320) {
            triggerFishing();
            return;
        }
    } else if (currentRoom === "sokak") {
        // 🏠 Emlakçı Dükkanına Tıklama
        if (clickX >= 20 && clickX <= 235 && clickY >= 10 && clickY <= 115) {
            if (typeof openRealEstateModal === 'function') openRealEstateModal();
            return;
        }
        // ☕ Kafe & Oyun Salonu Kapısına Tıklama
        if (clickX >= 260 && clickX <= 540 && clickY >= 10 && clickY <= 115) {
            changeRoom('kafe');
            return;
        }
        // 💨 Nargile Cafe Kapısına Tıklama
        if (clickX >= 560 && clickX <= 780 && clickY >= 10 && clickY <= 115) {
            changeRoom('nargile_cafe');
            return;
        }
        // 🏢 Konutlar & Apartman Kapısına Tıklama (SADECE KENDİ VE ARKADAŞLARININ EVLERİ)
        if (clickX >= 20 && clickX <= 250 && clickY >= 335 && clickY <= 470) {
            if (typeof openHousingPortalModal === 'function') openHousingPortalModal();
            return;
        }
        // 🛒 Mobilya Marketi Kapısına Tıklama
        if (clickX >= 550 && clickX <= 780 && clickY >= 335 && clickY <= 470) {
            changeRoom('market');
            return;
        }
    } else if (currentRoom === "nargile_cafe") {
        // 1. Sol Masa: 👤 Tekli 101 Okey Masası
        if (clickX >= 145 && clickX <= 365 && clickY >= 160 && clickY <= 360) {
            socket.emit('requestTableOptions', 'okey101_tekli');
            return;
        }
        // 2. Sağ Masa: 👥 Çiftli / Eşli 101 Okey Masası
        if (clickX >= 435 && clickX <= 655 && clickY >= 160 && clickY <= 360) {
            socket.emit('requestTableOptions', 'okey101');
            return;
        }
        // Çıkış Kapısına Tıklama (Sağ Altta)
        if (clickX >= canvas.width - 90 && clickX <= canvas.width - 20 && clickY >= canvas.height - 75 && clickY <= canvas.height - 10) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom === "market") {
        // Çıkış Kapısına Tıklama (Orta Alt)
        if (clickX >= canvas.width / 2 - 40 && clickX <= canvas.width / 2 + 40 && clickY >= canvas.height - 75 && clickY <= canvas.height - 10) {
            changeRoom('sokak');
            return;
        }
        // Mağazadaki tezgaha, raflara veya teşhirdeki mobilyalara tıklandığında mobilya marketini aç
        if (typeof openFurnitureMarketModal === 'function') {
            openFurnitureMarketModal();
            return;
        }
    } else if (currentRoom.startsWith("house_")) {
        // Ev Çıkış Kapısı (Sol Altta)
        if (clickX >= 15 && clickX <= 75 && clickY >= canvas.height - 75 && clickY <= canvas.height - 10) {
            changeRoom('sokak');
            return;
        }
    }

    // Tıkladığın yere gitme özelliği kaldırıldı (Karakter sadece tuşlar ve kumanda ile hareket eder)
    targetWalkPos = null;
}

canvas.addEventListener('click', (e) => {
    let rect = canvas.getBoundingClientRect();
    let clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    let clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    handleCanvasTapOrClick(clickX, clickY);
});

canvas.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
        let t = e.touches[0];
        let rect = canvas.getBoundingClientRect();
        let clickX = (t.clientX - rect.left) * (canvas.width / rect.width);
        let clickY = (t.clientY - rect.top) * (canvas.height / rect.height);
        handleCanvasTapOrClick(clickX, clickY);
    }
}, { passive: true });

// --- 8. WASD VE YÖN KONTROLLERİ ---
let myFacing = 'down';
let walkCycle = 0;

window.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT') return;
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') { keys.w = true; myFacing = 'up'; targetWalkPos = null; }
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') { keys.a = true; myFacing = 'left'; targetWalkPos = null; }
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') { keys.s = true; myFacing = 'down'; targetWalkPos = null; }
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') { keys.d = true; myFacing = 'right'; targetWalkPos = null; }
    if (e.key === 'e' || e.key === 'E') { triggerMobileInteract(); }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') keys.w = false;
    if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') keys.a = false;
    if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') keys.s = false;
    if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') keys.d = false;
});

function setKey(dir, isPressed) {
    keys[dir] = isPressed;
    if (isPressed) {
        targetWalkPos = null;
        if (dir === 'w') myFacing = 'up';
        if (dir === 's') myFacing = 'down';
        if (dir === 'a') myFacing = 'left';
        if (dir === 'd') myFacing = 'right';
    }
}

function handleTouchKey(dir, isPressed, event) {
    if (event && event.cancelable) event.preventDefault();
    if (isPressed && typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch(e){}
    }
    setKey(dir, isPressed);
}

// Mobil Etkileşim ("E" Tuşu) İşlevi
function triggerMobileInteract() {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(20); } catch(e){}
    }
    if (!players[myId]) return;
    let p = players[myId];

    if (currentRoom === "kafe") {
        if (p.x >= 20 && p.x <= 260 && p.y <= 120) {
            triggerPlayerAction('tea');
            return;
        }
        let nearest = null;
        let minDist = 120;
        cafeTables.forEach(t => {
            let cx = t.x + t.w / 2;
            let cy = t.y + t.h / 2;
            let dist = Math.hypot(p.x - cx, p.y - cy);
            if (dist < minDist) {
                minDist = dist;
                nearest = t;
            }
        });
        if (nearest) {
            socket.emit('requestTableOptions', nearest.id);
            return;
        }
    } else if (currentRoom === "nargile_cafe") {
        let distTekli = Math.hypot(p.x - 255, p.y - 242);
        let distEsli = Math.hypot(p.x - 545, p.y - 242);
        if (distTekli < 130) {
            socket.emit('requestTableOptions', 'okey101_tekli');
            return;
        }
        if (distEsli < 130) {
            socket.emit('requestTableOptions', 'okey101');
            return;
        }
        let distExit = Math.hypot(p.x - (canvas.width - 55), p.y - (canvas.height - 40));
        if (distExit < 90) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom === "sahil") {
        let distSwan = Math.hypot(p.x - 695, p.y - 255);
        if (distSwan < 110) {
            handleRentSwanBoat();
            return;
        }
        triggerFishing();
        return;
    } else if (currentRoom === "sokak") {
        if (p.x <= 235 && p.y <= 120) {
            if (typeof openRealEstateModal === 'function') openRealEstateModal();
            return;
        }
        if (p.x >= 260 && p.x <= 540 && p.y <= 120) {
            changeRoom('kafe');
            return;
        }
        if (p.x >= 560 && p.y <= 120) {
            changeRoom('nargile_cafe');
            return;
        }
        if (p.x <= 250 && p.y >= 335) {
            if (typeof openHousingPortalModal === 'function') openHousingPortalModal();
            return;
        }
        if (p.x >= 550 && p.y >= 335) {
            changeRoom('market');
            return;
        }
    } else if (currentRoom === "market") {
        if (p.x >= 520 && p.y <= 170) {
            if (typeof openFurnitureMarketModal === 'function') openFurnitureMarketModal();
            return;
        }
        if (p.y >= canvas.height - 90) {
            changeRoom('sokak');
            return;
        }
    } else if (currentRoom.startsWith("house_")) {
        if (p.x <= 90 && p.y >= canvas.height - 90) {
            changeRoom('sokak');
            return;
        }
    }
}

// Mobil Sanal Kumanda Aç/Kapat Butonu
function toggleMobileDpad() {
    let dpad = document.getElementById('mobileControlsOverlay');
    let actionBtn = document.getElementById('mobileActionBtn');
    if (!dpad) return;
    let isHidden = (dpad.style.display === 'none' || dpad.style.display === '');
    dpad.style.display = isHidden ? 'block' : 'none';
    if (actionBtn) actionBtn.style.display = isHidden ? 'flex' : 'none';
}

// --- 9. HARİTA ÇİZİM YARDIMCILARI ---

// A) KAFE ÇİZİMİ
function drawCafeEnvironment() {
    // 1. Ahşap Parke Zemin
    ctx.fillStyle = "#3d2314";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
        let offset = (y / 28) % 2 === 0 ? 0 : 45;
        for (let x = offset; x < canvas.width; x += 90) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 28); ctx.stroke();
        }
    }

    // 2. Sıcak Kırmızı Kilim (Batak masalarının altına)
    ctx.fillStyle = "#7f1d1d";
    ctx.beginPath();
    ctx.roundRect(410, 70, 200, 370, 16);
    ctx.fill();
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 3. Bar / Çay Ocağı Tezgahı (Sol Üst)
    let isTeaHover = (canvasMouseX >= 20 && canvasMouseX <= 250 && canvasMouseY >= 15 && canvasMouseY <= 65);
    if (isTeaHover) hoveredTableId = 'tea';

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(25, 20, 230, 48); // Tezgah gölgesi
    ctx.fillStyle = "#5c2c16";
    ctx.beginPath();
    ctx.roundRect(20, 15, 230, 45, 8);
    ctx.fill();
    ctx.strokeStyle = isTeaHover ? "#f59e0b" : "#8b4513";
    ctx.lineWidth = isTeaHover ? 3 : 2;
    ctx.stroke();

    // Bar üstü bakır semaver ve fincanlar
    ctx.fillStyle = "#b45309"; // Bakır semaver gövdesi
    ctx.beginPath();
    ctx.roundRect(45, 18, 24, 28, 4);
    ctx.fill();
    // Semaver kapağı & pirinç musluğu
    ctx.fillStyle = "#facc15";
    ctx.fillRect(52, 14, 10, 4);
    ctx.fillRect(39, 32, 6, 4);

    // Semaverden yükselen sıcak buhar animasyonu
    let steamAnimY = 14 - ((Date.now() / 60) % 10);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(57, steamAnimY + 5);
    ctx.quadraticCurveTo(61, steamAnimY + 2, 58, steamAnimY);
    ctx.stroke();

    // Çay bardakları
    ctx.fillStyle = "#ef4444";
    ctx.fillRect(80, 28, 8, 12);
    ctx.fillRect(95, 28, 8, 12);

    // Bar tabelası
    ctx.fillStyle = isTeaHover ? "#38bdf8" : "#fef08a";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("☕ Çay Ocağı (10 TL) - Tıkla ve Al", 115, 42);

    // 4. Bar Tabureleri
    [55, 115, 175].forEach(sx => {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.beginPath(); ctx.arc(sx, 74, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#b45309";
        ctx.beginPath(); ctx.arc(sx, 70, 8, 0, Math.PI * 2); ctx.fill();
    });

    // 5. MASALARI ÇİZME VE HOVER KONTROLÜ
    hoveredTableId = isTeaHover ? 'tea' : null;
    cafeTables.forEach(t => {
        let isHover = (canvasMouseX >= t.x && canvasMouseX <= t.x + t.w && canvasMouseY >= t.y && canvasMouseY <= t.y + t.h);
        if (isHover) hoveredTableId = t.id;

        if (t.id === 'billiard') {
            drawBilliardTableObj(t.x, t.y, t.w, t.h, isHover);
        } else if (t.id === 'tavla') {
            drawTavlaTableObj(t.x, t.y, t.w, t.h, isHover);
        } else if (t.id === 'okey101') {
            drawOkey101TableObj(t.x, t.y, t.w, t.h, isHover);
        } else if (t.id === 'batak') {
            drawBatakTableObj(t.x + 70, t.y + 60, 44, 3, "Gömmeli Batak", isHover);
        } else if (t.id === 'batak4') {
            drawBatakTableObj(t.x + 70, t.y + 60, 44, 4, "Normal Batak", isHover);
        }
    });

    canvas.style.cursor = hoveredTableId ? 'pointer' : 'default';
}

// BİLARDO MASASI ÇİZİMİ
function drawBilliardTableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 14);
    ctx.fill();

    // Hover parlaması
    if (isHover) {
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 18;
    }

    // Ahşap Çerçeve
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#facc15" : "#78350f";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Yeşil Çuha
    ctx.fillStyle = "#047857";
    ctx.beginPath();
    ctx.roundRect(x + 12, y + 12, w - 24, h - 24, 6);
    ctx.fill();

    // 6 Adet Delik
    ctx.fillStyle = "#0f172a";
    let pockets = [
        { px: x + 14, py: y + 14 }, { px: x + w / 2, py: y + 12 }, { px: x + w - 14, py: y + 14 },
        { px: x + 14, py: y + h - 14 }, { px: x + w / 2, py: y + h - 12 }, { px: x + w - 14, py: y + h - 14 }
    ];
    pockets.forEach(p => {
        ctx.beginPath(); ctx.arc(p.px, p.py, 5.5, 0, Math.PI * 2); ctx.fill();
    });

    // Beyaz Top
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(x + 40, y + h / 2, 4.5, 0, Math.PI * 2); ctx.fill();

    // Üçgen Dizili Mini Toplar
    let rackX = x + 125, rackY = y + h / 2;
    ctx.fillStyle = "#dc2626"; // Kırmızı
    ctx.beginPath(); ctx.arc(rackX, rackY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000000"; // 8 numara
    ctx.beginPath(); ctx.arc(rackX + 7, rackY - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#f59e0b"; // Sarı
    ctx.beginPath(); ctx.arc(rackX + 7, rackY + 4, 4, 0, Math.PI * 2); ctx.fill();

    // Çapraz Durmuş Istaka
    ctx.strokeStyle = "#d97706";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x + 18, y + h - 16);
    ctx.lineTo(x + w - 25, y + 18);
    ctx.stroke();

    // Masa Üstü Lamba
    ctx.fillStyle = "rgba(254, 240, 138, 0.15)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2.2, h / 2.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Başlık Rozeti
    ctx.fillStyle = isHover ? "#facc15" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎱 8-Ball Bilardo", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

// TAVLA MASASI ÇİZİMİ
function drawTavlaTableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 8, w, h, 14);
    ctx.fill();

    if (isHover) {
        ctx.shadowColor = "#f59e0b";
        ctx.shadowBlur = 18;
    }

    // Ahşap Çerçeve (Koyu Maun)
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#f59e0b" : "#78350f";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Tavla Ahşap İçi (Ceviz rengi zemin)
    ctx.fillStyle = "#b45309";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 6);
    ctx.fill();

    // Orta ahşap bölme (Bar)
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + w / 2 - 4, y + 10, 8, h - 20);
    // Pirinç Menteşeler
    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + w / 2 - 2, y + 18, 4, 8);
    ctx.fillRect(x + w / 2 - 2, y + h - 26, 4, 8);

    // Tavla Haneleri (Üçgenler)
    let leftW = (w - 28) / 2;
    let pointW = leftW / 6;

    // Sol taraf üst haneler
    for (let i = 0; i < 6; i++) {
        let pX = x + 10 + i * pointW;
        ctx.fillStyle = i % 2 === 0 ? "#7f1d1d" : "#fef08a";
        ctx.beginPath();
        ctx.moveTo(pX, y + 10);
        ctx.lineTo(pX + pointW / 2, y + 36);
        ctx.lineTo(pX + pointW, y + 10);
        ctx.closePath();
        ctx.fill();
    }
    // Sağ taraf üst haneler
    for (let i = 0; i < 6; i++) {
        let pX = x + w / 2 + 4 + i * pointW;
        ctx.fillStyle = i % 2 === 0 ? "#fef08a" : "#7f1d1d";
        ctx.beginPath();
        ctx.moveTo(pX, y + 10);
        ctx.lineTo(pX + pointW / 2, y + 36);
        ctx.lineTo(pX + pointW, y + 10);
        ctx.closePath();
        ctx.fill();
    }

    // Minik pullar masada
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath(); ctx.arc(x + 22, y + 18, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 22, y + 27, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.arc(x + w - 22, y + h - 18, 4.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w - 22, y + h - 27, 4.5, 0, Math.PI * 2); ctx.fill();

    // 2 Adet 3D Zar masanın üstünde
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 18, y + h / 2 - 7, 13, 13, 2); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x + w / 2 + 5, y + h / 2 - 5, 13, 13, 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x + w / 2 - 12, y + h / 2 - 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.beginPath(); ctx.arc(x + w / 2 + 9, y + h / 2 - 1, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w / 2 + 14, y + h / 2 + 3, 1.5, 0, Math.PI * 2); ctx.fill();

    // Sandalyeler (üst ve alt)
    [y - 12, y + h + 4].forEach(sy => {
        ctx.fillStyle = "#78350f";
        ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, sy, 40, 10, 4); ctx.fill();
    });

    // Başlık Rozeti
    ctx.fillStyle = isHover ? "#f59e0b" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🎲 Geleneksel Tavla", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

// BATAK MASASI ÇİZİMİ (3 ve 4 Kişilik Sandalyeli)
function drawBatakTableObj(cx, cy, radius, chairCount, title, isHover) {
    ctx.save();

    // Sandalyeleri Çiz (Masanın etrafında)
    for (let i = 0; i < chairCount; i++) {
        let angle = (i * 2 * Math.PI / chairCount) - Math.PI / 2;
        let chairDist = radius + 15;
        let chX = cx + Math.cos(angle) * chairDist;
        let chY = cy + Math.sin(angle) * chairDist;

        // Sandalye gölgesi
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.arc(chX + 2, chY + 3, 11, 0, Math.PI * 2); ctx.fill();

        // Sandalye sırtı & minderi
        ctx.fillStyle = "#78350f";
        ctx.beginPath(); ctx.arc(chX, chY, 11, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#dc2626"; // Kırmızı kadife minder
        ctx.beginPath(); ctx.arc(chX, chY, 8, 0, Math.PI * 2); ctx.fill();
    }

    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.arc(cx + 4, cy + 6, radius, 0, Math.PI * 2);
    ctx.fill();

    // Hover parlaması
    if (isHover) {
        ctx.shadowColor = "#facc15";
        ctx.shadowBlur = 18;
    }

    // Ahşap Masa Gövdesi
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#facc15" : "#92400e";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Yeşil Keçe Kaplama
    ctx.fillStyle = chairCount === 3 ? "#065f46" : "#047857";
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 8, 0, Math.PI * 2);
    ctx.fill();

    // Masadaki İskambil Kartları
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;

    if (chairCount === 3) {
        // 3 Kartlık Yelpaze
        [-12, 0, 12].forEach((rot, idx) => {
            ctx.save();
            ctx.translate(cx + (idx - 1) * 7, cy);
            ctx.rotate(rot * Math.PI / 180);
            ctx.fillRect(-7, -10, 14, 20);
            ctx.strokeRect(-7, -10, 14, 20);
            ctx.fillStyle = idx === 1 ? "#dc2626" : "#1e293b";
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(idx === 1 ? "♥" : "♠", 0, 3);
            ctx.restore();
        });
    } else {
        // 4 Kartlık Haç Formu
        [[0, -6, "♠", "#1e293b"], [7, 0, "♥", "#dc2626"], [0, 6, "♦", "#dc2626"], [-7, 0, "♣", "#1e293b"]].forEach(c => {
            ctx.save();
            ctx.translate(cx + c[0], cy + c[1]);
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(-6, -9, 12, 18);
            ctx.strokeRect(-6, -9, 12, 18);
            ctx.fillStyle = c[3];
            ctx.font = "8px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(c[2], 0, 3);
            ctx.restore();
        });
    }

    // Masa Başlığı
    ctx.fillStyle = isHover ? "#facc15" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🃏 ${title}`, cx, cy + radius + 18);
    if (isHover) {
        ctx.fillStyle = "#38bdf8";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", cx, cy + radius + 30);
    }
    ctx.restore();
}

// 101 OKEY MASASI ÇİZİMİ
function drawOkey101TableObj(x, y, w, h, isHover) {
    ctx.save();
    // Masa gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 6, w, h, 14);
    ctx.fill();

    if (isHover) {
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 18;
    }

    // Ahşap Çerçeve & Gövde
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? "#38bdf8" : "#92400e";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Yeşil Çuha
    ctx.fillStyle = "#064e3b";
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 8);
    ctx.fill();

    // 4 Adet Istaka (Üst, Alt, Sol, Sağ)
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x + 22, y + 13, w - 44, 9); // Üst
    ctx.fillRect(x + 22, y + h - 22, w - 44, 9); // Alt
    ctx.fillRect(x + 13, y + 24, 9, h - 48); // Sol
    ctx.fillRect(x + w - 22, y + 24, 9, h - 48); // Sağ

    // Istakalar üzerindeki minik taşlar
    ctx.fillStyle = "#fef08a";
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(x + 26 + i * 15, y + 14, 9, 7);
        ctx.fillRect(x + 26 + i * 15, y + h - 21, 9, 7);
    }

    // Ortadaki kapalı taş destesi
    ctx.fillStyle = "#fef08a";
    ctx.fillRect(x + w / 2 - 13, y + h / 2 - 8, 12, 16);
    ctx.fillStyle = "#dc2626";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄", x + w / 2 - 7, y + h / 2 + 4);

    // Açık gösterge taşı
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + w / 2 + 2, y + h / 2 - 8, 12, 16);
    ctx.strokeRect(x + w / 2 + 2, y + h / 2 - 8, 12, 16);
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("7", x + w / 2 + 8, y + h / 2 + 4);

    // Masa Başlığı
    ctx.fillStyle = isHover ? "#38bdf8" : "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄 101 Okey (4 Kişi)", x + w / 2, y + h + 18);
    if (isHover) {
        ctx.fillStyle = "#facc15";
        ctx.font = "10px sans-serif";
        ctx.fillText("(Tıkla ve Katıl / İzle)", x + w / 2, y + h + 30);
    }
    ctx.restore();
}

// B) SOKAK ÇİZİMİ
function drawStreetEnvironment() {
    // 1. Zemin (Gündüz Canlı Yeşil Çim / Gece Derin Alacakaranlık)
    ctx.fillStyle = isNightMode ? "#064e3b" : "#15803d";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gece modu gökyüzü ve yıldızlar
    if (isNightMode) {
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 25; i++) {
            let sx = (i * 137) % canvas.width;
            let sy = (i * 79) % 180;
            let twinkle = (Math.sin(Date.now() / 300 + i) + 1) / 2;
            ctx.globalAlpha = 0.3 + twinkle * 0.7;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1.0;
    }

    // Çim dokusu
    ctx.fillStyle = isNightMode ? "rgba(4, 47, 46, 0.6)" : "rgba(22, 101, 52, 0.4)";
    for (let i = 0; i < 40; i++) {
        let fx = ((i * 73) % canvas.width);
        let fy = ((i * 127) % canvas.height);
        ctx.fillRect(fx, fy, 4, 3);
    }

    // Minik Kır Çiçekleri
    for (let i = 0; i < 15; i++) {
        let fx = ((i * 111) % (canvas.width - 40)) + 20;
        let fy = ((i * 163) % (canvas.height - 40)) + 20;
        if (fy > 220 && fy < 320) continue; // Yolun üstüne çiçek gelmesin
        ctx.fillStyle = i % 2 === 0 ? (isNightMode ? "#ca8a04" : "#fef08a") : (isNightMode ? "#9f1239" : "#fca5a5");
        ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // 2. Taş Döşeli Kaldırım Yolu (Ortadan Geçen Yol)
    let roadY = 240, roadH = 80;
    ctx.fillStyle = isNightMode ? "#334155" : "#64748b";
    ctx.fillRect(0, roadY, canvas.width, roadH);
    ctx.strokeStyle = isNightMode ? "#1e293b" : "#475569";
    ctx.lineWidth = 1.5;
    for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath(); ctx.moveTo(x, roadY); ctx.lineTo(x, roadY + roadH); ctx.stroke();
    }
    for (let y = roadY; y < roadY + roadH; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // 3. SOKAK BİNALARI VE VİTRİNLERİ (5 FARKLI MEKAN CEPHESİ)

    // A) 🏠 EMLAKÇI ALİ BEY (Sol Üst: x: 20, y: 12, w: 220, h: 96)
    let reX = 20, reY = 12, reW = 220, reH = 96;
    ctx.fillStyle = isNightMode ? "#1e1b4b" : "#312e81";
    ctx.beginPath(); ctx.roundRect(reX, reY, reW, reH, 10); ctx.fill();
    ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.stroke();
    // Tente (Altın Sarı & Beyaz)
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#f59e0b" : "#ffffff";
        ctx.fillRect(reX + i * (reW / 8), reY + 28, reW / 8, 16);
    }
    // Tabela
    ctx.fillStyle = "#facc15"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🏠 EMLAKÇI ALİ BEY", reX + reW / 2, reY + 20);
    // Vitrin / Satılık Evler
    ctx.fillStyle = isNightMode ? "rgba(254, 240, 138, 0.3)" : "rgba(255, 255, 255, 0.4)";
    ctx.fillRect(reX + 14, reY + 50, 80, 40);
    ctx.fillStyle = "#facc15"; ctx.font = "bold 9px sans-serif";
    ctx.fillText("SATILIK EVLER", reX + 54, reY + 68);
    ctx.fillStyle = "#cbd5e1"; ctx.font = "8px sans-serif";
    ctx.fillText("500-1500 TL", reX + 54, reY + 80);
    // Kapı
    ctx.fillStyle = "#78350f"; ctx.fillRect(reX + reW - 55, reY + 48, 38, 48);
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(reX + reW - 24, reY + 72, 3, 0, Math.PI * 2); ctx.fill();

    // B) ☕ KAFE & OYUN SALONU (Orta Üst: x: 260, y: 10, w: 280, h: 100)
    let cafeX = 260, cafeY = 10, cafeW = 280, cafeH = 100;
    ctx.fillStyle = isNightMode ? "#0f172a" : "#1e293b";
    ctx.beginPath(); ctx.roundRect(cafeX, cafeY, cafeW, cafeH, 10); ctx.fill();
    ctx.strokeStyle = isNightMode ? "#f59e0b" : "#38bdf8"; ctx.lineWidth = 2; ctx.stroke();
    if (isNightMode) {
        ctx.fillStyle = "rgba(253, 224, 71, 0.4)";
        ctx.fillRect(cafeX + 18, cafeY + 55, 30, 30);
        ctx.fillRect(cafeX + cafeW - 48, cafeY + 55, 30, 30);
    }
    let stripeW = cafeW / 10;
    for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#ef4444" : "#ffffff";
        ctx.fillRect(cafeX + i * stripeW, cafeY + 30, stripeW, 20);
    }
    ctx.fillStyle = "#facc15"; ctx.font = "bold 14px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("☕ KAFE & OYUN SALONU", cafeX + cafeW / 2, cafeY + 22);
    ctx.fillStyle = "#78350f"; ctx.fillRect(cafeX + cafeW / 2 - 20, cafeY + 50, 40, 50);
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(cafeX + cafeW / 2 + 12, cafeY + 75, 3, 0, Math.PI * 2); ctx.fill();

    // C) 💨 NARGİLE LOUNGE (Sağ Üst: x: 560, y: 12, w: 220, h: 96)
    let nrgX = 560, nrgY = 12, nrgW = 220, nrgH = 96;
    ctx.fillStyle = isNightMode ? "#3b0764" : "#581c87";
    ctx.beginPath(); ctx.roundRect(nrgX, nrgY, nrgW, nrgH, 10); ctx.fill();
    ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 2; ctx.stroke();
    // Mor-Bordo Tente
    for (let i = 0; i < 8; i++) {
        ctx.fillStyle = i % 2 === 0 ? "#a855f7" : "#4c1d95";
        ctx.fillRect(nrgX + i * (nrgW / 8), nrgY + 28, nrgW / 8, 16);
    }
    ctx.fillStyle = "#f0abfc"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("💨 NARGİLE & 101", nrgX + nrgW / 2, nrgY + 20);
    // Vitrin & Köz Işıltısı
    ctx.fillStyle = "rgba(244, 114, 182, 0.35)";
    ctx.fillRect(nrgX + 14, nrgY + 50, 75, 40);
    ctx.fillStyle = "#f472b6"; ctx.font = "bold 9px sans-serif";
    ctx.fillText("101 OKEY & ŞARK", nrgX + 51, nrgY + 72);
    // Kapı
    ctx.fillStyle = "#78350f"; ctx.fillRect(nrgX + nrgW - 55, nrgY + 48, 38, 48);
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(nrgX + nrgW - 24, nrgY + 72, 3, 0, Math.PI * 2); ctx.fill();

    // D) 🏢 KONUTLAR & APARTMAN SİTESİ (Sol Alt: x: 20, y: 345, w: 230, h: 125)
    let aptX = 20, aptY = 345, aptW = 230, aptH = 125;
    ctx.fillStyle = isNightMode ? "#0f172a" : "#1e293b";
    ctx.beginPath(); ctx.roundRect(aptX, aptY, aptW, aptH, 12); ctx.fill();
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.stroke();
    // Tabela
    ctx.fillStyle = "#fb923c"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🏢 KONUTLAR & SİTE", aptX + aptW / 2, aptY + 22);
    ctx.fillStyle = "#94a3b8"; ctx.font = "10px sans-serif";
    ctx.fillText("(Arkadaşlarının ve Kendi Evin)", aptX + aptW / 2, aptY + 36);
    // 4 Adet Daire Pencereleri (Işık animasyonlu)
    let winColors = ["#fde047", "#fed7aa", "#fef08a", "#67e8f9"];
    for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 2; c++) {
            ctx.fillStyle = isNightMode ? winColors[(r * 2 + c)] : "rgba(255,255,255,0.4)";
            ctx.fillRect(aptX + 24 + c * 45, aptY + 48 + r * 34, 30, 24);
            ctx.strokeStyle = "#334155"; ctx.lineWidth = 1;
            ctx.strokeRect(aptX + 24 + c * 45, aptY + 48 + r * 34, 30, 24);
        }
    }
    // Ana Giriş Kapısı & Turnike
    ctx.fillStyle = "#0284c7"; ctx.fillRect(aptX + aptW - 65, aptY + 55, 45, 60);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.strokeRect(aptX + aptW - 65, aptY + 55, 45, 60);
    ctx.fillStyle = "#facc15"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("GİRİŞ", aptX + aptW - 42, aptY + 88);

    // E) 🛒 MOBİLYA & EV MARKETİ (Sağ Alt: x: 550, y: 345, w: 230, h: 125)
    let mktX = 550, mktY = 345, mktW = 230, mktH = 125;
    ctx.fillStyle = isNightMode ? "#082f49" : "#075985";
    ctx.beginPath(); ctx.roundRect(mktX, mktY, mktW, mktH, 12); ctx.fill();
    ctx.strokeStyle = "#06b6d4"; ctx.lineWidth = 2; ctx.stroke();
    // Tabela
    ctx.fillStyle = "#22d3ee"; ctx.font = "bold 13px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🛒 MOBİLYA MARKETİ", mktX + mktW / 2, mktY + 22);
    ctx.fillStyle = "#cbd5e1"; ctx.font = "10px sans-serif";
    ctx.fillText("(Şark Sediri, TV, Şömine...)", mktX + mktW / 2, mktY + 36);
    // Geniş Showroom Camı
    ctx.fillStyle = isNightMode ? "rgba(34, 211, 238, 0.25)" : "rgba(255, 255, 255, 0.35)";
    ctx.fillRect(mktX + 16, mktY + 48, 110, 65);
    ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 1.5; ctx.strokeRect(mktX + 16, mktY + 48, 110, 65);
    // Cam vitrinde mini sedir ve lamba silueti
    ctx.fillStyle = "#facc15"; ctx.font = "16px sans-serif";
    ctx.fillText("🛋️", mktX + 50, mktY + 86);
    ctx.fillText("🪵", mktX + 92, mktY + 86);
    // Mağaza Kapısı
    ctx.fillStyle = "#78350f"; ctx.fillRect(mktX + mktW - 65, mktY + 55, 45, 60);
    ctx.strokeStyle = "#facc15"; ctx.lineWidth = 1.5; ctx.strokeRect(mktX + mktW - 65, mktY + 55, 45, 60);
    ctx.fillStyle = "#facc15"; ctx.font = "bold 10px sans-serif";
    ctx.fillText("GİRİŞ", mktX + mktW - 42, mktY + 88);

    // 4. Park Bankları ve Sokak Lambaları
    drawBench(ctx, 270, 215);
    drawBench(ctx, 490, 215);
    drawLampPost(ctx, 250, 230);
    drawLampPost(ctx, 550, 230);
}

function drawTree(ctx, x, y) {
    // Gövde
    ctx.fillStyle = "#5c2c16";
    ctx.fillRect(x - 8, y, 16, 32);
    // Yapraklar
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath(); ctx.arc(x + 2, y + 2, 28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isNightMode ? "#064e3b" : "#166534";
    ctx.beginPath(); ctx.arc(x, y - 6, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = isNightMode ? "#047857" : "#22c55e";
    ctx.beginPath(); ctx.arc(x - 6, y - 12, 16, 0, Math.PI * 2); ctx.fill();
}

function drawBench(ctx, x, y) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, 44, 12);
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(x + 4, y + 12, 4, 8);
    ctx.fillRect(x + 36, y + 12, 4, 8);
}

function drawLampPost(ctx, x, y) {
    // Işık halesi (Gece daha geniş ve parlak)
    let haloRadius = isNightMode ? 70 : 45;
    let haloAlpha = isNightMode ? "rgba(254, 240, 138, 0.28)" : "rgba(254, 240, 138, 0.12)";
    ctx.fillStyle = haloAlpha;
    ctx.beginPath(); ctx.arc(x, y - 40, haloRadius, 0, Math.PI * 2); ctx.fill();

    // Direk
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 40); ctx.stroke();
    // Fener
    ctx.fillStyle = isNightMode ? "#facc15" : "#fef08a";
    ctx.beginPath(); ctx.arc(x, y - 40, 6, 0, Math.PI * 2); ctx.fill();
}

// C) OYUNCU VE ANİMASYON ÇİZİMİ
function drawAnimatedPlayer(p, id) {
    let isMoving = (keys.w || keys.a || keys.s || keys.d) && (id === myId);
    let bob = isMoving ? Math.sin(walkCycle) * 2.5 : 0;
    let legSwing = isMoving ? Math.sin(walkCycle) * 5 : 0;

    let pX = p.x;
    let pY = p.y + bob;

    // Dans efekti (Gövde sağa-sola sallanır)
    let isDancing = (p.action === 'dance');
    let danceTilt = isDancing ? Math.sin(Date.now() / 140) * 0.15 : 0;

    ctx.save();
    if (isDancing) {
        ctx.translate(pX, pY);
        ctx.rotate(danceTilt);
        ctx.translate(-pX, -pY);
    }

    // 1. Yumuşak Zemin Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(pX, p.y + 22, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    let isDressOrSkirt = (p.color && (p.color.startsWith('dress_') || p.color.startsWith('skirt_')));
    let facing = (id === myId) ? myFacing : 'down';

    // 2. Bacaklar & Ayakkabılar (Yürüme Salınımı)
    drawAvatarLegsAndShoes(ctx, pX, pY, legSwing, p.skinColor, p.shoes, isDressOrSkirt);

    // 3. Gövde & Kıyafet
    drawAvatarBodyAndClothes(ctx, pX, pY, p.color, p.skinColor);

    // 4. Kafa (Özelleştirilebilir Ten Rengi)
    let skin = p.skinColor || "#ffd1a4";
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(pX, pY - 18, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 5. Şapkalar & Saç Modelleri
    drawAvatarHairAndHats(ctx, pX, pY, p.hat || 'none', facing);

    // 6. Gözler ve Yüz Aksesuarları
    let eyeOffsetX = 0, eyeOffsetY = 0;
    if (id === myId) {
        if (myFacing === 'left') eyeOffsetX = -3;
        else if (myFacing === 'right') eyeOffsetX = 3;
        else if (myFacing === 'up') eyeOffsetY = -2;
        else eyeOffsetY = 1;
    }
    drawAvatarFaceAndEyes(ctx, pX, pY, p.face || 'none', eyeOffsetX, eyeOffsetY);

    // 7. Sosyal Aksesuarlar & Elde Taşınan Eşyalar (Balık Tutma, Tespih, Balon, Çay, Olta, Gazoz)
    if (p.isFishing) {
        // Balık tutma animasyonu (Misina, esneyen olta, kırmızı şamandıra ve su halkaları)
        ctx.save();
        let fishHandX = pX + 10;
        let fishHandY = pY + 2;
        let rodBend = Math.sin(Date.now() / 240) * 2;
        let tipX = fishHandX + 26;
        let tipY = fishHandY - 18 + rodBend;

        // Karbon Kamış Gövdesi
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fishHandX, fishHandY);
        ctx.quadraticCurveTo(fishHandX + 13, fishHandY - 14, tipX, tipY);
        ctx.stroke();

        // Makara & Kol
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath(); ctx.arc(fishHandX + 4, fishHandY, 3, 0, Math.PI * 2); ctx.fill();

        // Misina
        let floatTargetX = tipX + 16;
        let floatTargetY = tipY + 40;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(floatTargetX, floatTargetY);
        ctx.stroke();

        // Kırmızı-Beyaz Şamandıra (Bobber)
        let bobberAnim = Math.sin(Date.now() / 180) * 2;
        ctx.fillStyle = "#ef4444";
        ctx.beginPath(); ctx.arc(floatTargetX, floatTargetY + bobberAnim, 3.5, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath(); ctx.arc(floatTargetX, floatTargetY + bobberAnim, 3.5, 0, Math.PI); ctx.fill();

        // Su Halka Animasyonu (Dalgalanma)
        let rippleR = ((Date.now() / 35) % 14) + 2;
        let rippleAlpha = 1 - (rippleR / 16);
        ctx.strokeStyle = `rgba(255, 255, 255, ${rippleAlpha * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(floatTargetX, floatTargetY + 3, rippleR, rippleR * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    } else {
        let activeHeld = p.heldItem || (p.hasTea ? 'cay' : 'none');
        drawHeldItem(ctx, pX, pY, activeHeld, false, (id === myId) ? myFacing : 'down');
    }

    // 8. El Sallama Animasyonu
    if (p.action === 'wave') {
        let waveArmAngle = Math.sin(Date.now() / 90) * 0.4 - 0.7;
        ctx.save();
        ctx.translate(pX + 10, pY - 5);
        ctx.rotate(waveArmAngle);
        ctx.fillStyle = p.color;
        ctx.fillRect(0, -12, 4, 12);
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(2, -14, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // 9. Alkış Animasyonu
    if (p.action === 'clap') {
        let clapOffset = Math.abs(Math.sin(Date.now() / 80)) * 4;
        ctx.fillStyle = "#facc15";
        ctx.beginPath(); ctx.arc(pX - 4 + clapOffset, pY + 2, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(pX + 4 - clapOffset, pY + 2, 3, 0, Math.PI * 2); ctx.fill();
        // Kıvılcım
        ctx.fillStyle = "#facc15";
        ctx.font = "10px sans-serif";
        ctx.fillText("✨", pX + 8, pY);
    }

    // 10. Dans Eden Nota Simgeleri
    if (isDancing) {
        let noteY = pY - 38 - ((Date.now() / 50) % 12);
        ctx.fillStyle = "#ec4899";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("♪ ♫", pX + 10, noteY);
    }

    ctx.restore(); // Dans tilt restorasyonu

    // 10.1 Kuğu Deniz Bisikleti (Sahilde kiralanmışsa oyuncunun altındaki kuğu pedalo)
    if (currentRoom === 'sahil' && p.hasSwanBoat) {
        ctx.save();
        // Kuğu teknesi gövdesi
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(pX, pY + 16, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Kuğu boynu ve başı
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(pX + 14, pY + 16);
        ctx.quadraticCurveTo(pX + 24, pY - 2, pX + 18, pY - 8);
        ctx.lineTo(pX + 13, pY - 8);
        ctx.quadraticCurveTo(pX + 16, pY + 4, pX + 10, pY + 16);
        ctx.closePath();
        ctx.fill();

        // Kuğu gagası (turuncu) & göz (siyah)
        ctx.fillStyle = "#f97316";
        ctx.beginPath();
        ctx.moveTo(pX + 18, pY - 8);
        ctx.lineTo(pX + 24, pY - 5);
        ctx.lineTo(pX + 18, pY - 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(pX + 16, pY - 6, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Su köpüğü & dalgası
        let ripple = Math.sin(Date.now() / 200) * 2;
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pX, pY + 20, 26 + ripple, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // 10.2 Nargile Duman Efekti (Nargile tutulurken veya Nargile Cafe'deyken duman yükselir)
    if (p.heldItem === 'nargile' || currentRoom === 'nargile_cafe') {
        let smokeTime = Date.now();
        for (let i = 0; i < 3; i++) {
            let offsetTime = (smokeTime / 450 + i * 2) % 6;
            let smokeAlpha = Math.max(0, 1 - (offsetTime / 6));
            let smokeY = pY - 28 - (offsetTime * 8);
            let smokeX = pX + Math.sin(offsetTime * 1.5 + i) * 6;
            let smokeR = 3 + offsetTime * 2.2;

            ctx.fillStyle = `rgba(240, 240, 255, ${smokeAlpha * 0.45})`;
            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 11. Oyuncu İsmi Rozeti
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    let nameWidth = ctx.measureText(p.name).width;
    ctx.roundRect(pX - nameWidth / 2 - 6, pY - 42, nameWidth + 12, 16, 6);
    ctx.fill();
    ctx.fillStyle = id === myId ? "#38bdf8" : "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(p.name, pX, pY - 30);

    // 12. Sanalika Tarzı Konuşma Baloncukları (Kuyruklu)
    if (activeChatBubbles[id] && activeChatBubbles[id].length > 0) {
        let bubbles = activeChatBubbles[id];
        let bubbleY = pY - 54;

        for (let i = bubbles.length - 1; i >= 0; i--) {
            let text = bubbles[i].text;

            ctx.font = "12px sans-serif";
            let textWidth = ctx.measureText(text).width;
            let boxWidth = Math.max(textWidth + 18, 44);
            let boxHeight = 26;

            // Balon gövdesi
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.roundRect(pX - boxWidth / 2, bubbleY - boxHeight, boxWidth, boxHeight, 8);
            ctx.fill();
            ctx.strokeStyle = "#334155";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Balon üçgen kuyruğu (ilk balon için kafaya işaret eder)
            if (i === bubbles.length - 1) {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.moveTo(pX - 4, bubbleY);
                ctx.lineTo(pX, bubbleY + 5);
                ctx.lineTo(pX + 4, bubbleY);
                ctx.fill();
            }

            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "center";
            ctx.fillText(text, pX, bubbleY - 8);

            bubbleY -= (boxHeight + 6);
        }
    }
}

// --- 10. ANA OYUN VE ÇİZİM DÖNGÜSÜ (GAME LOOP) ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Ortamı Çiz
    if (currentRoom === "kafe") {
        drawCafeEnvironment();
    } else if (currentRoom === "sahil") {
        drawBeachEnvironment();
    } else if (currentRoom === "nargile_cafe") {
        drawNargileCafeEnvironment();
    } else if (currentRoom === "market") {
        drawMarketEnvironment();
    } else if (currentRoom.startsWith("house_")) {
        if (typeof drawHouseEnvironment === 'function') drawHouseEnvironment();
    } else {
        drawStreetEnvironment();
    }

    // 2. Kendi Oyuncumuzu Hareket Ettir (Sadece Klavye, Yön Tuşları ve Mobil D-Pad)
    if (players[myId]) {
        let speed = 3.6;
        let p = players[myId];
        let isMoving = false;

        if (keys.w || keys.s || keys.a || keys.d) {
            if (keys.w) { p.y -= speed; isMoving = true; }
            if (keys.s) { p.y += speed; isMoving = true; }
            if (keys.a) { p.x -= speed; isMoving = true; }
            if (keys.d) { p.x += speed; isMoving = true; }
        }

        if (isMoving) walkCycle += 0.28;

        p.x = Math.max(20, Math.min(canvas.width - 20, p.x));
        p.y = Math.max(40, Math.min(canvas.height - 25, p.y));

        socket.emit('playerMovement', { x: p.x, y: p.y });
    }

    // 3. Tüm Oyuncuları Çiz
    for (let id in players) {
        drawAnimatedPlayer(players[id], id);
    }

    requestAnimationFrame(gameLoop);
}

// --- 11. SAHİL VE DENİZ ÇİZİMİ (BEACH ENVIRONMENT) ---
function drawBeachEnvironment() {
    let now = Date.now();

    // 1. Berrak Turkuaz Deniz (Sol ve Üst Kısım)
    let oceanGrad = ctx.createLinearGradient(0, 0, canvas.width * 0.7, canvas.height * 0.7);
    oceanGrad.addColorStop(0, '#0284c7');
    oceanGrad.addColorStop(0.5, '#0ea5e9');
    oceanGrad.addColorStop(1, '#38bdf8');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Deniz İçi Canlı Su Dalgalanmaları & Işık Kırılmaları
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) {
        let waveY = 60 + i * 45;
        let waveOffset = Math.sin((now / 1200) + i) * 18;
        ctx.beginPath();
        ctx.moveTo(0, waveY + waveOffset);
        ctx.bezierCurveTo(
            150, waveY - 12 + waveOffset,
            300, waveY + 12 + waveOffset,
            450, waveY + waveOffset
        );
        ctx.stroke();
    }

    // 3. Sıcak Altın Kumsal (Sağ-Alt Kıyı Şeridi)
    let sandGrad = ctx.createLinearGradient(350, 200, canvas.width, canvas.height);
    sandGrad.addColorStop(0, '#fef08a');
    sandGrad.addColorStop(1, '#fde047');

    let tide = Math.sin(now / 1400) * 8; // Gelgit animasyonu

    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(180 + tide, canvas.height);
    ctx.bezierCurveTo(
        310 + tide, 380,
        420 + tide, 240,
        canvas.width, 140 + tide * 0.5
    );
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fill();

    // 3.1 Islak Kum & Beyaz Dalga Köpükleri
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(180 + tide, canvas.height);
    ctx.bezierCurveTo(
        310 + tide, 380,
        420 + tide, 240,
        canvas.width, 140 + tide * 0.5
    );
    ctx.stroke();

    // İkinci ince köpük çizgisi
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(172 + tide, canvas.height);
    ctx.bezierCurveTo(
        302 + tide, 380,
        412 + tide, 240,
        canvas.width, 132 + tide * 0.5
    );
    ctx.stroke();

    // 3.2 Kumsaldaki Deniz Kabukları & Çakıllar
    let shells = [
        { x: 530, y: 340, c: '#fda4af' },
        { x: 620, y: 410, c: '#fed7aa' },
        { x: 470, y: 440, c: '#fbcfe8' },
        { x: 690, y: 280, c: '#fef08a' },
        { x: 740, y: 390, c: '#fed7aa' }
    ];
    shells.forEach(s => {
        ctx.fillStyle = s.c;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.15)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
    });

    // 3.3 Plaj Şemsiyesi ve Havlu (Kumsalda Sağda)
    // Plaj Havlusu
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.roundRect(640, 310, 48, 26, 4);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(652, 310, 8, 26);
    ctx.fillRect(668, 310, 8, 26);

    // Güneş Şemsiyesi
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(715, 335);
    ctx.lineTo(715, 290);
    ctx.stroke();
    // Şemsiye Kubbesi
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(715, 288, 26, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(715, 262);
    ctx.lineTo(705, 288);
    ctx.lineTo(725, 288);
    ctx.closePath();
    ctx.fill();

    // 4. AHŞAP BALIKÇILIK İSKELESİ (Wooden Pier)
    // İskele kumsaldan denizin ortasına doğru uzanır
    let pierX = 80, pierY = 160, pierW = 390, pierH = 65;

    // İskele Altı Ayakları (Pilings in Water)
    let pilingsX = [95, 175, 255, 335, 415];
    pilingsX.forEach(px => {
        // Su altı gölgesi
        ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
        ctx.fillRect(px - 1, pierY + pierH, 14, 28);

        // Ahşap Direk
        ctx.fillStyle = "#451a03";
        ctx.fillRect(px, pierY + pierH, 10, 24);
        ctx.fillStyle = "#78350f";
        ctx.fillRect(px + 2, pierY + pierH, 6, 24);

        // Su yüzey halkası
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(px + 5, pierY + pierH + 22, 9, 3.5, 0, 0, Math.PI * 2);
        ctx.stroke();
    });

    // İskele Güvertesi Gölgesi
    ctx.fillStyle = "rgba(15, 23, 42, 0.35)";
    ctx.fillRect(pierX + 4, pierY + 6, pierW, pierH);

    // İskele Ahşap Tahtaları
    ctx.fillStyle = "#78350f";
    ctx.fillRect(pierX, pierY, pierW, pierH);
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 2;
    ctx.strokeRect(pierX, pierY, pierW, pierH);

    // Tahta aralıkları & çivi detayları
    ctx.strokeStyle = "#451a03";
    ctx.lineWidth = 1.2;
    for (let x = pierX + 16; x < pierX + pierW; x += 18) {
        ctx.beginPath();
        ctx.moveTo(x, pierY);
        ctx.lineTo(x, pierY + pierH);
        ctx.stroke();

        // Minik çiviler
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(x - 8, pierY + 4, 1.5, 1.5);
        ctx.fillRect(x - 8, pierY + pierH - 6, 1.5, 1.5);
    }

    // İskele Kenar Korkuluk Babaları (Bollards / Posts)
    let bollards = [pierX + 10, pierX + 130, pierX + 250, pierX + 370];
    bollards.forEach(bx => {
        ctx.fillStyle = "#92400e";
        ctx.beginPath();
        ctx.roundRect(bx, pierY - 10, 10, 14, 2);
        ctx.fill();
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1;
        ctx.stroke();
    });

    // İskele Üzerindeki Balıkçı Kovası
    ctx.fillStyle = "#0284c7"; // Mavi kova
    ctx.beginPath();
    ctx.roundRect(pierX + 30, pierY + 12, 16, 18, 2);
    ctx.fill();
    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(pierX + 32, pierY + 12, 12, 3);
    // Kovadan dışarı sarkan turuncu balık kuyruğu!
    ctx.fillStyle = "#f97316";
    ctx.beginPath();
    ctx.moveTo(pierX + 42, pierY + 10);
    ctx.lineTo(pierX + 49, pierY + 3);
    ctx.lineTo(pierX + 46, pierY + 12);
    ctx.closePath();
    ctx.fill();

    // 5. Uçan Martılar (Animated Flying Seagulls)
    let gulls = [
        { baseX: 160, baseY: 65, speed: 1.8, span: 12 },
        { baseX: 340, baseY: 90, speed: 1.4, span: 9 },
        { baseX: 510, baseY: 45, speed: 2.1, span: 14 }
    ];
    gulls.forEach((g, idx) => {
        let gx = (g.baseX + (now / 40) * g.speed) % (canvas.width + 40) - 20;
        let gy = g.baseY + Math.sin((now / 350) + idx) * 6;
        let wingFlap = Math.sin(now / 120) * 4;

        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx - g.span, gy + wingFlap);
        ctx.quadraticCurveTo(gx - g.span / 2, gy - 3, gx, gy);
        ctx.quadraticCurveTo(gx + g.span / 2, gy - 3, gx + g.span, gy + wingFlap);
        ctx.stroke();
    });

    // 5.1 KUĞU DENİZ BİSİKLETİ KİRALAMA İSKELESİ (Sağ Kumsalda)
    let swanPierX = 620, swanPierY = 210, swanPierW = 150, swanPierH = 75;
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(swanPierX, swanPierY, swanPierW, swanPierH, 8); ctx.fill();
    ctx.strokeStyle = "#f43f5e";
    ctx.lineWidth = 2;
    ctx.stroke();

    for (let x = swanPierX + 15; x < swanPierX + swanPierW; x += 15) {
        ctx.strokeStyle = "#451a03";
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, swanPierY); ctx.lineTo(x, swanPierY + swanPierH); ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🦢 KUĞU BİSİKLETİ", swanPierX + swanPierW / 2, swanPierY + 24);
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("20 TL (Tıkla Kirala)", swanPierX + swanPierW / 2, swanPierY + 42);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "9px sans-serif";
    ctx.fillText("Derin Deniz & Nadir İnci", swanPierX + swanPierW / 2, swanPierY + 58);

    // 6. Bilgilendirme ve Tıklama Rozeti (Sahil Başlığı)
    let isWaterHover = (canvasMouseX < 560 || canvasMouseY < 320);
    ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
    ctx.beginPath();
    ctx.roundRect(18, 16, 310, 34, 10);
    ctx.fill();
    ctx.strokeStyle = isWaterHover ? "#38bdf8" : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isWaterHover ? "#38bdf8" : "#fef08a";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🎣 Martı Sahili & Balıkçılık İskelesi", 30, 32);

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.fillText(isWaterHover ? "✨ Oltanı atmak için tıkla (10 sn bekle)!" : "💡 Denize veya iskeleye tıkla, balık tut!", 30, 44);
}

// --- 11.1 NARGİLE CAFE & 101 MASASI ÇİZİMİ ---
function drawNargileCafeEnvironment() {
    let now = Date.now();

    // 1. Zemin: Şık Koyu Bordo / Otantik Doğu Halısı
    ctx.fillStyle = "#450a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Otantik halı bordürü
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 4;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);
    ctx.strokeStyle = "#991b1b";
    ctx.lineWidth = 2;
    ctx.strokeRect(22, 22, canvas.width - 44, canvas.height - 44);

    // Halı geometrik desenleri
    ctx.fillStyle = "rgba(180, 83, 9, 0.25)";
    for (let x = 60; x < canvas.width - 60; x += 110) {
        for (let y = 60; y < canvas.height - 60; y += 110) {
            ctx.beginPath();
            ctx.arc(x, y, 22, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // 2. Üst Tabela
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 185, 8, 370, 36, 10);
    ctx.fill();
    ctx.strokeStyle = "#c084fc";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("💨 OTANTİK NARGİLE LOUNGE & 101 SALONU", canvas.width / 2, 32);

    // 3. Şark Köşeleri (Köşelere yerleştirilmiş, ferah nargile alanları)
    drawOrientalCorner(ctx, 35, 60, 95, 95);
    drawOrientalCorner(ctx, 670, 60, 95, 95);

    // 4. İKİ ADET 101 OKEY MASASI:
    // Sol Masa: 👤 TEKLİ 101 OKEY (Bireysel - 4 Kişi)
    // Sağ Masa: 👥 ÇİFTLİ / EŞLİ 101 OKEY (2v2 Kıraathane & A4 Yazboz)
    let isHoverTekli = (canvasMouseX >= 145 && canvasMouseX <= 365 && canvasMouseY >= 160 && canvasMouseY <= 360);
    let isHoverEsli = (canvasMouseX >= 435 && canvasMouseX <= 655 && canvasMouseY >= 160 && canvasMouseY <= 360);

    drawNargileOkeyTable(ctx, 160, 175, 190, 135, 'okey101_tekli', '👤 TEKLİ 101 OKEY', '(Bireysel - 4 Kişi)', '#0f766e', '#38bdf8', isHoverTekli);
    drawNargileOkeyTable(ctx, 450, 175, 190, 135, 'okey101', '👥 ÇİFTLİ / EŞLİ 101', '(2v2 Kıraathane & A4 Yazboz)', '#15803d', '#4ade80', isHoverEsli);

    // 5. Nargile Köz Semaveri / Tezgahı (Sol Altta)
    drawHookahCounter(ctx, 75, 380);

    // 6. Çıkış Kapısı (Sağ Altta)
    drawExitDoor(ctx, canvas.width - 80, canvas.height - 65, "🚪 SOKAK");
}

function drawNargileOkeyTable(ctx, x, y, w, h, tableId, title, subTitle, feltColor, accentColor, isHover) {
    ctx.save();

    // 1. Dört Sandalye (Üst, Alt, Sol, Sağ)
    let chairPad = 12;
    // Üst sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 24, y - chairPad, 48, 10, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, y - chairPad + 2, 40, 6, 2); ctx.fill();
    // Alt sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 24, y + h + 2, 48, 10, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 20, y + h + 4, 40, 6, 2); ctx.fill();
    // Sol sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x - chairPad, y + h / 2 - 20, 10, 40, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x - chairPad + 2, y + h / 2 - 16, 6, 32, 2); ctx.fill();
    // Sağ sandalye
    ctx.fillStyle = "#78350f";
    ctx.beginPath(); ctx.roundRect(x + w + 2, y + h / 2 - 20, 10, 40, 4); ctx.fill();
    ctx.fillStyle = feltColor;
    ctx.beginPath(); ctx.roundRect(x + w + 4, y + h / 2 - 16, 6, 32, 2); ctx.fill();

    // 2. Masa Gölgesi
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.beginPath();
    ctx.roundRect(x + 5, y + 7, w, h, 14);
    ctx.fill();

    // 3. Hover Parlaması
    if (isHover) {
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 20;
    }

    // 4. Lüks Ahşap Çerçeve & Altın Detay
    ctx.fillStyle = "#451a03";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = isHover ? accentColor : "#ca8a04";
    ctx.lineWidth = isHover ? 3 : 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Kadife / Çuha Zemin
    ctx.fillStyle = feltColor;
    ctx.beginPath();
    ctx.roundRect(x + 10, y + 10, w - 20, h - 20, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 6. Dört Istaka (Ahşap)
    ctx.fillStyle = "#b45309";
    ctx.fillRect(x + 32, y + 13, w - 64, 11); // Üst
    ctx.fillRect(x + 32, y + h - 24, w - 64, 11); // Alt
    ctx.fillRect(x + 13, y + 26, 11, h - 52); // Sol
    ctx.fillRect(x + w - 24, y + 26, 11, h - 52); // Sağ

    // Istaka üzerindeki minik taşlar (Fildişi)
    ctx.fillStyle = "#fef08a";
    for (let i = 0; i < 7; i++) {
        ctx.fillRect(x + 36 + i * 16, y + 15, 11, 8);
        ctx.fillRect(x + 36 + i * 16, y + h - 22, 11, 8);
    }
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(x + 14, y + 30 + i * 18, 9, 12);
        ctx.fillRect(x + w - 23, y + 30 + i * 18, 9, 12);
    }

    // 7. Ortadaki Taş Destesi ve Gösterge Taşı
    // Taş destesi (kapalı)
    ctx.fillStyle = "#fef9c3";
    ctx.fillRect(x + w / 2 - 18, y + h / 2 - 9, 15, 18);
    ctx.strokeStyle = "#78350f";
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + w / 2 - 18, y + h / 2 - 9, 15, 18);
    ctx.fillStyle = "#b45309";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🀄", x + w / 2 - 10, y + h / 2 + 5);

    // Açık gösterge taşı
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + w / 2 + 2, y + h / 2 - 9, 15, 18);
    ctx.strokeRect(x + w / 2 + 2, y + h / 2 - 9, 15, 18);
    ctx.fillStyle = (tableId === 'okey101_tekli') ? "#0284c7" : "#dc2626";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText((tableId === 'okey101_tekli') ? "7" : "10", x + w / 2 + 10, y + h / 2 + 4);

    // 8. Tabela & Rozet (Masa Altında)
    let badgeBg = isHover ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.82)";
    ctx.fillStyle = badgeBg;
    ctx.beginPath();
    ctx.roundRect(x + w / 2 - 82, y + h + 15, 164, 30, 8);
    ctx.fill();
    ctx.strokeStyle = isHover ? accentColor : "rgba(250, 204, 21, 0.35)";
    ctx.lineWidth = isHover ? 1.8 : 1;
    ctx.stroke();

    ctx.fillStyle = isHover ? accentColor : "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, x + w / 2, y + h + 28);

    ctx.fillStyle = isHover ? "#f8fafc" : "#94a3b8";
    ctx.font = "9px sans-serif";
    ctx.fillText(subTitle, x + w / 2, y + h + 40);

    ctx.restore();
}

// --- 11.2 MOBİLYA MARKETİ ÇİZİMİ ---
function drawMarketEnvironment() {
    let now = Date.now();

    // 1. Zemin: Lüks Açık Meşe Showroom Parkesi ve Halı Yolluklar
    ctx.fillStyle = "#b45309";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Parke derz çizgileri
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 28) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }
    for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }

    // Ana Showroom Halı Yolluğu (Kırmızı & Altın Bordürlü)
    ctx.fillStyle = "#881337";
    ctx.fillRect(265, 0, 70, canvas.height);
    ctx.fillRect(0, 260, canvas.width, 36);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(267, 0, 66, canvas.height);
    ctx.strokeRect(0, 262, canvas.width, 32);

    // 2. Üst Tabela
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.beginPath();
    ctx.roundRect(canvas.width / 2 - 190, 6, 380, 36, 10);
    ctx.fill();
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🛒 MOBİLYA & EV DEKORASYON MARKETİ", canvas.width / 2, 30);

    // 3. Duvar Teşhir Rafları (Dolu, Canlı ve Şık Mağaza Rafları)
    drawMarketWallShelves(ctx, 30, 48, 480, 80);

    // 4. Kasiyer Hasan ve Danışma Tezgahı (Sağ Üstte)
    let kX = 660, kY = 88;
    ctx.fillStyle = "#451a03";
    ctx.fillRect(kX - 65, kY + 6, 130, 42);
    ctx.fillStyle = "#78350f";
    ctx.fillRect(kX - 60, kY + 10, 120, 34);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(kX - 65, kY + 6, 130, 42);

    // Kasa / POS Terminali
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(kX - 45, kY - 4, 28, 14);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(kX - 43, kY - 2, 24, 10);
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.arc(kX - 10, kY + 4, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("KASİYER HASAN", kX + 10, kY + 32);

    // Kasiyer NPC Karakteri
    ctx.fillStyle = "#10b981";
    ctx.fillRect(kX + 5, kY - 14, 24, 24);
    ctx.fillStyle = "#ffd1a4";
    ctx.beginPath(); ctx.arc(kX + 17, kY - 24, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(kX + 5, kY - 32, 24, 6);

    // Konuşma Balonu
    let bobY = Math.sin(now / 300) * 3;
    ctx.fillStyle = "rgba(15, 23, 42, 0.95)";
    ctx.beginPath();
    ctx.roundRect(kX - 110, kY - 74 + bobY, 220, 32, 8);
    ctx.fill();
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("👋 Hoş Geldiniz! Tıklayıp Eşya Satın Alın!", kX, kY - 54 + bobY);

    // 5. BEŞ ADET ZENGİN SHOWROOM PODYUMU:
    // Podyum 1: Salon & Şark Köşesi (Sol Üst)
    drawShowroomPodium(ctx, 135, 195, 200, 100, "🛋️ Otantik Şark Sediri & Halı");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'hali', x: 135, y: 195 });
        drawPlacedFurniture(ctx, { id: 'sedir', x: 135, y: 185 });
    }

    // Podyum 2: RGB Gaming & Retro Atari (Orta Üst)
    drawShowroomPodium(ctx, 450, 195, 200, 100, "🎮 RGB Gaming PC & Retro Atari");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'bilgisayar', x: 415, y: 195 });
        drawPlacedFurniture(ctx, { id: 'arcade', x: 495, y: 190 });
    }

    // Podyum 3: Smart TV & Doğal Taş Şömine (Sol Alt)
    drawShowroomPodium(ctx, 135, 375, 200, 110, "📺 Smart TV & Doğal Taş Şömine");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'tv', x: 85, y: 375 });
        drawPlacedFurniture(ctx, { id: 'somine', x: 185, y: 375 });
    }

    // Podyum 4: Piyano & Kütüphane (Orta Alt)
    drawShowroomPodium(ctx, 450, 375, 200, 110, "🎹 Kuyruklu Piyano & Kütüphane");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'piyano', x: 410, y: 375 });
        drawPlacedFurniture(ctx, { id: 'kitaplik', x: 495, y: 370 });
    }

    // Podyum 5: Resif Akvaryumu & Lüks Deri Berjer (Sağ Taraf)
    drawShowroomPodium(ctx, 675, 260, 185, 150, "🐠 Canlı Akvaryum & Berjer");
    if (typeof drawPlacedFurniture === 'function') {
        drawPlacedFurniture(ctx, { id: 'akvaryum', x: 675, y: 220 });
        drawPlacedFurniture(ctx, { id: 'berjer', x: 640, y: 280 });
        drawPlacedFurniture(ctx, { id: 'gramofon', x: 715, y: 280 });
    }

    // Tavan Ray Spotları (Showroom Aydınlatmaları)
    drawCeilingTrackLights(ctx);

    // 6. Çıkış Kapısı (Orta Altta)
    drawExitDoor(ctx, canvas.width / 2 - 25, canvas.height - 65, "🚪 SOKAK");
}

function drawMarketWallShelves(ctx, x, y, w, h) {
    ctx.save();
    // Ahşap Arka Panel
    ctx.fillStyle = "#3e1c07";
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = "#ca8a04"; ctx.lineWidth = 1.5; ctx.stroke();

    // 2 Adet Masif Raf Tablası
    let r1 = y + 36;
    let r2 = y + 74;
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x + 4, r1, w - 8, 6);
    ctx.fillRect(x + 4, r2, w - 8, 6);
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(x + 4, r1 + 5, w - 8, 1.5);
    ctx.fillRect(x + 4, r2 + 5, w - 8, 1.5);

    // 1. Üst Raftaki Eşyalar:
    // Masa Lambası (Sarı abajur)
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.moveTo(x + 24, r1 - 22); ctx.lineTo(x + 36, r1 - 22); ctx.lineTo(x + 42, r1 - 10); ctx.lineTo(x + 18, r1 - 10); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 28, r1 - 10, 4, 10); ctx.fillRect(x + 24, r1, 12, 2);

    // Renkli Kitap Dizisi
    let bColors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
    bColors.forEach((bc, i) => {
        ctx.fillStyle = bc;
        ctx.fillRect(x + 56 + i * 8, r1 - 24, 6, 24);
        ctx.fillStyle = "#fef08a"; ctx.fillRect(x + 56 + i * 8, r1 - 20, 6, 1.5);
    });

    // Porselen Vazo ve Çiçekler
    ctx.fillStyle = "#38bdf8";
    ctx.beginPath(); ctx.ellipse(x + 130, r1 - 8, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ec4899"; ctx.beginPath(); ctx.arc(x + 130, r1 - 18, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 135, r1 - 15, 3, 0, Math.PI * 2); ctx.fill();

    // Rulo Halılar
    ctx.fillStyle = "#991b1b"; ctx.beginPath(); ctx.roundRect(x + 160, r1 - 14, 34, 12, 4); ctx.fill();
    ctx.fillStyle = "#1e3a8a"; ctx.beginPath(); ctx.roundRect(x + 198, r1 - 14, 34, 12, 4); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 162, r1 - 10, 2, 8); ctx.fillRect(x + 200, r1 - 10, 2, 8);

    // Altın Şamdan ve Mumlar
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 255, r1 - 18, 3, 18);
    ctx.fillRect(x + 248, r1 - 12, 17, 3);
    ctx.fillStyle = "#ea580c"; ctx.beginPath(); ctx.arc(x + 256.5, r1 - 21, 2, 0, Math.PI * 2); ctx.fill();

    // Antika Küre
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 295, r1 - 6, 4, 6);
    ctx.fillStyle = "#0284c7"; ctx.beginPath(); ctx.arc(x + 297, r1 - 14, 7, 0, Math.PI * 2); ctx.fill();

    // Monstera Saksı & Ficus
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(x + 330, r1 - 12, 14, 12);
    ctx.fillStyle = "#16a34a"; ctx.beginPath(); ctx.arc(x + 337, r1 - 16, 7, 0, Math.PI * 2); ctx.fill();

    // Vintage Radyo
    ctx.fillStyle = "#78350f"; ctx.beginPath(); ctx.roundRect(x + 370, r1 - 16, 26, 16, 3); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.beginPath(); ctx.arc(x + 378, r1 - 8, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1e293b"; ctx.fillRect(x + 386, r1 - 12, 7, 4);

    // İndirim Rozeti
    ctx.fillStyle = "#dc2626"; ctx.beginPath(); ctx.roundRect(x + 420, r1 - 20, 52, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("🏷️ %20 İNDİRİM", x + 446, r1 - 8);

    // 2. Alt Raftaki Eşyalar:
    // Hediyelik Kutular
    ctx.fillStyle = "#0284c7"; ctx.fillRect(x + 20, r2 - 16, 22, 16);
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 29, r2 - 16, 4, 16); ctx.fillRect(x + 20, r2 - 9, 22, 4);

    ctx.fillStyle = "#ec4899"; ctx.fillRect(x + 50, r2 - 14, 18, 14);
    ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 57, r2 - 14, 4, 14);

    // Ansiklopedi Seti
    for (let j = 0; j < 8; j++) {
        ctx.fillStyle = (j % 2 === 0) ? "#1e293b" : "#7f1d1d";
        ctx.fillRect(x + 85 + j * 7, r2 - 20, 6, 20);
    }

    // Mini Masa Lambası
    ctx.fillStyle = "#38bdf8"; ctx.beginPath(); ctx.moveTo(x + 165, r2 - 16); ctx.lineTo(x + 179, r2 - 16); ctx.lineTo(x + 183, r2 - 6); ctx.lineTo(x + 161, r2 - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#64748b"; ctx.fillRect(x + 169, r2 - 6, 2, 6);

    // Cam Fanus & Sukulent
    ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(x + 215, r2 - 11, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(x + 215, r2 - 8, 4, 0, Math.PI * 2); ctx.fill();

    // Ahşap Sandık
    ctx.fillStyle = "#5c2306"; ctx.beginPath(); ctx.roundRect(x + 245, r2 - 14, 22, 14, 3); ctx.fill();
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 253, r2 - 9, 6, 4);

    // Fotoğraf Çerçeveleri
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 285, r2 - 18, 15, 18);
    ctx.fillStyle = "#38bdf8"; ctx.fillRect(x + 287, r2 - 16, 11, 14);
    ctx.fillStyle = "#ca8a04"; ctx.fillRect(x + 305, r2 - 16, 14, 16);
    ctx.fillStyle = "#facc15"; ctx.fillRect(x + 307, r2 - 14, 10, 12);

    // Kaktüs Serisi
    ctx.fillStyle = "#b45309"; ctx.fillRect(x + 338, r2 - 8, 10, 8); ctx.fillRect(x + 355, r2 - 8, 10, 8);
    ctx.fillStyle = "#15803d"; ctx.beginPath(); ctx.arc(x + 343, r2 - 12, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 360, r2 - 14, 5, 0, Math.PI * 2); ctx.fill();

    // "YENİ GELENLER" Tabelası
    ctx.fillStyle = "#059669"; ctx.beginPath(); ctx.roundRect(x + 385, r2 - 18, 70, 18, 4); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.font = "bold 9px sans-serif"; ctx.textAlign = "center";
    ctx.fillText("✨ YENİ SEZON", x + 420, r2 - 6);

    ctx.restore();
}

function drawCeilingTrackLights(ctx) {
    ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(40, 2); ctx.lineTo(canvas.width - 40, 2); ctx.stroke();

    let spots = [135, 295, 450, 600, 710];
    spots.forEach(sx => {
        ctx.fillStyle = "#64748b";
        ctx.fillRect(sx - 3, 2, 6, 6);
        ctx.fillStyle = "#1e293b";
        ctx.beginPath(); ctx.arc(sx, 11, 5, 0, Math.PI * 2); ctx.fill();

        let halo = ctx.createRadialGradient(sx, 12, 1, sx, 80, 70);
        halo.addColorStop(0, "rgba(254, 240, 138, 0.16)");
        halo.addColorStop(1, "transparent");
        ctx.fillStyle = halo;
        ctx.beginPath(); ctx.arc(sx, 80, 70, 0, Math.PI * 2); ctx.fill();
    });
}

function drawShowroomPodium(ctx, x, y, w, h, label) {
    ctx.fillStyle = "rgba(15, 23, 42, 0.5)";
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#cbd5e1";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x, y + h / 2 + 14);
}

function drawExitDoor(ctx, x, y, label) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x, y, 50, 55);
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 50, 55);
    ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.arc(x + 40, y + 28, 3, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + 25, y - 8);
}

function drawOrientalCorner(ctx, x, y, w, h) {
    ctx.fillStyle = "#831843";
    ctx.fillRect(x, y, w, 24);
    ctx.fillRect(x, y, 24, h);
    ctx.fillStyle = "#9d174d";
    ctx.fillRect(x, y - 8, w, 8);
    ctx.fillRect(x - 8, y, 8, h);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(x + 10, y + 2, 14, 12);
    ctx.fillRect(x + 40, y + 2, 14, 12);
    ctx.fillRect(x + 2, y + 35, 12, 14);

    let sx = x + w / 2 + 10;
    let sy = y + h / 2 + 10;
    ctx.fillStyle = "#ca8a04";
    ctx.beginPath(); ctx.arc(sx, sy, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#0284c7";
    ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
}

function drawHookahCounter(ctx, x, y) {
    ctx.fillStyle = "#78350f";
    ctx.fillRect(x - 30, y, 90, 40);
    ctx.fillStyle = "#b45309";
    ctx.beginPath(); ctx.arc(x + 15, y - 5, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(x + 15, y - 7, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#facc15";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🔥 Köz & Nargile", x + 15, y + 24);
}

// --- 12. BALIK TUTMA SİSTEMİ İŞLEYİCİLERİ ---
let fishingCountdownInterval = null;
let fishingRemainingSeconds = 10;

function triggerFishing() {
    if (currentRoom !== 'sahil') return;
    if (players[myId] && players[myId].isFishing) {
        socket.emit('cancelFishing');
        return;
    }
    if (window.playSound) window.playSound('reel');
    socket.emit('startFishing');
}

function closeFishingResultModal() {
    const modal = document.getElementById('fishingResultModal');
    if (modal) modal.style.display = 'none';
}

socket.on('fishingStarted', (data) => {
    if (window.playSound) window.playSound('splash');
    const container = document.getElementById('fishingProgressContainer');
    const progressBar = document.getElementById('fishingProgressBar');
    const countdownText = document.getElementById('fishingCountdownText');

    if (container) container.style.display = 'block';
    if (progressBar) progressBar.style.width = '100%';

    fishingRemainingSeconds = data.duration || 10;
    if (countdownText) countdownText.innerText = fishingRemainingSeconds;

    if (fishingCountdownInterval) clearInterval(fishingCountdownInterval);

    let startTime = Date.now();
    let totalMs = fishingRemainingSeconds * 1000;

    fishingCountdownInterval = setInterval(() => {
        let elapsed = Date.now() - startTime;
        let leftMs = Math.max(0, totalMs - elapsed);
        let leftSec = Math.ceil(leftMs / 1000);

        if (countdownText) countdownText.innerText = leftSec;
        if (progressBar) {
            let pct = (leftMs / totalMs) * 100;
            progressBar.style.width = pct + '%';
        }

        if (leftMs <= 0) {
            clearInterval(fishingCountdownInterval);
            fishingCountdownInterval = null;
        }
    }, 100);
});

socket.on('playerFishingState', (data) => {
    if (players[data.id]) {
        players[data.id].isFishing = data.isFishing;
    }
});

socket.on('fishingCancelled', (data) => {
    if (fishingCountdownInterval) {
        clearInterval(fishingCountdownInterval);
        fishingCountdownInterval = null;
    }
    const container = document.getElementById('fishingProgressContainer');
    if (container) container.style.display = 'none';

    if (data && data.reason) {
        const errToast = document.getElementById('errorToast');
        if (errToast) {
            errToast.innerText = data.reason;
            errToast.style.display = 'block';
            setTimeout(() => { errToast.style.display = 'none'; }, 3000);
        }
    }
});

socket.on('fishingResult', (data) => {
    if (fishingCountdownInterval) {
        clearInterval(fishingCountdownInterval);
        fishingCountdownInterval = null;
    }
    const container = document.getElementById('fishingProgressContainer');
    if (container) container.style.display = 'none';

    let loot = data.loot;
    if (!loot) return;

    if (loot.value > 0) {
        if (window.playSound) window.playSound('coin');
    } else {
        if (window.playSound) window.playSound('splash');
    }

    if (data.money !== undefined) {
        updateMoneyDisplay(data.money);
    }

    const modal = document.getElementById('fishingResultModal');
    const emojiEl = document.getElementById('catchLootEmoji');
    const nameEl = document.getElementById('catchLootName');
    const descEl = document.getElementById('catchLootDesc');
    const rewardEl = document.getElementById('catchLootReward');

    if (emojiEl) emojiEl.innerText = loot.emoji || "🐟";
    if (nameEl) nameEl.innerText = loot.name;
    if (descEl) descEl.innerText = loot.desc;

    if (rewardEl) {
        if (loot.value > 0) {
            rewardEl.style.background = 'rgba(16, 185, 129, 0.2)';
            rewardEl.style.borderColor = '#10b981';
            rewardEl.style.color = '#34d399';
            rewardEl.innerText = `+${loot.value} TL Kazandın!`;
        } else {
            rewardEl.style.background = 'rgba(239, 68, 68, 0.2)';
            rewardEl.style.borderColor = '#ef4444';
            rewardEl.style.color = '#f87171';
            rewardEl.innerText = `0 TL (Çöp / Değersiz)`;
        }
    }

    if (modal) modal.style.display = 'flex';
});

// --- 13. ADMİN PANELİ FONKSİYONLARI (YASİN ÖZEL) ---
let allAdminUsers = [];

function openAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) modal.style.display = 'flex';
    socket.emit('adminGetUsers');
}

function closeAdminPanel() {
    const modal = document.getElementById('adminPanelModal');
    if (modal) modal.style.display = 'none';
}

socket.on('adminUsersList', (users) => {
    allAdminUsers = users || [];
    renderAdminUsers(allAdminUsers);
});

function filterAdminUsers() {
    const searchVal = (document.getElementById('adminUserSearchInput')?.value || '').toLowerCase().trim();
    if (!searchVal) {
        renderAdminUsers(allAdminUsers);
        return;
    }
    let filtered = allAdminUsers.filter(u => u.username.toLowerCase().includes(searchVal));
    renderAdminUsers(filtered);
}

function renderAdminUsers(users) {
    const container = document.getElementById('adminUserListContainer');
    if (!container) return;

    if (!users || users.length === 0) {
        container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:25px; font-style:italic;">Şu an oyunda çevrimiçi oyuncu bulunmuyor.</div>`;
        return;
    }

    container.innerHTML = users.map(user => {
        let isMe = (user.username.toLowerCase() === 'yasin');
        let statusBadge = user.isOnline
            ? `<span style="font-size:11px; background:rgba(34,197,94,0.2); color:#4ade80; border:1px solid #22c55e; padding:1px 6px; border-radius:4px; font-weight:700;">🟢 Çevrimiçi</span>`
            : `<span style="font-size:11px; background:rgba(148,163,184,0.2); color:#94a3b8; border:1px solid #64748b; padding:1px 6px; border-radius:4px;">⚪ Çevrimdışı</span>`;

        return `
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <div style="font-weight: 800; font-size: 15px; color: #f8fafc; display:flex; align-items:center; gap:8px;">
                    <span>${user.username}</span>
                    ${isMe ? '<span style="font-size:10px; background:#ef4444; color:white; font-weight:800; padding:1px 6px; border-radius:4px;">ADMİN</span>' : ''}
                    ${statusBadge}
                </div>
                <div style="font-size: 13px; color: #facc15; font-weight: bold; margin-top: 4px;">
                    💰 Bakiye: <span style="font-size:14px; color:#38bdf8;">${user.money}</span> TL
                </div>
            </div>
            <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <input type="number" id="adminInput_${user.username}" placeholder="Miktar" value="100" style="width: 80px; padding: 7px 8px; background: rgba(15,23,42,0.85); border: 1px solid #475569; border-radius: 6px; color: white; font-weight: bold; font-size: 13px; text-align: center; outline:none;">
                <button onclick="adminModifyUser('${user.username}', 'add')" style="padding: 7px 12px; background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px; box-shadow:0 2px 6px rgba(16,185,129,0.3);">+ Ekle</button>
                <button onclick="adminModifyUser('${user.username}', 'set')" style="padding: 7px 12px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 12px; box-shadow:0 2px 6px rgba(59,130,246,0.3);">= Belirle</button>
                <button onclick="adminQuickAdd('${user.username}', 250)" style="padding: 7px 9px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #facc15; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">+250</button>
                <button onclick="adminQuickAdd('${user.username}', 1000)" style="padding: 7px 9px; background: rgba(245,158,11,0.15); border: 1px solid #f59e0b; color: #facc15; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 11px;">+1000</button>
            </div>
        </div>
        `;
    }).join('');
}

function adminModifyUser(targetUsername, mode) {
    const inputEl = document.getElementById(`adminInput_${targetUsername}`);
    let amount = parseInt(inputEl ? inputEl.value : 0);
    if (isNaN(amount) || amount < 0) {
        alert("Lütfen geçerli bir tutar yazın!");
        return;
    }
    socket.emit('adminModifyMoney', { targetUsername: targetUsername, amount: amount, mode: mode });
}

function adminQuickAdd(targetUsername, amount) {
    socket.emit('adminModifyMoney', { targetUsername: targetUsername, amount: amount, mode: 'add' });
}

// --- 14. MOBİL D-PAD VE DOKUNMATİK EKRAN SİSTEMİ ---
function checkMobileDeviceHUD() {
    let isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   (window.innerWidth <= 860) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);
    let dpad = document.getElementById('mobileControlsOverlay');
    let actionBtn = document.getElementById('mobileActionBtn');
    if (dpad) dpad.style.display = isMobile ? 'block' : 'none';
    if (actionBtn) actionBtn.style.display = isMobile ? 'flex' : 'none';
}

function initMobileDpadTracking() {
    const dpad = document.getElementById('mobileControlsOverlay');
    if (!dpad) return;

    let touchId = null;

    dpad.addEventListener('touchstart', (e) => {
        if (e.changedTouches.length > 0) {
            let t = e.changedTouches[0];
            touchId = t.identifier;
            updateDpadFromTouch(t.clientX, t.clientY);
        }
    }, { passive: false });

    dpad.addEventListener('touchmove', (e) => {
        if (e.cancelable) e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            let t = e.changedTouches[i];
            if (t.identifier === touchId) {
                updateDpadFromTouch(t.clientX, t.clientY);
                break;
            }
        }
    }, { passive: false });

    const endTouch = (e) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === touchId) {
                touchId = null;
                keys.w = false;
                keys.a = false;
                keys.s = false;
                keys.d = false;
                break;
            }
        }
    };

    dpad.addEventListener('touchend', endTouch);
    dpad.addEventListener('touchcancel', endTouch);
}

function updateDpadFromTouch(clientX, clientY) {
    const dpad = document.getElementById('mobileControlsOverlay');
    if (!dpad) return;
    targetWalkPos = null;
    let rect = dpad.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    let dist = Math.hypot(dx, dy);

    if (dist < 12) {
        keys.w = false; keys.a = false; keys.s = false; keys.d = false;
        return;
    }

    keys.d = (dx > 14);
    keys.a = (dx < -14);
    keys.s = (dy > 14);
    keys.w = (dy < -14);

    if (Math.abs(dx) > Math.abs(dy)) {
        myFacing = dx > 0 ? 'right' : 'left';
    } else {
        myFacing = dy > 0 ? 'down' : 'up';
    }
}

window.addEventListener('resize', checkMobileDeviceHUD);
window.addEventListener('orientationchange', checkMobileDeviceHUD);
document.addEventListener('DOMContentLoaded', () => {
    checkMobileDeviceHUD();
    initMobileDpadTracking();
});
setTimeout(() => {
    checkMobileDeviceHUD();
    initMobileDpadTracking();
}, 600);
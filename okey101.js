// okey101.js - 101 Okey Oyun Motoru (Cezalı & Katlamasız)

const COLORS = ['kirmizi', 'siyah', 'mavi', 'sari']; // Red, Black, Blue, Yellow

// 106 Taş Üret ve Karıştır
function createDeck() {
    let deck = [];
    let idCounter = 1;

    for (let copy = 1; copy <= 2; copy++) {
        for (let color of COLORS) {
            for (let v = 1; v <= 13; v++) {
                deck.push({
                    id: `t_${idCounter++}`,
                    color: color,
                    value: v,
                    isFakeOkey: false
                });
            }
        }
    }

    // 2 Adet Sahte Okey (Yıldızlı Taş)
    deck.push({ id: `t_${idCounter++}`, color: 'sahte', value: 0, isFakeOkey: true });
    deck.push({ id: `t_${idCounter++}`, color: 'sahte', value: 0, isFakeOkey: true });

    // Karıştır (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    return deck;
}

// Okey ve Gösterge Belirleme
function determineOkey(deck) {
    // Gösterge sahte okey olamaz, normal taş bulunana kadar ara
    let gostergeIndex = deck.findIndex(t => !t.isFakeOkey);
    let gosterge = deck.splice(gostergeIndex, 1)[0];

    // Okey: Gösterge ile aynı renk ve bir fazlası (13 ise 1)
    let okeyValue = (gosterge.value === 13) ? 1 : gosterge.value + 1;
    let okeyDef = {
        color: gosterge.color,
        value: okeyValue
    };

    return { gosterge, okeyDef };
}

// Bir taşın gerçek Okey olup olmadığını anla
function isRealOkey(tile, okeyDef) {
    if (!tile || tile.isFakeOkey) return false;
    return tile.color === okeyDef.color && tile.value === okeyDef.value;
}

// Sahte Okey'in oyundaki temsil ettiği değer ve renk (Okey taşının asıl değerini alır)
function getEffectiveTile(tile, okeyDef) {
    if (tile.isFakeOkey) {
        return {
            id: tile.id,
            color: okeyDef.color,
            value: okeyDef.value,
            isFakeOkey: true,
            isOkey: false
        };
    }
    let isOkey = isRealOkey(tile, okeyDef);
    return {
        id: tile.id,
        color: tile.color,
        value: tile.value,
        isFakeOkey: false,
        isOkey: isOkey
    };
}

// Sıralı Per Kontrolü (Aynı Renk, Ardışık: 4-5-6 veya 11-12-13-1, Okey Her Yere Joker Olarak Geçer)
function isValidSeries(tiles, okeyDef) {
    if (!tiles || tiles.length < 3 || tiles.length > 13) return false;

    let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
    if (nonOkey.length === 0) return true; // Hepsi okeyse geçerli

    // Tüm normal taşların rengi aynı olmalı
    let baseColor = nonOkey[0].isFakeOkey ? okeyDef.color : nonOkey[0].color;
    for (let t of nonOkey) {
        let effColor = t.isFakeOkey ? okeyDef.color : t.color;
        if (effColor !== baseColor) return false;
    }

    let nonOkeyVals = nonOkey.map(t => t.isFakeOkey ? okeyDef.value : t.value);
    let okeyCount = tiles.length - nonOkey.length;
    let n = tiles.length;

    // Olası her başlangıç değerini (1'den 13'e) dene
    for (let startVal = 1; startVal <= 13; startVal++) {
        let req = [];
        let possible = true;
        for (let i = 0; i < n; i++) {
            let v = startVal + i;
            if (v > 13) {
                if (v === 14 && i === n - 1) {
                    v = 1; // 12-13-1 veya 11-12-13-1 kuralı
                } else {
                    possible = false;
                    break;
                }
            }
            req.push(v);
        }
        if (!possible) continue;

        // nonOkeyVals listesindeki her değer req içinde birebir eşleşmeli
        let tempReq = [...req];
        let matched = true;
        for (let val of nonOkeyVals) {
            let idx = tempReq.indexOf(val);
            if (idx === -1) {
                matched = false;
                break;
            }
            tempReq.splice(idx, 1);
        }
        // Kalan boşluk sayısı tam olarak okeyCount'a eşit mi?
        if (matched && tempReq.length === okeyCount) {
            return true;
        }
    }

    return false;
}

// Grup Per Kontrolü (Aynı Sayı, Farklı Renkler: 7-7-7 gibi 3 veya 4 taş)
function isValidGroup(tiles, okeyDef) {
    if (!tiles || tiles.length < 3 || tiles.length > 4) return false;

    let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
    if (nonOkey.length === 0) return true;

    let baseVal = nonOkey[0].isFakeOkey ? okeyDef.value : nonOkey[0].value;
    let colorsUsed = new Set();

    for (let t of nonOkey) {
        let effVal = t.isFakeOkey ? okeyDef.value : t.value;
        let effCol = t.isFakeOkey ? okeyDef.color : t.color;
        if (effVal !== baseVal) return false;
        if (colorsUsed.has(effCol)) return false; // Aynı renkten birden fazla olamaz
        colorsUsed.add(effCol);
    }

    return true;
}

// Çift Kontrolü (Tamamen aynı renk ve aynı sayı 2 taş, Okey veya Gösterge Joker desteği)
function isValidPair(tileA, tileB, okeyDef, gostergeTile = null) {
    if (!tileA || !tileB) return false;
    let effA = getEffectiveTile(tileA, okeyDef);
    let effB = getEffectiveTile(tileB, okeyDef);

    if (effA.isOkey || effB.isOkey) return true; // Okey herhangi bir taşla çift oluşturur

    // Gösterge Çift Kuralı: Gösterge taşı çekildiyse, yanına eldeki herhangi bir taş konularak çift sayılabilir!
    if (gostergeTile) {
        let isGostA = !tileA.isFakeOkey && tileA.color === gostergeTile.color && tileA.value === gostergeTile.value;
        let isGostB = !tileB.isFakeOkey && tileB.color === gostergeTile.color && tileB.value === gostergeTile.value;
        if (isGostA || isGostB) return true;
    }

    return effA.color === effB.color && effA.value === effB.value;
}

// Per Puanı Hesaplama
function getPerScore(tiles, okeyDef) {
    let score = 0;
    // Okey taşları yerine girdiği taşın sayı değerini alır
    if (isValidSeries(tiles, okeyDef)) {
        let nonOkey = tiles.filter(t => !isRealOkey(t, okeyDef));
        let nonOkeyVals = nonOkey.map(t => t.isFakeOkey ? okeyDef.value : t.value);
        let okeyCount = tiles.length - nonOkey.length;
        let n = tiles.length;

        for (let startVal = 1; startVal <= 13; startVal++) {
            let req = [];
            let possible = true;
            for (let i = 0; i < n; i++) {
                let v = startVal + i;
                if (v > 13) {
                    if (v === 14 && i === n - 1) v = 1;
                    else { possible = false; break; }
                }
                req.push(v);
            }
            if (!possible) continue;
            let tempReq = [...req];
            let matched = true;
            for (let val of nonOkeyVals) {
                let idx = tempReq.indexOf(val);
                if (idx === -1) { matched = false; break; }
                tempReq.splice(idx, 1);
            }
            if (matched && tempReq.length === okeyCount) {
                return req.reduce((a, b) => a + b, 0);
            }
        }
    } else if (isValidGroup(tiles, okeyDef)) {
        let nonOkey = tiles.find(t => !isRealOkey(t, okeyDef));
        let val = nonOkey ? (nonOkey.isFakeOkey ? okeyDef.value : nonOkey.value) : 10;
        return val * tiles.length;
    }
    tiles.forEach(t => {
        let eff = getEffectiveTile(t, okeyDef);
        score += eff.value;
    });
    return score;
}

// Otomatik Çoklu Per Çözücü (Partitioner)
function findValidPartition(tiles, okeyDef) {
    if (!tiles || tiles.length < 3) return null;

    function getCombinations(arr, k) {
        if (k === 0) return [[]];
        if (arr.length === 0) return [];
        let head = arr[0];
        let tail = arr.slice(1);
        let withHead = getCombinations(tail, k - 1).map(c => [head, ...c]);
        let withoutHead = getCombinations(tail, k);
        return [...withHead, ...withoutHead];
    }

    function search(remaining) {
        if (remaining.length === 0) return [];
        if (remaining.length < 3) return null;

        let n = remaining.length;
        for (let size of [3, 4, 5]) {
            if (size > n) continue;
            let combs = getCombinations(remaining, size);
            for (let comb of combs) {
                if (isValidSeries(comb, okeyDef) || isValidGroup(comb, okeyDef)) {
                    let combIds = new Set(comb.map(t => t.id));
                    let rest = remaining.filter(t => !combIds.has(t.id));
                    let sub = search(rest);
                    if (sub !== null) {
                        return [comb, ...sub];
                    }
                }
            }
        }
        return null;
    }

    return search(tiles);
}

// Takım ve Partner Yardımcıları
function getTeamIndex(gameData, playerId) {
    let idx = gameData.players.indexOf(playerId);
    return (idx % 2 === 0) ? 1 : 2; // 0 & 2 -> Takım 1, 1 & 3 -> Takım 2
}

function getPartnerId(gameData, playerId) {
    let idx = gameData.players.indexOf(playerId);
    if (idx === -1) return null;
    return gameData.players[(idx + 2) % 4];
}

function getHandSum(hand, okeyDef) {
    if (!hand || hand.length === 0) return 0;
    let sum = 0;
    hand.forEach(t => {
        let eff = getEffectiveTile(t, okeyDef);
        sum += eff.value;
    });
    return sum;
}

// Oyunu Başlat (mode: 'esli' | 'tekli')
function startOkey101Game(players, existingScores = null, roundNumber = 1, mode = 'esli', existingYazboz = null) {
    let deck = createDeck();
    let { gosterge, okeyDef } = determineOkey(deck);

    let defaultYazboz = {
        mode: mode,
        team1: {
            id: 1,
            name: "1. Grup (Oyuncu 1 & 3)",
            playerIds: [players[0], players[2]],
            topRounds: [],       // [{ round, text, score }]
            bottomPenalties: [], // [{ round, text, score }]
            bottomSilers: [],    // [{ round, text, score }]
            totalScore: 0
        },
        team2: {
            id: 2,
            name: "2. Grup (Oyuncu 2 & 4)",
            playerIds: [players[1], players[3]],
            topRounds: [],
            bottomPenalties: [],
            bottomSilers: [],
            totalScore: 0
        }
    };

    let yazboz = existingYazboz || defaultYazboz;
    yazboz.mode = mode;
    yazboz.roundNumber = roundNumber;

    let gameData = {
        tableId: 'okey101',
        mode: mode, // 'esli' veya 'tekli'
        players: [...players],
        turnIndex: 0,
        roundNumber: roundNumber,
        gosterge: gosterge,
        okeyDef: okeyDef,
        drawPile: deck,
        tableOpenedPers: [], // Masaya açılan perler: [{ id, ownerId, type, tiles, score }]
        hands: {},
        hasOpened: {},      // pid -> true/false
        openedType: {},     // pid -> 'seri' veya 'cift'
        scores: existingScores || {}, // Genel ceza puanı (düşük olan kazanır)
        roundPenalties: {}, // Bu eldeki cezalar (+101'ler)
        discardPiles: {},   // pid -> array of discarded tiles
        drawnThisTurn: false,
        lastDiscardTaken: false,
        takenDiscardTile: null,
        takenDiscardTileId: null,
        takenDiscardTileProcessed: false,
        lastDiscard: null,
        pendingDiscardTaker: null,
        yazboz: yazboz,
        gameOver: false,
        winner: null
    };

    // Oyuncuların ellerini dağıt
    // İlk başlayacak oyuncuya 22 taş, diğer 3 oyuncuya 21 taş verilir
    players.forEach((pid, index) => {
        let count = (index === 0) ? 22 : 21;
        gameData.hands[pid] = deck.splice(0, count);
        gameData.hasOpened[pid] = false;
        gameData.openedType[pid] = null;
        gameData.discardPiles[pid] = [];
        gameData.roundPenalties[pid] = 0;
        if (!existingScores || existingScores[pid] === undefined) {
            gameData.scores[pid] = 0;
        }
    });

    // İlk oyuncunun elinde zaten 22 taş olduğu için taş çekmiş kabul edilir
    gameData.drawnThisTurn = true;

    return gameData;
}

// Yerden (Desteden) Taş Çekme
function drawTileFromDeck(gameData, playerId) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (gameData.drawnThisTurn) return { success: false, msg: "Bu tur zaten taş çektin!" };
    if (gameData.drawPile.length === 0) return { success: false, msg: "Destedeki taşlar bitti!" };

    let tile = gameData.drawPile.pop();
    gameData.hands[playerId].push(tile);
    gameData.drawnThisTurn = true;
    gameData.lastDiscardTaken = false;
    gameData.takenDiscardTile = null;
    gameData.takenDiscardTileId = null;
    gameData.takenDiscardTileProcessed = false;
    gameData.pendingDiscardTaker = null;

    return { success: true, tile: tile };
}

// Yazboz Yardımcıları (Kıraathane Çetelesi)
function addPenaltyToYazboz(gameData, playerId, penaltyAmount, reason) {
    if (!gameData.yazboz || gameData.mode !== 'esli') return;
    let teamIdx = getTeamIndex(gameData, playerId);
    let team = teamIdx === 1 ? gameData.yazboz.team1 : gameData.yazboz.team2;
    team.bottomPenalties.push({
        round: gameData.roundNumber,
        text: `+${penaltyAmount} (${reason})`,
        score: penaltyAmount
    });
    updateYazbozTotals(gameData);
}

function addSilerToYazboz(gameData, playerId, silerAmount, reason) {
    if (!gameData.yazboz || gameData.mode !== 'esli') return;
    let teamIdx = getTeamIndex(gameData, playerId);
    let team = teamIdx === 1 ? gameData.yazboz.team1 : gameData.yazboz.team2;
    team.bottomSilers.push({
        round: gameData.roundNumber,
        text: `-${silerAmount} (${reason})`,
        score: silerAmount
    });
    updateYazbozTotals(gameData);
}

function recordTopYazboz(gameData, teamIdx, roundNum, text, score) {
    if (!gameData.yazboz || gameData.mode !== 'esli') return;
    let team = teamIdx === 1 ? gameData.yazboz.team1 : gameData.yazboz.team2;
    team.topRounds.push({
        round: roundNum,
        text: `El ${roundNum}: ${text}`,
        score: score
    });
    updateYazbozTotals(gameData);
}

function updateYazbozTotals(gameData) {
    let y = gameData.yazboz;
    if (!y) return;

    [1, 2].forEach(teamIdx => {
        let team = teamIdx === 1 ? y.team1 : y.team2;
        let topSum = team.topRounds.reduce((sum, r) => sum + r.score, 0);
        let penSum = team.bottomPenalties.reduce((sum, p) => sum + p.score, 0);
        let silSum = team.bottomSilers.reduce((sum, s) => sum + Math.abs(s.score), 0);
        team.totalScore = topSum + penSum - silSum;
    });
}

function checkDiscardTakerPenalty(gameData, takerId, isCift) {
    if (!gameData.pendingDiscardTaker || gameData.pendingDiscardTaker.takerId !== takerId) return;
    let info = gameData.pendingDiscardTaker;
    let tile = info.tile;
    let discarderId = info.fromId;
    let val = tile.value || (tile.isFakeOkey ? gameData.okeyDef.value : 5);
    let mult = isCift ? 20 : 10;
    let penalty = val * mult;

    gameData.roundPenalties[discarderId] = (gameData.roundPenalties[discarderId] || 0) + penalty;
    let reason = `Yandan Taş Alma (${val} x ${mult})`;
    addPenaltyToYazboz(gameData, discarderId, penalty, reason);

    gameData.pendingDiscardTaker = null;
}

// Yan Oyuncunun Attığı Taşı Alma (Cezalı kural: Sadece hemen el açacaksa veya açtıysa işleyecekse alabilir)
function takeDiscardedTile(gameData, playerId) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (gameData.drawnThisTurn) return { success: false, msg: "Bu tur zaten taş çektin!" };

    let prevPlayerIndex = (gameData.turnIndex + 3) % 4;
    let prevPid = gameData.players[prevPlayerIndex];
    let prevDiscardPile = gameData.discardPiles[prevPid];

    if (!prevDiscardPile || prevDiscardPile.length === 0) {
        return { success: false, msg: "Soldaki oyuncunun attığı taş yok!" };
    }

    let tile = prevDiscardPile.pop();
    gameData.hands[playerId].push(tile);
    gameData.drawnThisTurn = true;
    gameData.lastDiscardTaken = true; // El açması veya işlemesi şarttır
    gameData.takenDiscardTile = tile;
    gameData.takenDiscardTileId = tile.id;
    gameData.takenDiscardTileProcessed = false;
    // Yandan taş alma cezası SADECE İLK DEFA EL AÇARKEN yazılır!
    if (!gameData.hasOpened[playerId]) {
        gameData.pendingDiscardTaker = {
            takerId: playerId,
            fromId: prevPid,
            tile: tile
        };
    } else {
        gameData.pendingDiscardTaker = null; // Zaten açmış oyuncu yandan aldığında atana ceza yazılmaz!
    }

    return { success: true, tile: tile };
}

// El Açma / Per İndirme / Çift İşleme - Katlamasız, Cezalı ve Silerli!
function openHand(gameData, playerId, persPayload) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (!gameData.drawnThisTurn) return { success: false, msg: "Önce taş çekmelisin!" };

    let isAlreadyOpened = !!gameData.hasOpened[playerId];
    let myOpenedType = gameData.openedType[playerId];
    let hand = gameData.hands[playerId];
    let okeyDef = gameData.okeyDef;

    // A) ÇİFT AÇMA / ÇİFT İNDİRME / ÇİFT İŞLEME KONTROLÜ
    if (persPayload.type === 'cift') {
        let pairs = persPayload.pairs;
        if (!pairs || pairs.length === 0) {
            return { success: false, msg: "Açılacak çift seçilmedi!" };
        }

        // İlk kez çift açılışı ise en az 5 çift gereklidir
        if (!isAlreadyOpened && pairs.length < 5) {
            gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
            addPenaltyToYazboz(gameData, playerId, 101, "Eksik Çift Açma Denemesi");
            return { success: false, penalty: true, msg: "Cezalı! İlk çift açılışı için en az 5 çift gereklidir! (+101 Ceza)" };
        }

        // Eğer daha önce SERİ açmışsa: Masada birinin çift açmış olması şartıyla elindeki çifti işleyebilir
        if (isAlreadyOpened && myOpenedType === 'seri') {
            let hasCiftTable = Object.values(gameData.openedType).some(t => t === 'cift');
            if (!hasCiftTable) {
                return { success: false, msg: "Masada henüz çift açmış bir oyuncu olmadığı için elinizdeki çifti masaya işleyemezsiniz!" };
            }
        }

        let usedTileIds = new Set();
        let validPairs = [];

        for (let p of pairs) {
            if (p.length !== 2) return { success: false, msg: "Her çift 2 taştan oluşmalıdır!" };
            let t1 = hand.find(t => t.id === p[0]);
            let t2 = hand.find(t => t.id === p[1]);
            if (!t1 || !t2 || usedTileIds.has(t1.id) || usedTileIds.has(t2.id)) {
                return { success: false, msg: "Geçersiz taş seçimi!" };
            }
            if (!isValidPair(t1, t2, okeyDef, gameData.gosterge)) {
                if (!isAlreadyOpened) {
                    gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
                    addPenaltyToYazboz(gameData, playerId, 101, "Geçersiz Çift Açma");
                    return { success: false, penalty: true, msg: "Cezalı! Geçersiz çift denemesi! (+101 Ceza)" };
                } else {
                    return { success: false, msg: "Geçersiz çift! Seçtiğiniz taşlar çift oluşturmuyor." };
                }
            }
            usedTileIds.add(t1.id);
            usedTileIds.add(t2.id);
            validPairs.push([t1, t2]);
        }

        // Yandan taş alındıysa, bu taşın indirilen çiftlerde kullanılmış olması şarttır!
        if (gameData.lastDiscardTaken && gameData.takenDiscardTileId) {
            if (!usedTileIds.has(gameData.takenDiscardTileId)) {
                return {
                    success: false,
                    msg: "Yandan aldığınız taşı açtığınız çiftlerde kullanmak zorundasınız!"
                };
            }
        }

        // Başarılı Çiftleri Masaya Ekle
        validPairs.forEach(pair => {
            gameData.tableOpenedPers.push({
                id: `per_${Date.now()}_${Math.floor(Math.random()*1000)}`,
                ownerId: playerId,
                type: 'cift',
                tiles: pair,
                score: pair[0].value + pair[1].value
            });
        });

        // Çift Sileri Kontrolü (Sadece ilk açılışta verilir)
        let silersEarned = 0;
        let silerText = "";
        if (!isAlreadyOpened) {
            if (pairs.length >= 9) {
                silersEarned = 2;
                silerText = "9 Çift Açma Sileri (-202)";
            } else if (pairs.length >= 7) {
                silersEarned = 1;
                silerText = "7 Çift Açma Sileri (-101)";
            }
            if (silersEarned > 0) {
                addSilerToYazboz(gameData, playerId, silersEarned * 101, silerText);
            }

            // Yandan taş alma cezası kontrolü (Sadece ilk açılışta ATILAN TAŞIN 20 KATI!)
            checkDiscardTakerPenalty(gameData, playerId, true);
        }

        if (gameData.lastDiscardTaken) {
            gameData.lastDiscardTaken = false;
            gameData.takenDiscardTileProcessed = true;
        }

        // Elden taşları sil
        gameData.hands[playerId] = hand.filter(t => !usedTileIds.has(t.id));

        if (!isAlreadyOpened) {
            gameData.hasOpened[playerId] = true;
            gameData.openedType[playerId] = 'cift';
        }

        let msg = isAlreadyOpened 
            ? (myOpenedType === 'seri' ? `Elinizdeki ${pairs.length} çift masaya başarıyla işlendi!` : `${pairs.length} çift başarıyla masaya indirildi!`)
            : `Tebrikler! ${pairs.length} Çift ile el açtın.`;
        if (silersEarned > 0) msg += ` 🌟 ${silerText} kazandınız!`;
        return { success: true, msg: msg };
    }

    // B) SERİ / GRUP İLE 101 AÇMA / YENİ PER İNDİRME KONTROLÜ
    // Kural: Çift açmış oyuncu masaya yeni per indiremez!
    if (isAlreadyOpened && myOpenedType === 'cift') {
        return { success: false, msg: "Çift açtığınız için masaya yeni per indiremezsiniz! Sadece masadaki perlere taş işleyebilirsiniz." };
    }

    let pers = persPayload.pers || persPayload;
    if (!Array.isArray(pers) || pers.length === 0) {
        return { success: false, msg: "Açılacak per seçilmedi!" };
    }

    // Eğer tek bir per içine çoklu per atıldıysa otomatik olarak geçerli per kombinasyonlarına böl
    if (pers.length === 1 && pers[0].tileIds.length >= 6) {
        let allTiles = pers[0].tileIds.map(tid => hand.find(t => t.id === tid)).filter(Boolean);
        let partitioned = findValidPartition(allTiles, okeyDef);
        if (partitioned && partitioned.length >= 2) {
            pers = partitioned.map(group => ({ tileIds: group.map(t => t.id) }));
        }
    }

    let totalScore = 0;
    let usedTileIds = new Set();
    let validPersToAdd = [];

    for (let p of pers) {
        let pTiles = p.tileIds.map(tid => hand.find(t => t.id === tid));
        if (pTiles.some(t => !t)) return { success: false, msg: "Elinizde olmayan taş seçildi!" };
        for (let t of pTiles) {
            if (usedTileIds.has(t.id)) return { success: false, msg: "Aynı taş iki yerde kullanılamaz!" };
            usedTileIds.add(t.id);
        }

        let isSeri = isValidSeries(pTiles, okeyDef);
        let isGrup = isValidGroup(pTiles, okeyDef);

        if (!isSeri && !isGrup) {
            if (!isAlreadyOpened) {
                gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
                addPenaltyToYazboz(gameData, playerId, 101, "Geçersiz Per Açma");
                return { success: false, penalty: true, msg: "Cezalı! Geçersiz per açma denemesi! (+101 Ceza)" };
            } else {
                return { success: false, msg: "Geçersiz per! Seçtiğiniz taşlar geçerli bir seri veya grup oluşturmuyor." };
            }
        }

        let pScore = getPerScore(pTiles, okeyDef);
        totalScore += pScore;
        validPersToAdd.push({
            type: isSeri ? 'seri' : 'grup',
            tiles: pTiles,
            score: pScore
        });
    }

    // 101 Puan Kontrolü: SADECE İLK EL AÇILIŞINDA GEREKLİDİR!
    if (!isAlreadyOpened) {
        if (totalScore < 101) {
            gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
            addPenaltyToYazboz(gameData, playerId, 101, `Yetersiz Puan (${totalScore} Puan)`);
            return { 
                success: false, 
                penalty: true, 
                totalScore: totalScore, 
                msg: `Cezalı! Perlerin toplamı ${totalScore} puan yaptı, en az 101 gereklidir! (+101 Ceza)` 
            };
        }
    }

    // Yandan taş alındıysa, bu taşın açılan perlerde kullanılmış olması şarttır!
    if (gameData.lastDiscardTaken && gameData.takenDiscardTileId) {
        if (!usedTileIds.has(gameData.takenDiscardTileId)) {
            return {
                success: false,
                msg: "Yandan aldığınız taşı açtığınız perlerde kullanmak zorundasınız!"
            };
        }
    }

    // Başarıyla Perleri Masaya Ekle
    validPersToAdd.forEach(vp => {
        gameData.tableOpenedPers.push({
            id: `per_${Date.now()}_${Math.floor(Math.random()*1000)}`,
            ownerId: playerId,
            type: vp.type,
            tiles: vp.tiles,
            score: vp.score
        });
    });

    let silersEarned = 0;
    let silerText = "";
    if (!isAlreadyOpened) {
        if (totalScore >= 180) {
            silersEarned = 2;
            silerText = "180+ Puan Açma Sileri (-202)";
        } else if (totalScore >= 150) {
            silersEarned = 1;
            silerText = "150+ Puan Açma Sileri (-101)";
        }
        if (silersEarned > 0) {
            addSilerToYazboz(gameData, playerId, silersEarned * 101, silerText);
        }

        // Yandan taş alma cezası kontrolü (SADECE İLK AÇILIŞTA ATILAN TAŞIN 10 KATI!)
        checkDiscardTakerPenalty(gameData, playerId, false);
    }

    if (gameData.lastDiscardTaken) {
        gameData.lastDiscardTaken = false;
        gameData.takenDiscardTileProcessed = true;
    }

    gameData.hands[playerId] = hand.filter(t => !usedTileIds.has(t.id));

    if (!isAlreadyOpened) {
        gameData.hasOpened[playerId] = true;
        gameData.openedType[playerId] = 'seri';
    }

    let msg = isAlreadyOpened
        ? `Yeni per(ler) başarıyla masaya indirildi!`
        : `Tebrikler! ${totalScore} puan ile elini masaya açtın!`;
    if (silersEarned > 0) msg += ` 🌟 ${silerText} kazandınız!`;
    return { 
        success: true, 
        totalScore: totalScore, 
        msg: msg 
    };
}

// Masadaki Açılmış Perlere Taş Ekleme (İşler Yapma / İşleme - Tekli veya Çoklu Taş)
function addTileToTablePer(gameData, playerId, tileIdOrIds, targetPerIndex, position = 'end') {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (!gameData.drawnThisTurn) return { success: false, msg: "Önce taş çekmelisin!" };

    // Eşli modda ortağın açmış olması da taş işlemeye izin verir ("Ortağım açtı, ben de işlerim")
    let partnerId = getPartnerId(gameData, playerId);
    let canProcess = gameData.hasOpened[playerId] || (gameData.mode === 'esli' && partnerId && gameData.hasOpened[partnerId]);
    if (!canProcess) return { success: false, msg: "Masaya taş işlemek için sizin veya ortağınızın el açmış olması gerekir!" };

    let targetPer = gameData.tableOpenedPers[targetPerIndex];
    if (!targetPer) return { success: false, msg: "Hedef per bulunamadı!" };

    if (targetPer.type === 'cift') {
        return { success: false, msg: "Çift perlere tekli taş eklenemez! Elinizdeki çifti masaya çift olarak indirebilirsiniz." };
    }

    let tileIds = Array.isArray(tileIdOrIds) ? tileIdOrIds : [tileIdOrIds];
    if (tileIds.length === 0) return { success: false, msg: "İşlenecek taş seçilmedi!" };

    let hand = gameData.hands[playerId];
    let selectedTiles = [];
    for (let tid of tileIds) {
        let t = hand.find(x => x.id === tid);
        if (!t) return { success: false, msg: "Seçilen taşlardan biri elinizde yok!" };
        selectedTiles.push(t);
    }

    let okeyDef = gameData.okeyDef;
    let testTilesBest = null;

    if (targetPer.type === 'seri') {
        let asc = [...selectedTiles].sort((a, b) => a.value - b.value);
        let desc = [...selectedTiles].sort((a, b) => b.value - a.value);

        let candidates = [asc, desc];
        for (let cand of candidates) {
            let combined = (position === 'start') ? [...cand, ...targetPer.tiles] : [...targetPer.tiles, ...cand];
            if (isValidSeries(combined, okeyDef)) {
                testTilesBest = combined;
                break;
            }
        }
    } else if (targetPer.type === 'grup') {
        let combined = [...targetPer.tiles, ...selectedTiles];
        if (isValidGroup(combined, okeyDef)) {
            testTilesBest = combined;
        }
    }

    if (!testTilesBest) {
        return { success: false, msg: "Seçtiğiniz taş(lar) bu pere uymuyor!" };
    }

    // Taşı pere ekle ve elden çıkar
    targetPer.tiles = testTilesBest;
    targetPer.score = getPerScore(testTilesBest, okeyDef);

    let selectedSet = new Set(tileIds);
    gameData.hands[playerId] = hand.filter(t => !selectedSet.has(t.id));

    if (gameData.lastDiscardTaken && gameData.takenDiscardTileId && selectedSet.has(gameData.takenDiscardTileId)) {
        gameData.takenDiscardTileProcessed = true;
        gameData.lastDiscardTaken = false;
    }

    // Yandan taş alma cezası kontrolü
    if (gameData.pendingDiscardTaker && gameData.pendingDiscardTaker.takerId === playerId) {
        checkDiscardTakerPenalty(gameData, playerId, false);
    }

    return { success: true, msg: `${tileIds.length} taş başarıyla masadaki pere işlendi!` };
}

// Masaya Rakibin İşlediği Okeyi Geri Alma (+101 Ceza Rakibe)
function takeOkeyFromTablePer(gameData, playerId, perIndex, tileIdInHand) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (!gameData.drawnThisTurn) return { success: false, msg: "Önce taş çekmelisin!" };

    let partnerId = getPartnerId(gameData, playerId);
    let canProcess = gameData.hasOpened[playerId] || (gameData.mode === 'esli' && partnerId && gameData.hasOpened[partnerId]);
    if (!canProcess) return { success: false, msg: "Masadaki Okey'i almak için sizin veya ortağınızın el açmış olması gerekir!" };

    let targetPer = gameData.tableOpenedPers[perIndex];
    if (!targetPer) return { success: false, msg: "Hedef per bulunamadı!" };
    if (targetPer.type === 'cift') return { success: false, msg: "Çift perlerden Okey alınamaz!" };

    let hand = gameData.hands[playerId];
    let tileIndex = hand.findIndex(t => t.id === tileIdInHand);
    if (tileIndex === -1) return { success: false, msg: "Seçtiğiniz taş elinizde yok!" };
    let myTile = hand[tileIndex];

    let okeyDef = gameData.okeyDef;
    let okeyIndexInPer = targetPer.tiles.findIndex(t => isRealOkey(t, okeyDef));
    if (okeyIndexInPer === -1) return { success: false, msg: "Bu per grubunda Okey taşı bulunmuyor!" };

    let realOkeyTile = targetPer.tiles[okeyIndexInPer];

    // Okeyin yerine myTile koyup per geçerli mi test et
    let testTiles = [...targetPer.tiles];
    testTiles[okeyIndexInPer] = myTile;

    let valid = (targetPer.type === 'seri') ? isValidSeries(testTiles, okeyDef) : isValidGroup(testTiles, okeyDef);
    if (!valid) {
        return { success: false, msg: "Elinizdeki taş bu perdeki Okey'in yerine uymuyor!" };
    }

    // Takası uygula
    targetPer.tiles = testTiles;
    targetPer.score = getPerScore(testTiles, okeyDef);

    hand.splice(tileIndex, 1);
    hand.push(realOkeyTile);

    // Rakibe 101 Ceza Yaz
    let perOwner = targetPer.ownerId;
    let isOpponent = (perOwner !== playerId && perOwner !== partnerId);
    if (isOpponent) {
        gameData.roundPenalties[perOwner] = (gameData.roundPenalties[perOwner] || 0) + 101;
        addPenaltyToYazboz(gameData, perOwner, 101, "Yerdeki Okeyi Kaptırma (+101)");
    }

    return { 
        success: true, 
        msg: isOpponent ? "🌟 Harika! Masadaki Okey'i aldın ve rakibe +101 ceza yazdırdın!" : "Masadaki Okey'i eline aldın!" 
    };
}

// Yandan Alınan Taşı Geri Bırakıp Desteden Çekme (Undo / Taşı Geri Bırak)
function returnDiscardTile(gameData, playerId) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (!gameData.lastDiscardTaken || !gameData.takenDiscardTileId) {
        return { success: false, msg: "Geri bırakılacak yandan alınmış taş yok!" };
    }

    let hand = gameData.hands[playerId];
    if (!hand) return { success: false, msg: "Oyuncu eli bulunamadı!" };

    let tileIndex = hand.findIndex(t => t.id === gameData.takenDiscardTileId);
    if (tileIndex === -1) {
        return { success: false, msg: "Yandan alınan taş elinizde bulunamadı (işlenmiş veya açılmış olabilir)!" };
    }

    // Taşı elden çıkar
    let returnedTile = hand.splice(tileIndex, 1)[0];

    // Solundaki (önceki) oyuncunun atılanlar destesine geri koy
    let prevPlayerIndex = (gameData.turnIndex + 3) % 4;
    let prevPid = gameData.players[prevPlayerIndex];
    if (!gameData.discardPiles[prevPid]) gameData.discardPiles[prevPid] = [];
    gameData.discardPiles[prevPid].push(returnedTile);

    // Desteden normal taş çek
    if (gameData.drawPile && gameData.drawPile.length > 0) {
        let newTile = gameData.drawPile.pop();
        hand.push(newTile);
    } else {
        // Deste bittiyse geri al
        hand.push(returnedTile);
        gameData.discardPiles[prevPid].pop();
        return { success: false, msg: "Destedeki taşlar bittiği için taş çekilemiyor!" };
    }

    // Durumu sıfırla (artık desteden çekilmiş sayılır, açma zorunluluğu kalkar)
    gameData.lastDiscardTaken = false;
    gameData.takenDiscardTile = null;
    gameData.takenDiscardTileId = null;
    gameData.takenDiscardTileProcessed = false;
    gameData.pendingDiscardTaker = null;
    gameData.drawnThisTurn = true;

    return { 
        success: true, 
        msg: "Yandan alınan taş geri bırakıldı ve desteden yeni taş çekildi." 
    };
}

// Bir taşın masadaki herhangi bir pere işleyip işlemediğini test et (İşler taş kontrolü)
function isTileIshler(gameData, tile) {
    if (!gameData.tableOpenedPers || gameData.tableOpenedPers.length === 0) return false;
    let okeyDef = gameData.okeyDef;

    for (let per of gameData.tableOpenedPers) {
        if (per.type === 'cift') continue;
        let testStart = [tile, ...per.tiles];
        let testEnd = [...per.tiles, tile];
        if (per.type === 'seri') {
            if (isValidSeries(testStart, okeyDef) || isValidSeries(testEnd, okeyDef)) return true;
        } else if (per.type === 'grup') {
            if (isValidGroup(testEnd, okeyDef)) return true;
        }
    }
    return false;
}

// Taş Atma ve Turu Bitirme (Cezalı: İşler taş veya Okey atılırsa +101 ceza!)
function discardTile(gameData, playerId, tileId) {
    if (gameData.gameOver) return { success: false, msg: "Oyun bitti!" };
    if (gameData.players[gameData.turnIndex] !== playerId) return { success: false, msg: "Sıra sende değil!" };
    if (!gameData.drawnThisTurn) return { success: false, msg: "Önce taş çekmelisin!" };

    let hand = gameData.hands[playerId];
    let tileIndex = hand.findIndex(t => t.id === tileId);
    if (tileIndex === -1) return { success: false, msg: "Atılacak taş elinde yok!" };

    let tile = hand[tileIndex];
    let okeyDef = gameData.okeyDef;

    // Yandan taş alındıysa el açılmadan veya masaya işlenmeden taş atılamaz!
    if (gameData.lastDiscardTaken) {
        if (!gameData.hasOpened[playerId]) {
            return {
                success: false,
                msg: "Yandan taş aldığınızda elinizi açmak (en az 101 puan veya 5 çift) ve aldığınız taşı kullanmak zorundasınız! El açmadan taş atamazsınız. Açamıyorsanız 'Taşı Geri Bırak' butonuna basarak desteden çekiniz."
            };
        } else if (!gameData.takenDiscardTileProcessed) {
            return {
                success: false,
                msg: "Yandan aldığınız taşı masadaki bir pere işlemek veya per/çift olarak indirmek zorundasınız! Masaya işlemeden taş atamazsınız. İşleyemiyorsanız 'Taşı Geri Bırak' butonuna basarak desteden çekiniz."
            };
        }
    }

    // 1. CEZA KONTROLÜ: Okey Atma Cezası
    let threwOkey = isRealOkey(tile, okeyDef);
    if (threwOkey && hand.length > 1) { // Son taşla biterken okey atılabilir
        gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
        addPenaltyToYazboz(gameData, playerId, 101, "Okey Atma Cezası");
    }

    // 2. CEZA KONTROLÜ: İşler Taş Atma Cezası (Masada açılmış per varken işleyen taşı yere atma)
    let isIshler = isTileIshler(gameData, tile);
    if (isIshler && hand.length > 1) {
        gameData.roundPenalties[playerId] = (gameData.roundPenalties[playerId] || 0) + 101;
        addPenaltyToYazboz(gameData, playerId, 101, "İşlek Atma Cezası");
    }

    // Taşı elden çıkar ve oyuncunun atılanlar destesine koy
    hand.splice(tileIndex, 1);
    gameData.discardPiles[playerId].push(tile);
    gameData.lastDiscard = { tile: tile, fromPlayerId: playerId };

    // 3. OYUN BİTİŞ KONTROLÜ (Elde 0 taş kaldıysa bitti!)
    if (hand.length === 0) {
        gameData.gameOver = true;
        gameData.winner = playerId;
        calculateRoundEndScores(gameData, playerId, threwOkey);
        return { success: true, finished: true, winner: playerId, threwOkey: threwOkey };
    }

    // Sıradaki oyuncuya devret
    gameData.turnIndex = (gameData.turnIndex + 1) % 4;
    gameData.drawnThisTurn = false;
    gameData.lastDiscardTaken = false;
    gameData.takenDiscardTile = null;
    gameData.takenDiscardTileId = null;
    gameData.takenDiscardTileProcessed = false;
    gameData.pendingDiscardTaker = null;

    return { 
        success: true, 
        finished: false, 
        nextPlayer: gameData.players[gameData.turnIndex],
        penaltyAdded: (threwOkey || isIshler) ? 101 : 0
    };
}

// Tur Sonu Skorlarını Hesapla (Eşli Kıraathane Kuralları & A4 Yazboz Desteği)
function calculateRoundEndScores(gameData, winnerId, threwOkey) {
    let mode = gameData.mode || 'esli';
    let roundNum = gameData.roundNumber;

    if (mode === 'esli') {
        let winTeamIdx = getTeamIndex(gameData, winnerId);
        let loseTeamIdx = (winTeamIdx === 1) ? 2 : 1;

        let team1Players = [gameData.players[0], gameData.players[2]];
        let team2Players = [gameData.players[1], gameData.players[3]];

        let winTeamPlayers = (winTeamIdx === 1) ? team1Players : team2Players;
        let loseTeamPlayers = (winTeamIdx === 1) ? team2Players : team1Players;

        // 1. Kafa Vurma Kontrolü (Kimse açmadan okeyle elden bitiş):
        let anyOtherOpened = gameData.players.some(pid => pid !== winnerId && gameData.hasOpened[pid]);
        let isKafaVurma = threwOkey && !anyOtherOpened;

        let winSiler = 0;
        let winSilerText = "";

        if (isKafaVurma) {
            // Kazanan takıma -404 siler!
            // Kaybeden takıma 1616 ceza!
            winSiler = 404;
            winSilerText = "Elden Okeyle Kafa Vurma (-404 Siler)";
        } else if (threwOkey) {
            // Okeyle Bitiş: -202 siler, karşı takım cezası 2 ile katlanır
            winSiler = 202;
            winSilerText = "Okeyle Bitiş (-202 Siler)";
        } else {
            // Normal Bitiş: -101 siler (Çizik)
            winSiler = 101;
            winSilerText = "Çizik Bitiş (-101 Siler)";
        }

        // Kazanan takım sileri yazboza ekle
        addSilerToYazboz(gameData, winnerId, winSiler, winSilerText);

        // 2. Üst Bölüm (El Cezaları / Kalan Sayılar):
        // Kazanan takımın el cezası = 0 (Bitti)
        recordTopYazboz(gameData, winTeamIdx, roundNum, "0 (Bitti)", 0);

        if (isKafaVurma) {
            recordTopYazboz(gameData, loseTeamIdx, roundNum, "1616 (Kafa Vurma Cezası)", 1616);
        } else {
            // Kaybeden takımın oyuncuları:
            let pA = loseTeamPlayers[0];
            let pB = loseTeamPlayers[1];
            let openedA = !!gameData.hasOpened[pA];
            let openedB = !!gameData.hasOpened[pB];
            let sumA = getHandSum(gameData.hands[pA], gameData.okeyDef);
            let sumB = getHandSum(gameData.hands[pB], gameData.okeyDef);

            let mult = threwOkey ? 2 : 1;
            let multText = threwOkey ? " x 2 (Okey)" : "";

            if (!openedA && !openedB) {
                // İki kişi de açamadı: 404 ceza (okeyle bittiyse * 2)
                let total = 404 * mult;
                let txt = `404 (İkisi de Açmadı)${multText} = ${total}`;
                recordTopYazboz(gameData, loseTeamIdx, roundNum, txt, total);
            } else if (openedA && !openedB) {
                // Biri açtı (sumA), diğeri açamadı: (202 + sumA) * 2 (okeyle bittiyse * 2 daha)
                let base = (202 + sumA) * 2;
                let total = base * mult;
                let txt = `(202 + ${sumA})*2${multText} = ${total}`;
                recordTopYazboz(gameData, loseTeamIdx, roundNum, txt, total);
            } else if (!openedA && openedB) {
                let base = (202 + sumB) * 2;
                let total = base * mult;
                let txt = `(202 + ${sumB})*2${multText} = ${total}`;
                recordTopYazboz(gameData, loseTeamIdx, roundNum, txt, total);
            } else {
                // İkisi de açtı: sumA + sumB
                let base = sumA + sumB;
                let total = base * mult;
                let txt = `(${sumA} + ${sumB})${multText} = ${total}`;
                recordTopYazboz(gameData, loseTeamIdx, roundNum, txt, total);
            }
        }

        // Genel yazboz toplamlarını hesapla:
        updateYazbozTotals(gameData);
    } else {
        // Tekli (Bireysel) Mod
        let multiplier = threwOkey ? 2 : 1;
        gameData.players.forEach(pid => {
            let isWinner = (pid === winnerId);
            let hand = gameData.hands[pid];
            let hasOpened = gameData.hasOpened[pid];
            let roundScore = 0;

            if (isWinner) {
                roundScore = -101 * multiplier;
            } else {
                if (!hasOpened) {
                    roundScore = 202 * multiplier;
                } else {
                    let remSum = getHandSum(hand, gameData.okeyDef);
                    roundScore = remSum * multiplier;
                }
            }
            let total = roundScore + (gameData.roundPenalties[pid] || 0);
            gameData.scores[pid] = (gameData.scores[pid] || 0) + total;
        });
    }
}

// 101 Okey Bot Yapay Zekası
function makeBotMove(gameData, botId) {
    if (gameData.gameOver || gameData.players[gameData.turnIndex] !== botId) return false;

    // 1. Taş Çek
    if (!gameData.drawnThisTurn) {
        drawTileFromDeck(gameData, botId);
    }

    let hand = gameData.hands[botId] || [];
    let okeyDef = gameData.okeyDef;

    // 2. El Açma Adaylarını Bul (Eğer henüz açmadıysa)
    if (!gameData.hasOpened[botId]) {
        let candidatePers = findBotValidPers(hand, okeyDef);
        let totalScore = candidatePers.reduce((sum, p) => sum + p.score, 0);

        if (totalScore >= 101) {
            openHand(gameData, botId, candidatePers);
        }
    }

    // 3. Masaya İşler Taşları Ekle (Eğer açtıysa)
    if (gameData.hasOpened[botId] && gameData.tableOpenedPers.length > 0) {
        for (let i = hand.length - 1; i >= 0; i--) {
            let t = hand[i];
            if (isRealOkey(t, okeyDef)) continue; // Okeyi elde sakla
            for (let pIdx = 0; pIdx < gameData.tableOpenedPers.length; pIdx++) {
                let res = addTileToTablePer(gameData, botId, t.id, pIdx, 'end');
                if (!res.success) {
                    res = addTileToTablePer(gameData, botId, t.id, pIdx, 'start');
                }
                if (res.success) break;
            }
        }
    }

    // 4. En Önemsiz Taşı At
    let discardTileObj = chooseBotDiscardTile(hand, gameData, okeyDef);
    if (discardTileObj) {
        discardTile(gameData, botId, discardTileObj.id);
    }

    return true;
}

// Bot İçin Elindeki Geçerli Perleri Bulan Algoritma
function findBotValidPers(hand, okeyDef) {
    let sortedHand = [...hand].sort((a, b) => {
        if (a.color !== b.color) return a.color.localeCompare(b.color);
        return a.value - b.value;
    });

    let foundPers = [];
    let usedIds = new Set();

    // Renklere göre serileri ara
    for (let color of COLORS) {
        let colorTiles = sortedHand.filter(t => t.color === color && !t.isFakeOkey && !isRealOkey(t, okeyDef));
        let streak = [];
        for (let i = 0; i < colorTiles.length; i++) {
            if (streak.length === 0) {
                streak.push(colorTiles[i]);
            } else {
                let last = streak[streak.length - 1];
                if (colorTiles[i].value === last.value + 1) {
                    streak.push(colorTiles[i]);
                } else if (colorTiles[i].value !== last.value) {
                    if (streak.length >= 3) {
                        foundPers.push({ tileIds: streak.map(t => t.id), score: getPerScore(streak, okeyDef) });
                        streak.forEach(t => usedIds.add(t.id));
                    }
                    streak = [colorTiles[i]];
                }
            }
        }
        if (streak.length >= 3) {
            foundPers.push({ tileIds: streak.map(t => t.id), score: getPerScore(streak, okeyDef) });
            streak.forEach(t => usedIds.add(t.id));
        }
    }

    // Aynı sayılı grupları ara (farklı renkler)
    for (let v = 1; v <= 13; v++) {
        let sameValTiles = sortedHand.filter(t => t.value === v && !usedIds.has(t.id) && !isRealOkey(t, okeyDef));
        let distinctColors = [];
        let seenColors = new Set();
        for (let t of sameValTiles) {
            if (!seenColors.has(t.color)) {
                seenColors.add(t.color);
                distinctColors.push(t);
            }
        }
        if (distinctColors.length >= 3) {
            foundPers.push({ tileIds: distinctColors.map(t => t.id), score: v * distinctColors.length });
            distinctColors.forEach(t => usedIds.add(t.id));
        }
    }

    return foundPers;
}

// Bot İçin Atılacak En Uygun Taşı Seç
function chooseBotDiscardTile(hand, gameData, okeyDef) {
    if (!hand || hand.length === 0) return null;

    // Asla Okey'i atma
    let nonOkeys = hand.filter(t => !isRealOkey(t, okeyDef));
    if (nonOkeys.length === 0) return hand[0];

    // Masadaki perlere işleyen taşı atıp ceza yememek için işler olmayanları filtrele
    let safeTiles = nonOkeys.filter(t => !isTileIshler(gameData, t));
    let pool = safeTiles.length > 0 ? safeTiles : nonOkeys;

    // En yalnız (tekil) ve yüksek sayılı taşı at
    return pool[pool.length - 1];
}

module.exports = {
    startOkey101Game,
    drawTileFromDeck,
    takeDiscardedTile,
    openHand,
    addTileToTablePer,
    discardTile,
    returnDiscardTile,
    makeBotMove,
    takeOkeyFromTablePer,
    getTeamIndex,
    getPartnerId,
    isValidSeries,
    isValidGroup,
    isValidPair,
    getPerScore,
    findValidPartition,
    isTileIshler,
    isRealOkey
};

// server.js
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const fs = require('fs');

// Oyun Motorları
const batakEngine = require('./batak.js');
const batak4Engine = require('./batak4.js');
const billiardEngine = require('./billiard.js');
const tavlaEngine = require('./tavla.js');
const okey101Engine = require('./okey101.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// --- OYUN ŞİFRESİ ---
const OYUN_SIFRESI = "yasin54";

const players = {};

// --- KALICI VERİ SİSTEMİ (DATA.JSON) ---
const DATA_FILE = './data.json';
let persistentData = {
    users: {}, // username -> { money: 100, avatar: { hat, face, skinColor, shirtColor }, inventory: [] }
    leaderboard: {
        billiard: {}, // name -> wins
        batak: {},     // name -> score
        tavla: {},     // name -> wins
        okey101: {}    // name -> wins
    }
};

function loadPersistentData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            let content = fs.readFileSync(DATA_FILE, 'utf-8');
            let parsed = JSON.parse(content);
            persistentData.users = parsed.users || {};
            persistentData.leaderboard = parsed.leaderboard || { billiard: {}, batak: {}, tavla: {}, okey101: {} };
            if (!persistentData.leaderboard.okey101) persistentData.leaderboard.okey101 = {};
        }
    } catch (e) {
        console.error("Kalıcı veri okunamadı:", e.message);
    }
}

function savePersistentData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(persistentData, null, 2), 'utf-8');
    } catch (e) {
        console.error("Kalıcı veri yazılamadı:", e.message);
    }
}

loadPersistentData();

function findUserKey(name) {
    if (!name) return null;
    let lower = name.toLowerCase().trim();
    return Object.keys(persistentData.users).find(k => k.toLowerCase() === lower) || null;
}

function parseHouseRoom(roomName) {
    if (!roomName || !roomName.toLowerCase().startsWith('house_')) return null;
    let parts = roomName.substring(6).split('_');
    let last = parts[parts.length - 1]?.toLowerCase();
    let houseType = (last === 'standart' || last === 'garden' || last === 'pool') ? last : null;
    let rawOwner = houseType ? parts.slice(0, -1).join('_') : parts.join('_');
    let owner = findUserKey(rawOwner) || rawOwner;
    return { owner, houseType };
}

function getFriendListData(username) {
    let uKey = findUserKey(username) || username;
    let uData = persistentData.users[uKey];
    if (!uData || !uData.friends) return [];
    return uData.friends.map(fName => {
        let fKey = findUserKey(fName) || fName;
        let onlinePlayer = Object.values(players).find(p => p.name.toLowerCase() === fKey.toLowerCase());
        let fData = persistentData.users[fKey];
        return {
            username: fKey,
            isOnline: !!onlinePlayer,
            room: onlinePlayer ? onlinePlayer.room : null,
            house: fData ? fData.house : null
        };
    });
}

const baseTableConfigs = {
    billiard: { min: 2, name: '8-Ball Bilardo', type: 'billiard' },
    batak: { min: 3, name: 'Gömmeli Batak (3 Kişi)', type: 'batak' },
    batak4: { min: 4, name: 'Normal Batak (4 Kişi)', type: 'batak4' },
    tavla: { min: 2, name: 'Klasik Tavla', type: 'tavla' },
    okey101: { min: 4, name: '101 Okey (Çiftli / Eşli)', type: 'okey101', mode: 'esli' },
    okey101_tekli: { min: 4, name: '101 Okey (Tekli)', type: 'okey101_tekli', mode: 'tekli' }
};

const tables = {
    billiard: { id: 'billiard', baseType: 'billiard', name: '8-Ball Bilardo', min: 2, bet: 0, pot: 0, players: [], spectators: [] },
    batak: { id: 'batak', baseType: 'batak', name: 'Gömmeli Batak (3 Kişi)', min: 3, bet: 0, pot: 0, players: [], spectators: [] },
    batak4: { id: 'batak4', baseType: 'batak4', name: 'Normal Batak (4 Kişi)', min: 4, bet: 0, pot: 0, players: [], spectators: [] },
    tavla: { id: 'tavla', baseType: 'tavla', name: 'Klasik Tavla', min: 2, bet: 0, pot: 0, players: [], spectators: [] },
    okey101: { id: 'okey101', baseType: 'okey101', name: '101 Okey (Çiftli / Eşli)', min: 4, bet: 0, pot: 0, mode: 'esli', players: [], spectators: [] },
    okey101_tekli: { id: 'okey101_tekli', baseType: 'okey101_tekli', name: '101 Okey (Tekli)', min: 4, bet: 0, pot: 0, mode: 'tekli', players: [], spectators: [] }
};

const activeGames = {};

function getPlayersInRoom(roomName) {
    let roomPlayers = {};
    for (let id in players) {
        if (players[id].room === roomName) roomPlayers[id] = players[id];
    }
    return roomPlayers;
}

// --- BATAK 40 SANİYE AFK VE BOT SİSTEMİ ---
let batakAfkTimers = {};
let okey101AfkTimers = {};
let billiardBotTimers = {};
let playerFishingTimers = {};
let playerTeaTimers = {};

function startBatakAfkTimer(game) {
    if (!game || game.gameOver || game.waitingTrickClear) return;
    let gid = game.tableId;
    if (batakAfkTimers[gid]) {
        clearTimeout(batakAfkTimers[gid]);
        delete batakAfkTimers[gid];
    }

    let currentPid = game.players[game.turnIndex];
    let isBot = game.playerProfiles[currentPid]?.isBot;
    // Bot ise 1.2 saniye, insan ise 40 saniye AFK süresi!
    let delay = isBot ? 1200 : 40000;

    batakAfkTimers[gid] = setTimeout(() => {
        makeBatakAiMove(game, currentPid, isBot);
    }, delay);
}

function makeBatakAiMove(game, pid, isBot) {
    if (!game || game.gameOver || game.waitingTrickClear) return;
    let engine = game.isBatak4 ? batak4Engine : batakEngine;

    if (game.phase === 'ihale') {
        let currentBid = game.bid.current;
        let hand = game.hands[pid] || [];
        let highCount = hand.filter(c => c.value === 'A' || c.value === 'K' || c.value === 'Q').length;
        if (highCount >= 5 && currentBid < 8) {
            engine.handleBid(game, pid, currentBid + 1);
        } else {
            engine.handleBid(game, pid, 'pas');
        }
        sendBatakUpdate(game);
    }
    else if (game.phase === 'koz_secimi') {
        let hand = game.hands[pid] || [];
        let suitCounts = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 };
        hand.forEach(c => { if (suitCounts[c.suit] !== undefined) suitCounts[c.suit]++; });
        let bestSuit = Object.keys(suitCounts).reduce((a, b) => suitCounts[a] > suitCounts[b] ? a : b, '♠');
        engine.setTrump(game, pid, bestSuit);
        sendBatakUpdate(game);
    }
    else if (game.phase === 'gomme') {
        let hand = game.hands[pid] || [];
        let nonTrumpIndices = [];
        hand.forEach((c, idx) => {
            if (c.suit !== game.trump) nonTrumpIndices.push(idx);
        });
        let discardIndices = nonTrumpIndices.slice(0, 4);
        while (discardIndices.length < 4) {
            let nextIdx = hand.findIndex((_, i) => !discardIndices.includes(i));
            if (nextIdx !== -1) discardIndices.push(nextIdx);
            else break;
        }
        engine.discardCards(game, pid, discardIndices);
        sendBatakUpdate(game);
    }
    else if (game.phase === 'oyun') {
        if (game.waitingTrickClear || (game.tableCards && game.tableCards.length >= (game.isBatak4 ? 4 : 3))) return;
        let hand = game.hands[pid] || [];
        for (let i = 0; i < hand.length; i++) {
            let color = players[pid]?.color || game.playerProfiles[pid]?.color || '#fff';
            let testResult = engine.playCard(game, pid, i, color);
            if (testResult.success) {
                handleBatakCardPlayed(game, engine, testResult);
                break;
            }
        }
    }
}

function handleBatakCardPlayed(game, engine, result) {
    if (batakAfkTimers[game.tableId]) {
        clearTimeout(batakAfkTimers[game.tableId]);
        delete batakAfkTimers[game.tableId];
    }

    if (result.trickWinner !== null) {
        game.waitingTrickClear = true;
        sendBatakUpdate(game); // Masadaki 3 kartı ve sonucu gösterir, el temizlenmeden afk timer başlatmaz

        let winnerName = (players[result.trickWinner] ? players[result.trickWinner].name : game.playerProfiles[result.trickWinner]?.name) || "Biri";

        game.players.forEach(pid => io.to(pid).emit('systemMessage', `Eli ${winnerName} aldı!`));
        if (game.spectators) {
            game.spectators.forEach(sid => io.to(sid).emit('systemMessage', `Eli ${winnerName} aldı!`));
        }

        setTimeout(() => {
            game.tableCards = [];
            game.waitingTrickClear = false;

            if (result.roundEnded) {
                let roundMsg = "TUR BİTTİ! Puanlar hesaplandı, Yeni el dağıtılıyor...";
                game.players.forEach(pid => io.to(pid).emit('systemMessage', roundMsg));
                if (game.spectators) {
                    game.spectators.forEach(sid => io.to(sid).emit('systemMessage', roundMsg));
                }

                // Liderlik tablosunu ve kazanan ödülünü güncelle
                let highestScore = -999;
                let topPid = null;
                game.players.forEach(pid => {
                    let pName = game.playerProfiles[pid]?.name;
                    let score = game.scores[pid] || 0;
                    let isBot = pid.startsWith('bot_') || (pName && (pName.startsWith('🤖') || pName.includes('🤖'))) || game.playerProfiles[pid]?.isBot;
                    if (pName && score > 0 && !isBot) {
                        persistentData.leaderboard.batak[pName] = (persistentData.leaderboard.batak[pName] || 0) + score;
                        if (score > highestScore) {
                            highestScore = score;
                            topPid = pid;
                        }
                    }
                });

                if (topPid && persistentData.users[game.playerProfiles[topPid]?.name]) {
                    let uName = game.playerProfiles[topPid].name;
                    let roundWin = 20;
                    if (game.pot && game.pot > 0) {
                        roundWin += game.pot;
                        let potMsg = `💰 TEBRİKLER! ${uName} masadaki ${game.pot} TL'lik pot ödülünü kazandı!`;
                        game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        game.pot = 0;
                    }
                    persistentData.users[uName].money = (persistentData.users[uName].money || 100) + roundWin;
                    io.to(topPid).emit('moneyUpdate', persistentData.users[uName].money);
                }
                savePersistentData();

                setTimeout(() => {
                    let oldScores = game.scores;
                    let nextRound = (game.roundNumber || 1) + 1;

                    let newGame = engine.startBatakGame(game.players, oldScores, nextRound);
                    newGame.isBatak4 = game.isBatak4;
                    newGame.tableId = game.tableId;
                    newGame.bet = game.bet || 0;
                    newGame.pot = game.pot || 0;
                    newGame.spectators = game.spectators || [];
                    newGame.playerProfiles = game.playerProfiles;
                    newGame.disconnectedPlayers = game.disconnectedPlayers || {};

                    activeGames[game.tableId] = newGame;
                    sendBatakUpdate(newGame);
                }, 4000);
            } else {
                sendBatakUpdate(game); // Yeni el başlar, timer artık çalışır
            }
        }, 2000);
    } else {
        sendBatakUpdate(game);
    }
}

function sendBatakUpdate(game) {
    if (!game || !game.hands || !game.players) return;
    let playerInfos = {};
    game.players.forEach(pid => {
        let pName = "Kayıtsız";
        if (players[pid]) pName = players[pid].name;
        else if (game.playerProfiles && game.playerProfiles[pid]) pName = game.playerProfiles[pid].name;

        playerInfos[pid] = {
            name: pName,
            score: (game.scores && game.scores[pid] !== undefined) ? game.scores[pid] : 0,
            tricks: (game.tricksTaken && game.tricksTaken[pid] !== undefined) ? game.tricksTaken[pid] : 0,
            isDisconnected: (game.disconnectedPlayers && !!game.disconnectedPlayers[pid])
        };
    });

    let currentPid = game.players[game.turnIndex];
    let currentPlayerName = playerInfos[currentPid] ? playerInfos[currentPid].name : "Biri";

    // Masadaki asıl oyunculara gönder (AFK süresi 40 saniye)
    game.players.forEach((pid) => {
        io.to(pid).emit('batakUpdate', {
            phase: game.phase,
            hand: (game.hands && game.hands[pid]) || [],
            table: game.tableCards,
            myTurn: !game.waitingTrickClear && (game.players[game.turnIndex] === pid),
            turnIndex: game.turnIndex,
            players: game.players,
            turnPlayerName: currentPlayerName,
            tricks: (game.tricksTaken && game.tricksTaken[pid] !== undefined) ? game.tricksTaken[pid] : 0,
            trump: game.trump,
            bidInfo: game.bid,
            playerInfos: playerInfos,
            roundNumber: game.roundNumber || 1,
            isSpectator: false,
            tableId: game.tableId,
            turnTimeout: 40
        });
    });

    // Masadaki izleyicilere (yancılara) gönder (kartlar gizli)
    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach((sid) => {
            io.to(sid).emit('batakUpdate', {
                phase: game.phase,
                hand: [],
                table: game.tableCards,
                myTurn: false,
                turnIndex: game.turnIndex,
                players: game.players,
                turnPlayerName: currentPlayerName,
                tricks: 0,
                trump: game.trump,
                bidInfo: game.bid,
                playerInfos: playerInfos,
                roundNumber: game.roundNumber || 1,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 40
            });
        });
    }

    // 40 Saniyelik AFK veya Bot Tetikleyiciyi Başlat (Sadece el toplanması beklemiyorsa!)
    if (!game.waitingTrickClear) {
        startBatakAfkTimer(game);
    }
}

function sendTavlaUpdate(game) {
    if (!game || !game.players) return;
    let stateObj = {
        tableId: game.tableId,
        players: game.players,
        playerColors: game.playerColors,
        turnIndex: game.turnIndex,
        board: game.board,
        bar: game.bar,
        borneOff: game.borneOff,
        dice: game.dice,
        remainingMoves: game.remainingMoves,
        hasRolled: game.hasRolled,
        winner: game.winner,
        gameOver: game.gameOver,
        playerProfiles: game.playerProfiles,
        disconnectedPlayers: game.disconnectedPlayers || {}
    };

    game.players.forEach(pid => {
        io.to(pid).emit('tavlaUpdate', { ...stateObj, isSpectator: false });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach(sid => {
            io.to(sid).emit('tavlaUpdate', { ...stateObj, isSpectator: true });
        });
    }
}

function getBatakInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (g && g.players && g.players.includes(socketId)) {
            let engine = g.isBatak4 ? batak4Engine : batakEngine;
            return { game: g, engine: engine, gameId: gid };
        }
    }
    return null;
}

function getBilliardInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('billiard') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: billiardEngine, gameId: gid };
        }
    }
    return null;
}

function getTavlaInstance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('tavla') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: tavlaEngine, gameId: gid };
        }
    }
    return null;
}

function getOkey101Instance(socketId) {
    for (let gid in activeGames) {
        let g = activeGames[gid];
        if (gid.startsWith('okey101') && g && g.players && g.players.includes(socketId)) {
            return { game: g, engine: okey101Engine, gameId: gid };
        }
    }
    return null;
}

function sendOkey101Update(game) {
    if (!game || !game.hands || !game.players) return;
    let playerInfos = {};
    game.players.forEach(pid => {
        let pName = "Kayıtsız";
        if (players[pid]) pName = players[pid].name;
        else if (game.playerProfiles && game.playerProfiles[pid]) pName = game.playerProfiles[pid].name;

        playerInfos[pid] = {
            name: pName,
            color: game.playerProfiles && game.playerProfiles[pid] ? game.playerProfiles[pid].color : "#fff",
            score: (game.scores && game.scores[pid] !== undefined) ? game.scores[pid] : 0,
            penalties: (game.roundPenalties && game.roundPenalties[pid] !== undefined) ? game.roundPenalties[pid] : 0,
            hasOpened: !!(game.hasOpened && game.hasOpened[pid]),
            openedType: game.openedType ? game.openedType[pid] : null,
            tileCount: game.hands && game.hands[pid] ? game.hands[pid].length : 0,
            lastDiscard: game.discardPiles && game.discardPiles[pid] && game.discardPiles[pid].length > 0 ? game.discardPiles[pid][game.discardPiles[pid].length - 1] : null,
            isDisconnected: (game.disconnectedPlayers && !!game.disconnectedPlayers[pid]),
            isBot: !!(game.playerProfiles && game.playerProfiles[pid]?.isBot)
        };
    });

    let currentPid = game.players[game.turnIndex];
    let currentPlayerName = playerInfos[currentPid] ? playerInfos[currentPid].name : "Biri";

    game.players.forEach((pid) => {
        if (game.disconnectedPlayers && game.disconnectedPlayers[pid]) return; // Masadan ayrılmış oyuncuya update gönderme!
        let prevPid = game.players[(game.turnIndex + 3) % 4];
        let partnerPid = okey101Engine.getPartnerId(game, pid);
        let partnerOpened = partnerPid && game.hasOpened && !!game.hasOpened[partnerPid];
        let canTakeDiscard = (game.players[game.turnIndex] === pid) && !game.drawnThisTurn && !!(game.discardPiles && game.discardPiles[prevPid] && game.discardPiles[prevPid].length > 0);

        let isMyTurn = (game.players[game.turnIndex] === pid);
        let myDiscardTaken = isMyTurn && !!game.lastDiscardTaken;
        let takenDiscardTileId = myDiscardTaken ? game.takenDiscardTileId : null;

        io.to(pid).emit('okey101Update', {
            hand: (game.hands && game.hands[pid]) || [],
            myTurn: isMyTurn,
            turnIndex: game.turnIndex,
            players: game.players,
            turnPlayerName: currentPlayerName,
            gosterge: game.gosterge,
            okeyDef: game.okeyDef,
            drawPileCount: game.drawPile ? game.drawPile.length : 0,
            tableOpenedPers: game.tableOpenedPers || [],
            playerInfos: playerInfos,
            drawnThisTurn: game.drawnThisTurn,
            lastDiscardTaken: myDiscardTaken,
            takenDiscardTileId: takenDiscardTileId,
            canTakeDiscard: canTakeDiscard,
            roundNumber: game.roundNumber || 1,
            mode: game.mode || 'esli',
            yazboz: game.yazboz || null,
            partnerId: partnerPid,
            partnerOpened: partnerOpened,
            teamIdx: okey101Engine.getTeamIndex(game, pid),
            isSpectator: false,
            tableId: game.tableId,
            turnTimeout: 40,
            gameOver: game.gameOver,
            winner: game.winner
        });
    });

    if (game.spectators && game.spectators.length > 0) {
        game.spectators.forEach((sid) => {
            io.to(sid).emit('okey101Update', {
                hand: [],
                myTurn: false,
                turnIndex: game.turnIndex,
                players: game.players,
                turnPlayerName: currentPlayerName,
                gosterge: game.gosterge,
                okeyDef: game.okeyDef,
                drawPileCount: game.drawPile ? game.drawPile.length : 0,
                tableOpenedPers: game.tableOpenedPers || [],
                playerInfos: playerInfos,
                drawnThisTurn: game.drawnThisTurn,
                lastDiscardTaken: game.lastDiscardTaken,
                canTakeDiscard: false,
                roundNumber: game.roundNumber || 1,
                mode: game.mode || 'esli',
                yazboz: game.yazboz || null,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 40,
                gameOver: game.gameOver,
                winner: game.winner
            });
        });
    }

    if (game.gameOver && game.winner && !game.winnerRecorded) {
        game.winnerRecorded = true;
        let wName = game.playerProfiles[game.winner]?.name;
        if (wName) {
            let isHuman = !game.winner.startsWith('bot_') && !wName.startsWith('🤖');
            if (isHuman) {
                persistentData.leaderboard.okey101[wName] = (persistentData.leaderboard.okey101[wName] || 0) + 1;
            }
            let winPrize = 25;
            if (game.pot && game.pot > 0) {
                winPrize += game.pot;
                let potMsg = `💰 TEBRİKLER! ${wName} 101 Okey masasındaki ${game.pot} TL'lik potu kazandı!`;
                game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                game.pot = 0;
            }
            if (isHuman && persistentData.users[wName]) {
                persistentData.users[wName].money = (persistentData.users[wName].money || 100) + winPrize;
                io.to(game.winner).emit('moneyUpdate', persistentData.users[wName].money);
            }
            savePersistentData();
        }
    } else {
        startOkey101AfkTimer(game);
    }
}

function startOkey101AfkTimer(game) {
    if (!game || game.gameOver) return;
    let gid = game.tableId;
    if (okey101AfkTimers[gid]) {
        clearTimeout(okey101AfkTimers[gid]);
        delete okey101AfkTimers[gid];
    }

    let currentPid = game.players[game.turnIndex];
    let isBot = game.playerProfiles[currentPid]?.isBot || currentPid.startsWith('bot_');
    let delay = isBot ? 1400 : 40000;

    okey101AfkTimers[gid] = setTimeout(() => {
        delete okey101AfkTimers[gid];
        if (game.players[game.turnIndex] === currentPid && !game.gameOver) {
            okey101Engine.makeBotMove(game, currentPid);
            sendOkey101Update(game);
            if (game.gameOver) {
                checkOkey101RoundEnd(game);
            }
        }
    }, delay);
}

function startNextOkey101Round(oldGame) {
    if (!oldGame || !oldGame.tableId) return;
    let tableId = oldGame.tableId;
    let nextRoundNum = (oldGame.roundNumber || 1) + 1;
    let nextGame = okey101Engine.startOkey101Game(
        oldGame.players,
        oldGame.scores,
        nextRoundNum,
        oldGame.mode || 'esli',
        oldGame.yazboz
    );
    nextGame.tableId = tableId;
    nextGame.mode = oldGame.mode;
    nextGame.bet = oldGame.bet;
    nextGame.pot = oldGame.pot;
    nextGame.spectators = oldGame.spectators || [];
    nextGame.disconnectedPlayers = oldGame.disconnectedPlayers || {};
    nextGame.playerProfiles = oldGame.playerProfiles || {};

    activeGames[tableId] = nextGame;
    sendOkey101Update(nextGame);
}

function checkOkey101RoundEnd(game) {
    if (!game || !game.gameOver || game.nextRoundScheduled) return;
    game.nextRoundScheduled = true;
    setTimeout(() => {
        if (game.tableId && activeGames[game.tableId] && activeGames[game.tableId].gameOver) {
            startNextOkey101Round(activeGames[game.tableId]);
        }
    }, 8000);
}

function makeBilliardBotShot(game, botId) {
    if (!game || game.gameOver || game.players[game.turnIndex] !== botId) return;

    if (game.ballInHand) {
        let placed = false;
        let testPositions = [
            { x: 150, y: 150 }, { x: 140, y: 100 }, { x: 140, y: 200 },
            { x: 180, y: 150 }, { x: 120, y: 150 }, { x: 200, y: 120 }
        ];
        for (let pos of testPositions) {
            if (billiardEngine.placeWhiteBall(game, botId, pos.x, pos.y)) {
                placed = true;
                break;
            }
        }
        if (!placed) {
            game.balls.white.x = 150;
            game.balls.white.y = 150;
            game.balls.white.vx = 0;
            game.balls.white.vy = 0;
            game.ballInHand = false;
        }
    }

    let white = game.balls.white;
    if (!white || !white.active) return;

    let mySuit = game.playerSuits[botId];
    let candidateBalls = [];
    let allBalls = Object.values(game.balls).filter(b => b.active && b.type !== 'white');

    if (mySuit) {
        candidateBalls = allBalls.filter(b => b.type === mySuit);
        if (candidateBalls.length === 0) {
            candidateBalls = allBalls.filter(b => b.type === 'black');
        }
    } else {
        candidateBalls = allBalls.filter(b => b.type === 'solid' || b.type === 'stripe');
        if (candidateBalls.length === 0) candidateBalls = allBalls.filter(b => b.type === 'black');
    }

    if (candidateBalls.length === 0) return;

    const pockets = [
        { x: 12, y: 12 }, { x: 300, y: 10 }, { x: 588, y: 12 },
        { x: 12, y: 288 }, { x: 300, y: 290 }, { x: 588, y: 288 }
    ];

    let bestShot = null;
    let bestScore = -999999;

    for (let target of candidateBalls) {
        for (let pocket of pockets) {
            let dxTP = pocket.x - target.x;
            let dyTP = pocket.y - target.y;
            let distTP = Math.sqrt(dxTP * dxTP + dyTP * dyTP);
            if (distTP === 0) continue;

            let ghostX = target.x - (dxTP / distTP) * 16;
            let ghostY = target.y - (dyTP / distTP) * 16;

            if (ghostX < 16 || ghostX > 584 || ghostY < 16 || ghostY > 284) continue;

            let dxWG = ghostX - white.x;
            let dyWG = ghostY - white.y;
            let distWG = Math.sqrt(dxWG * dxWG + dyWG * dyWG);
            if (distWG === 0) continue;

            let dirWG = { x: dxWG / distWG, y: dyWG / distWG };
            let dirTP = { x: dxTP / distTP, y: dyTP / distTP };
            let dot = dirWG.x * dirTP.x + dirWG.y * dirTP.y;

            if (dot > 0.05) {
                let score = dot * 200 - distTP * 0.2 - distWG * 0.15;
                if (score > bestScore) {
                    bestScore = score;
                    bestShot = {
                        angle: Math.atan2(dyWG, dxWG) * (180 / Math.PI),
                        power: Math.min(22, Math.max(10, 8 + (distTP + distWG) * 0.025))
                    };
                }
            }
        }
    }

    if (!bestShot) {
        let target = candidateBalls[0];
        let dx = target.x - white.x;
        let dy = target.y - white.y;
        bestShot = {
            angle: Math.atan2(dy, dx) * (180 / Math.PI),
            power: 14
        };
    }

    let jitter = (Math.random() - 0.5) * 3;
    let finalAngle = bestShot.angle + jitter;

    billiardEngine.shootBall(game, botId, finalAngle, bestShot.power, 0, 0);
}

io.on('connection', (socket) => {
    console.log('Yeni biri bağlandı:', socket.id);

    // 1. ŞİFRELİ VE İSİMLİ GİRİŞ (LOGIN)
    socket.on('login', (data) => {
        if (data.pass === OYUN_SIFRESI) {
            let inputName = (data.name || "Oyuncu").trim();
            let username = findUserKey(inputName) || inputName;

            let chosenGender = data.gender || 'male';

            // Kalıcı hesap ve bakiye kontrolü (Varsayılan 100 TL)
            if (!persistentData.users[username]) {
                let isFem = (chosenGender === 'female');
                persistentData.users[username] = {
                    money: 100,
                    gender: chosenGender,
                    avatar: {
                        hat: isFem ? 'hair_long' : 'bere',
                        face: 'none',
                        skinColor: '#ffd1a4',
                        shirtColor: isFem ? 'dress_pink' : '#3b82f6',
                        color: isFem ? 'dress_pink' : '#3b82f6',
                        heldItem: 'none',
                        shoes: isFem ? 'flats' : 'sneakers'
                    },
                    inventory: isFem ? ['hats_hair_long', 'skins_#ffd1a4', 'shirts_dress_pink', 'shoes_flats', 'face_none', 'props_none'] : ['hats_bere', 'skins_#facc15', 'shirts_#3b82f6', 'shoes_sneakers', 'face_none', 'props_none'],
                    friends: [],
                    friendRequests: [],
                    house: null,
                    furnitureInventory: [],
                    propInventory: {}
                };
                savePersistentData();
            }
            let uData = persistentData.users[username];
            if (data.gender) {
                uData.gender = data.gender;
            }
            if (!uData.gender) uData.gender = 'male';
            if (!uData.avatar.shoes) uData.avatar.shoes = (uData.gender === 'female' ? 'flats' : 'sneakers');
            if (!uData.avatar.heldItem) uData.avatar.heldItem = 'none';
            if (!uData.inventory) uData.inventory = [];
            if (!uData.inventory.includes('props_none')) uData.inventory.push('props_none');
            if (!uData.friends) uData.friends = [];
            if (!uData.friendRequests) uData.friendRequests = [];
            if (!uData.house) uData.house = null;
            if (!uData.furnitureInventory) uData.furnitureInventory = [];

            // El eşyaları (props) envanter paketi & çoklu alım desteği
            if (!uData.propInventory) {
                uData.propInventory = {};
                uData.inventory.forEach(k => {
                    if (k.startsWith('props_') && k !== 'props_none') {
                        if (!uData.propInventory[k]) uData.propInventory[k] = 1;
                    }
                });
            }

            // Çay süresi kontrolü (5 dakika dolmuşsa elinden al)
            let hasValidTea = false;
            if (uData.teaExpiresAt) {
                if (Date.now() >= uData.teaExpiresAt) {
                    uData.teaExpiresAt = null;
                    if (uData.avatar.heldItem === 'cay') uData.avatar.heldItem = 'none';
                    delete uData.propInventory['props_cay'];
                    savePersistentData();
                } else {
                    hasValidTea = true;
                }
            }

            players[socket.id] = {
                name: username,
                x: 400, y: 400,
                color: uData.avatar.shirtColor || '#3b82f6',
                skinColor: uData.avatar.skinColor || '#facc15',
                hat: uData.avatar.hat || 'bere',
                face: uData.avatar.face || 'none',
                heldItem: uData.avatar.heldItem || 'none',
                shoes: uData.avatar.shoes || 'none',
                gender: uData.gender || 'male',
                money: uData.money !== undefined ? uData.money : 100,
                msg: "",
                room: "sokak",
                hasTea: hasValidTea,
                action: hasValidTea ? 'tea' : null,
                isFishing: false,
                hasSwanBoat: false
            };

            // Eğer çay süresi devam ediyorsa zamanlayıcıyı kur
            if (hasValidTea) {
                givePlayerTeaWithTimer(socket.id, username, uData.teaExpiresAt - Date.now());
            }

            socket.join("sokak");
            let isAdmin = (username.toLowerCase() === 'yasin');
            socket.emit('loginSuccess', {
                money: uData.money,
                avatar: uData.avatar,
                inventory: uData.inventory,
                propInventory: uData.propInventory,
                friendRequests: uData.friendRequests || [],
                isAdmin: isAdmin,
                username: username,
                friends: getFriendListData(username),
                houses: uData.houses || (uData.house ? { [uData.house.type]: uData.house } : {}),
                house: uData.house,
                gender: uData.gender || 'male',
                furnitureInventory: uData.furnitureInventory
            });
            socket.emit('currentPlayers', getPlayersInRoom("sokak"));
            socket.to("sokak").emit('newPlayer', { id: socket.id, player: players[socket.id] });

            console.log(`${username} oyuna giriş yaptı! Bakiye: ${uData.money} TL`);

            // Devam eden oyun kontrolü (Reconnect Teklifi)
            let ongoingGame = null;
            let oldPid = null;
            for (let tid in activeGames) {
                let g = activeGames[tid];
                if (g && g.disconnectedPlayers) {
                    for (let dPid in g.disconnectedPlayers) {
                        if (g.disconnectedPlayers[dPid].name.toLowerCase() === username.toLowerCase()) {
                            ongoingGame = { tableId: tid, game: g };
                            oldPid = dPid;
                            break;
                        }
                    }
                }
                if (ongoingGame) break;
            }

            if (ongoingGame) {
                socket.emit('reconnectOffer', {
                    tableId: ongoingGame.tableId,
                    tableName: tables[ongoingGame.tableId] ? tables[ongoingGame.tableId].name : ongoingGame.tableId,
                    gameType: ongoingGame.tableId.startsWith('billiard') ? 'billiard' : (ongoingGame.tableId.startsWith('tavla') ? 'tavla' : 'batak')
                });
            }
        } else {
            socket.emit('loginFailed');
        }
    });

    // RECONNECT (Kendi Eski Koltuğuna Geri Dönüş)
    socket.on('acceptReconnect', (tableId) => {
        let game = activeGames[tableId];
        if (!game || !players[socket.id]) return;

        let myName = players[socket.id].name.toLowerCase();
        let oldPid = null;

        for (let pid in game.disconnectedPlayers) {
            if (game.disconnectedPlayers[pid].name.toLowerCase() === myName) {
                oldPid = pid;
                break;
            }
        }
        if (!oldPid) {
            for (let pid in game.playerProfiles) {
                if (game.playerProfiles[pid].name.toLowerCase() === myName) {
                    oldPid = pid;
                    break;
                }
            }
        }

        if (!oldPid || !game.players.includes(oldPid)) {
            socket.emit('gameError', "Eski koltuğunuz artık mevcut değil veya başka biri devraldı.");
            return;
        }

        // Eski socket ID'sini yeni ID ile güncelle
        let pIndex = game.players.indexOf(oldPid);
        if (pIndex !== -1) game.players[pIndex] = socket.id;

        game.playerProfiles[socket.id] = game.playerProfiles[oldPid];
        delete game.playerProfiles[oldPid];

        if (game.disconnectedPlayers) delete game.disconnectedPlayers[oldPid];

        if (game.hands && game.hands[oldPid]) {
            game.hands[socket.id] = game.hands[oldPid];
            delete game.hands[oldPid];
        }
        if (game.tricksTaken && game.tricksTaken[oldPid] !== undefined) {
            game.tricksTaken[socket.id] = game.tricksTaken[oldPid];
            delete game.tricksTaken[oldPid];
        }
        if (game.scores && game.scores[oldPid] !== undefined) {
            game.scores[socket.id] = game.scores[oldPid];
            delete game.scores[oldPid];
        }
        if (game.playerSuits && game.playerSuits[oldPid] !== undefined) {
            game.playerSuits[socket.id] = game.playerSuits[oldPid];
            delete game.playerSuits[oldPid];
        }
        if (game.bid && game.bid.highestBidder === oldPid) {
            game.bid.highestBidder = socket.id;
        }
        if (game.passedPlayers) {
            game.passedPlayers = game.passedPlayers.map(p => p === oldPid ? socket.id : p);
        }
        if (game.tableCards) {
            game.tableCards.forEach(tc => { if (tc.playerId === oldPid) tc.playerId = socket.id; });
        }
        if (game.hasOpened && game.hasOpened[oldPid] !== undefined) {
            game.hasOpened[socket.id] = game.hasOpened[oldPid];
            delete game.hasOpened[oldPid];
        }
        if (game.openedType && game.openedType[oldPid] !== undefined) {
            game.openedType[socket.id] = game.openedType[oldPid];
            delete game.openedType[oldPid];
        }
        if (game.roundPenalties && game.roundPenalties[oldPid] !== undefined) {
            game.roundPenalties[socket.id] = game.roundPenalties[oldPid];
            delete game.roundPenalties[oldPid];
        }
        if (game.discardPiles && game.discardPiles[oldPid]) {
            game.discardPiles[socket.id] = game.discardPiles[oldPid];
            delete game.discardPiles[oldPid];
        }

            players[socket.id].room = "kafe";
            socket.join("kafe");

            let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
            socket.emit('startGame', gameType);

            if (gameType === 'batak') {
                sendBatakUpdate(game);
            } else if (gameType === 'tavla') {
                sendTavlaUpdate(game);
            } else if (gameType === 'okey101') {
                sendOkey101Update(game);
            } else if (gameType === 'billiard') {
                socket.emit('billiardUpdate', {
                    balls: game.balls,
                    turnIndex: game.turnIndex,
                    players: game.players,
                    playerSuits: game.playerSuits,
                    ballInHand: game.ballInHand,
                    winner: game.winner,
                    gameOver: game.gameOver,
                    tableId: game.tableId,
                    turnTimeout: 30,
                    disconnectedPlayers: game.disconnectedPlayers || {}
                });
            }

            io.to("kafe").emit('systemMessage', `✅ ${players[socket.id].name} masaya geri döndü!`);
            game.players.forEach(pid => {
                if (pid !== socket.id) io.to(pid).emit('systemMessage', `✅ ${players[socket.id].name} masaya geri döndü, oyun devam ediyor!`);
            });
        });

    socket.on('declineReconnect', (tableId) => {
        let game = activeGames[tableId];
        if (game && players[socket.id]) {
            let myName = players[socket.id].name;
            game.players.forEach(pid => {
                if (pid !== socket.id) io.to(pid).emit('systemMessage', `ℹ️ ${myName} masaya dönmedi.`);
            });
        }
    });

    // BOŞALAN KOLTUĞU DEVRALMA (YENİ OYUNCU EKSİK KOLTUĞA GEÇER)
    socket.on('takeoverSeat', (data) => {
        // data: { tableId, oldPid }
        let tableId = data.tableId;
        let game = activeGames[tableId];
        if (!game || !players[socket.id]) return;

        let oldPid = data.oldPid;
        if (!oldPid || !game.disconnectedPlayers || !game.disconnectedPlayers[oldPid]) {
            // İlk boş koltuğu al
            let discKeys = Object.keys(game.disconnectedPlayers || {});
            if (discKeys.length > 0) oldPid = discKeys[0];
            else {
                socket.emit('gameError', "Bu masada boşalan koltuk kalmadı!");
                return;
            }
        }

        let oldInfo = game.disconnectedPlayers[oldPid];
        let pIndex = game.players.indexOf(oldPid);
        if (pIndex !== -1) game.players[pIndex] = socket.id;

        game.playerProfiles[socket.id] = {
            name: players[socket.id].name,
            color: players[socket.id].color
        };
        delete game.playerProfiles[oldPid];
        delete game.disconnectedPlayers[oldPid];

        if (game.hands && game.hands[oldPid]) {
            game.hands[socket.id] = game.hands[oldPid];
            delete game.hands[oldPid];
        }
        if (game.tricksTaken && game.tricksTaken[oldPid] !== undefined) {
            game.tricksTaken[socket.id] = game.tricksTaken[oldPid];
            delete game.tricksTaken[oldPid];
        }
        if (game.scores && game.scores[oldPid] !== undefined) {
            game.scores[socket.id] = game.scores[oldPid];
            delete game.scores[oldPid];
        }
        if (game.playerSuits && game.playerSuits[oldPid] !== undefined) {
            game.playerSuits[socket.id] = game.playerSuits[oldPid];
            delete game.playerSuits[oldPid];
        }
        if (game.bid && game.bid.highestBidder === oldPid) {
            game.bid.highestBidder = socket.id;
        }
        if (game.passedPlayers) {
            game.passedPlayers = game.passedPlayers.map(p => p === oldPid ? socket.id : p);
        }
        if (game.tableCards) {
            game.tableCards.forEach(tc => { if (tc.playerId === oldPid) tc.playerId = socket.id; });
        }
        if (game.hasOpened && game.hasOpened[oldPid] !== undefined) {
            game.hasOpened[socket.id] = game.hasOpened[oldPid];
            delete game.hasOpened[oldPid];
        }
        if (game.openedType && game.openedType[oldPid] !== undefined) {
            game.openedType[socket.id] = game.openedType[oldPid];
            delete game.openedType[oldPid];
        }
        if (game.roundPenalties && game.roundPenalties[oldPid] !== undefined) {
            game.roundPenalties[socket.id] = game.roundPenalties[oldPid];
            delete game.roundPenalties[oldPid];
        }
        if (game.discardPiles && game.discardPiles[oldPid]) {
            game.discardPiles[socket.id] = game.discardPiles[oldPid];
            delete game.discardPiles[oldPid];
        }

        if (game.spectators) {
            game.spectators = game.spectators.filter(sid => sid !== socket.id);
        }

        players[socket.id].room = "kafe";
        socket.join("kafe");

        let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
        socket.emit('startGame', gameType);

        if (gameType === 'batak') {
            sendBatakUpdate(game);
        } else if (gameType === 'tavla') {
            sendTavlaUpdate(game);
        } else if (gameType === 'okey101') {
            sendOkey101Update(game);
        } else if (gameType === 'billiard') {
            socket.emit('billiardUpdate', {
                balls: game.balls,
                turnIndex: game.turnIndex,
                players: game.players,
                playerSuits: game.playerSuits,
                ballInHand: game.ballInHand,
                winner: game.winner,
                gameOver: game.gameOver,
                tableId: game.tableId,
                turnTimeout: 30,
                disconnectedPlayers: game.disconnectedPlayers || {}
            });
        }

        io.to("kafe").emit('systemMessage', `📢 ${players[socket.id].name}, ayrılan ${oldInfo.name} yerine oyuna katıldı ve koltuğu devraldı!`);
        game.players.forEach(pid => {
            if (pid !== socket.id) io.to(pid).emit('systemMessage', `✅ ${players[socket.id].name} eksik koltuğu doldurdu, oyun devam ediyor!`);
        });
    });

    // 2. HAREKET
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            if (players[socket.id].isFishing) {
                let dx = Math.abs(players[socket.id].x - movementData.x);
                let dy = Math.abs(players[socket.id].y - movementData.y);
                if (dx > 3 || dy > 3) {
                    players[socket.id].isFishing = false;
                    if (playerFishingTimers && playerFishingTimers[socket.id]) {
                        clearTimeout(playerFishingTimers[socket.id]);
                        delete playerFishingTimers[socket.id];
                    }
                    io.to(players[socket.id].room).emit('playerFishingState', { id: socket.id, isFishing: false });
                    socket.emit('fishingCancelled');
                }
            }
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            socket.to(players[socket.id].room).emit('playerMoved', { id: socket.id, x: movementData.x, y: movementData.y });
        }
    });

    // 3. MEKAN / ODA DEĞİŞTİRME
    socket.on('changeRoom', (newRoom) => {
        if (!players[socket.id]) return;
        let oldRoom = players[socket.id].room;

        if (players[socket.id].isFishing) {
            players[socket.id].isFishing = false;
            if (playerFishingTimers && playerFishingTimers[socket.id]) {
                clearTimeout(playerFishingTimers[socket.id]);
                delete playerFishingTimers[socket.id];
            }
        }

        socket.leave(oldRoom);
        socket.to(oldRoom).emit('playerDisconnected', socket.id);

        socket.join(newRoom);
        players[socket.id].room = newRoom;

        if (newRoom === "kafe") { players[socket.id].x = 350; players[socket.id].y = 400; }
        else if (newRoom === "sokak") { players[socket.id].x = 350; players[socket.id].y = 80; }
        else if (newRoom === "sahil") { players[socket.id].x = 420; players[socket.id].y = 350; }
        else if (newRoom === "nargile_cafe") { players[socket.id].x = 400; players[socket.id].y = 380; }
        else if (newRoom === "market") { players[socket.id].x = 400; players[socket.id].y = 420; }
        else if (newRoom.startsWith("house_")) {
            players[socket.id].x = 400; players[socket.id].y = 400;
            let parsed = parseHouseRoom(newRoom);
            if (parsed) {
                let hData = persistentData.users[parsed.owner];
                if (hData) {
                    let targetHouse = null;
                    let targetType = parsed.houseType;
                    if (hData.houses && targetType && hData.houses[targetType]) {
                        targetHouse = hData.houses[targetType];
                    } else if (hData.houses && Object.keys(hData.houses).length > 0) {
                        targetType = targetType || Object.keys(hData.houses)[0];
                        targetHouse = hData.houses[targetType];
                    } else if (hData.house) {
                        targetHouse = hData.house;
                        targetType = targetType || hData.house.type || 'standart';
                    }

                    if (targetHouse) {
                        socket.emit('houseDataUpdate', {
                            ...targetHouse,
                            owner: parsed.owner,
                            type: targetType,
                            houseId: `${parsed.owner}_${targetType}`
                        });
                    }
                }
            }
        }

        socket.emit('currentPlayers', getPlayersInRoom(newRoom));
        socket.to(newRoom).emit('newPlayer', { id: socket.id, player: players[socket.id] });
    });

    // 4. SOHBET
    socket.on('chatMessage', (msg) => {
        if (players[socket.id]) {
            players[socket.id].msg = msg;
            io.to(players[socket.id].room).emit('chatUpdate', { id: socket.id, msg: msg });

            setTimeout(() => {
                if (players[socket.id] && players[socket.id].msg === msg) {
                    players[socket.id].msg = "";
                }
            }, 5000);
        }
    });

    // 5. MASA SEÇENEKLERİNİ SORGULA (İzle / Masaya Otur / Boşalan Koltuğa Geç / Yeni Masa Aç)
    socket.on('requestTableOptions', (baseType) => {
        if (!players[socket.id] || !baseTableConfigs[baseType]) return;

        let tableList = [];
        for (let tid in tables) {
            let t = tables[tid];
            if (t.baseType === baseType) {
                let isGameActive = !!activeGames[tid];
                let currentNames = [];
                let vacantSeats = [];

                if (isGameActive) {
                    let g = activeGames[tid];
                    currentNames = g.players.map(pid => (players[pid]?.name || g.playerProfiles[pid]?.name || "Oyuncu"));
                    if (g.disconnectedPlayers) {
                        for (let dPid in g.disconnectedPlayers) {
                            vacantSeats.push({
                                oldPid: dPid,
                                name: g.disconnectedPlayers[dPid].name,
                                seatIndex: g.disconnectedPlayers[dPid].seatIndex
                            });
                        }
                    }
                } else {
                    currentNames = t.players.map(pid => players[pid]?.name || "Oyuncu");
                }

                tableList.push({
                    id: t.id,
                    name: t.name,
                    min: t.min,
                    bet: t.bet || 0,
                    mode: t.mode || (t.baseType === 'okey101_tekli' ? 'tekli' : (t.baseType === 'okey101' ? 'esli' : null)),
                    pot: (t.bet || 0) * t.min,
                    count: isGameActive ? t.min : t.players.length,
                    isActive: isGameActive,
                    players: currentNames,
                    spectatorCount: (activeGames[tid]?.spectators || []).length,
                    hasVacantSeat: vacantSeats.length > 0,
                    vacantSeats: vacantSeats
                });
            }
        }

        socket.emit('tableOptionsModal', {
            baseType: baseType,
            baseName: baseTableConfigs[baseType].name,
            tables: tableList
        });
    });

    // 6. MASAYA OTURMA (Lobiye Katılma)
    socket.on('joinTable', (tableId) => {
        if (!players[socket.id]) return;
        let table = tables[tableId];
        let room = players[socket.id].room;

        if (!table) return;

        if (activeGames[tableId]) {
            socket.emit('gameError', "Bu masada şu anda oyun oynanıyor! İzlemek veya boş koltuk varsa devralmak için masa menüsünü kullanın.");
            return;
        }

        let requiredBet = table.bet || 0;
        let pMoney = players[socket.id].money !== undefined ? players[socket.id].money : 0;
        if (requiredBet > 0 && pMoney < requiredBet) {
            socket.emit('gameError', `Yetersiz bakiye! Bu masanın bahsi ${requiredBet} TL, sizin bakiyeniz: ${pMoney} TL.`);
            return;
        }

        if (!table.players.includes(socket.id) && table.players.length < table.min) {
            table.players.push(socket.id);

            table.players.forEach(pid => {
                io.to(pid).emit('updateTableLobby', { name: table.name, count: table.players.length, min: table.min, tableId: tableId, bet: requiredBet });
            });

            // MASA DOLDU - OYUNU BAŞLAT
            if (table.players.length === table.min) {
                startGameForTable(tableId, table, room);
            }
        }
    });

    function startGameForTable(tableId, table, room) {
        let bet = table.bet || 0;
        let pot = 0;

        // Gerçek oyunculardan bahis miktarını düş ve pot oluştur
        table.players.forEach(pid => {
            if (!pid.startsWith('bot_') && players[pid]) {
                let uName = players[pid].name;
                if (persistentData.users[uName]) {
                    persistentData.users[uName].money = Math.max(0, (persistentData.users[uName].money || 0) - bet);
                    players[pid].money = persistentData.users[uName].money;
                    io.to(pid).emit('moneyUpdate', players[pid].money);
                }
            }
            pot += bet;
        });
        savePersistentData();

        let betAnnouncement = bet > 0 ? ` (Masa Bahsi: ${bet} TL | Toplam Ödül Havuzu: ${pot} TL)` : "";
        io.to(room).emit('systemMessage', `🔥 ${table.name} oyunu başladı!${betAnnouncement}`);

        let isBatak4 = table.baseType === 'batak4';
        let isBatak3 = table.baseType === 'batak';
        let isBilliard = table.baseType === 'billiard';
        let isTavla = table.baseType === 'tavla';
        let isOkey101 = table.baseType === 'okey101' || table.baseType === 'okey101_tekli';

        if (isBatak3 || isBatak4) {
            let engine = isBatak3 ? batakEngine : batak4Engine;
            let newGame = engine.startBatakGame(table.players, null, 1);
            newGame.isBatak4 = isBatak4;
            newGame.tableId = tableId;
            newGame.bet = bet;
            newGame.pot = pot;
            newGame.spectators = [];
            newGame.disconnectedPlayers = {};
            newGame.playerProfiles = {};
            table.players.forEach(pid => {
                newGame.playerProfiles[pid] = {
                    name: players[pid] ? players[pid].name : "Oyuncu",
                    color: players[pid] ? players[pid].color : "#fff",
                    isBot: !!players[pid]?.isBot
                };
            });

            activeGames[tableId] = newGame;

            activeGames[tableId].players.forEach((pid) => {
                if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'batak');
            });
            sendBatakUpdate(activeGames[tableId]);
        }
        else if (isBilliard) {
            let newGame = billiardEngine.startBilliardGame(table.players);
            newGame.tableId = tableId;
            newGame.bet = bet;
            newGame.pot = pot;
            newGame.spectators = [];
            newGame.disconnectedPlayers = {};
            newGame.playerProfiles = {};
            table.players.forEach(pid => {
                newGame.playerProfiles[pid] = {
                    name: players[pid] ? players[pid].name : "Oyuncu",
                    isBot: !!players[pid]?.isBot
                };
            });

            activeGames[tableId] = newGame;
            activeGames[tableId].players.forEach((pid) => {
                if (!pid.startsWith('bot_')) {
                    io.to(pid).emit('startGame', 'billiard');
                    io.to(pid).emit('billiardUpdate', {
                        balls: newGame.balls,
                        turnIndex: newGame.turnIndex,
                        players: newGame.players,
                        playerSuits: newGame.playerSuits,
                        ballInHand: newGame.ballInHand,
                        winner: newGame.winner,
                        gameOver: newGame.gameOver,
                        tableId: tableId,
                        turnTimeout: 30,
                        disconnectedPlayers: {}
                    });
                }
            });
        }
        else if (isTavla) {
            let newGame = tavlaEngine.startTavlaGame(table.players);
            newGame.tableId = tableId;
            newGame.bet = bet;
            newGame.pot = pot;
            newGame.spectators = [];
            newGame.disconnectedPlayers = {};
            newGame.playerProfiles = {};
            table.players.forEach(pid => {
                newGame.playerProfiles[pid] = {
                    name: players[pid] ? players[pid].name : "Oyuncu",
                    isBot: !!players[pid]?.isBot
                };
            });

            activeGames[tableId] = newGame;
            activeGames[tableId].players.forEach((pid) => {
                if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'tavla');
            });
            sendTavlaUpdate(newGame);
        }
        else if (isOkey101) {
            let mode = table.mode || (table.baseType === 'okey101_tekli' ? 'tekli' : 'esli');
            let newGame = okey101Engine.startOkey101Game(table.players, null, 1, mode);
            newGame.tableId = tableId;
            newGame.mode = mode;
            newGame.bet = bet;
            newGame.pot = pot;
            newGame.spectators = [];
            newGame.disconnectedPlayers = {};
            newGame.playerProfiles = {};
            table.players.forEach(pid => {
                newGame.playerProfiles[pid] = {
                    name: players[pid] ? players[pid].name : "Oyuncu",
                    color: players[pid] ? players[pid].color : "#fff",
                    isBot: !!players[pid]?.isBot
                };
            });

            activeGames[tableId] = newGame;
            activeGames[tableId].players.forEach((pid) => {
                if (!pid.startsWith('bot_')) io.to(pid).emit('startGame', 'okey101');
            });
            sendOkey101Update(newGame);
        }

        table.players = [];
    }

    // BOT EKLEME (Masaya Yapay Zeka Katılması)
    socket.on('addBotToTable', (tableId) => {
        let table = tables[tableId];
        if (!table || table.players.length >= table.min) return;

        let botNames = ["🤖 Hasan Dayı", "🤖 Çaycı İsmail", "🤖 Mahmut Emmi", "🤖 Dayı Recep"];
        let randomName = botNames[Math.floor(Math.random() * botNames.length)];
        let botId = `bot_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        players[botId] = {
            name: randomName,
            x: 350, y: 350,
            color: '#f59e0b',
            skinColor: '#fde047',
            hat: 'kasket',
            face: 'mustache',
            heldItem: 'tespih',
            money: 100,
            msg: "",
            room: "kafe",
            hasTea: true,
            action: null,
            isBot: true
        };

        table.players.push(botId);
        table.players.forEach(pid => {
            if (!pid.startsWith('bot_')) {
                io.to(pid).emit('updateTableLobby', { name: table.name, count: table.players.length, min: table.min, tableId: tableId, bet: table.bet || 0 });
            }
        });

        io.to("kafe").emit('systemMessage', `🤖 ${randomName} ${table.name} masasına katıldı!`);

        if (table.players.length === table.min) {
            startGameForTable(tableId, table, "kafe");
        }
    });

    // 7. YENİ MASA AÇMA
    socket.on('createNewTable', (payload) => {
        let baseType = typeof payload === 'object' ? payload.baseType : payload;
        let bet = typeof payload === 'object' ? (parseInt(payload.bet) || 0) : 0;
        let mode = typeof payload === 'object' && payload.mode ? payload.mode : (baseType === 'okey101_tekli' ? 'tekli' : (baseType === 'okey101' ? 'esli' : null));
        if (bet < 0) bet = 0;

        if (!players[socket.id] || !baseTableConfigs[baseType]) return;

        let pMoney = players[socket.id].money !== undefined ? players[socket.id].money : 0;
        if (bet > 0 && pMoney < bet) {
            socket.emit('gameError', `Yetersiz bakiye! ${bet} TL bahisli masa açmak için en az ${bet} TL bakiyeniz olmalıdır.`);
            return;
        }

        let existingCount = Object.keys(tables).filter(k => tables[k].baseType === baseType).length;
        let newTableId = `${baseType}_${Date.now().toString().slice(-4)}`;
        let betText = bet > 0 ? ` [Bahis: ${bet} TL]` : " [Ücretsiz]";
        let modeText = (baseType === 'okey101' || baseType === 'okey101_tekli') ? (mode === 'esli' ? ' [Eşli]' : ' [Tekli]') : '';
        let newTableName = `${baseTableConfigs[baseType].name}${modeText} (Masa ${existingCount + 1})${betText}`;

        tables[newTableId] = {
            id: newTableId,
            baseType: baseType,
            name: newTableName,
            min: baseTableConfigs[baseType].min,
            bet: bet,
            pot: 0,
            mode: mode,
            players: [socket.id],
            spectators: []
        };

        socket.emit('updateTableLobby', { name: newTableName, count: 1, min: baseTableConfigs[baseType].min, tableId: newTableId, bet: bet, mode: mode });
        io.to("kafe").emit('systemMessage', `📢 ${players[socket.id].name} yeni bir ${newTableName} masası açtı!`);
    });

    // 8. OYUNU İZLE (YANCI OL)
    socket.on('spectateTable', (tableId) => {
        let game = activeGames[tableId];
        if (!game) {
            socket.emit('gameError', "Bu masada şu anda izlenebilecek bir oyun yok.");
            return;
        }

        if (!game.spectators) game.spectators = [];
        if (!game.spectators.includes(socket.id)) game.spectators.push(socket.id);

        let gameType = tableId.startsWith('billiard') ? 'billiard' : (tableId.startsWith('tavla') ? 'tavla' : (tableId.startsWith('okey101') ? 'okey101' : 'batak'));
        socket.emit('startGame', gameType);

        if (gameType === 'batak') {
            sendBatakUpdate(game);
        } else if (gameType === 'billiard') {
            socket.emit('billiardUpdate', {
                balls: game.balls,
                turnIndex: game.turnIndex,
                players: game.players,
                playerSuits: game.playerSuits,
                ballInHand: game.ballInHand,
                winner: game.winner,
                gameOver: game.gameOver,
                isSpectator: true,
                tableId: game.tableId,
                turnTimeout: 30,
                disconnectedPlayers: game.disconnectedPlayers || {}
            });
        } else if (gameType === 'tavla') {
            sendTavlaUpdate(game);
        } else if (gameType === 'okey101') {
            sendOkey101Update(game);
        }

        io.to(tableId).emit('systemMessage', `👁️ ${players[socket.id]?.name || "Biri"} masayı izlemeye başladı.`);
    });

    // 9. MASA REAKSİYONU / TEZAHÜRAT (Yancılar ve Oyuncular İçin)
    socket.on('tableReaction', (data) => {
        let tableId = data.tableId;
        let game = activeGames[tableId];
        if (game) {
            let senderName = players[socket.id]?.name || "Biri";
            let reactionObj = { sender: senderName, text: data.reaction };
            game.players.forEach(pid => io.to(pid).emit('showReaction', reactionObj));
            if (game.spectators) {
                game.spectators.forEach(sid => io.to(sid).emit('showReaction', reactionObj));
            }
        }
    });

    // Çay Eşyası Süre Zamanlayıcısı (5 Dakika = 300.000 ms)
    function givePlayerTeaWithTimer(targetSocketId, targetUsername, durationMs = 300000) {
        let target = players[targetSocketId];
        if (!target) return;
        target.hasTea = true;
        target.heldItem = 'cay';

        let targetData = persistentData.users[targetUsername];
        if (targetData) {
            if (!targetData.avatar) targetData.avatar = {};
            targetData.avatar.heldItem = 'cay';
            targetData.teaExpiresAt = Date.now() + durationMs;
            if (!targetData.propInventory) targetData.propInventory = {};
            targetData.propInventory['props_cay'] = 1;
            savePersistentData();
        }

        if (playerTeaTimers[targetSocketId]) {
            clearTimeout(playerTeaTimers[targetSocketId]);
            delete playerTeaTimers[targetSocketId];
        }

        playerTeaTimers[targetSocketId] = setTimeout(() => {
            delete playerTeaTimers[targetSocketId];
            let currentTarget = players[targetSocketId];
            if (currentTarget && (currentTarget.heldItem === 'cay' || currentTarget.hasTea)) {
                currentTarget.heldItem = 'none';
                currentTarget.hasTea = false;
                if (persistentData.users[targetUsername]) {
                    persistentData.users[targetUsername].avatar.heldItem = 'none';
                    persistentData.users[targetUsername].teaExpiresAt = null;
                    delete persistentData.users[targetUsername].propInventory['props_cay'];
                    savePersistentData();
                }
                io.to(currentTarget.room).emit('playerAvatarChange', {
                    id: targetSocketId,
                    avatar: persistentData.users[targetUsername]?.avatar,
                    heldItem: 'none'
                });
                io.to(currentTarget.room).emit('playerActionUpdate', {
                    id: targetSocketId,
                    action: null,
                    hasTea: false
                });
                io.to(targetSocketId).emit('teaExpired');
                io.to(targetSocketId).emit('systemMessage', "☕ Çayını bitirdin ve bardak soğudu! (5 dakikalık süren doldu).");
                io.to(targetSocketId).emit('propInventoryUpdate', persistentData.users[targetUsername]?.propInventory || {});
            }
        }, durationMs);

        io.to(target.room).emit('playerActionUpdate', { id: targetSocketId, action: 'tea', hasTea: true });
        io.to(target.room).emit('playerAvatarChange', { id: targetSocketId, avatar: targetData?.avatar, heldItem: 'cay' });
        io.to(targetSocketId).emit('teaTimerStarted', { remainingMs: durationMs });
        io.to(targetSocketId).emit('propInventoryUpdate', targetData?.propInventory || {});
    }

    // 10. SOSYAL EYLEMLER (ÇAY ALMA 10 TL, EL SALLAMA, DANS, ALKIŞ)
    socket.on('playerAction', (actionData) => {
        if (players[socket.id]) {
            players[socket.id].action = actionData.action;
            if (actionData.action === 'tea') {
                let username = players[socket.id].name;
                let userData = persistentData.users[username];
                if (userData) {
                    if (userData.money < 10) {
                        socket.emit('gameError', "Çay 10 TL! Yetersiz bakiye.");
                        return;
                    }
                    userData.money -= 10;
                    savePersistentData();
                    socket.emit('moneyUpdate', userData.money);
                }
                givePlayerTeaWithTimer(socket.id, username, 300000);
                socket.emit('systemMessage', "☕ Çay Ocağı'ndan taze tavşan kanı çay aldın (-10 TL). Afiyet olsun! (5 dakika elinde)");
                return;
            }

            io.to(players[socket.id].room).emit('playerActionUpdate', {
                id: socket.id,
                action: actionData.action,
                hasTea: players[socket.id].hasTea
            });

            if (actionData.action !== 'tea') {
                setTimeout(() => {
                    if (players[socket.id] && players[socket.id].action === actionData.action) {
                        players[socket.id].action = null;
                        io.to(players[socket.id].room).emit('playerActionUpdate', { id: socket.id, action: null, hasTea: players[socket.id].hasTea });
                    }
                }, 3500);
            }
        }
    });

    // 10.1 GARDIROR VE KIYAFET SATIN ALMA / DEĞİŞTİRME (4 KAT FİYAT, YENİ MODELLER)
    const WARDROBE_ITEM_PRICES = {
        'hats_none': 0, 'hats_bere': 200, 'hats_kasket': 260, 'hats_fes': 320, 'hats_cowboy': 380,
        // Kadın Saç Modelleri & Şapkalar
        'hats_hair_long': 260, 'hats_hair_wavy': 320, 'hats_hair_ponytail': 280, 'hats_hair_braids': 290,
        'hats_hair_bob': 240, 'hats_hair_hijab': 250, 'hats_beret_pink': 260, 'hats_crown': 480,

        'faces_none': 0, 'faces_mustache': 240, 'faces_sunglasses': 300, 'faces_beard': 360,
        'skins_#facc15': 0, 'skins_#ffd1a4': 240, 'skins_#d2996c': 300, 'skins_#8d5524': 360,
        
        // Tişörtler & Üstler (4 kat: 100 TL)
        'shirts_#3b82f6': 0, 'shirts_#ef4444': 100, 'shirts_#10b981': 100, 'shirts_#8b5cf6': 100, 'shirts_#f59e0b': 100, 'shirts_#0f172a': 100,
        'shirts_polo': 160, 'shirts_hoodie': 220, 'shirts_leather': 350,
        // Kadın Elbiseleri & Etekler
        'shirts_dress_pink': 280, 'shirts_dress_black': 380, 'shirts_dress_red': 310, 'shirts_skirt_crop': 260, 'shirts_skirt_denim': 240,

        // Ayakkabı Modelleri (Shoes)
        'shoes_none': 0, 'shoes_sneakers': 180, 'shoes_classic': 240, 'shoes_boots': 280, 'shoes_heels': 320, 'shoes_flats': 190,

        // El Eşyaları (Nargile 700 TL, Tespih 400 TL, diğerleri aynı)
        'props_none': 0, 'props_nargile': 700, 'props_cay': 100, 'props_kahve': 110, 'props_balon': 120, 'props_gazoz': 140, 'props_tespih': 400, 'props_olta': 200, 'props_baglama': 220, 'props_asagold': 260, 'props_kupa': 290
    };

    socket.on('buyWardrobeItem', (data) => {
        if (!players[socket.id] || !data) return;
        let username = players[socket.id].name;
        let userData = persistentData.users[username];
        if (!userData) return;

        let cat = data.category; // 'hats'/'hat', 'faces'/'face', 'skins'/'skin', 'shirts'/'shirt', 'props'/'prop'
        let normCat = cat.endsWith('s') ? cat : (cat + 's');
        let singleCat = cat.endsWith('s') ? cat.slice(0, -1) : cat;
        let itemId = data.id;

        let itemKey = `${normCat}_${itemId}`;
        let itemCost = WARDROBE_ITEM_PRICES[itemKey] !== undefined ? WARDROBE_ITEM_PRICES[itemKey] : 5;
        let isFree = (itemCost === 0 || itemId === 'none' || itemId === '#facc15' || itemId === '#3b82f6');

        // EŞYALAR (PROPS) İÇİN ÇOKLU SATIN ALMA DESTEĞİ
        if (normCat === 'props' && itemId !== 'none') {
            if (userData.money < itemCost) {
                socket.emit('gameError', `Yetersiz bakiye! Bu eşya ${itemCost} TL. Bakiyeniz: ${userData.money} TL.`);
                return;
            }
            userData.money -= itemCost;
            if (!userData.propInventory) userData.propInventory = {};
            userData.propInventory[itemKey] = (userData.propInventory[itemKey] || 0) + 1;

            if (!userData.inventory) userData.inventory = [];
            if (!userData.inventory.includes(itemKey)) userData.inventory.push(itemKey);

            if (itemId === 'cay') {
                givePlayerTeaWithTimer(socket.id, username, 300000);
            } else {
                userData.avatar.heldItem = itemId;
                players[socket.id].heldItem = itemId;
            }

            savePersistentData();
            socket.emit('moneyUpdate', userData.money);
            socket.emit('propInventoryUpdate', userData.propInventory);
            socket.emit('wardrobeUpdate', { avatar: userData.avatar, inventory: userData.inventory });
            io.to(players[socket.id].room).emit('playerAvatarChange', {
                id: socket.id,
                avatar: userData.avatar,
                heldItem: players[socket.id].heldItem
            });
            socket.emit('systemMessage', `✅ 1 adet ${itemId} satın aldın! Çantandaki toplam: ${userData.propInventory[itemKey]} adet.`);
            return;
        }

        let isAlreadyOwned = isFree || (userData.inventory && userData.inventory.includes(itemKey));

        if (!isAlreadyOwned) {
            if (userData.money < itemCost) {
                socket.emit('gameError', `Yetersiz bakiye! Bu eşya ${itemCost} TL. Bakiyeniz: ${userData.money} TL.`);
                return;
            }
            userData.money -= itemCost;
            if (!userData.inventory) userData.inventory = [];
            userData.inventory.push(itemKey);
        }

        // Tekil yuva kuralı: Her kategoriden SADECE 1 şey giyilebilir / kuşanılabilir
        if (singleCat === 'hat') {
            userData.avatar.hat = itemId;
            players[socket.id].hat = itemId;
        } else if (singleCat === 'face') {
            userData.avatar.face = itemId;
            players[socket.id].face = itemId;
        } else if (singleCat === 'skin') {
            userData.avatar.skinColor = itemId;
            players[socket.id].skinColor = itemId;
        } else if (singleCat === 'shirt') {
            userData.avatar.color = itemId;
            userData.avatar.shirtColor = itemId;
            players[socket.id].color = itemId;
        } else if (singleCat === 'shoe' || singleCat === 'shoes') {
            userData.avatar.shoes = itemId;
            players[socket.id].shoes = itemId;
        } else if (singleCat === 'prop') {
            userData.avatar.heldItem = itemId;
            players[socket.id].heldItem = itemId;
        }

        savePersistentData();

        let updatedAvatar = {
            hat: players[socket.id].hat || 'none',
            face: players[socket.id].face || 'none',
            skinColor: players[socket.id].skinColor || '#facc15',
            color: players[socket.id].color || '#3b82f6',
            heldItem: players[socket.id].heldItem || 'none',
            shoes: players[socket.id].shoes || 'none',
            gender: players[socket.id].gender || userData.gender || 'male'
        };

        socket.emit('moneyUpdate', userData.money);
        socket.emit('wardrobeUpdate', { avatar: updatedAvatar, inventory: userData.inventory });
        io.to(players[socket.id].room).emit('playerAvatarChange', {
            id: socket.id,
            avatar: updatedAvatar,
            hat: updatedAvatar.hat,
            face: updatedAvatar.face,
            skinColor: updatedAvatar.skinColor,
            color: updatedAvatar.color,
            heldItem: updatedAvatar.heldItem,
            shoes: updatedAvatar.shoes,
            gender: updatedAvatar.gender
        });
    });

    // 10.2 ADMİN PANELİ (SADECE YASİN KULLANICISI İÇİN - SADECE ÇEVRİMİÇİ OYUNCULAR)
    function getAdminOnlineUsers() {
        let onlineUsernames = [...new Set(Object.values(players).map(p => p.name))];
        return onlineUsernames.map(u => ({
            username: u,
            money: persistentData.users[u]?.money !== undefined ? persistentData.users[u].money : 0,
            isOnline: true
        })).sort((a, b) => a.username.localeCompare(b.username));
    }

    socket.on('adminGetUsers', () => {
        if (!players[socket.id] || players[socket.id].name.toLowerCase() !== 'yasin') {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        socket.emit('adminUsersList', getAdminOnlineUsers());
    });

    socket.on('adminModifyMoney', (data) => {
        if (!players[socket.id] || players[socket.id].name.toLowerCase() !== 'yasin') {
            socket.emit('gameError', "Bu işlem için admin yetkisi gerekiyor!");
            return;
        }
        if (!data || !data.targetUsername) return;
        let targetUser = data.targetUsername;
        let amount = parseInt(data.amount);
        if (isNaN(amount) || amount < 0) return;

        if (!persistentData.users[targetUser]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }

        if (data.mode === 'set') {
            persistentData.users[targetUser].money = amount;
        } else {
            // 'add'
            persistentData.users[targetUser].money = (persistentData.users[targetUser].money || 0) + amount;
        }

        savePersistentData();

        let updatedMoney = persistentData.users[targetUser].money;

        // Hedef kullanıcı çevrimiçiyse anında bakiye ve bildirim gönder
        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetUser.toLowerCase()) {
                players[sid].money = updatedMoney;
                io.to(sid).emit('moneyUpdate', updatedMoney);
                let noteMsg = (data.mode === 'set')
                    ? `👑 Admin (yasin) hesabınızın bakiyesini ${amount} TL olarak güncelledi!`
                    : `👑 Admin (yasin) hesabınıza ${amount} TL ekledi! (Yeni Bakiye: ${updatedMoney} TL)`;
                io.to(sid).emit('systemMessage', noteMsg);
            }
        }

        socket.emit('systemMessage', `✅ ${targetUser} kullanıcısının yeni bakiyesi: ${updatedMoney} TL`);

        // Güncel online listesini admine tekrar gönder
        socket.emit('adminUsersList', getAdminOnlineUsers());
    });

    // 10.3 SOSYAL ETKİLEŞİM & ARKADAŞLIK SİSTEMİ
    socket.on('buyTeaForPlayer', (data) => {
        if (!players[socket.id] || !data || !data.targetId) return;
        let sender = players[socket.id];
        let senderData = persistentData.users[sender.name];
        let target = players[data.targetId];
        if (!target) {
            socket.emit('gameError', "Oyuncu bulunamadı veya oyundan ayrılmış!");
            return;
        }
        if (!senderData || senderData.money < 10) {
            socket.emit('gameError', "Çay ısmarlamak 10 TL! Yetersiz bakiye.");
            return;
        }

        senderData.money -= 10;
        sender.money = senderData.money;
        savePersistentData();

        socket.emit('moneyUpdate', senderData.money);
        givePlayerTeaWithTimer(data.targetId, target.name, 300000);

        io.to(data.targetId).emit('teaGiftReceived', { from: sender.name });
        io.to(data.targetId).emit('systemMessage', `☕ ${sender.name} sana sıcacık tavşan kanı bir çay ısmarladı! (5 dakika elinde).`);
        socket.emit('systemMessage', `☕ ${target.name} oyuncusuna çay ısmarladın (-10 TL).`);
    });

    socket.on('sendMoney', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername) return;
        let sender = players[socket.id];
        let senderData = persistentData.users[sender.name];
        let targetUser = data.targetUsername.trim();
        let amount = parseInt(data.amount);

        if (isNaN(amount) || amount <= 0) {
            socket.emit('gameError', "Geçerli bir para miktarı giriniz!");
            return;
        }
        if (sender.name.toLowerCase() === targetUser.toLowerCase()) {
            socket.emit('gameError', "Kendinize para gönderemezsiniz!");
            return;
        }
        if (!senderData || senderData.money < amount) {
            socket.emit('gameError', `Yetersiz bakiye! Bakiyeniz: ${senderData?.money || 0} TL.`);
            return;
        }
        if (!persistentData.users[targetUser]) {
            socket.emit('gameError', "Böyle bir oyuncu bulunamadı!");
            return;
        }

        senderData.money -= amount;
        sender.money = senderData.money;
        persistentData.users[targetUser].money = (persistentData.users[targetUser].money || 0) + amount;
        savePersistentData();

        socket.emit('moneyUpdate', senderData.money);
        socket.emit('systemMessage', `💸 ${targetUser} kullanıcısına ${amount} TL gönderdin.`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetUser.toLowerCase()) {
                players[sid].money = persistentData.users[targetUser].money;
                io.to(sid).emit('moneyUpdate', players[sid].money);
                io.to(sid).emit('moneyGiftReceived', { from: sender.name, amount: amount });
                io.to(sid).emit('systemMessage', `💸 ${sender.name} sana ${amount} TL gönderdi! (Yeni Bakiyen: ${players[sid].money} TL)`);
            }
        }
    });

    // Eşyayı Çantadan Eline Al / Bırak (Kuşan)
    socket.on('equipPropItem', (data) => {
        if (!players[socket.id] || !data || !data.itemKey) return;
        let username = players[socket.id].name;
        let userData = persistentData.users[username];
        if (!userData) return;
        let itemKey = data.itemKey;
        let propId = itemKey.replace('props_', '');

        if (itemKey === 'props_none') {
            userData.avatar.heldItem = 'none';
            players[socket.id].heldItem = 'none';
            socket.emit('systemMessage', "✋ Elindeki eşyayı bıraktın.");
        } else {
            if (!userData.propInventory || !userData.propInventory[itemKey] || userData.propInventory[itemKey] <= 0) {
                socket.emit('gameError', "Bu eşyaya çantanızda sahip değilsiniz!");
                return;
            }
            if (propId === 'cay') {
                givePlayerTeaWithTimer(socket.id, username, 300000);
                socket.emit('systemMessage', "☕ Çayını eline aldın! (5 dakika süreli)");
                return;
            }
            if (userData.avatar.heldItem === propId) {
                userData.avatar.heldItem = 'none';
                players[socket.id].heldItem = 'none';
                socket.emit('systemMessage', `✋ ${propId} eşyasını çantana kaldırdın.`);
            } else {
                userData.avatar.heldItem = propId;
                players[socket.id].heldItem = propId;
                socket.emit('systemMessage', `🖐️ ${propId} eşyasını eline aldın.`);
            }
        }
        savePersistentData();
        socket.emit('wardrobeUpdate', { avatar: userData.avatar, inventory: userData.inventory });
        socket.emit('propInventoryUpdate', userData.propInventory);
        io.to(players[socket.id].room).emit('playerAvatarChange', {
            id: socket.id,
            avatar: userData.avatar,
            heldItem: players[socket.id].heldItem
        });
    });

    socket.on('giftPropItem', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername || !data.itemKey) return;
        let sender = players[socket.id];
        let senderData = persistentData.users[sender.name];
        let targetUser = data.targetUsername.trim();
        let itemKey = data.itemKey;
        let propId = itemKey.replace('props_', '');

        if (!itemKey.startsWith('props_') || itemKey === 'props_none') {
            socket.emit('gameError', "Sadece elde taşınabilen aksesuarlar hediye edilebilir!");
            return;
        }
        if (!senderData.propInventory || !senderData.propInventory[itemKey] || senderData.propInventory[itemKey] <= 0) {
            socket.emit('gameError', "Bu eşyaya çantanızda sahip değilsiniz!");
            return;
        }
        if (!persistentData.users[targetUser]) {
            socket.emit('gameError', "Kullanıcı bulunamadı!");
            return;
        }

        // Gönderenden 1 adet düş
        senderData.propInventory[itemKey] -= 1;
        let remaining = senderData.propInventory[itemKey];
        if (remaining <= 0) {
            delete senderData.propInventory[itemKey];
            senderData.inventory = senderData.inventory.filter(k => k !== itemKey);
            if (senderData.avatar.heldItem === propId) {
                senderData.avatar.heldItem = 'none';
                sender.heldItem = 'none';
            }
        }

        // Alıcıya 1 adet ekle (başkası hediye edince asla azalmaz!)
        let targetData = persistentData.users[targetUser];
        if (!targetData.propInventory) targetData.propInventory = {};
        targetData.propInventory[itemKey] = (targetData.propInventory[itemKey] || 0) + 1;
        if (!targetData.inventory) targetData.inventory = [];
        if (!targetData.inventory.includes(itemKey)) targetData.inventory.push(itemKey);

        savePersistentData();

        socket.emit('propInventoryUpdate', senderData.propInventory);
        socket.emit('wardrobeUpdate', { avatar: senderData.avatar, inventory: senderData.inventory });
        io.to(sender.room).emit('playerAvatarChange', { id: socket.id, avatar: senderData.avatar, heldItem: sender.heldItem });
        socket.emit('systemMessage', `🎁 ${targetUser} oyuncusuna 1 adet ${propId} hediye ettiniz! (Çantanızda kalan: ${remaining || 0} adet)`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetUser.toLowerCase()) {
                io.to(sid).emit('propInventoryUpdate', targetData.propInventory);
                io.to(sid).emit('wardrobeUpdate', { avatar: targetData.avatar, inventory: targetData.inventory });
                io.to(sid).emit('propGiftReceived', { from: sender.name, itemKey: itemKey });
                io.to(sid).emit('systemMessage', `🎁 ${sender.name} sana 1 adet ${propId} hediye etti! Çantana eklendi (Toplam: ${targetData.propInventory[itemKey]} adet).`);
            }
        }
    });

    socket.on('sendFriendRequest', (data) => {
        if (!players[socket.id] || !data || !data.targetUsername) return;
        let sender = players[socket.id];
        let senderKey = findUserKey(sender.name) || sender.name;
        let senderData = persistentData.users[senderKey];
        let targetUser = (data.targetUsername || "").trim();

        if (senderKey.toLowerCase() === targetUser.toLowerCase()) {
            socket.emit('gameError', "Kendinizi arkadaş olarak ekleyemezsiniz!");
            return;
        }

        let targetKey = findUserKey(targetUser);
        if (!targetKey) {
            socket.emit('gameError', "Böyle bir kullanıcı bulunamadı!");
            return;
        }
        let targetData = persistentData.users[targetKey];

        if (!senderData.friends) senderData.friends = [];
        if (senderData.friends.some(f => f.toLowerCase() === targetKey.toLowerCase())) {
            socket.emit('gameError', `${targetKey} zaten arkadaş listenizde!`);
            return;
        }

        if (!targetData.friendRequests) targetData.friendRequests = [];
        if (targetData.friendRequests.some(r => r.toLowerCase() === senderKey.toLowerCase())) {
            socket.emit('gameError', `${targetKey} kullanıcısına zaten bekleyen bir arkadaşlık isteğiniz var!`);
            return;
        }

        // AKILLI OTOMATİK EŞLEŞME: Eğer hedef kullanıcı daha önce bize istek atmışsa, otomatik kabul et!
        if (senderData.friendRequests && senderData.friendRequests.some(r => r.toLowerCase() === targetKey.toLowerCase())) {
            senderData.friendRequests = senderData.friendRequests.filter(r => r.toLowerCase() !== targetKey.toLowerCase());
            targetData.friendRequests = targetData.friendRequests.filter(r => r.toLowerCase() !== senderKey.toLowerCase());

            if (!senderData.friends) senderData.friends = [];
            if (!targetData.friends) targetData.friends = [];
            if (!senderData.friends.some(f => f.toLowerCase() === targetKey.toLowerCase())) senderData.friends.push(targetKey);
            if (!targetData.friends.some(f => f.toLowerCase() === senderKey.toLowerCase())) targetData.friends.push(senderKey);

            savePersistentData();

            socket.emit('systemMessage', `👥 ${targetKey} ile karşılıklı istek gönderdiğiniz için otomatik arkadaş oldunuz! Artık birbirinizin evlerini ziyaret edebilirsiniz.`);
            socket.emit('friendListUpdate', getFriendListData(senderKey));
            socket.emit('friendRequestsUpdate', senderData.friendRequests || []);

            for (let sid in players) {
                if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                    io.to(sid).emit('systemMessage', `👥 ${senderKey} arkadaşlık teklifinizi onayladı! Artık arkadaşsınız.`);
                    io.to(sid).emit('friendListUpdate', getFriendListData(targetKey));
                    io.to(sid).emit('friendRequestsUpdate', targetData.friendRequests || []);
                }
            }
            return;
        }

        targetData.friendRequests.push(senderKey);
        savePersistentData();

        socket.emit('systemMessage', `👥 ${targetKey} oyuncusuna arkadaşlık isteği gönderildi.`);

        // Hedef kullanıcı online ise hemen bildir ve istek sayısını güncelle
        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                io.to(sid).emit('friendRequestsUpdate', targetData.friendRequests);
                io.to(sid).emit('friendRequestReceived', { fromUsername: senderKey });
                io.to(sid).emit('systemMessage', `👥 ${senderKey} sana arkadaşlık isteği gönderdi! "Arkadaşlarım" menüsünden inceleyebilirsin.`);
            }
        }
    });

    socket.on('respondFriendRequest', (data) => {
        if (!players[socket.id] || !data || !data.fromUsername) return;
        let responder = players[socket.id];
        let responderKey = findUserKey(responder.name) || responder.name;
        let responderData = persistentData.users[responderKey];
        let fromUser = (data.fromUsername || "").trim();

        let fromKey = findUserKey(fromUser);
        if (!fromKey) return;
        let fromData = persistentData.users[fromKey];

        // İstek listelerinden temizle
        if (responderData.friendRequests) {
            responderData.friendRequests = responderData.friendRequests.filter(u => u.toLowerCase() !== fromKey.toLowerCase());
        }
        if (fromData.friendRequests) {
            fromData.friendRequests = fromData.friendRequests.filter(u => u.toLowerCase() !== responderKey.toLowerCase());
        }

        if (data.accept) {
            if (!responderData.friends) responderData.friends = [];
            if (!fromData.friends) fromData.friends = [];

            if (!responderData.friends.some(f => f.toLowerCase() === fromKey.toLowerCase())) responderData.friends.push(fromKey);
            if (!fromData.friends.some(f => f.toLowerCase() === responderKey.toLowerCase())) fromData.friends.push(responderKey);

            savePersistentData();

            socket.emit('systemMessage', `👥 ${fromKey} ile artık arkadaşsınız! Artık birbirinizin evlerini ziyaret edebilirsiniz.`);
            socket.emit('friendListUpdate', getFriendListData(responderKey));
            socket.emit('friendRequestsUpdate', responderData.friendRequests || []);

            for (let sid in players) {
                if (players[sid].name.toLowerCase() === fromKey.toLowerCase()) {
                    io.to(sid).emit('systemMessage', `👥 ${responderKey} arkadaşlık isteğini kabul etti! Artık arkadaşsınız.`);
                    io.to(sid).emit('friendListUpdate', getFriendListData(fromKey));
                    io.to(sid).emit('friendRequestsUpdate', fromData.friendRequests || []);
                }
            }
        } else {
            savePersistentData();
            socket.emit('friendRequestsUpdate', responderData.friendRequests || []);
            socket.emit('systemMessage', `ℹ️ ${fromKey} kullanıcısının arkadaşlık isteğini sildiniz.`);
        }
    });

    socket.on('removeFriend', (data) => {
        if (!players[socket.id] || !data || !data.username) return;
        let username = players[socket.id].name;
        let userKey = findUserKey(username) || username;
        let targetKey = findUserKey((data.username || "").trim());
        if (!targetKey) return;

        let uData = persistentData.users[userKey];
        let tData = persistentData.users[targetKey];

        if (uData && uData.friends) {
            uData.friends = uData.friends.filter(f => f.toLowerCase() !== targetKey.toLowerCase());
        }
        if (tData && tData.friends) {
            tData.friends = tData.friends.filter(f => f.toLowerCase() !== userKey.toLowerCase());
        }
        savePersistentData();

        socket.emit('friendListUpdate', getFriendListData(userKey));
        socket.emit('systemMessage', `👥 ${targetKey} arkadaş listenizden çıkarıldı.`);

        for (let sid in players) {
            if (players[sid].name.toLowerCase() === targetKey.toLowerCase()) {
                io.to(sid).emit('friendListUpdate', getFriendListData(targetKey));
                io.to(sid).emit('systemMessage', `ℹ️ ${userKey} seni arkadaş listesinden çıkardı.`);
            }
        }
    });

    socket.on('getFriendsList', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        socket.emit('friendListUpdate', getFriendListData(uKey));
        socket.emit('friendRequestsUpdate', uData?.friendRequests || []);
    });

    // 10.4 EMLAKÇI, EVLER & MOBİLYA SİSTEMİ (EVLER 5 KAT, MOBİLYALAR 200-600 TL)
    const HOUSE_PRICES = {
        'standart': 2500,
        'garden': 5000,
        'pool': 7500
    };

    const FURNITURE_PRICES = {
        'bitki': 200,
        'hali': 240,
        'sedir': 280,
        'kitaplik': 320,
        'berjer': 360,
        'yemek_masasi': 400,
        'akvaryum': 440,
        'tv': 480,
        'gramofon': 520,
        'somine': 550,
        'bilgisayar': 570,
        'arcade': 590,
        'piyano': 600
    };

    const HOUSE_NAMES = {
        'standart': 'Standart Şehir Dairesi',
        'garden': 'Verandalı Bahçeli Ev',
        'pool': 'Bahçeli & Havuzlu Villa'
    };

    socket.on('buyHouse', (houseType) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        if (!uData) return;

        let price = HOUSE_PRICES[houseType];
        if (!price) {
            socket.emit('gameError', "Geçersiz ev tipi!");
            return;
        }

        if (!uData.houses) uData.houses = {};
        if (uData.house && uData.house.type && !uData.houses[uData.house.type]) {
            uData.houses[uData.house.type] = uData.house;
        }

        if (uData.houses[houseType]) {
            socket.emit('gameError', "Zaten bu tip bir eve sahipsiniz!");
            return;
        }
        if (uData.money < price) {
            socket.emit('gameError', `Bu ev ${price} TL! Bakiyeniz: ${uData.money} TL.`);
            return;
        }

        uData.money -= price;
        players[socket.id].money = uData.money;
        uData.houses[houseType] = {
            type: houseType,
            furniture: []
        };
        uData.house = uData.houses[houseType];
        savePersistentData();

        let houseName = HOUSE_NAMES[houseType] || houseType;
        socket.emit('moneyUpdate', uData.money);
        socket.emit('housesUpdate', uData.houses);
        socket.emit('houseDataUpdate', {
            ...uData.houses[houseType],
            owner: uKey,
            type: houseType,
            houseId: `${uKey}_${houseType}`
        });
        socket.emit('systemMessage', `🏠 Tebrikler! ${houseName} tipi yeni evinizi satın aldınız!`);
    });

    socket.on('buyFurniture', (itemId) => {
        if (!players[socket.id]) {
            socket.emit('gameError', "Önce oyuna giriş yapmalısınız!");
            return;
        }
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        if (!persistentData.users[uKey]) {
            persistentData.users[uKey] = {
                money: (players[socket.id].money !== undefined) ? players[socket.id].money : 100,
                furnitureInventory: []
            };
        }
        let uData = persistentData.users[uKey];
        if (typeof uData.money !== 'number') {
            uData.money = (players[socket.id].money !== undefined) ? players[socket.id].money : 100;
        }

        let cost = FURNITURE_PRICES[itemId];
        if (!cost) {
            socket.emit('gameError', "Geçersiz mobilya!");
            return;
        }
        if (uData.money < cost) {
            socket.emit('gameError', `Bu mobilya ${cost} TL! Bakiyeniz: ${uData.money} TL.`);
            return;
        }

        uData.money -= cost;
        players[socket.id].money = uData.money;
        if (!uData.furnitureInventory) uData.furnitureInventory = [];
        uData.furnitureInventory.push(itemId);
        savePersistentData();

        socket.emit('moneyUpdate', uData.money);
        socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
        socket.emit('furnitureBuySuccess', {
            itemId: itemId,
            cost: cost,
            remainingMoney: uData.money
        });
        socket.emit('systemMessage', `🛒 Mobilya satın alındı! Evinize gidip yerleştirebilirsiniz.`);
    });

    socket.on('placeFurniture', (data) => {
        if (!players[socket.id] || !data || !data.itemId) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        if (!uData) return;

        let parsed = parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) {
            socket.emit('gameError', "Mobilyaları sadece kendi evinizde yerleştirebilirsiniz!");
            return;
        }

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        if (!uData.houses[hType]) {
            uData.houses[hType] = (uData.house && uData.house.type === hType) ? uData.house : { type: hType, furniture: [] };
        }
        let targetHouse = uData.houses[hType];

        let idx = (uData.furnitureInventory || []).indexOf(data.itemId);
        if (idx === -1) {
            socket.emit('gameError', "Envanterinizde bu mobilya kalmadı!");
            return;
        }

        uData.furnitureInventory.splice(idx, 1);
        if (!targetHouse.furniture) targetHouse.furniture = [];
        targetHouse.furniture.push({
            id: data.itemId,
            x: Math.round(data.x || 400),
            y: Math.round(data.y || 300)
        });
        uData.house = targetHouse;
        savePersistentData();

        socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
        io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
        socket.emit('systemMessage', `🛋️ Mobilya odaya yerleştirildi!`);
    });

    socket.on('moveFurniture', (data) => {
        if (!players[socket.id] || !data || data.index === undefined) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        if (!uData) return;

        let parsed = parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) return;

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse || !targetHouse.furniture) return;

        let index = parseInt(data.index);
        if (index >= 0 && index < targetHouse.furniture.length) {
            targetHouse.furniture[index].x = Math.round(data.x);
            targetHouse.furniture[index].y = Math.round(data.y);
            uData.house = targetHouse;
            savePersistentData();

            io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
        }
    });

    socket.on('removeFurniture', (index) => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        if (!uData) return;

        let parsed = parseHouseRoom(players[socket.id].room);
        if (!parsed || parsed.owner.toLowerCase() !== uKey.toLowerCase()) return;

        if (!uData.houses) uData.houses = {};
        let hType = parsed.houseType || (uData.house ? uData.house.type : 'standart');
        let targetHouse = uData.houses[hType] || uData.house;
        if (!targetHouse || !targetHouse.furniture) return;

        let idx = parseInt(index);
        if (idx >= 0 && idx < targetHouse.furniture.length) {
            let removed = targetHouse.furniture.splice(idx, 1)[0];
            if (!uData.furnitureInventory) uData.furnitureInventory = [];
            uData.furnitureInventory.push(removed.id);
            uData.house = targetHouse;
            savePersistentData();

            socket.emit('furnitureInventoryUpdate', uData.furnitureInventory);
            io.to(players[socket.id].room).emit('houseFurnitureSync', targetHouse.furniture);
            socket.emit('systemMessage', `📦 Mobilya kaldırılıp depoya geri alındı.`);
        }
    });

    socket.on('getHouseData', (data) => {
        let rawTarget = typeof data === 'object' && data ? data.owner : data;
        rawTarget = (rawTarget || players[socket.id]?.name || "").trim();
        let targetUser = findUserKey(rawTarget) || rawTarget;
        let tData = persistentData.users[targetUser];
        let reqType = typeof data === 'object' && data ? data.type : null;

        if (tData) {
            let targetHouse = null;
            if (tData.houses && reqType && tData.houses[reqType]) {
                targetHouse = tData.houses[reqType];
            } else if (tData.houses && Object.keys(tData.houses).length > 0) {
                reqType = reqType || Object.keys(tData.houses)[0];
                targetHouse = tData.houses[reqType] || Object.values(tData.houses)[0];
            } else if (tData.house) {
                targetHouse = tData.house;
                reqType = reqType || tData.house.type;
            }

            if (targetHouse) {
                socket.emit('houseDataUpdate', {
                    ...targetHouse,
                    owner: targetUser,
                    type: reqType || targetHouse.type || 'standart',
                    houseId: `${targetUser}_${reqType || targetHouse.type}`
                });
                return;
            }
        }
        socket.emit('houseDataUpdate', null);
    });

    socket.on('getAvailableHouses', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let uKey = findUserKey(username) || username;
        let uData = persistentData.users[uKey];
        if (!uData) return;

        let availableList = [];
        let myHouses = uData.houses || (uData.house ? { [uData.house.type]: uData.house } : {});
        for (let hType in myHouses) {
            let hObj = myHouses[hType];
            availableList.push({
                owner: uKey,
                houseId: `${uKey}_${hType}`,
                type: hType,
                isSelf: true,
                furnitureCount: (hObj.furniture || []).length
            });
        }

        let friends = uData.friends || [];
        friends.forEach(fName => {
            let clean = typeof fName === 'string' ? fName : (fName ? fName.username : '');
            if (!clean) return;
            let fKey = findUserKey(clean) || clean;
            let fData = persistentData.users[fKey];
            if (fData) {
                let fHouses = fData.houses || (fData.house ? { [fData.house.type]: fData.house } : {});
                for (let hType in fHouses) {
                    let hObj = fHouses[hType];
                    availableList.push({
                        owner: fKey,
                        houseId: `${fKey}_${hType}`,
                        type: hType,
                        isSelf: false,
                        furnitureCount: (hObj.furniture || []).length
                    });
                }
            }
        });

        socket.emit('availableHousesList', {
            houses: availableList,
            hasSelfHouse: Object.keys(myHouses).length > 0,
            friendCount: friends.length
        });
    });

    // 10.5 DENİZ BİSİKLETİ (KUĞU) KİRALAMA
    socket.on('rentSwanBoat', () => {
        if (!players[socket.id]) return;
        let username = players[socket.id].name;
        let userData = persistentData.users[username];
        if (!userData) return;

        if (players[socket.id].hasSwanBoat) {
            socket.emit('gameError', "Zaten Kuğu Deniz Bisikleti kiraladınız!");
            return;
        }
        if (userData.money < 20) {
            socket.emit('gameError', "Kuğu Deniz Bisikleti kiralamak için 20 TL gerekiyor! Bakiyeniz yetersiz.");
            return;
        }

        userData.money -= 20;
        players[socket.id].money = userData.money;
        players[socket.id].hasSwanBoat = true;
        savePersistentData();

        socket.emit('moneyUpdate', userData.money);
        socket.emit('swanBoatRented', true);
        io.to(players[socket.id].room).emit('playerSwanBoatUpdate', { id: socket.id, hasSwanBoat: true });
        socket.emit('systemMessage', "🦢 Tebrikler! 20 TL'ye Kuğu Deniz Bisikleti kiraladın. Artık denizin üzerinde süzülebilir ve açık denizde nadir balıklar/hazineler yakalayabilirsin!");
    });

    // 11. LİDERLİK TABLOSU TALEBİ (Botlar Asla Listelenmez)
    socket.on('getLeaderboard', () => {
        const isHuman = (name) => name && !name.startsWith('🤖') && !name.startsWith('bot_') && !name.includes('🤖') && !name.toLowerCase().includes('dayı') && !name.toLowerCase().includes('ismail') && !name.toLowerCase().includes('emmi');

        let topBilliard = Object.entries(persistentData.leaderboard.billiard || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        let topBatak = Object.entries(persistentData.leaderboard.batak || {})
            .filter(([name]) => isHuman(name))
            .map(([name, score]) => ({ name, score }))
            .sort((a, b) => b.score - a.score).slice(0, 5);

        let topTavla = Object.entries(persistentData.leaderboard.tavla || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        let topOkey101 = Object.entries(persistentData.leaderboard.okey101 || {})
            .filter(([name]) => isHuman(name))
            .map(([name, wins]) => ({ name, wins }))
            .sort((a, b) => b.wins - a.wins).slice(0, 5);

        socket.emit('leaderboardData', { billiard: topBilliard, batak: topBatak, tavla: topTavla, okey101: topOkey101 });
    });

    // 12. BATAK OYUN DİNLEYİCİLERİ
    socket.on('placeBid', (bidValue) => {
        let instance = getBatakInstance(socket.id);
        if (instance && instance.engine.handleBid(instance.game, socket.id, bidValue)) sendBatakUpdate(instance.game);
    });

    socket.on('selectTrump', (suit) => {
        let instance = getBatakInstance(socket.id);
        if (instance && instance.engine.setTrump(instance.game, socket.id, suit)) sendBatakUpdate(instance.game);
    });

    socket.on('discardCards', (indices) => {
        let instance = getBatakInstance(socket.id);
        if (instance && instance.engine.discardCards(instance.game, socket.id, indices)) sendBatakUpdate(instance.game);
    });

    socket.on('playCard', (cardIndex) => {
        let instance = getBatakInstance(socket.id);
        if (instance) {
            if (instance.game.waitingTrickClear) return;
            if (batakAfkTimers[instance.game.tableId]) {
                clearTimeout(batakAfkTimers[instance.game.tableId]);
                delete batakAfkTimers[instance.game.tableId];
            }
            let result = instance.engine.playCard(instance.game, socket.id, cardIndex, players[socket.id]?.color || '#fff');
            if (!result.success) {
                socket.emit('gameError', result.msg);
                return;
            }
            handleBatakCardPlayed(instance.game, instance.engine, result);
        }
    });

    // 13. BİLLARDO OYUN DİNLEYİCİLERİ
    socket.on('billiardShoot', (data) => {
        let instance = getBilliardInstance(socket.id);
        if (instance) billiardEngine.shootBall(instance.game, socket.id, data.angle, data.power, data.spinX, data.spinY);
    });

    socket.on('billiardPlaceWhite', (pos) => {
        let instance = getBilliardInstance(socket.id);
        if (instance) billiardEngine.placeWhiteBall(instance.game, socket.id, pos.x, pos.y);
    });

    // 13.1 TAVLA OYUN DİNLEYİCİLERİ
    socket.on('tavlaRoll', () => {
        let instance = getTavlaInstance(socket.id);
        if (instance && tavlaEngine.rollDice(instance.game, socket.id)) {
            sendTavlaUpdate(instance.game);
        }
    });

    socket.on('getTavlaValidMoves', (data) => {
        let instance = getTavlaInstance(socket.id);
        if (instance) {
            let moves = tavlaEngine.getValidMovesForPoint(instance.game, socket.id, data.fromPoint);
            socket.emit('tavlaValidMovesResponse', { moves: moves });
        }
    });

    socket.on('tavlaMove', (data) => {
        let instance = getTavlaInstance(socket.id);
        if (instance && tavlaEngine.makeMove(instance.game, socket.id, data.fromPoint, data.toPoint, data.usedDie)) {
            sendTavlaUpdate(instance.game);
            if (instance.game.gameOver && instance.game.winner && !instance.game.winnerRecorded) {
                instance.game.winnerRecorded = true;
                let wName = instance.game.playerProfiles[instance.game.winner]?.name;
                let isHuman = !instance.game.winner.startsWith('bot_') && !wName.startsWith('🤖') && !instance.game.playerProfiles[instance.game.winner]?.isBot;
                if (wName) {
                    if (isHuman) {
                        persistentData.leaderboard.tavla[wName] = (persistentData.leaderboard.tavla[wName] || 0) + 1;
                    }
                    let winPrize = 20;
                    if (instance.game.pot && instance.game.pot > 0) {
                        winPrize += instance.game.pot;
                        let potMsg = `💰 TEBRİKLER! ${wName} tavla masasındaki ${instance.game.pot} TL'lik potu kazandı!`;
                        instance.game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (instance.game.spectators) instance.game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        instance.game.pot = 0;
                    }
                    if (isHuman && persistentData.users[wName]) {
                        persistentData.users[wName].money = (persistentData.users[wName].money || 100) + winPrize;
                        io.to(instance.game.winner).emit('moneyUpdate', persistentData.users[wName].money);
                    }
                    savePersistentData();
                }
            }
        }
    });

    // 13.5 101 OKEY OYUN DİNLEYİCİLERİ
    socket.on('okey101DrawTile', () => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.drawTileFromDeck(instance.game, socket.id);
            if (res.success) {
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101TakeDiscard', () => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.takeDiscardedTile(instance.game, socket.id);
            if (res.success) {
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101ReturnDiscard', () => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.returnDiscardTile(instance.game, socket.id);
            if (res.success) {
                socket.emit('systemMessage', `↩️ ${res.msg}`);
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101OpenHand', (payload) => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.openHand(instance.game, socket.id, payload);
            if (res.success) {
                socket.emit('systemMessage', `✅ ${res.msg}`);
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
                if (res.penalty) {
                    sendOkey101Update(instance.game);
                }
            }
        }
    });

    socket.on('okey101AddTileToPer', (data) => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let tileIdOrIds = data.tileIds || data.tileId;
            let res = instance.engine.addTileToTablePer(instance.game, socket.id, tileIdOrIds, data.targetPerIndex, data.position || 'end');
            if (res.success) {
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101DiscardTile', (tileId) => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.discardTile(instance.game, socket.id, tileId);
            if (res.success) {
                if (res.penaltyAdded) {
                    socket.emit('gameError', `⚠️ Cezalı hamle! İşler taş veya Okey attığınız için +101 Ceza puanı aldınız!`);
                }
                sendOkey101Update(instance.game);
                if (res.finished) {
                    checkOkey101RoundEnd(instance.game);
                }
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101TakeOkey', (data) => {
        let instance = getOkey101Instance(socket.id);
        if (instance) {
            let res = instance.engine.takeOkeyFromTablePer(instance.game, socket.id, data.perIndex, data.tileId);
            if (res.success) {
                socket.emit('systemMessage', res.msg);
                sendOkey101Update(instance.game);
            } else {
                socket.emit('gameError', res.msg);
            }
        }
    });

    socket.on('okey101NextRound', () => {
        let instance = getOkey101Instance(socket.id);
        if (instance && instance.game && instance.game.gameOver) {
            startNextOkey101Round(instance.game);
        }
    });

    // 14. MASADAN AYRILMA (Leave Table)
    socket.on('leaveTable', (tableId) => {
        let pName = players[socket.id] ? players[socket.id].name : "Oyuncu";

        // Aktif oyundaysa ve masadan kalkıyorsa koltuğu boşalt
        for (let gid in activeGames) {
            let g = activeGames[gid];
            if (g && g.players && g.players.includes(socket.id)) {
                if (!g.disconnectedPlayers) g.disconnectedPlayers = {};
                let seatIdx = g.players.indexOf(socket.id);
                g.disconnectedPlayers[socket.id] = {
                    name: pName,
                    seatIndex: seatIdx
                };

                let remainingHumans = g.players.filter(pid => pid !== socket.id && !pid.startsWith('bot_') && (!g.disconnectedPlayers || !g.disconnectedPlayers[pid]));
                if (remainingHumans.length === 0) {
                    // Masada başka insan kalmadı, oyunu tamamen sonlandır ve temizle!
                    if (okey101AfkTimers[gid]) {
                        clearTimeout(okey101AfkTimers[gid]);
                        delete okey101AfkTimers[gid];
                    }
                    if (batakAfkTimers[gid]) {
                        clearTimeout(batakAfkTimers[gid]);
                        delete batakAfkTimers[gid];
                    }
                    if (billiardBotTimers[gid]) {
                        clearTimeout(billiardBotTimers[gid]);
                        delete billiardBotTimers[gid];
                    }
                    delete activeGames[gid];
                    if (tables[gid]) {
                        tables[gid].players = [];
                        tables[gid].spectators = [];
                    }
                } else {
                    g.players.forEach(pid => {
                        if (pid !== socket.id && !pid.startsWith('bot_')) {
                            io.to(pid).emit('systemMessage', `⚠️ ${pName} masadan kalktı! Koltuk boş, yerine biri oturabilir veya geri dönebilir.`);
                        }
                    });
                    if (g.spectators) {
                        g.spectators.forEach(sid => io.to(sid).emit('systemMessage', `⚠️ ${pName} masadan kalktı! Koltuğu devralmak için masa menüsünü kullanabilirsiniz.`));
                    }
                    if (gid.startsWith('batak')) {
                        sendBatakUpdate(g);
                    } else if (gid.startsWith('tavla')) {
                        sendTavlaUpdate(g);
                    } else if (gid.startsWith('okey101')) {
                        sendOkey101Update(g);
                    }
                }
            }
        }

        // İzleyicilikten çıkış
        for (let gid in activeGames) {
            let g = activeGames[gid];
            if (g && g.spectators) {
                g.spectators = g.spectators.filter(sid => sid !== socket.id);
            }
        }

        // Lobiden çıkış
        for (let tid in tables) {
            let t = tables[tid];
            if (t.players && t.players.includes(socket.id)) {
                t.players = t.players.filter(pid => pid !== socket.id);
                t.players.forEach(pid => io.to(pid).emit('updateTableLobby', { name: t.name, count: t.players.length, min: t.min, tableId: tid, bet: t.bet || 0 }));
            }
        }

        socket.emit('tableLeft');
    });

    // 14.1 BALIK TUTMA SİSTEMİ (SAHİL)
    const FISH_LOOT_TABLE = [
        { id: 'cizme', name: "Eski Çizme", emoji: "🥾", value: 0, weight: 20, desc: "Eski bir çizme çektin! Deniz temizliği için teşekkürler." },
        { id: 'hamsi', name: "Karadeniz Hamsisi", emoji: "🐟", value: 1, weight: 28, desc: "Taze bir Karadeniz Hamsisi yakaladın!" },
        { id: 'istavrit', name: "Gümüş İstavrit", emoji: "🐟", value: 3, weight: 20, desc: "Çıtır bir Gümüş İstavrit yakaladın!" },
        { id: 'cipura', name: "Ege Çipurası", emoji: "🐠", value: 10, weight: 14, desc: "Nefis bir Ege Çipurası tuttun!" },
        { id: 'levrek', name: "Deniz Levreği", emoji: "🐟", value: 20, weight: 9, desc: "Büyük bir Deniz Levreği çektin!" },
        { id: 'ahtapot', name: "Kaya Ahtapotu", emoji: "🐙", value: 35, weight: 6, desc: "Kolları kıpır kıpır bir Kaya Ahtapotu yakaladın!" },
        { id: 'inci', name: "Nadir İnci", emoji: "🦪", value: 50, weight: 3, desc: "✨ EFSANEVİ! İstiridye içinden parıldayan Nadir İnci çıktı!" }
    ];

    socket.on('startFishing', () => {
        if (!players[socket.id] || players[socket.id].room !== 'sahil') return;
        if (players[socket.id].isFishing) {
            socket.emit('gameError', "Zaten oltan denizde! Balığın vurmasını bekle...");
            return;
        }

        players[socket.id].isFishing = true;
        io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: true });
        socket.emit('fishingStarted', { duration: 10 });

        if (playerFishingTimers[socket.id]) clearTimeout(playerFishingTimers[socket.id]);

        playerFishingTimers[socket.id] = setTimeout(() => {
            if (!players[socket.id] || !players[socket.id].isFishing) return;
            players[socket.id].isFishing = false;
            delete playerFishingTimers[socket.id];

            let currentLootTable = FISH_LOOT_TABLE;
            if (players[socket.id].hasSwanBoat) {
                currentLootTable = [
                    { id: 'hamsi', name: "Karadeniz Hamsisi", emoji: "🐟", value: 1, weight: 10, desc: "Taze bir Karadeniz Hamsisi yakaladın!" },
                    { id: 'istavrit', name: "Gümüş İstavrit", emoji: "🐟", value: 3, weight: 12, desc: "Çıtır bir Gümüş İstavrit yakaladın!" },
                    { id: 'cipura', name: "Ege Çipurası", emoji: "🐠", value: 10, weight: 15, desc: "Nefis bir Ege Çipurası tuttun!" },
                    { id: 'levrek', name: "Deniz Levreği", emoji: "🐟", value: 20, weight: 15, desc: "Büyük bir Deniz Levreği çektin!" },
                    { id: 'ahtapot', name: "Kaya Ahtapotu", emoji: "🐙", value: 35, weight: 15, desc: "Kolları kıpır kıpır bir Kaya Ahtapotu yakaladın!" },
                    { id: 'inci', name: "Nadir İnci", emoji: "🦪", value: 50, weight: 15, desc: "✨ EFSANEVİ! İstiridye içinden parıldayan Nadir İnci çıktı!" },
                    { id: 'mercan', name: "Altın Mercan", emoji: "🪸", value: 75, weight: 10, desc: "🌟 Muhteşem parıltı! Derin sulardan Altın Mercan çıkardın!" },
                    { id: 'hazine', name: "Antik Hazine Sandığı", emoji: "🪙", value: 100, weight: 8, desc: "👑 İNANILMAZ! Kuğu bisikletiyle açık denizden altın dolu Antik Hazine Sandığı çektin!" }
                ];
            }

            let totalWeight = currentLootTable.reduce((sum, item) => sum + item.weight, 0);
            let rand = Math.random() * totalWeight;
            let chosen = currentLootTable[0];
            let acc = 0;
            for (let item of currentLootTable) {
                acc += item.weight;
                if (rand <= acc) {
                    chosen = item;
                    break;
                }
            }

            let uName = players[socket.id].name;
            let earned = chosen.value;
            if (persistentData.users[uName]) {
                persistentData.users[uName].money = (persistentData.users[uName].money || 0) + earned;
                players[socket.id].money = persistentData.users[uName].money;
                savePersistentData();
                socket.emit('moneyUpdate', players[socket.id].money);
            }

            socket.emit('fishingResult', {
                loot: chosen,
                money: players[socket.id].money
            });

            io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: false });

            if (chosen.id === 'levrek' || chosen.id === 'ahtapot' || chosen.id === 'inci' || chosen.id === 'mercan' || chosen.id === 'hazine') {
                io.to('sahil').emit('systemMessage', `🎣 VAY CANINA! ${uName} denizden ${chosen.emoji} ${chosen.name} tuttu! (+${earned} TL)`);
            }
        }, 10000);
    });

    socket.on('cancelFishing', () => {
        if (players[socket.id] && players[socket.id].isFishing) {
            players[socket.id].isFishing = false;
            if (playerFishingTimers[socket.id]) {
                clearTimeout(playerFishingTimers[socket.id]);
                delete playerFishingTimers[socket.id];
            }
            io.to('sahil').emit('playerFishingState', { id: socket.id, isFishing: false });
        }
    });

    // 15. BAĞLANTI KOPMASI (Disconnect)
    socket.on('disconnect', () => {
        if (playerFishingTimers && playerFishingTimers[socket.id]) {
            clearTimeout(playerFishingTimers[socket.id]);
            delete playerFishingTimers[socket.id];
        }
        if (playerTeaTimers[socket.id]) {
            clearTimeout(playerTeaTimers[socket.id]);
            delete playerTeaTimers[socket.id];
        }
        if (players[socket.id]) {
            let pName = players[socket.id].name;
            let room = players[socket.id].room;
            console.log(`${pName} oyundan çıktı.`);

            // Aktif oyundaysa koltuğu boşalt ve devralınabilir yap
            for (let gid in activeGames) {
                let g = activeGames[gid];
                if (g.players.includes(socket.id)) {
                    if (!g.disconnectedPlayers) g.disconnectedPlayers = {};
                    let seatIdx = g.players.indexOf(socket.id);
                    g.disconnectedPlayers[socket.id] = {
                        name: pName,
                        seatIndex: seatIdx
                    };

                    g.players.forEach(pid => {
                        if (pid !== socket.id) {
                            io.to(pid).emit('systemMessage', `⚠️ ${pName} masadan ayrıldı! Koltuk boş, yerine biri oturabilir veya geri gelebilir.`);
                        }
                    });
                    if (g.spectators) {
                        g.spectators.forEach(sid => io.to(sid).emit('systemMessage', `⚠️ ${pName} masadan ayrıldı! Koltuğu devralmak için masa menüsünü kullanabilirsiniz.`));
                    }
                    if (gid.startsWith('batak')) {
                        sendBatakUpdate(g);
                    } else if (gid.startsWith('tavla')) {
                        sendTavlaUpdate(g);
                    } else if (gid.startsWith('okey101')) {
                        sendOkey101Update(g);
                    }

                    let connectedHumans = g.players.filter(pid => !pid.startsWith('bot_') && (!g.disconnectedPlayers || !g.disconnectedPlayers[pid]));
                    if (connectedHumans.length === 0) {
                        if (batakAfkTimers[gid]) {
                            clearTimeout(batakAfkTimers[gid]);
                            delete batakAfkTimers[gid];
                        }
                        if (okey101AfkTimers[gid]) {
                            clearTimeout(okey101AfkTimers[gid]);
                            delete okey101AfkTimers[gid];
                        }
                        if (billiardBotTimers[gid]) {
                            clearTimeout(billiardBotTimers[gid]);
                            delete billiardBotTimers[gid];
                        }
                        delete activeGames[gid];
                        if (tables[gid]) tables[gid].players = [];
                    }
                }
                if (g.spectators) {
                    g.spectators = g.spectators.filter(sid => sid !== socket.id);
                }
            }

            delete players[socket.id];
            io.to(room).emit('playerDisconnected', socket.id);

            for (let id in tables) {
                tables[id].players = tables[id].players.filter(pid => pid !== socket.id);
            }
        }
    });
});

// BİLLARDO FİZİK VE SENKRONİZASYON DÖNGÜSÜ
setInterval(() => {
    for (let gid in activeGames) {
        if (!gid.startsWith('billiard')) continue;
        let game = activeGames[gid];
        if (game) {
            let isMoving = billiardEngine.updatePhysics(game);

            // Bilardo Yapay Zeka (Bot) Sırası
            if (!isMoving && !game.gameOver && !game.shotActive) {
                let currentPid = game.players[game.turnIndex];
                let isBot = currentPid && (currentPid.startsWith('bot_') || game.playerProfiles[currentPid]?.isBot);
                if (isBot && !billiardBotTimers[gid]) {
                    billiardBotTimers[gid] = setTimeout(() => {
                        delete billiardBotTimers[gid];
                        makeBilliardBotShot(game, currentPid);
                    }, 1400);
                }
            }

            // Bilardo bittiğinde liderlik tablosunu ve pot ödülünü güncelle
            if (game.gameOver && game.winner && !game.winnerRecorded) {
                game.winnerRecorded = true;
                let wName = game.playerProfiles[game.winner]?.name;
                let isHuman = !game.winner.startsWith('bot_') && !wName.startsWith('🤖') && !game.playerProfiles[game.winner]?.isBot;
                if (wName) {
                    if (isHuman) {
                        persistentData.leaderboard.billiard[wName] = (persistentData.leaderboard.billiard[wName] || 0) + 1;
                    }
                    let winPrize = 20;
                    if (game.pot && game.pot > 0) {
                        winPrize += game.pot;
                        let potMsg = `💰 TEBRİKLER! ${wName} bilardo masasındaki ${game.pot} TL'lik potu kazandı!`;
                        game.players.forEach(pid => io.to(pid).emit('systemMessage', potMsg));
                        if (game.spectators) game.spectators.forEach(sid => io.to(sid).emit('systemMessage', potMsg));
                        game.pot = 0;
                    }
                    if (isHuman && persistentData.users[wName]) {
                        persistentData.users[wName].money = (persistentData.users[wName].money || 100) + winPrize;
                        io.to(game.winner).emit('moneyUpdate', persistentData.users[wName].money);
                    }
                    savePersistentData();
                }
            }

            let stateObj = {
                balls: game.balls,
                turnIndex: game.turnIndex,
                players: game.players,
                playerSuits: game.playerSuits,
                ballInHand: game.ballInHand,
                winner: game.winner,
                gameOver: game.gameOver,
                tableId: game.tableId,
                turnTimeout: 30,
                disconnectedPlayers: game.disconnectedPlayers || {}
            };

            game.players.forEach((pid) => {
                io.to(pid).emit('billiardUpdate', { ...stateObj, isSpectator: false });
            });

            if (game.spectators && game.spectators.length > 0) {
                game.spectators.forEach((sid) => {
                    io.to(sid).emit('billiardUpdate', { ...stateObj, isSpectator: true });
                });
            }
        }
    }
}, 30);

server.listen(3000, () => { console.log('Sunucu aktif: http://localhost:3000'); });
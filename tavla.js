// tavla.js - Sunucu Tarafı Tavla (Backgammon) Motoru

function createInitialBoard() {
    // 24 kapı (1-24). Her kapıda { player: 'white'|'black'|null, count: 0 }
    // Standart Tavla Yerleşimi:
    // Beyaz (White): 1'den 24'e doğru ilerler (Toplama alanı 19-24)
    // Siyah (Black): 24'ten 1'e doğru ilerler (Toplama alanı 1-6)
    let points = Array(25).fill(null).map(() => ({ player: null, count: 0 }));

    // Beyaz taşlar (Toplam 15 taş)
    points[1]  = { player: 'white', count: 2 };
    points[12] = { player: 'white', count: 5 };
    points[17] = { player: 'white', count: 3 };
    points[19] = { player: 'white', count: 5 };

    // Siyah taşlar (Toplam 15 taş)
    points[24] = { player: 'black', count: 2 };
    points[13] = { player: 'black', count: 5 };
    points[8]  = { player: 'black', count: 3 };
    points[6]  = { player: 'black', count: 5 };

    return points;
}

function startTavlaGame(players) {
    let p1 = players[0];
    let p2 = players[1];

    let gameData = {
        tableId: null,
        players: [p1, p2], // [white, black]
        playerColors: {
            [p1]: 'white',
            [p2]: 'black'
        },
        turnIndex: 0, // 0: p1 (white), 1: p2 (black)
        board: createInitialBoard(),
        bar: { white: 0, black: 0 },         // Kırılan taşlar
        borneOff: { white: 0, black: 0 },   // Toplanan taşlar
        dice: [],                            // Atılan zarlar [d1, d2]
        remainingMoves: [],                  // Kullanılabilir zar hamleleri
        hasRolled: false,
        winner: null,
        gameOver: false,
        spectators: [],
        disconnectedPlayers: {},
        playerProfiles: {}
    };

    return gameData;
}

function rollDice(gameData, playerId) {
    let currentPid = gameData.players[gameData.turnIndex];
    if (currentPid !== playerId || gameData.hasRolled || gameData.gameOver) return false;

    let d1 = Math.floor(Math.random() * 6) + 1;
    let d2 = Math.floor(Math.random() * 6) + 1;

    gameData.dice = [d1, d2];
    gameData.hasRolled = true;

    if (d1 === d2) {
        // Çift zar: 4 hamle hakkı
        gameData.remainingMoves = [d1, d1, d1, d1];
    } else {
        gameData.remainingMoves = [d1, d2];
    }

    // Oynanabilir geçerli hamle var mı kontrol et
    checkPassTurnIfNoMoves(gameData);

    return true;
}

function isHomeBoard(color, pointIndex) {
    if (color === 'white') return pointIndex >= 19 && pointIndex <= 24;
    return pointIndex >= 1 && pointIndex <= 6;
}

function canBearOff(gameData, color) {
    if (gameData.bar[color] > 0) return false;

    let points = gameData.board;
    for (let i = 1; i <= 24; i++) {
        if (points[i].player === color && !isHomeBoard(color, i)) {
            return false;
        }
    }
    return true;
}

function getValidMovesForPoint(gameData, playerId, fromPoint) {
    let color = gameData.playerColors[playerId];
    if (!color || gameData.gameOver || !gameData.hasRolled || gameData.remainingMoves.length === 0) {
        return [];
    }

    let moves = [];
    let uniqueDice = [...new Set(gameData.remainingMoves)];

    // Kırık taş varsa öncelikle bardan girilmelidir
    if (gameData.bar[color] > 0) {
        if (fromPoint !== 'bar') return [];

        uniqueDice.forEach(die => {
            let target = color === 'white' ? die : (25 - die);
            let pt = gameData.board[target];
            let opp = color === 'white' ? 'black' : 'white';

            if (!pt.player || pt.player === color || (pt.player === opp && pt.count === 1)) {
                moves.push({ die, target });
            }
        });
        return moves;
    }

    if (fromPoint === 'bar') return [];

    let currentPt = gameData.board[fromPoint];
    if (!currentPt || currentPt.player !== color || currentPt.count === 0) return [];

    let bearingOffPossible = canBearOff(gameData, color);

    uniqueDice.forEach(die => {
        let target = color === 'white' ? fromPoint + die : fromPoint - die;

        // Pul toplama kontrolü
        if (color === 'white' && target > 24) {
            if (bearingOffPossible) {
                if (target === 25 || fromPoint === getFurthestPoint(gameData, color)) {
                    moves.push({ die, target: 'off' });
                }
            }
        } else if (color === 'black' && target < 1) {
            if (bearingOffPossible) {
                if (target === 0 || fromPoint === getFurthestPoint(gameData, color)) {
                    moves.push({ die, target: 'off' });
                }
            }
        } else if (target >= 1 && target <= 24) {
            let targetPt = gameData.board[target];
            let opp = color === 'white' ? 'black' : 'white';

            // Hedef kapı boş, kendi taşımız var ya da rakip tek taş (açık)
            if (!targetPt.player || targetPt.player === color || (targetPt.player === opp && targetPt.count === 1)) {
                moves.push({ die, target });
            }
        }
    });

    return moves;
}

function getFurthestPoint(gameData, color) {
    if (color === 'white') {
        for (let i = 19; i <= 24; i++) {
            if (gameData.board[i].player === color && gameData.board[i].count > 0) return i;
        }
    } else {
        for (let i = 6; i >= 1; i--) {
            if (gameData.board[i].player === color && gameData.board[i].count > 0) return i;
        }
    }
    return null;
}

function makeMove(gameData, playerId, fromPoint, toPoint, usedDie) {
    let color = gameData.playerColors[playerId];
    if (!color || gameData.players[gameData.turnIndex] !== playerId || !gameData.hasRolled) return false;

    let dieIndex = gameData.remainingMoves.indexOf(usedDie);
    if (dieIndex === -1) return false;

    let opp = color === 'white' ? 'black' : 'white';

    // 1. Taşın çıkış noktasından eksiltilmesi
    if (fromPoint === 'bar') {
        if (gameData.bar[color] <= 0) return false;
        gameData.bar[color]--;
    } else {
        let pt = gameData.board[fromPoint];
        if (!pt || pt.player !== color || pt.count <= 0) return false;
        pt.count--;
        if (pt.count === 0) pt.player = null;
    }

    // 2. Taşın varış noktasına eklenmesi veya toplanması
    if (toPoint === 'off') {
        gameData.borneOff[color]++;
        if (gameData.borneOff[color] >= 15) {
            gameData.winner = playerId;
            gameData.gameOver = true;
        }
    } else {
        let targetPt = gameData.board[toPoint];
        if (targetPt.player === opp && targetPt.count === 1) {
            // Rakip taş kırıldı!
            targetPt.player = color;
            targetPt.count = 1;
            gameData.bar[opp]++;
        } else {
            targetPt.player = color;
            targetPt.count++;
        }
    }

    // 3. Kullanılan zarı listeden düş
    gameData.remainingMoves.splice(dieIndex, 1);

    // Hamleler bittiyse veya kalan zarlarla hamle yapılamıyorsa turu geçir
    checkPassTurnIfNoMoves(gameData);

    return true;
}

function checkPassTurnIfNoMoves(gameData) {
    if (gameData.gameOver) return;

    if (gameData.remainingMoves.length === 0) {
        passTurn(gameData);
        return;
    }

    // Kalan zarlarla herhangi bir hamle yapılabiliyor mu?
    let currentPid = gameData.players[gameData.turnIndex];
    let color = gameData.playerColors[currentPid];
    let hasAnyValidMove = false;

    if (gameData.bar[color] > 0) {
        let barMoves = getValidMovesForPoint(gameData, currentPid, 'bar');
        if (barMoves.length > 0) hasAnyValidMove = true;
    } else {
        for (let i = 1; i <= 24; i++) {
            if (gameData.board[i].player === color && gameData.board[i].count > 0) {
                let moves = getValidMovesForPoint(gameData, currentPid, i);
                if (moves.length > 0) {
                    hasAnyValidMove = true;
                    break;
                }
            }
        }
    }

    if (!hasAnyValidMove) {
        // Hamle kalmadı, sırayı devret
        gameData.remainingMoves = [];
        passTurn(gameData);
    }
}

function passTurn(gameData) {
    gameData.turnIndex = (gameData.turnIndex + 1) % 2;
    gameData.hasRolled = false;
    gameData.dice = [];
    gameData.remainingMoves = [];
}

module.exports = {
    startTavlaGame,
    rollDice,
    getValidMovesForPoint,
    makeMove,
    passTurn
};

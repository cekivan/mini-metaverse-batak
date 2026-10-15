// batak4.js (SUNUCU TARAFI - 4 Kişilik Normal Batak)

const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = {'2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13, 'A':14};

function createAndShuffleDeck() {
    let deck = [];
    for(let s of SUITS) {
        for(let v in RANKS) { deck.push({ suit: s, value: v }); }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function sortHand(hand) {
    const suitOrder = {'♠':1, '♥':2, '♦':3, '♣':4};
    return hand.sort((a, b) => {
        if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
        return RANKS[b.value] - RANKS[a.value];
    });
}

function startBatakGame(players, existingScores = null, roundNumber = 1) {
    let deck = createAndShuffleDeck();
    let gameData = {
        phase: 'ihale', 
        players: [...players], // 4 Kişi
        hands: {},
        tableCards: [], // Gömmeli kart yok
        turnIndex: 0,
        forcedPlayerIndex: 0, 
        bid: { current: 3, highestBidder: null }, // İhale 4'ten başlayacak
        passedPlayers: [], 
        trump: null,
        tricksTaken: {},
        starterIndex: 0,
        trumpBroken: false,
        scores: existingScores || {},
        roundNumber: roundNumber
    };

    players.forEach((pid) => {
        gameData.hands[pid] = sortHand(deck.splice(0, 13)); // Herkese 13 kart
        gameData.tricksTaken[pid] = 0;
        if (!existingScores || existingScores[pid] === undefined) {
            gameData.scores[pid] = 0;
        }
    });

    return gameData;
}

function handleBid(gameData, playerId, bidValue) {
    if (gameData.phase !== 'ihale' || gameData.players[gameData.turnIndex] !== playerId || gameData.passedPlayers.includes(playerId)) return false;

    if (bidValue === 'pas') {
        if (!gameData.passedPlayers.includes(playerId)) gameData.passedPlayers.push(playerId);
    } else {
        let minAllowedBid = (gameData.bid.highestBidder === null) ? 4 : gameData.bid.current + 1;
        if (bidValue >= minAllowedBid) {
            gameData.bid.current = bidValue;
            gameData.bid.highestBidder = playerId;
        } else return false;
    }

    let activePlayers = gameData.players.filter(p => !gameData.passedPlayers.includes(p));

    if (activePlayers.length <= 1) {
        if (gameData.bid.highestBidder === null) {
            gameData.bid.highestBidder = gameData.players[gameData.forcedPlayerIndex];
            gameData.bid.current = 4; // Pas diyene 4'ten kalır
        }
        gameData.phase = 'koz_secimi';
        gameData.turnIndex = gameData.players.indexOf(gameData.bid.highestBidder); 
        return true;
    }

    do {
        gameData.turnIndex = (gameData.turnIndex + 1) % gameData.players.length;
    } while (gameData.passedPlayers.includes(gameData.players[gameData.turnIndex]));

    return true;
}

function setTrump(gameData, playerId, suit) {
    if (gameData.phase !== 'koz_secimi' || gameData.bid.highestBidder !== playerId) return false;
    gameData.trump = suit;
    
    // Gömme işlemi YOK. Doğrudan oyuna geçilir.
    gameData.phase = 'oyun'; 
    gameData.starterIndex = gameData.turnIndex; 
    return true;
}

// 4 kişilik oyunda "gömme" tetiklenmez ama hata vermemesi için boş tutuyoruz.
function discardCards(gameData, playerId, cardIndices) { return false; }

function isValidMove(gameData, hand, playedCard, tableCards) {
    let trump = gameData.trump;

    if (tableCards.length === 0) {
        if (playedCard.suit === trump && !gameData.trumpBroken) {
            let hasNonTrump = hand.some(c => c.suit !== trump);
            if (hasNonTrump) return { valid: false, msg: "Koz çıkmadan eli kozla açamazsın!" };
        }
        return { valid: true };
    } 

    let ledSuit = tableCards[0].card.suit; 
    let highestLedValue = Math.max(...tableCards.filter(tc => tc.card.suit === ledSuit).map(tc => RANKS[tc.card.value]));
    let sameSuitCards = hand.filter(c => c.suit === ledSuit);
    
    if (sameSuitCards.length > 0) {
        if (playedCard.suit !== ledSuit) return { valid: false, msg: `Elinde ${ledSuit} varken başka renk atamazsın!` };
        let higherCards = sameSuitCards.filter(c => RANKS[c.value] > highestLedValue);
        if (higherCards.length > 0 && RANKS[playedCard.value] < highestLedValue) {
            return { valid: false, msg: `Elinde daha yüksek bir ${ledSuit} varken küçüğünü atamazsın!` };
        }
        return { valid: true };
    } else {
        let hasTrump = hand.some(c => c.suit === trump);
        if (hasTrump) {
            if (playedCard.suit !== trump) return { valid: false, msg: `Dönen renkten elinde yok. Koz (${trump}) çakmak zorundasın!` };
            let trumpsOnTable = tableCards.filter(tc => tc.card.suit === trump);
            if (trumpsOnTable.length > 0) {
                let highestTrumpValue = Math.max(...trumpsOnTable.map(tc => RANKS[tc.card.value]));
                let higherTrumpsInHand = hand.filter(c => c.suit === trump && RANKS[c.value] > highestTrumpValue);
                if (higherTrumpsInHand.length > 0 && RANKS[playedCard.value] < highestTrumpValue) {
                    return { valid: false, msg: "Yerdeki kozdan daha büyük bir koz atmak zorundasın!" };
                }
            }
        }
        return { valid: true };
    }
}

function getTrickWinner(tableCards, trump) {
    let winningCard = tableCards[0];
    for (let i = 1; i < tableCards.length; i++) {
        let card = tableCards[i].card;
        let currentWinner = winningCard.card;
        if (card.suit === trump && currentWinner.suit !== trump) { winningCard = tableCards[i]; }
        else if (card.suit === currentWinner.suit) {
            if (RANKS[card.value] > RANKS[currentWinner.value]) winningCard = tableCards[i];
        }
    }
    return winningCard.playerId;
}

function playCard(gameData, playerId, cardIndex, playerColor) {
    if (gameData.phase !== 'oyun' || gameData.players[gameData.turnIndex] !== playerId || gameData.waitingTrickClear || (gameData.tableCards && gameData.tableCards.length >= 4)) return { success: false, msg: "Sıra sende değil!" };

    let hand = gameData.hands[playerId];
    let cardToPlay = hand[cardIndex];

    let moveCheck = isValidMove(gameData, hand, cardToPlay, gameData.tableCards);
    if (!moveCheck.valid) return { success: false, msg: moveCheck.msg };

    if (cardToPlay.suit === gameData.trump) gameData.trumpBroken = true;

    hand.splice(cardIndex, 1);
    gameData.tableCards.push({ playerId: playerId, playerColor: playerColor, card: cardToPlay });
    gameData.turnIndex = (gameData.turnIndex + 1) % gameData.players.length;

    let trickWinner = null;
    let roundEnded = false;

    if (gameData.tableCards.length === 4) { // DİKKAT: 4 oyuncu kart attığında el biter
        trickWinner = getTrickWinner(gameData.tableCards, gameData.trump);
        gameData.tricksTaken[trickWinner] += 1; 
        gameData.turnIndex = gameData.players.indexOf(trickWinner); 

        // Elde hiç kart kalmadıysa turun bittiğini kontrol ediyoruz
        let totalCardsLeft = 0;
        for (let p in gameData.hands) {
            totalCardsLeft += gameData.hands[p].length;
        }

        if (totalCardsLeft === 0) {
            roundEnded = true;
            let bid = gameData.bid.current;
            let bidder = gameData.bid.highestBidder;

            // 4 Kişilik Batak Puanlama Mantığı:
            gameData.players.forEach(pid => {
                let tricks = gameData.tricksTaken[pid];
                if (pid === bidder) {
                    if (tricks < bid) gameData.scores[pid] -= bid;
                    else gameData.scores[pid] += tricks;
                } else {
                    // Yancılar 4 kişilikte en az 1 el alamazsa (0 el) ihale kadar batar
                    if (tricks < 1) gameData.scores[pid] -= bid;
                    else gameData.scores[pid] += tricks;
                }
            });
        }
    }
    return { success: true, trickWinner: trickWinner, roundEnded: roundEnded };
}

module.exports = { startBatakGame, handleBid, setTrump, discardCards, playCard };
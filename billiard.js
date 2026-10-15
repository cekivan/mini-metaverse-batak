// billiard.js (SUNUCU TARAFI)

function startBilliardGame(players) {
    let balls = {
        white: { x: 150, y: 150, vx: 0, vy: 0, type: 'white', active: true }
    };

    let startX = 420;
    let startY = 150;
    let spacing = 18; 

    // 1-7 Düz, 8 Siyah, 9-15 Çizgili
    let positions = [
        {x: startX, y: startY}, 
        {x: startX + spacing, y: startY - 10}, {x: startX + spacing, y: startY + 10}, 
        {x: startX + spacing*2, y: startY - 20}, {x: startX + spacing*2, y: startY}, {x: startX + spacing*2, y: startY + 20}, 
        {x: startX + spacing*3, y: startY - 30}, {x: startX + spacing*3, y: startY - 10}, {x: startX + spacing*3, y: startY + 10}, {x: startX + spacing*3, y: startY + 30}, 
        {x: startX + spacing*4, y: startY - 40}, {x: startX + spacing*4, y: startY - 20}, {x: startX + spacing*4, y: startY}, {x: startX + spacing*4, y: startY + 20}, {x: startX + spacing*4, y: startY + 40} 
    ];

    positions.forEach((pos, index) => {
        let num = index + 1;
        let type = (num === 8) ? 'black' : (num < 8 ? 'solid' : 'stripe');
        balls['ball_' + num] = { x: pos.x, y: pos.y, vx: 0, vy: 0, number: num, type: type, active: true };
    });

    let gameData = {
        players: [...players], 
        turnIndex: 0,
        tableWidth: 600,
        tableHeight: 300,
        balls: balls,
        playerSuits: {}, 
        ballInHand: false,
        winner: null,
        gameOver: false,
        firstHit: null, 
        pottedThisTurn: [], 
        shotActive: false 
    };
    
    gameData.playerSuits[players[0]] = null;
    gameData.playerSuits[players[1]] = null;

    return gameData;
}

function shootBall(gameData, playerId, angle, power, spinX = 0, spinY = 0) {
    let currentPlayer = gameData.players[gameData.turnIndex];
    if (currentPlayer !== playerId || gameData.ballInHand || gameData.gameOver) return false;

    let white = gameData.balls.white;
    if (!white.active || Math.abs(white.vx) > 0.05 || Math.abs(white.vy) > 0.05) return false;

    let rad = angle * (Math.PI / 180);
    white.vx = Math.cos(rad) * power;
    white.vy = Math.sin(rad) * power;
    white.spinX = Math.max(-1, Math.min(1, spinX));
    white.spinY = Math.max(-1, Math.min(1, spinY));
    
    gameData.firstHit = null;
    gameData.pottedThisTurn = [];
    return true;
}

function placeWhiteBall(gameData, playerId, x, y) {
    if (gameData.players[gameData.turnIndex] !== playerId || !gameData.ballInHand) return false;
    
    for (let key in gameData.balls) {
        if (key === 'white' || !gameData.balls[key].active) continue;
        let dx = gameData.balls[key].x - x;
        let dy = gameData.balls[key].y - y;
        if (Math.sqrt(dx*dx + dy*dy) < 16) return false; 
    }

    gameData.balls.white.x = x;
    gameData.balls.white.y = y;
    gameData.balls.white.vx = 0;
    gameData.balls.white.vy = 0;
    gameData.ballInHand = false;
    return true;
}

function evaluateShot(gameData) {
    if (gameData.gameOver) return;

    let foul = false;
    let keepTurn = false;
    let currentPlayer = gameData.players[gameData.turnIndex];
    let oppPlayer = gameData.players[(gameData.turnIndex + 1) % 2];
    let mySuit = gameData.playerSuits[currentPlayer];

    // Fauller
    if (mySuit) {
        if (!gameData.firstHit) foul = true; 
        else if (gameData.firstHit === 'black') {
            let ownBallsLeft = Object.values(gameData.balls).filter(b => b.active && b.type === mySuit).length;
            if (ownBallsLeft > 0) foul = true;
        }
        else if (gameData.firstHit !== mySuit) foul = true; 
    } else {
        if (!gameData.firstHit || gameData.firstHit === 'black') foul = true; 
    }

    if (gameData.pottedThisTurn.includes('white')) foul = true;

    if (mySuit) {
        let oppSuit = mySuit === 'solid' ? 'stripe' : 'solid';
        if (gameData.pottedThisTurn.includes(oppSuit)) foul = true; 
        if (!foul && gameData.pottedThisTurn.includes(mySuit)) keepTurn = true;
    } else {
        if (!foul && gameData.pottedThisTurn.length > 0) keepTurn = true;
    }

    // Oyun Bitişi
    if (gameData.pottedThisTurn.includes('black')) {
        gameData.gameOver = true;
        if (mySuit) {
            let ownBallsLeft = Object.values(gameData.balls).filter(b => b.active && b.type === mySuit).length;
            if (ownBallsLeft === 0 && !foul) gameData.winner = currentPlayer;
            else gameData.winner = oppPlayer; 
        } else {
            gameData.winner = oppPlayer; 
        }
        return;
    }

    // Renk Seçimi
    if (!mySuit && !foul) {
        let firstValid = gameData.pottedThisTurn.find(t => t === 'solid' || t === 'stripe');
        if (firstValid) {
            gameData.playerSuits[currentPlayer] = firstValid;
            gameData.playerSuits[oppPlayer] = firstValid === 'solid' ? 'stripe' : 'solid';
            keepTurn = true; 
        }
    }

    if (foul) {
        gameData.ballInHand = true;
        gameData.turnIndex = (gameData.turnIndex + 1) % 2;
        gameData.balls.white.vx = 0; gameData.balls.white.vy = 0;
    } else {
        if (!keepTurn) gameData.turnIndex = (gameData.turnIndex + 1) % 2;
    }
}

function updatePhysics(gameData) {
    if(gameData.gameOver) return false;
    let friction = 0.985; 
    let radius = 8;
    let minDist = radius * 2; // 16px
    let pockets = [
        {x: 12, y: 12}, {x: 300, y: 10}, {x: 588, y: 12}, 
        {x: 12, y: 288}, {x: 300, y: 290}, {x: 588, y: 288}
    ];
    let movingBalls = false;

    let ballKeys = Object.keys(gameData.balls);
    for (let i = 0; i < ballKeys.length; i++) {
        for (let j = i + 1; j < ballKeys.length; j++) {
            let b1 = gameData.balls[ballKeys[i]]; 
            let b2 = gameData.balls[ballKeys[j]];
            if (!b1.active || !b2.active || b1.x === -100 || b2.x === -100) continue;

            let dx = b2.x - b1.x; 
            let dy = b2.y - b1.y; 
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < minDist && dist > 0.0001) {
                if (b1.type === 'white' && !gameData.firstHit) gameData.firstHit = b2.type;
                if (b2.type === 'white' && !gameData.firstHit) gameData.firstHit = b1.type;

                // 1. İç içe geçmeyi engellemek için ayırma (Positional Correction)
                let overlap = 0.5 * (minDist - dist);
                let nx = dx / dist;
                let ny = dy / dist;

                b1.x -= nx * overlap;
                b1.y -= ny * overlap;
                b2.x += nx * overlap;
                b2.y += ny * overlap;

                // 2. 2D Elastik Çarpışma Hız Değişimi
                let kx = b1.vx - b2.vx;
                let ky = b1.vy - b2.vy;
                let p = nx * kx + ny * ky; // Normal doğrultusundaki bağıl hız

                if (p > 0) { // Sadece birbirine doğru hareket ederken sek
                    let elasticity = 0.96;
                    let impulse = p * elasticity;
                    b1.vx -= impulse * nx;
                    b1.vy -= impulse * ny;
                    b2.vx += impulse * nx;
                    b2.vy += impulse * ny;

                    // Beyaz top falso etkisi (Spin etkisi)
                    if (b1.type === 'white' && b1.spinY) {
                        b1.vx += nx * b1.spinY * 1.5;
                        b1.vy += ny * b1.spinY * 1.5;
                        b1.spinY *= 0.3; // Çarpışmayla falso harcanır
                    } else if (b2.type === 'white' && b2.spinY) {
                        b2.vx -= nx * b2.spinY * 1.5;
                        b2.vy -= ny * b2.spinY * 1.5;
                        b2.spinY *= 0.3;
                    }
                }
            }
        }
    }

    for (let key in gameData.balls) {
        let ball = gameData.balls[key];
        if (!ball.active || ball.x === -100) continue;

        if (Math.abs(ball.vx) > 0.02 || Math.abs(ball.vy) > 0.02) {
            movingBalls = true;
            ball.x += ball.vx; 
            ball.y += ball.vy;
            ball.vx *= friction; 
            ball.vy *= friction;

            // Yuvarlanma açısı (Dönüş hissi)
            ball.rollAngle = ((ball.rollAngle || 0) + Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * 0.14) % (Math.PI * 2);

            // Delik kontrolü
            pockets.forEach(pocket => {
                let pdx = ball.x - pocket.x; 
                let pdy = ball.y - pocket.y;
                if (Math.sqrt(pdx * pdx + pdy * pdy) < 18) {
                    gameData.pottedThisTurn.push(key === 'white' ? 'white' : ball.type);
                    if (key === 'white') {
                        ball.x = -100; ball.y = -100; ball.vx = 0; ball.vy = 0; 
                    } else {
                        ball.active = false; ball.vx = 0; ball.vy = 0;
                    }
                }
            });

            // Bantlardan sekme (Dışarı kaçmayı veya bant içine sıkışmayı engeller)
            let minX = 10 + radius;
            let maxX = 590 - radius;
            let minY = 10 + radius;
            let maxY = 290 - radius;

            let spinTangent = (ball.type === 'white' && ball.spinX) ? ball.spinX * 0.8 : 0;

            if (ball.x < minX) { 
                ball.x = minX; 
                ball.vx = Math.abs(ball.vx) * 0.95; 
                ball.vy += spinTangent;
                if (ball.type === 'white') ball.spinX *= 0.4;
            } else if (ball.x > maxX) { 
                ball.x = maxX; 
                ball.vx = -Math.abs(ball.vx) * 0.95; 
                ball.vy -= spinTangent;
                if (ball.type === 'white') ball.spinX *= 0.4;
            }

            if (ball.y < minY) { 
                ball.y = minY; 
                ball.vy = Math.abs(ball.vy) * 0.95; 
                ball.vx -= spinTangent;
                if (ball.type === 'white') ball.spinX *= 0.4;
            } else if (ball.y > maxY) { 
                ball.y = maxY; 
                ball.vy = -Math.abs(ball.vy) * 0.95; 
                ball.vx += spinTangent;
                if (ball.type === 'white') ball.spinX *= 0.4;
            }
        } else {
            ball.vx = 0; 
            ball.vy = 0;
        }
    }

    if (movingBalls) {
        gameData.shotActive = true;
    } else if (gameData.shotActive) {
        gameData.shotActive = false;
        evaluateShot(gameData);
    }

    return movingBalls;
}

module.exports = { startBilliardGame, shootBall, placeWhiteBall, updatePhysics };
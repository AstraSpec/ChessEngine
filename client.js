// Client side

let ws = null;
let team = 1;
let turn = 1;
let running = false;
let gamemode = "MULTIPLAYER";

let boardLocal = null;
let selectedPiece = null;
let validMoves = [];

// Initializes multiplayer websocket
function wsOpen() {
    if (ws) {
        ws.onerror = ws.onopen = ws.onclose = null;
        ws.close();
    }
    ws = new WebSocket(`ws://127.0.0.1:3000`);
    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);
            
            switch(data.type) {
                case 'team_assignment':
                    team = data.team;
                    console.log(`Assigned to team ${team} (${team === 1 ? 'White' : 'Black'})`);
                    updateStatus(`You are on team ${team === 1 ? 'White' : 'Black'}`);
                    updateTeamDisplay();
                    break;
                case 'start':
                    console.log(`Game started! Team: ${team}, Turn: ${turn}`);
                    updateStatus(`Game started! You are team ${team === 1 ? 'White' : 'Black'}. Player ${turn}'s turn`);
                    running = true;
                    updateTurnDisplay();
                    break;
                case 'board':
                    updateBoard(data.board);
                    break;
                case 'move':
                    updateStatus(`Player ${data.player} made a move. Player ${data.nextTurn}'s turn`);
                    turn = data.nextTurn;
                    updateTurnDisplay();
                    break;
            }
            
        } catch (error) {
            console.error('Message error: ', error);
            updateStatus('Message error');
        }
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket connection error: ', error);
        updateStatus('WebSocket connection error');
    };

    ws.onopen = function () {
        console.log('WebSocket connected');
        updateStatus('Connected to server');
    };

    ws.onclose = function () {
        console.log('WebSocket disconnected');
        updateStatus('Disconnected from server');
        running = false;
        ws = null;
    };
}

// Creates the chess board dynamically
function createBoard() {
    const board = document.querySelector('.board');
    board.innerHTML = '';
    
    // Create 8x8 chess board (64 squares)
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            const square = document.createElement('button');
            square.className = 'square';
            square.id = `${y}-${x}`;
            
            // Add alternating colors for chess board pattern
            if ((y + x) % 2 === 0) {
                square.classList.add('light-square');
            } else {
                square.classList.add('dark-square');
            }
            
            board.appendChild(square);
        }
    }
}

// Shows the pieces on the board
function updateBoard(board) {
    for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
            let square = document.getElementById(y + '-' + x);
            let piece = board[y][x];
            updateSquare(square, piece);
        }
    }

    boardLocal = board;
}

function updateSquare(square, piece) {
    square.innerHTML = '';
    
    if (piece == null) return;
    
    const icon = document.createElement('i');
    icon.classList.add('fa-solid', piece.icon);

    if (piece.team === 1) {
        icon.classList.add('team-white');
    } else {
        icon.classList.add('team-black');
    }
    
    square.appendChild(icon);
}

// Initializes starting values
function startGame() {
    updateStatus("Connecting to server...");
    wsOpen();
}

// Initializes game after fully loaded
document.addEventListener('DOMContentLoaded', function() {
    createBoard();

    // Adds event listeners to squares
    const squares = document.getElementsByClassName("square");
    for (let i = 0; i < squares.length; i++) {
        const square = squares[i];
        square.addEventListener("click", onClick);
    }
    
    const resetBtn = document.getElementById("reset");
    resetBtn.addEventListener("click", resetButton);
    
    // Initialize team and turn displays
    updateTeamDisplay();
    updateTurnDisplay();
    
    startGame();
});

// Click event for squares
function onClick(event) {
    if (!running) return;
    
    let square = event.target;
    if (square.tagName === 'I') {
        square = square.parentElement;
    }

    let x = parseInt(square.id.split('-')[1]);
    let y = parseInt(square.id.split('-')[0]);

    if (turn !== team) {
        updateStatus("It's not your turn!");
        return;
    }

    const clickedPiece = boardLocal[y][x];

    if (selectedPiece === null && clickedPiece && clickedPiece.team === team) {
        selectPiece(clickedPiece, square);
    }
    else if (selectedPiece !== null) {
        // Check if clicked on your teams piece
        if (clickedPiece !== null && selectedPiece.team === clickedPiece.team) {
            selectPiece(clickedPiece, square);
            return;
        }
        
        // Check if moving to the same square
        if (selectedPiece.x === x && selectedPiece.y === y) {
            updateStatus("Cannot move to the same square!");
            return;
        }

        // Check if the destination is a valid move
        let isValidMove = false;
        validMoves.forEach(move => {
            if (move.x === x && move.y === y) {
                isValidMove = true;
            }
        });
        
        if (!isValidMove) {
            updateStatus("Invalid move! Please select a valid destination.");
            return;
        }
        
        ws.send(JSON.stringify({
            type: 'move',
            move: {
                fromX: selectedPiece.x,
                fromY: selectedPiece.y,
                toX: x,
                toY: y,
                piece: selectedPiece.type
            }
        }));
        
        clearHighlighting();
        
        selectedPiece = null;
        validMoves = [];
    }
}

// Resets game
function resetButton() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            type: 'reset'
        }));
    }
    
    // Reset local game state
    running = true;
    updateStatus("Game reset. Player 1's turn");
}

// Updates status message
function updateStatus(message) {
    const statusElement = document.getElementById('status');
    if (statusElement) {
        statusElement.textContent = message;
    }
}

// Updates team display
function updateTeamDisplay() {
    const teamElement = document.getElementById('team-display');
    if (teamElement) {
        teamElement.textContent = `Your Team: ${team === 1 ? 'White' : 'Black'}`;
        teamElement.className = `team-display team-${team === 1 ? 'white' : 'black'}`;
    }
}

// Updates turn display
function updateTurnDisplay() {
    const turnElement = document.getElementById('turn-display');
    if (turnElement) {
        turnElement.textContent = `Current Turn: ${turn === 1 ? 'White' : 'Black'}`;
        turnElement.className = `turn-display turn-${turn === 1 ? 'white' : 'black'}`;
    }
}

function getValidMoves(piece) {
    let validMoves = [];

    let x = piece.x;
    let y = piece.y;
    
    // Pawn
    if (piece.type === 'pawn') {
        let direction = piece.team === 1 ? -1 : 1; // White moves up, Black moves down
        let newY = y + direction;
        
        // Check if move is within board bounds
        if (newY >= 0 && newY < 8) {
            // Forward move (empty square)
            if (!boardLocal[newY][x]) {
                validMoves.push({x: x, y: newY});
                
                // Check if it's the first move (can move 2 squares)
                if ((piece.team === 1 && y === 6) || (piece.team === 2 && y === 1)) {
                    let doubleY = y + (2 * direction);
                    if (doubleY >= 0 && doubleY < 8 && !boardLocal[doubleY][x]) {
                        validMoves.push({x: x, y: doubleY});
                    }
                }
            }
            
            // Diagonal captures (enemy pieces)
            let leftX = x - 1;
            let rightX = x + 1;
            
            // Left diagonal capture
            if (leftX >= 0 && boardLocal[newY][leftX] && boardLocal[newY][leftX].team !== piece.team) {
                validMoves.push({x: leftX, y: newY});
            }
            
            // Right diagonal capture
            if (rightX < 8 && boardLocal[newY][rightX] && boardLocal[newY][rightX].team !== piece.team) {
                validMoves.push({x: rightX, y: newY});
            }
        }
    }
    if (piece.type === 'knight') {
        const knightMoves = [
            {x: x - 2, y: y - 1}, {x: x - 2, y: y + 1},
            {x: x + 2, y: y - 1}, {x: x + 2, y: y + 1},
            {x: x - 1, y: y - 2}, {x: x + 1, y: y - 2},
            {x: x - 1, y: y + 2}, {x: x + 1, y: y + 2} 
        ];
        
        knightMoves.forEach(move => {
            // Check if move is within board bounds
            if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
                // Check if destination is empty or contains enemy piece
                if (!boardLocal[move.y][move.x] || boardLocal[move.y][move.x].team !== piece.team) {
                    validMoves.push(move);
                }
            }
        });
    }
    if (piece.type === 'bishop') {
        const directions = [
            {x: -1, y: -1}, {x: -1, y: 1},
            {x: 1, y: -1}, {x: 1, y: 1}
        ];
        
        directions.forEach(dir => {
            let newX = x + dir.x;
            let newY = y + dir.y;
            
            // Keep moving in this direction until blocked
            while (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
                if (!boardLocal[newY][newX]) {
                    // Empty square - can move here
                    validMoves.push({x: newX, y: newY});
                } else if (boardLocal[newY][newX].team !== piece.team) {
                    // Enemy piece - can capture and stop
                    validMoves.push({x: newX, y: newY});
                    break;
                } else {
                    // Own piece - blocked, stop
                    break;
                }
                
                newX += dir.x;
                newY += dir.y;
            }
        });
    }
    if (piece.type === 'rook') {
        const directions = [
            {x: 0, y: -1}, {x: 0, y: 1},
            {x: -1, y: 0}, {x: 1, y: 0} 
        ];
        
        directions.forEach(dir => {
            let newX = x + dir.x;
            let newY = y + dir.y;
            
            // Keep moving in this direction until blocked
            while (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
                if (!boardLocal[newY][newX]) {
                    // Empty square - can move here
                    validMoves.push({x: newX, y: newY});
                } else if (boardLocal[newY][newX].team !== piece.team) {
                    // Enemy piece - can capture and stop
                    validMoves.push({x: newX, y: newY});
                    break;
                } else {
                    // Own piece - blocked, stop
                    break;
                }
                
                newX += dir.x;
                newY += dir.y;
            }
        });
    }
    
    if (piece.type === 'queen') {
        const directions = [
            {x: 0, y: -1}, {x: 0, y: 1},
            {x: -1, y: 0}, {x: 1, y: 0},
            {x: -1, y: -1}, {x: -1, y: 1},
            {x: 1, y: -1}, {x: 1, y: 1}
        ];
        
        directions.forEach(dir => {
            let newX = x + dir.x;
            let newY = y + dir.y;
            
            // Keep moving in this direction until blocked
            while (newX >= 0 && newX < 8 && newY >= 0 && newY < 8) {
                if (!boardLocal[newY][newX]) {
                    // Empty square - can move here
                    validMoves.push({x: newX, y: newY});
                } else if (boardLocal[newY][newX].team !== piece.team) {
                    // Enemy piece - can capture and stop
                    validMoves.push({x: newX, y: newY});
                    break;
                } else {
                    // Own piece - blocked, stop
                    break;
                }
                
                newX += dir.x;
                newY += dir.y;
            }
        });
    }
    
    if (piece.type === 'king') {
        const kingMoves = [
            {x: x - 1, y: y - 1}, {x: x, y: y - 1}, {x: x + 1, y: y - 1},
            {x: x - 1, y: y}, {x: x + 1, y: y},
            {x: x - 1, y: y + 1}, {x: x, y: y + 1}, {x: x + 1, y: y + 1}
        ];
        
        kingMoves.forEach(move => {
            // Check if move is within board bounds
            if (move.x >= 0 && move.x < 8 && move.y >= 0 && move.y < 8) {
                // Check if destination is empty or contains enemy piece
                if (!boardLocal[move.y][move.x] || boardLocal[move.y][move.x].team !== piece.team) {
                    // Check if this square is under attack by any enemy piece
                    if (!isSquareUnderAttack(move.x, move.y, piece.team)) {
                        validMoves.push(move);
                    }
                }
            }
        });
    }
    
    return validMoves;
}

// Check if a square is under attack by any enemy piece
function isSquareUnderAttack(x, y, defendingTeam) {
    const attackingTeam = defendingTeam === 1 ? 2 : 1;
    
    // Check all squares on the board for enemy pieces
    for (let checkY = 0; checkY < 8; checkY++) {
        for (let checkX = 0; checkX < 8; checkX++) {
            const piece = boardLocal[checkY][checkX];
            
            // If this is an enemy piece, check if it can attack the target square
            if (piece && piece.team === attackingTeam) {
                // Temporarily move the piece to the target square to check if it's a valid move
                const originalPiece = boardLocal[y][x];
                boardLocal[y][x] = piece;
                
                // Get all possible moves for this enemy piece
                const enemyMoves = getValidMovesForPiece(piece, checkX, checkY);
                
                // Check if any of these moves can reach the target square
                const canAttack = enemyMoves.some(move => move.x === x && move.y === y);
                
                // Restore the original board state
                boardLocal[y][x] = originalPiece;
                
                if (canAttack) {
                    return true; // Square is under attack
                }
            }
        }
    }
    
    return false;
}

// Helper function to get valid moves for a piece at a specific position
function getValidMovesForPiece(piece, pieceX, pieceY) {
    const originalX = piece.x;
    const originalY = piece.y;
    
    // Temporarily set the piece's position
    piece.x = pieceX;
    piece.y = pieceY;
    
    // Get valid moves
    const moves = getValidMoves(piece);
    
    // Restore original position
    piece.x = originalX;
    piece.y = originalY;
    
    return moves;
}

function selectPiece(piece, square) {
    selectedPiece = piece;

    clearHighlighting();

    // Highlight selected square
    square.style.backgroundColor = '#ffff00';
    updateStatus(`Selected ${selectedPiece.type} at (${piece.x}, ${piece.y})`);

    validMoves = getValidMoves(selectedPiece);

    // Highlight valid moves
    validMoves.forEach(move => {
        const moveSquare = document.getElementById(`${move.y}-${move.x}`);
        if (moveSquare) {
            moveSquare.classList.add('selected');
        }
    });
}

function clearHighlighting() {
    // Clear selection highlighting
    const squares = document.getElementsByClassName("square");
    for (let i = 0; i < squares.length; i++) {
        squares[i].style.backgroundColor = '';
        squares[i].classList.remove('selected');
    }
}
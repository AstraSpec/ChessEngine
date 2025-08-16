// Client side

let ws = null;
let currentPlayer = 1;
let running = false;
let gamemode = "MULTIPLAYER";

let boardLocal = null;
let selectedPiece = null;

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
                case 'start':
                    updateStatus(`Player ${currentPlayer}'s turn`);
                    running = true;
                    break;
                case 'board':
                    updateBoard(data.board);
                    break;
                case 'move':
                    updateStatus(`Player ${data.player} made a move. Player ${data.nextTurn}'s turn`);
                    currentPlayer = data.nextTurn;
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

    if (selectedPiece === null && boardLocal[y][x] && boardLocal[y][x].team === currentPlayer) {
        selectedPiece = boardLocal[y][x];
        // Highlight selected square
        square.style.backgroundColor = '#ffff00';
        updateStatus(`Selected ${selectedPiece.type} at (${x}, ${y})`);
    }
    else if (selectedPiece !== null) {
        // Check if moving to the same square
        if (selectedPiece.x === x && selectedPiece.y === y) {
            updateStatus("Cannot move to the same square!");
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
        
        // Clear selection highlighting
        const squares = document.getElementsByClassName("square");
        for (let i = 0; i < squares.length; i++) {
            squares[i].style.backgroundColor = '';
        }
        
        selectedPiece = null;
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
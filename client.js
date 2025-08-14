// Client side

let ws = null;
let currentPlayer = 1;
let running = false;
let gamemode = "SINGLEPLAYER";

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
function createChessBoard() {
    const board = document.querySelector('.board');
    board.innerHTML = '';
    
    // Create 8x8 chess board (64 squares)
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('button');
            square.className = 'square';
            square.id = `${row}-${col}`;
            square.setAttribute('role', 'button');
            square.setAttribute('aria-label', `Square ${row}-${col}`);
            
            // Add alternating colors for chess board pattern
            if ((row + col) % 2 === 0) {
                square.classList.add('light-square');
            } else {
                square.classList.add('dark-square');
            }
            
            board.appendChild(square);
        }
    }
}

// Initializes starting values
function startGame() {
    updateStatus("Connecting to server...");
    wsOpen();
}

// Initializes game after fully loaded
document.addEventListener('DOMContentLoaded', function() {
    createChessBoard();

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
    
    const square = event.target;
    const squareId = square.id;
    
    console.log(`Square clicked: ${squareId}`);
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
// Client side

let ws = null;

// Initialize multiplayer websocket
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
                    symbol = data.symbol;
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

// Function to initialize the starting values
function startGame() {
    wsOpen();
}

// Initialize game after fully loaded
document.addEventListener('DOMContentLoaded', function() {
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
    
}

// Resets gams
function resetButton() {
    ws.send(JSON.stringify({
        type: 'reset'
    }));
}
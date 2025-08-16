// Server side

"use strict";

const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const path = require("path");
const Player = require("./Player.js");
const Piece = require("./Piece.js");

const app = express();

const sqlite3 = require('sqlite3').verbose();
var db = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

const hostname = "127.0.0.1";
const port = 3000;

const wss = new WebSocket.Server({ noServer: true });

const BOARD_SIZE = 8;

let board = [];
let players = [null, null];
let gameState = {
    isRunning: false,
    currentTurn: 1,
    board: null,
    startTime: null
};

// ======================================================================================
// Handles websocket

// Starts game (singleplayer or multiplayer)
wss.on("connection", (ws, req) => {
    console.log("WebSocket Connected!");

    let gameMode = "MULTIPLAYER";

    setupBoard();
    sendBoard(ws);
    
    // First player joins
    if (players[0] === null) {
        players[0] = new Player(0, 'human', ws);
        console.log("Player 1 (Human) joined");
        
        // For singleplayer, create a bot as player 2
        if (gameMode === "SINGLEPLAYER") {
            console.log("Bot (Player 2) created");
        }
    
    // Second player joins (multiplayer game)
    } else if (players[1] === null) {
        // Second human player joins (multiplayer)
        players[1] = new Player(2, 'human', ws);
        console.log("Player 2 (Human) joined");
    }

    // Start game if we have enough players
    if (players[0] && players[1]) {
        startGame();
    }

    // Handle messages from human players
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handlePlayerMessage(ws, data);
        } catch (error) {
            console.error('Message parsing error:', error);
        }
    });

    // Handles disconnections
    ws.on("close", () => {
        console.log("WebSocket Disconnected!");
        handlePlayerDisconnect(ws);
    });
});

function setupBoard() {
    let strBoard = [
    'rkbKQbkr',
    'pppppppp',
    '        ',
    '        ',
    '        ',
    '        ',
    'pppppppp',
    'rkbKQbkr'
    ];

    for (let y = 0; y < BOARD_SIZE; y++) {
        board[y] = [];
        for (let x = 0; x < BOARD_SIZE; x++) {
            board[y].push(getPiece(x, y, strBoard[y][x]));
        }
    }
}

function getPiece(x, y, str) {
    let team = y > 3 ? 1 : 2;
    switch(str) {
        case ' ':
            return null;
        case 'p':
            return new Piece(x, y, 'pawn', team, 'fa-chess-pawn');
        case 'r':
            return new Piece(x, y, 'rook', team, 'fa-chess-rook');
        case 'k':
            return new Piece(x, y, 'knight', team, 'fa-chess-knight');
        case 'b':
            return new Piece(x, y, 'bishop', team, 'fa-chess-bishop');
        case 'K':
            return new Piece(x, y, 'king', team, 'fa-chess-king');
        case 'Q':
            return new Piece(x, y, 'queen', team, 'fa-chess-queen');
        default:
            return null;
    };
}

function sendBoard(player) {
    player.send(JSON.stringify({
        type: 'board',
        board: board
    }));
}

// Handles different types of player messages
function handlePlayerMessage(ws, data) {
    switch (data.type) {
        case 'move':
            handlePlayerMove(ws, data);
            break;
        case 'reset':
            handleGameReset();
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

// Handles player moves
function handlePlayerMove(ws, data) {
    // Find which player sent this move
    let playerIndex = -1;
    for (let i = 0; i < players.length; i++) {
        if (players[i] && players[i].ws === ws) {
            playerIndex = i;
            break;
        }
    }

    if (playerIndex === -1 || playerIndex !== gameState.currentTurn - 1) {
        return; // Not your turn
    }

    // Process the move
    console.log(`Player ${playerIndex} made move:`, data);
    
    // Extract move coordinates
    const { fromX, fromY, toX, toY, piece } = data.move;
    
    // Execute the move
    board[toY][toX] = board[fromY][fromX];
    board[fromY][fromX] = null;
    
    // Update piece coordinates
    board[toY][toX].x = toX;
    board[toY][toX].y = toY;
    
    // Update game state
    gameState.currentTurn = gameState.currentTurn === 1 ? 2 : 1;
    
    // Send updated board to all players
    for (let i = 0; i < players.length; i++) {
        if (players[i] && players[i].isReady()) {
            sendBoard(players[i].ws);
        }
    }
    
    // Notify all players of the move
    notifyAllPlayers({
        type: 'move',
        player: playerIndex + 1,
        move: data.move,
        nextTurn: gameState.currentTurn
    });
}

// Handle game reset
function handleGameReset() {
    gameState.isRunning = false;
    gameState.currentTurn = 1;
    gameState.startTime = null;
    
    // Reset player scores
    if (players[0]) players[0].score = 0;
    if (players[1]) players[1].score = 0;
    
    notifyAllPlayers({
        type: 'reset'
    });
    
    console.log("Game reset");
}

// Handle player disconnection
function handlePlayerDisconnect(ws) {
    for (let i = 0; i < players.length; i++) {
        if (players[i] && players[i].ws === ws) {
            players[i].disconnect();
            players[i] = null;
            console.log(`Player ${i + 1} disconnected`);
            break;
        }
    }
    
    // If both players disconnected, reset game
    if (!players[0] && !players[1]) {
        gameState.isRunning = false;
        console.log("All players disconnected, game ended");
    }
}

// Start the game
function startGame() {
    gameState.isRunning = true;
    gameState.startTime = Date.now();
    gameState.currentTurn = 1;
    
    console.log("Game started!");
    
    // Notify all players that game has begun
    notifyAllPlayers({
        type: 'start',
    });
}

// Notify all connected players
function notifyAllPlayers(message) {
    for (let i = 0; i < players.length; i++) {
        if (players[i] && players[i].isReady()) {
            players[i].send(message);
        }
    }
}

//Listen on specified port and ip
const server = app.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});

//Handle 'upgrade' from HTTP to WebSocket
server.on("upgrade", (req, socket, head) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
    });
});

// Handle GET request on /
app.get("/", (req, res) => {
    console.log(`Handling a GET /`);
    res.sendFile(__dirname + "/index.html", function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("Sent: index.html");
        }
    });
});
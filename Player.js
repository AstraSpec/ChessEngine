// Player class to represent either human player or bot

class Player {
    constructor(id, type, ws = null) {
        this.id = id;           // Player ID
        this.type = type;       // 'human' or 'bot'
        this.ws = ws;           // WebSocket connection (null for bots)
        this.isConnected = ws !== null;
        this.lastMove = null;   // Last move made by this player
        this.score = 0;         // Player's score
    }

    // Send message to player (only works for human players)
    send(message) {
        if (this.type === 'human' && this.ws && this.ws.readyState === 1) { // WebSocket.OPEN = 1
            this.ws.send(JSON.stringify(message));
        }
    }

    // Check if player is ready to play
    isReady() {
        if (this.type === 'human') {
            return this.isConnected && this.ws && this.ws.readyState === 1; // WebSocket.OPEN = 1
        }
        return true; // Bots are always ready
    }

    // Disconnect player
    disconnect() {
        this.isConnected = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

module.exports = Player;


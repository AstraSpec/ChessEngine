// Server side

"use strict";

const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");
const path = require("path");

const app = express();

const sqlite3 = require('sqlite3').verbose();
var db = null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, './')));

const hostname = "127.0.0.1";
const port = 3000;

const wss = new WebSocket.Server({ noServer: true });

// ======================================================================================
// Handles websocket seperate from AI games

// Starts multiplayer game
wss.on("connection", (ws, req) => {
    console.log("WebSocket Connected!");

    // Handles multiplayer moves
    ws.on('message', (message) => {
        const data = JSON.parse(message);

    });

    // Handles disconnections
    ws.on("close", () => {
        console.log("WebSocket Disconnected!");
    });
});

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
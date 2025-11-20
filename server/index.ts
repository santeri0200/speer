import {config, globalConfig} from './config/config.ts'
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8000 });
wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send("Hello! You are connected to the WebSocket server.");

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        ws.send(`Server echo: ${message}`);
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});
console.log("server is listening on port 8000");

const somebodyElseThanMe = globalConfig.find(c => c.name !== config.name && c.name !== 'error');
const socket = new WebSocket(somebodyElseThanMe?.url || '');
socket.onopen = () => {
    console.log("Connected to server on port 8000");
    socket.send(JSON.stringify({ type: "chat", payload: `hello from ${config.name}` }));
};

console.log("server is is at the end of index.ts");



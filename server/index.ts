import {config, globalConfig} from './config/config.ts'
import { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8000 });
let shouldRun = true;

const generateMessage = () => {
    const messages = [
        "Hello there!",
        "How's it going?",
        "What's new?",
        "Have a great day!",
        "Stay safe!",
        `hello from ${config.name}`,
        // "stop"
    ];
    const index = Math.floor(Math.random() * messages.length);
    return messages[index];
}

wss.on("connection", (ws) => {
    console.log("Client connected");

    ws.send(JSON.stringify({ type: "info", payload: "Hello! You are connected to the WebSocket server."}));

    ws.on("message", (message) => {
        console.log(`Received: ${message}`);
        ws.send(JSON.stringify({ type: "echo", payload: `Server echo: ${message}`}));


        if(message.toString().includes("stop")) {
            shouldRun = false;
            console.log("Stopping outgoing connections as requested.");
            process.exit(0);
        }
    });

    ws.on("close", () => {
        console.log("Client disconnected");
    });
});
console.log("server is listening on port 8000");
const talk =  async (run: boolean) => {
    const somebodyElseThanMe = globalConfig.find(c => c.name !== config.name && c.name !== 'error');
    while(run){
        console.log(`run is ${run}`);
        console.log("Attempting to connect");
        console.log(`My name is ${config.name}, connecting to ${somebodyElseThanMe?.name} at ${somebodyElseThanMe?.url}`);
        const socket = new WebSocket(somebodyElseThanMe?.url || '');
        socket.onopen = () => {
            console.log("Connected to server on port 8000");
            socket.send(JSON.stringify({ type: "CLIENT_TO_SUPERNODE_MESSAGE", from: config.name }));

            const payload:string = generateMessage();
            socket.send(JSON.stringify({ type: "chat", payload: payload }));
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Supernode replied:", data);
        };
        
        console.log("Connection closed");
        await new Promise(resolve => setTimeout(resolve, 1000));
        socket.close();
    }

}
talk(shouldRun);
console.log("server is at the end of index.ts");



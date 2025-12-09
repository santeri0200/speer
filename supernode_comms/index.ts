/**
 *  NOTE: docker compose networking settings sometimes are quite tricky, try both 8000 or 800{node number} if things wont work. 
 * 
 *  Supernodes ask each other at random itervals about information of connected clients in order to share information.
 *  random because it is little bit easier to read when all nodes arent talking at the same time from the logs
 * 
 *  The message name is GET_KNOWN_CLIENTS
 *  
 *  The answer to the message is a json of ClientConnection[]. the message starts with RESPONSE_GET_KNOWN_CLIENTS
*/
import {config, globalConfig} from './config/config.ts'
import { WebSocketServer } from "ws";

import { StateManager } from './state-manager.ts';
import type { Message, Client, ClientConnection } from './types.ts';

const stateManager = new StateManager();

// Mock client connection
const mockClient: Omit<Client, 'ws'> = {
    username: `mockuser_${config.name}`,
    address: `address_${config.name}`,
    offer: '',
};
stateManager.updateDirectClient(mockClient as Client);

const GET_KNOWN_CLIENTS: string = "GET_KNOWN_CLIENTS"
const RESPONSE_GET_KNOWN_CLIENTS: string = "RESPONSE_GET_KNOWN_CLIENTS"
const CLIENT_TO_SUPERNODE_MESSAGE: string ="CLIENT_TO_SUPERNODE_MESSAGE"
const SUPERNODE_TO_CLIENT_MESSAGE: string = "SUPERNODE_TO_CLIENT_MESSAGE"


//this is run whenn the supernode gets the GET_KNOWN_CLIENTS message
const handleRespondToGetKnownClients = (ws, req, parsedMessage) => {
    console.log(`${config.name} is sending client info to ${req.socket.remoteAddress}`)
    const response: Message = {
        type: RESPONSE_GET_KNOWN_CLIENTS,
        body: stateManager.getConnectedClients()
    }
    ws.send(JSON.stringify(response))
}

const sendAnswerToClient = (ws, req, parsedMessage) => {
    // console.log(parsedMessage)
    const clients = stateManager.getConnectedClients()
    const target = clients.find(({ address }) => address == parsedMessage.body.address)
    if (!target) return

    const response: Message = {
        type: 'ANSWER',
        body: parsedMessage.body.answer,
    }
    target.ws.send(JSON.stringify(response))
}

const handleSupernodeGossip = (clients: ClientConnection[]) => {
    stateManager.updateRemoteClients(clients);
}

const wss = new WebSocketServer({ port: 8000 });
wss.on("connection", (ws, req) => {
    // console.log(`${config.name} was connected from ${req.socket.remoteAddress}`);
    ws.on("message", (message) => {
        // console.log(`Received: ${message}`);
        const parsedMessage = JSON.parse(message)
        if(parsedMessage['type'] === GET_KNOWN_CLIENTS) {
            handleRespondToGetKnownClients(ws, req, parsedMessage)
        }
        if(parsedMessage['type'] === CLIENT_TO_SUPERNODE_MESSAGE) {
            const newClient: Client = {
                username: parsedMessage['body'].username,
                address: `${req.socket.remoteAddress}:${req.socket.remotePort}`,
                offer: parsedMessage['body'].offer,
                ws,
            };
            stateManager.updateDirectClient(newClient)
            ws.send(JSON.stringify({
                type: SUPERNODE_TO_CLIENT_MESSAGE,
                body: stateManager.getOnlineClients(),
                from: config.name
            }));
        }
        if(parsedMessage['type'] === "ANSWER") {
            sendAnswerToClient(ws, req, parsedMessage)
        }
    });
    ws.on("close", () => {
        console.log("supernode socket disconnected");
    });
});

const randomBetween = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const createConnectionAndGossip = async (server, attempts, responseWaitTimeMs, onMessageFunc) => {
    let response = false
    for(let i = 0; i < attempts; i += 1){
        if(server.name == config.name || server.name == 'error'){
            // console.log(`${config.name} skipped  ${server.name}`)
            continue;
        }
        // console.log(`${config.name} attempting to connect to ${server.name}`)
        try{
            const connection = new WebSocket(server.url)
            connection.onopen = () => {
                // console.log(`${config.name} asking client info from ${connection.url}`)
                const message = {
                    type: GET_KNOWN_CLIENTS,
                    body: null
                }
                connection.send(JSON.stringify(message))
            }
            connection.onmessage = (event) => {
                onMessageFunc(event, connection)
                response = true
                connection.close()
            }
            connection.onclose = () => {
                // cleanup? 
            }
            //timeout for the response to come back
            await new Promise(resolve => setTimeout(resolve, responseWaitTimeMs));
            connection.close()
            if(response){
                break;
            }
        }catch(e){
            // console.log(`${config.name} failed to connect ${server.url}`)
        }
    }
}

const startClientAddressGossip = async () => {
    await new Promise(resolve => setTimeout(resolve, randomBetween(0, 2000)));
    for(const server of globalConfig){
       createConnectionAndGossip(server, 3, 1000, (event, connection) => {
           const parsedMessage = JSON.parse(event.data)
           // console.log(`${config.name} got client-info\n ${event.data} \nfrom ${connection.url}`)
            if (parsedMessage['type'] == RESPONSE_GET_KNOWN_CLIENTS) {
                handleSupernodeGossip(parsedMessage['body']);
            }
       })
    }
}

setInterval(async () => {
    // console.log(`--SERVER ${config.name} starting gossip--`)
    await startClientAddressGossip()
    // console.log(`--SERVER ${config.name} stopped gossip--`)
}, randomBetween(5000, 10000))
setInterval(async () => {
    // console.log("--Cleanup Expired Client Entries--")
    stateManager.cleanupExpiredClients()
}, 60000)

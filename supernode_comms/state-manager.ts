import {config} from './config/config.ts'
import type {Client, ClientConnection} from "./types"

export class StateManager {
    private connectedClients: ClientConnection[] = [];

    getConnectedClients(): ClientConnection[] {
        return this.connectedClients;
    }

    //Use this for sending clients a list of online users
    getOnlineClients(): Client[] {
        return this.connectedClients.map(client => ({
            username: client.username,
            address: client.address
        }));
    }

    //This is for supernode communication
    updateRemoteClients(clients: ClientConnection[]): void {
        clients.forEach(client => {
            if (client.supernodeAddress !== config.url){
                const existingIndex = this.connectedClients.findIndex(
                    c => c.username === client.username
                );
                if (existingIndex !== -1) {
                    this.connectedClients[existingIndex] = client;
                } else {
                    this.connectedClients.push(client);
                }
            }
        })
    }

    //This is for Client communication
    updateDirectClient(client: Client): void {
        const existingIndex = this.connectedClients.findIndex(
            c => c.username === client.username
        );
        const clientConnection: ClientConnection = {
            ...client,
            supernodeAddress: config.url,
            timeToLive: Date.now() + 60000 // 1 minute TTL
        };
        if (existingIndex !== -1) {
            this.connectedClients[existingIndex] = clientConnection;
        } else {
            this.connectedClients.push(clientConnection);
        }
    }

    //This is for when a client informs the server that it is going offline
    removeClient(address: string): void {
        this.connectedClients = this.connectedClients.filter(
            client => client.address !== address
        );
    }

    cleanupExpiredClients(): void {
        const nowTTL = Date.now();
        const beforeCP = this.connectedClients.length
        this.connectedClients = this.connectedClients.filter(
            client => client.timeToLive > nowTTL
        );
        console.log("Cleaned up:",(beforeCP - this.connectedClients.length), "clients")
    }
}

import type {ClientConnection} from "./types"

export class StateManager {
    private connectedClients: ClientConnection[] = [];

    getConnectedClients(): ClientConnection[] {
        return this.connectedClients;
    }

    //Use this for sending clients a list of online users
    getOnlineClients() {
        return this.connectedClients.map(client => ({
            username: client.username,
            address: client.address
        }));
    }

    updateClients(clients: ClientConnection[]): void {
        clients.forEach(client => {
            const existingIndex = this.connectedClients.findIndex(
                c => c.username === client.username
            );
            if (existingIndex !== -1) {
                this.connectedClients[existingIndex] = client;
            } else {
                this.connectedClients.push(client);
            }
        })
    }

    //This is for when a client informs the server that it is going offline
    removeClient(address: string): void {
        this.connectedClients = this.connectedClients.filter(
            client => client.address !== address
        );
    }

    cleanupExpiredClients(): void {
        const nowTTL = Date.now() - 60000; //remove all that are more than 60 secs old
        const beforeCP = this.connectedClients.length
        this.connectedClients = this.connectedClients.filter(
            client => client.timeToLive > nowTTL
        );
        console.log("Cleaned up:",(beforeCP - this.connectedClients.length), "clients")
    }
}

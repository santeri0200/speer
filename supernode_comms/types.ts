export type ServerConfig = {
    name: string;
    url: string;
}

export type Message = {
    type: string,
    body: ClientConnection[] | null,
}

export type Client = {
    username: string;           // Client username
    address: string;            // Client IP address
}

export interface ClientConnection {
    supernodeAddress: string;   // Supernode that owns the client
    username: string;           // Client username
    address: string;            // Client IP address
    timeToLive: number;         // timestamp (ms since epoch)
}

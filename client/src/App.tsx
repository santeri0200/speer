import React, { useState } from 'react';

const App: React.FC = () => {
    const [state, setState] = useState<string[]>([]); //This needs proper typing, same as in supernode_comms types: Client
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [username, setUsername] = useState<string>('');
    const [connected, setConnected] = useState<boolean>(false);
    const [intervalId, setIntervalId] = useState<number | null>(null);

    const connectToSupernode = () => {
        if (!username.trim()) return;
        const websocket = new WebSocket('ws://localhost:8000');
        websocket.onopen = () => {
            setConnected(true);
            const interval = setInterval(() => {
                if (websocket.readyState === WebSocket.OPEN) {
                    const payload = {
                        type: 'CLIENT_TO_SUPERNODE_MESSAGE',
                        body: {
                            timestamp: new Date().toISOString(),
                            username: username,
                        },
                    };
                    websocket.send(JSON.stringify(payload));
                }
            }, 1000);
            setIntervalId(interval);
        };

        websocket.onmessage = (event) => {
            console.log("supernode message");
            const message = JSON.parse(event.data);
            if (message.type === 'SUPERNODE_TO_CLIENT_MESSAGE') {
                setState(message.body);
            }
        };

        websocket.onclose = () => {
            setConnected(false);
            setState([])
            if (intervalId) {
                clearInterval(intervalId);
                setIntervalId(null);
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        setWs(websocket);
    };

    const handleSendUsername = () => {
        if (username.trim()) {
            connectToSupernode();
        }
    };
    const handleDisconnect = () => {
        ws?.close()
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>SPEER</h1>
            <h3>The P2P VoIP</h3>
            {!connected && (
                <div>
                    <label htmlFor="username">Username: </label>
                    <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                    />
                    <button onClick={handleSendUsername}>
                        Connect
                    </button>
                </div>
            )}
            {connected && (
                <div>
                    <p style={{ color: 'green' }}>Connected as {username}</p>
                    <button onClick={handleDisconnect}>
                        Disconnect
                    </button>
                    <div style={{ marginTop: '20px' }}>
                        <h3>Connected Clients:</h3>
                        {state.length === 0 ? (
                            <p>No clients connected.</p>
                        ) : (
                            <div>
                                {state.map((client, index) => (
                                    <div key={index}>
                                        <button style={{width: '100%', margin:'1px'}}>{client.username}</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;

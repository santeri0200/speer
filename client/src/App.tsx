import React, { useRef, useState, useEffect } from 'react';

type Client = { address: string; username: string; offer?: RTCSessionDescriptionInit };

const App: React.FC = () => {
  const connection = new RTCPeerConnection();
  const [clients, setClients] = useState<Client[]>([]);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [intervalId, setIntervalId] = useState<number>(-1);

  const localStream = useRef<MediaStream | null>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const localVideo = useRef<HTMLVideoElement>(null);

  connection.onicecandidate = console.log
  connection.oniceconnectionstatechange = console.log
  connection.onicegatheringstatechange = console.log
  connection.onsignalingstatechange = console.log
  connection.onnegotiationneeded = console.log
  connection.ontrack = console.log

  connection.onicecandidate = (event) => {
    if (event.candidate && ws) {
      ws.send(
        JSON.stringify({
          type: 'ICE_CANDIDATE',
          body: { candidate: event.candidate },
        })
      );
    }
  };


  useEffect(() => {
    connection.ontrack = (event) => {
      if (remoteVideo.current) {
        remoteVideo.current.srcObject = event.streams[0];
      }
    };

    return () => {
      connection.close();
      ws?.close();
    };
  }, [ws]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      localStream.current = stream;

      if (localVideo.current) {
        localVideo.current.srcObject = stream;
      }

      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
    } catch (error) {
      console.error('Error accessing camera/microphone:', error);
      alert('Could not access camera/microphone. Please allow access.');
    }
  };

  const connectToSupernode = async () => {
    if (!username.trim()) return;

    await initializeCamera();

    const websocket = new WebSocket('ws://localhost:8000');
    websocket.onopen = async () => {
      setConnected(true);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      websocket.send(
        JSON.stringify({
          type: 'CLIENT_TO_SUPERNODE_MESSAGE',
          body: { username, offer: connection.localDescription },
        })
      );

      const interval = setInterval(() => {
        if (websocket.readyState === WebSocket.OPEN) {
          const payload = {
            type: 'CLIENT_TO_SUPERNODE_MESSAGE',
            body: {
              timestamp: new Date().toISOString(),
              username: username,
            }
          }

          websocket.send(JSON.stringify(payload))
        }
      }, 1000)

      setIntervalId(interval)
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'SUPERNODE_TO_CLIENT_MESSAGE') {
        setClients(message.body);
      } else if (message.type === 'ANSWER') {
        handleIncomingAnswer(message.body);
      } else if (message.type === 'ICECANDIDATE') {
        handleIceCandidate(message.body)
      }
    };

    websocket.onclose = () => {
      setConnected(false);
      setClients([]);

      if (intervalId !== -1) {
        clearInterval(intervalId)
        setIntervalId(-1)
      }
    };

    websocket.onerror = (error) => console.error('WebSocket error:', error);

    setWs(websocket);
  };

  const handleIncomingAnswer = async (answer: RTCSessionDescriptionInit) => {
    const desc = new RTCSessionDescription(answer);
    await connection.setRemoteDescription(desc);
  };

  const handleIceCandidate = async (candidate: RTCIceCandidate) => {
    await connection.addIceCandidate(candidate)    
  }

  const handleCall = async (client: Client) => {
    const desc = new RTCSessionDescription(client.offer!);
    await connection.setRemoteDescription(desc);

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    ws?.send(
      JSON.stringify({
        type: 'ANSWER',
        body: { address: client.address, answer },
      })
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>SPEER</h1>
      <h3>The P2P VoIP</h3>

      <video
        ref={localVideo}
        autoPlay
        muted
        playsInline
        style={{ background: 'black', width: 300, marginBottom: '10px' }}
      />
      <video
        ref={remoteVideo}
        autoPlay
        playsInline
        style={{ background: 'black', width: 300 }}
      />

      {!connected ? (
        <div>
          <label htmlFor="username">Username: </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username"
          />
          <button onClick={connectToSupernode}>Connect</button>
        </div>
      ) : (
        <div>
          <p style={{ color: 'green' }}>Connected as {username}</p>
          <button onClick={() => ws?.close()}>Disconnect</button>

          <div style={{ marginTop: '20px' }}>
            <h3>Connected Clients:</h3>
            {clients.length === 0 ? (
              <p>No clients connected.</p>
            ) : (
              clients.map((client, i) => (
                <button
                  key={i}
                  onClick={() => handleCall(client)}
                  style={{ width: '100%', margin: '1px' }}
                >
                  {client.username}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;

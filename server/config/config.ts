const SERVER_NODE_NAME = process.env.SERVER_NODE_NAME || ''

export const globalConfig = [
    {
        name: 'error',
        url: '',
    },
    {
        name: 'speer-server-0',
        url: 'http://speer-server-0:8000',
    },
    {
        name: 'speer-server-1',
        url: 'http://speer-server-1:8001',
    },
    {
        name: 'speer-server-2',
        url: 'http://speer-server-2:8002',
    }
]


const readServerConfig = () => {
    console.log(`Reading configuration for server node: ${SERVER_NODE_NAME}`)
    const info = globalConfig.find(c => c.name === SERVER_NODE_NAME);
    return info || globalConfig[0];
}

export const config = readServerConfig()




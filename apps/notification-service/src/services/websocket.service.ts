import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import logger from 'logger';

let wss: WebSocketServer;

export const createWebSocketServer = (server: Server): void => {
    wss = new WebSocketServer({ server });

    wss.on('connection', (ws: WebSocket) => {
        logger.info('A new client connected to WebSocket');

        ws.send(JSON.stringify({ type: 'WELCOME', message: 'Connection established to Notification Service!' }));

        ws.on('close', () => {
            logger.info('Client disconnected from WebSocket');
        });

        ws.on('error', (error) => {
            logger.error({ error }, 'WebSocket connection error');
        });
    });

    logger.info('WebSocket server initialized');
};

export const broadcast = (data: object): void => {
    if (!wss) {
        logger.warn('WebSocket server is not initialized. Cannot broadcast message.');
        return;
    }

    const message = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
    logger.info({ clients: wss.clients.size, message }, 'Broadcasting message to WebSocket clients');
};
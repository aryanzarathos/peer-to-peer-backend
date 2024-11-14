import { WebSocketServer } from 'ws';
import serverConfig from '../config/serverConfig.js';
import messageController from '../controllers/messageController.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';  // npm install uuid

class WebSocketService {
    constructor() {
        this.rooms = new Map();
        this.clients = new Map();  // Store clients with their unique IDs
        this.server = new WebSocketServer({ port: serverConfig.port });

        // Initialize the WebSocket server events
        this.server.on('connection', this.onConnection.bind(this));
        this.server.on('error', this.onError.bind(this));

        logger.info(`WebSocket server running on port ${serverConfig.port}`);
    }

    onConnection(ws,req) {

        const roomId = req.url.split("/")[1];
        if (!roomId) {
            ws.close();
            return logger.error('Room ID not provided');
        }

        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, new Set());
        }

        // Add client to the specific room
        this.rooms.get(roomId).add(ws);

        const clientId = uuidv4();  // Generate a unique ID for each client
        this.clients.set(clientId, ws);
        logger.info(`New client connected with ID: ${clientId}`);

        ws.send(`connection established with ID: ${clientId}`);

        ws.on('message', (data) => this.onMessage(ws, clientId, data, roomId));
        ws.on('close', () => this.onClose(clientId));
        ws.on('error', (error) => this.onError(error));
    }

    onMessage(ws, clientId, data, roomid) {
        logger.info(`Received message from client ${clientId} room id ${roomid}: ${data}`);
        // this.sendToClient(clientId, `Client ${clientId} room id ${roomid} says: ${data}`);
        this.broadcastToRoom(roomid, ws, `Client ${clientId} room id ${roomid} says: ${data}`);
    }

    onClose(clientId) {
        this.clients.delete(clientId);
        logger.info(`Client ${clientId} disconnected!`);
    }

    onError(error) {
        logger.error(`WebSocket error: ${error}`);
    }

    // Method to broadcast to all other clients except the sender
    broadcastToOthers(senderId, message) {
        this.clients.forEach((client, clientId) => {
            if (clientId !== senderId && client.readyState === client.OPEN) {
                client.send(message);
            }
        });
    }

    // Method to send a message to a specific client by ID
    sendToClient(clientId, message) {
        const client = this.clients.get(clientId);
        if (client && client.readyState === client.OPEN) {
            client.send(message);
        } else {
            logger.error(`Client ${clientId} is not connected`);
        }
    }
    broadcastToRoom(roomId, senderWs, message) {
        this.rooms.get(roomId).forEach((client) => {
            if (client !== senderWs && client.readyState === client.OPEN) {
                client.send(message);
            }
        });
    }
}

export default WebSocketService;

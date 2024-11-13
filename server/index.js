 import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';  // Ensure to use the cors package

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3501;
const ADMIN = 'Admin';

const app = express();

// Enable CORS for multiple origins (local dev and remote production)
app.use(cors({
    origin: [
        'http://127.0.0.1:5500',         // Local dev URL
        'http://localhost:5500',          // Local dev URL
        'https://chat-app-jwaw.onrender.com'  // Deployed frontend URL
    ],
    methods: ['GET', 'POST'],             // Allowed HTTP methods
    allowedHeaders: ['Content-Type'],     // Allowed headers
    credentials: true                     // Allow credentials (cookies, etc.)
}));

// Serve static files (public folder)
app.use(express.static(path.join(__dirname, 'public')));

// Start the server
const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// State management for users
const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
};

// Set up Socket.IO with CORS configuration
const io = new Server(expressServer, {
    cors: {
        origin: [
            'http://127.0.0.1:5500',         // Local dev URL
            'http://localhost:5500',          // Local dev URL
            'https://chat-app-jwaw.onrender.com'  // Deployed frontend URL
        ],
        methods: ['GET', 'POST'],             // Allowed HTTP methods
        allowedHeaders: ['Content-Type'],     // Allowed headers
        credentials: true                     // Allow credentials (cookies, etc.)
    }
});

// In-memory message storage
const roomMessages = {};  // { roomName: [{ name, text, time }] }

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // Upon connection, welcome the user
    socket.emit('message', buildMsg(ADMIN, "Welcome to Summoner's Chat App! We're improving"));

    // User enters a room
    socket.on('enterRoom', ({ name, room }) => {
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        // Update previous room's user list
        if (prevRoom) {
            io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
        }

        // Join new room
        socket.join(user.room);
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // Update user list in the room
        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });

        // Update rooms list for everyone
        io.emit('roomList', { rooms: getAllActiveRooms() });

        // Send message history to the new user
        socket.emit('messageHistory', roomMessages[user.room] || []);
    });

    // Handle incoming messages
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            const message = buildMsg(name, text);

            // Save the message to the room's history
            if (!roomMessages[room]) {
                roomMessages[room] = [];
            }
            roomMessages[room].push(message);

            // Send the message to everyone in the room
            io.to(room).emit('message', message);
        }
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        if (user) {
            userLeavesApp(socket.id);
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));
            io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
            io.emit('roomList', { rooms: getAllActiveRooms() });
        }
        console.log(`User ${socket.id} disconnected`);
    });

    // Listen for activity (e.g., typing indicator)
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });
});

// Function to build messages with timestamp
function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    };
}

// User-related helper functions
function activateUser(id, name, room) {
    const user = { id, name, room };
    UsersState.setUsers([
        ...UsersState.users.filter(user => user.id !== id),
        user
    ]);
    return user;
}

function userLeavesApp(id) {
    UsersState.setUsers(UsersState.users.filter(user => user.id !== id));
}

function getUser(id) {
    return UsersState.users.find(user => user.id === id);
}

function getUsersInRoom(room) {
    return UsersState.users.filter(user => user.room === room);
}

function getAllActiveRooms() {
    return Array.from(new Set(UsersState.users.map(user => user.room)));
}

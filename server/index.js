 import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3501;
const ADMIN = 'Admin';

const app = express();

app.use(cors({
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://chat-app-jwaw.onrender.com'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

const UsersState = {
    users: [],
    setUsers: function (newUsersArray) {
        this.users = newUsersArray;
    }
};

const io = new Server(expressServer, {
    cors: {
        origin: [
            'http://127.0.0.1:5500',
            'http://localhost:5500',
            'https://chat-app-jwaw.onrender.com'
        ],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }
});

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // User enters a room
    socket.on('enterRoom', ({ name, room }) => {
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        if (prevRoom) {
            io.to(prevRoom).emit('userList', { users: getUsersInRoom(prevRoom) });
        }

        // Join new room and send welcome message once
        socket.join(user.room);
        socket.emit('message', buildMsg(ADMIN, `Welcome to the ${user.room} chat room!`));
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        io.to(user.room).emit('userList', { users: getUsersInRoom(user.room) });
        io.emit('roomList', { rooms: getAllActiveRooms() });

        // Send message history to the new user
        socket.emit('messageHistory', roomMessages[room] || []);
    });

    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            const message = buildMsg(name, text);
            if (!roomMessages[room]) {
                roomMessages[room] = [];
            }
            roomMessages[room].push(message);
            io.to(room).emit('message', message);
        }
    });

    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });

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
});

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

const roomMessages = {};

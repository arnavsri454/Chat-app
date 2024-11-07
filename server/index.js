import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3501;
const ADMIN = 'Admin';

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

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

const io = new Server(expressServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? false
            : ['http://localhost:5500', 'http://127.0.0.1:5501'], // Allow both origins
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    }
});

io.on('connection', socket => {
    console.log(`User ${socket.id} connected`);

    // Upon connection, welcome the user
    socket.emit('message', buildMsg(ADMIN, "Welcome to Summoner's Chat App! , we are improving"));

    // User entering a room
    socket.on('enterRoom', ({ name, room }) => {
        // Leave previous room if necessary
        const prevRoom = getUser(socket.id)?.room;

        if (prevRoom) {
            socket.leave(prevRoom);
            io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} has left the room`));
        }

        const user = activateUser(socket.id, name, room);

        // Update previous room's user list
        if (prevRoom) {
            io.to(prevRoom).emit('userList', {
                users: getUsersInRoom(prevRoom)
            });
        }

        // Join the new room
        socket.join(user.room);

        // Notify the user who joined
        socket.emit('message', buildMsg(ADMIN, `You have joined the ${user.room} chat room`));

        // Notify others in the room
        socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has joined the room`));

        // Update the user list for the room
        io.to(user.room).emit('userList', {
            users: getUsersInRoom(user.room)
        });

        // Update rooms list for everyone
        io.emit('roomList', {
            rooms: getAllActiveRooms()
        });
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
        const user = getUser(socket.id);
        userLeavesApp(socket.id);

        if (user) {
            io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} has left the room`));

            // Update user list for the room
            io.to(user.room).emit('userList', {
                users: getUsersInRoom(user.room)
            });

            // Update rooms list for everyone
            io.emit('roomList', {
                rooms: getAllActiveRooms()
            });
        }

        console.log(`User ${socket.id} disconnected`);
    });

    // Upon connection - notify others (except the new user)
    socket.broadcast.emit('message', `User ${socket.id.substring(0, 5)} connected`);

    // Listen for incoming messages
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // Listen for activity (e.g., typing indicator)
    socket.on('activity', (name) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            socket.broadcast.to(room).emit('activity', name);
        }
    });
});

// Function to build message with timestamp
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
    UsersState.setUsers(
        UsersState.users.filter(user => user.id !== id)
    );
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

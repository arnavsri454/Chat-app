import express from 'express';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 3501;
const ADMIN = 'Admin';

const app = express();

// Configure Multer for image uploads
const storage = multer.diskStorage({
    destination: path.join(__dirname, 'public/uploads'),
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const upload = multer({ storage });

// Enable CORS
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

// Serve static files (public folder)
app.use(express.static(path.join(__dirname, 'public')));

// Image upload route
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
});

const expressServer = app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});

// Initialize Socket.io
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

// Main code for managing chat
io.on('connection', (socket) => {
    console.log(`User ${socket.id} connected`);

    // Handle regular text messages
    socket.on('message', ({ name, text }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', buildMsg(name, text));
        }
    });

    // Handle image messages
    socket.on('imageMessage', ({ name, imageUrl }) => {
        const room = getUser(socket.id)?.room;
        if (room) {
            io.to(room).emit('message', {
                name,
                text: `<img src="${imageUrl}" alt="Shared image" class="shared-image"/>`,
                time: new Date().toLocaleTimeString()
            });
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
    });
});

function buildMsg(name, text) {
    return {
        name,
        text,
        time: new Date().toLocaleTimeString()
    };
}

function getUser(id) {
    // Implement function to get user details
}

 

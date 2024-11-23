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

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
        }
        cb(null, true);
    }
});

// CORS Configuration
const corsOptions = {
    origin: [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'https://chat-app-jwaw.onrender.com'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

app.use(cors(corsOptions));

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
const io = new Server(expressServer, { cors: corsOptions });

// In-memory storage for users
const users = new Map();

function getUser(id) {
    return users.get(id);
}

function addUser(id, room) {
    users.set(id, { room });
}

function removeUser(id) {
    users.delete(id);
}

// Main code for managing chat
io.on('con

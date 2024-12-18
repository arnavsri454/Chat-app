const socket = io('https://chat-app-jwaw.onrender.com'); // Update with your deployed server URL

const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');
const imageInput = document.querySelector('#imageUpload');

// Send a text message
function sendMessage(e) {
    e.preventDefault();
    if (nameInput.value.trim() && msgInput.value.trim() && chatRoom.value.trim()) {
        socket.emit('sendMessage', {
            name: nameInput.value,
            text: msgInput.value,
            room: chatRoom.value,
        });
        msgInput.value = "";
    } else {
        alert("Please fill in your name, message, and room.");
    }
    msgInput.focus();
}

// Send an image
function sendImage(e) {
    e.preventDefault();
    if (!imageInput.files[0]) return alert("Please select an image to upload.");

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);

    // Upload the image to the server
    fetch('https://chat-app-jwaw.onrender.com/upload', { // Update with your deployed upload URL
        method: 'POST',
        body: formData,
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.imageUrl) {
                socket.emit('sendMessage', {
                    name: nameInput.value,
                    text: `<img src="${data.imageUrl}" alt="Image" class="chat-image" />`,
                    room: chatRoom.value,
                });
                imageInput.value = '';
            } else {
                alert("Error uploading the image. Please try again.");
            }
        })
        .catch((error) => console.error('Error uploading image:', error));
}

document.querySelector('.form-msg').addEventListener('submit', sendMessage);
document.querySelector('.form-upload').addEventListener('submit', sendImage);

// Handle incoming messages
socket.on("message", (data) => {
    displayMessage(data);
});

// Display a message in the chat
function displayMessage(data) {
    const { name, text, time } = data;
    const li = document.createElement('li');
    li.className = 'post';

    if (name === nameInput.value) li.classList.add('post--left');
    if (name !== nameInput.value && name !== 'Admin') li.classList.add('post--right');

    li.innerHTML = `
        <div class="post__header ${name === nameInput.value
            ? 'post__header--user'
            : 'post__header--reply'}">
            <span class="post__header--name">${name}</span>
            <span class="post__header--time">${time || new Date().toLocaleTimeString()}</span>
        </div>
        <div class="post__text">${text}</div>`;
    
    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

// Handle connection and room setup
socket.on('connect', () => {
    console.log('Connected to server');

    if (nameInput.value.trim() && chatRoom.value.trim()) {
        socket.emit('joinRoom', {
            username: nameInput.value,
            room: chatRoom.value,
        });
    } else {
        alert("Please enter your name and room before joining the chat.");
    }
});

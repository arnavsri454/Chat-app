 const socket = io('https://chat-app-jwaw.onrender.com');

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
    if (nameInput.value && msgInput.value && chatRoom.value) {
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        });
        msgInput.value = "";
    }
    msgInput.focus();
}

// Send an image
function sendImage(e) {
    e.preventDefault();
    if (!imageInput.files[0]) return;

    const formData = new FormData();
    formData.append('image', imageInput.files[0]);

    // Upload the image to the server
    fetch('http://localhost:3501/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.imageUrl) {
            socket.emit('imageMessage', {
                name: nameInput.value,
                imageUrl: data.imageUrl
            });
            imageInput.value = '';
        }
    })
    .catch(error => console.error('Error uploading image:', error));
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage);

document.querySelector('.form-upload')
    .addEventListener('submit', sendImage);

socket.on("message", (data) => {
    displayMessage(data);
});

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
            <span class="post__header--time">${time}</span>
        </div>
        <div class="post__text">${text}</div>`;
    
    chatDisplay.appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

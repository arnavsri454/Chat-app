 const socket = io('https://chat-app-jwaw.onrender.com');  // WebSocket connection URL

const msgInput = document.querySelector('#message');
const nameInput = document.querySelector('#name');
const chatRoom = document.querySelector('#room');
const activity = document.querySelector('.activity');
const usersList = document.querySelector('.user-list');
const roomList = document.querySelector('.room-list');
const chatDisplay = document.querySelector('.chat-display');

function sendMessage(e) {
    e.preventDefault();
    if (nameInput.value && msgInput.value && chatRoom.value) {
        console.log('Sending message: ', msgInput.value);  // Debugging message send
        socket.emit('message', {
            name: nameInput.value,
            text: msgInput.value
        });
        msgInput.value = "";
    }
    msgInput.focus();
}

function enterRoom(e) {
    e.preventDefault();
    if (nameInput.value && chatRoom.value) {
        console.log('Entering room: ', chatRoom.value);  // Debugging room entry
        socket.emit('enterRoom', {
            name: nameInput.value,
            room: chatRoom.value
        });
    }
}

document.querySelector('.form-msg')
    .addEventListener('submit', sendMessage);

document.querySelector('.form-join')
    .addEventListener('submit', enterRoom);

msgInput.addEventListener('keypress', () => {
    socket.emit('activity', nameInput.value);
});

// Listen for messages from the server
socket.on("message", (data) => {
    console.log('Received message: ', data);  // Debugging message display
    activity.textContent = "";
    displayMessage(data);
});

// Handle activity (e.g., typing indicator)
let activityTimer;
socket.on("activity", (name) => {
    activity.textContent = `${name} is typing...`;
    clearTimeout(activityTimer);
    activityTimer = setTimeout(() => {
        activity.textContent = "";
    }, 3000);
});

// Listen for updated user list
socket.on('userList', ({ users }) => {
    showUsers(users);
});

// Listen for updated room list
socket.on('roomList', ({ rooms }) => {
    showRooms(rooms);
});

// Show active users in the current room
function showUsers(users) {
    usersList.innerHTML = '';  // Clear existing list
    if (users && users.length > 0) {
        usersList.innerHTML = `<em>Users in ${chatRoom.value}:</em>`;
        users.forEach((user, i) => {
            const userItem = document.createElement('span');
            userItem.textContent = user.name;
            usersList.appendChild(userItem);
            if (i !== users.length - 1) {
                usersList.innerHTML += ', ';  // Comma between users
            }
        });
    }
}

// Show active rooms
function showRooms(rooms) {
    roomList.innerHTML = '';  // Clear existing room list
    if (rooms && rooms.length > 0) {
        roomList.innerHTML = '<em>Active Rooms:</em>';
        rooms.forEach((room, i) => {
            const roomItem = document.createElement('span');
            roomItem.textContent = room;
            roomList.appendChild(roomItem);
            if (i !== rooms.length - 1) {
                roomList.innerHTML += ', ';  // Comma between rooms
            }
        });
    }
}

// Receive message history and display it when joining a room
socket.on("messageHistory", (messages) => {
    messages.forEach(displayMessage);
});

// Function to display a message
function displayMessage(data) {
    const { name, text, time } = data;
    const li = document.createElement('li');
    li.className = 'post';
    if (name === nameInput.value) li.classList.add('post--left');
    if (name !== nameInput.value && name !== 'Admin') li.classList.add('post--right');
    
    if (name !== 'Admin') {
        li.innerHTML = `  
            <div class="post__header ${name === nameInput.value
                ? 'post__header--user'
                : 'post__header--reply'}">
                <span class="post__header--name">${name}</span>
                <span class="post__header--time">${time}</span>
            </div>
            <div class="post__text">${text}</div>`;
    } else {
        li.innerHTML = `<div class="post__text">${text}</div>`;
    }
    
    document.querySelector('.chat-display').appendChild(li);
    chatDisplay.scrollTop = chatDisplay.scrollHeight;
}

const socket = new WebSocket("wss://room-chat-server-1.onrender.com");

let username, room, key;
let isTyping = false;
let typingTimeout;

const $ = (id) => document.getElementById(id);

$("joinBtn").onclick = () => {
  username = $("username").value;
  room = $("room").value;
  key = $("key").value;

  if (!username || !room || !key) return alert("Fill all fields!");

  $("room-container").classList.add("hidden");
  $("chat-container").classList.remove("hidden");
  $("room-name").innerText = `Room: ${room}`;
  socket.send(JSON.stringify({ type: "join", username, room }));
};

$("sendBtn").onclick = sendMessage;
$("message").addEventListener("keydown", handleTyping);
$("emojiBtn").onclick = () => document.querySelector("emoji-picker").style.display = "block";
document.querySelector("emoji-picker").addEventListener("emoji-click", (e) => {
  $("message").value += e.detail.unicode;
  document.querySelector("emoji-picker").style.display = "none";
});

$("darkToggle").onclick = () => document.body.classList.toggle("dark");

function handleTyping() {
  if (!isTyping) {
    isTyping = true;
    socket.send(JSON.stringify({ type: "typing", username, room }));
    typingTimeout = setTimeout(() => { isTyping = false }, 3000);
  }
}

function sendMessage() {
  const msg = $("message").value.trim();
  if (!msg) return;

  const encrypted = CryptoJS.AES.encrypt(msg, key).toString();
  socket.send(JSON.stringify({ type: "message", username, room, encrypted }));
  $("message").value = "";
  isTyping = false;
}

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case "message":
      showMessage(data.username, data.encrypted, data.timestamp, data.seenBy || []);
      break;
    case "typing":
      $("typing-status").innerText = `${data.username} is typing...`;
      setTimeout(() => $("typing-status").innerText = "", 2000);
      break;
    case "users":
      $("user-list").innerText = `Users: ${data.users.join(", ")}`;
      break;
    default:
      break;
  }
};

function showMessage(sender, encryptedMsg, timestamp, seenBy) {
  const decrypted = CryptoJS.AES.decrypt(encryptedMsg, key).toString(CryptoJS.enc.Utf8);
  const div = document.createElement("div");
  const time = new Date(timestamp || Date.now()).toLocaleTimeString();
  const isUser = sender === username;

  div.className = `message ${isUser ? "user" : "other"}`;
  div.dataset.meta = `${sender} • ${time} ${isUser ? (seenBy.includes(username) ? "✔✔" : "✔") : ""}`;
  div.innerText = decrypted;
  $("messages").appendChild(div);
  $("messages").scrollTop = $("messages").scrollHeight;

  if (!document.hasFocus()) {
    showNotification(sender, decrypted);
  }

  // Send read receipt
  if (!isUser) {
    socket.send(JSON.stringify({ type: "seen", username, room }));
  }
}

function showNotification(title, body) {
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((perm) => {
      if (perm === "granted") new Notification(title, { body });
    });
  }
}

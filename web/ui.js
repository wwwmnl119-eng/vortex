const socket = io();
const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phone");
const usernameInput = document.getElementById("username");
const addPhoneInput = document.getElementById("addPhone");
const searchInput = document.getElementById("searchInput");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msg");
const meAvatar = document.getElementById("meAvatar");
const meName = document.getElementById("meName");
const mePhone = document.getElementById("mePhone");
const friendAvatar = document.getElementById("friendAvatar");
const friendName = document.getElementById("friendName");
const friendStatus = document.getElementById("friendStatus");
const chatList = document.getElementById("chatList");

let selectedPhone = "";

function getMePhone(){ return localStorage.getItem("phone") || ""; }
function getMeUsername(){ return localStorage.getItem("username") || "User"; }

function syncMe() {
  const phone = getMePhone();
  const username = getMeUsername();
  mePhone.textContent = phone || "-";
  meName.textContent = username;
  meAvatar.textContent = (username || phone || "U").charAt(0).toUpperCase();
}

async function register() {
  if (!document.getElementById("agree").checked) return alert("accept terms");
  const phone = phoneInput.value.trim();
  const username = usernameInput.value.trim();
  const r = await fetch("/register", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ phone, username })
  });
  const j = await r.json();
  if (j.error) return alert(j.error);
  localStorage.setItem("phone", phone);
  localStorage.setItem("username", username || ("User " + phone));
  authScreen.classList.add("hidden");
  syncMe();
  loadContacts();
}

async function addContact() {
  const owner = getMePhone();
  const peer = addPhoneInput.value.trim();
  if (!owner) return alert("register first");
  if (!peer) return alert("enter friend phone");
  const r = await fetch("/contacts/add", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ owner, peer })
  });
  const j = await r.json();
  if (j.error) return alert(j.error);
  addPhoneInput.value = "";
  loadContacts();
}

function renderContacts(users) {
  chatList.innerHTML = "";
  users.forEach(u => {
    const item = document.createElement("div");
    item.className = "chat-item" + (selectedPhone === u.phone ? " active" : "");
    item.innerHTML = `
      <div class="avatar">${(u.avatar || u.phone).charAt(0).toUpperCase()}</div>
      <div>
        <div class="chat-name">${u.username || u.phone}</div>
        <div class="chat-preview">${u.phone}</div>
      </div>
    `;
    item.onclick = () => openChat(u.phone, u.username || u.phone, u.avatar || "?");
    chatList.appendChild(item);
  });
}

async function loadContacts() {
  const owner = getMePhone();
  if (!owner) return;
  const r = await fetch("/contacts/" + encodeURIComponent(owner));
  const users = await r.json();
  const q = searchInput.value.trim().toLowerCase();
  const filtered = q ? users.filter(u =>
    (u.phone || "").toLowerCase().includes(q) ||
    (u.username || "").toLowerCase().includes(q)
  ) : users;
  renderContacts(filtered);
}

async function openChat(phone, label, avatar) {
  selectedPhone = phone;
  friendName.textContent = label;
  friendStatus.textContent = "chat opened";
  friendAvatar.textContent = (avatar || phone).charAt(0).toUpperCase();
  await loadContacts();
  const r = await fetch("/messages/" + encodeURIComponent(getMePhone()) + "/" + encodeURIComponent(phone));
  const data = await r.json();
  messagesEl.innerHTML = "";
  data.forEach(addMsg);
}

function addMsg(m) {
  const div = document.createElement("div");
  div.className = "msg " + (m.from === getMePhone() ? "me" : "other");
  const time = new Date(m.time || Date.now()).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  div.innerHTML = `<div>${m.text}</div><div class="msg-time">${time}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function send() {
  const from = getMePhone();
  const to = selectedPhone;
  const text = msgInput.value.trim();
  if (!from) return alert("register first");
  if (!to) return alert("select a chat");
  if (!text) return;
  socket.emit("message", { from, to, text });
  msgInput.value = "";
}

function logout() {
  localStorage.removeItem("phone");
  localStorage.removeItem("username");
  location.reload();
}

searchInput.addEventListener("input", loadContacts);

socket.on("message", (m) => {
  const me = getMePhone();
  const other = selectedPhone;
  if ((m.from === me && m.to === other) || (m.from === other && m.to === me)) addMsg(m);
});

if (localStorage.getItem("phone")) {
  phoneInput.value = localStorage.getItem("phone");
  usernameInput.value = localStorage.getItem("username") || "";
  authScreen.classList.add("hidden");
  syncMe();
  loadContacts();
}

window.register = register;
window.addContact = addContact;
window.send = send;
window.logout = logout;

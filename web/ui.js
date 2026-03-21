const socket = io();

const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const meAvatar = document.getElementById("meAvatar");
const mePhone = document.getElementById("mePhone");
const findPhoneInput = document.getElementById("findPhoneInput");
const findResult = document.getElementById("findResult");
const chatList = document.getElementById("chatList");
const peerAvatar = document.getElementById("peerAvatar");
const peerName = document.getElementById("peerName");
const peerStatus = document.getElementById("peerStatus");
const messagesEl = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");

let selectedPhone = "";

function getMePhone() {
  return localStorage.getItem("phone") || "";
}
function syncMe() {
  const phone = getMePhone();
  mePhone.textContent = phone || "-";
  meAvatar.textContent = (phone || "U").charAt(0).toUpperCase();
}

async function auth() {
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const r = await fetch("/auth", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ phone, password })
  });
  const j = await r.json();
  if (j.error) return alert(j.error);
  localStorage.setItem("phone", j.user.phone);
  authScreen.classList.add("hidden");
  syncMe();
  await loadContacts();
}

async function findUser() {
  const phone = findPhoneInput.value.trim();
  if (!phone) return;
  const r = await fetch("/users/find/" + encodeURIComponent(phone));
  const j = await r.json();
  if (!r.ok) {
    findResult.textContent = j.error || "not found";
    return;
  }
  findResult.innerHTML = `found: ${j.phone} <button onclick="addFoundContact('${j.phone}')">add</button>`;
}

async function addFoundContact(phone) {
  const owner = getMePhone();
  const r = await fetch("/contacts/add", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ owner, peer: phone })
  });
  const j = await r.json();
  if (j.error) return alert(j.error);
  findResult.textContent = "added";
  await loadContacts();
}

function renderContacts(users) {
  chatList.innerHTML = "";
  users.forEach(u => {
    const item = document.createElement("div");
    item.className = "chat-item" + (selectedPhone === u.phone ? " active" : "");
    item.innerHTML = `
      <div class="avatar">${(u.avatar || u.phone).charAt(0).toUpperCase()}</div>
      <div>
        <div class="chat-name">${u.phone}</div>
        <div class="chat-preview">text chat</div>
      </div>
    `;
    item.onclick = () => openChat(u.phone, u.avatar || "?");
    chatList.appendChild(item);
  });
}

async function loadContacts() {
  const owner = getMePhone();
  if (!owner) return;
  const r = await fetch("/contacts/" + encodeURIComponent(owner));
  const users = await r.json();
  renderContacts(users);
}

async function openChat(phone, avatar) {
  selectedPhone = phone;
  peerName.textContent = phone;
  peerStatus.textContent = "text chat";
  peerAvatar.textContent = (avatar || phone).charAt(0).toUpperCase();

  const r = await fetch("/messages/" + encodeURIComponent(getMePhone()) + "/" + encodeURIComponent(phone));
  const data = await r.json();
  messagesEl.innerHTML = "";
  data.forEach(addMsg);
}

function addMsg(m) {
  const div = document.createElement("div");
  const mine = m.from === getMePhone();
  div.className = "msg " + (mine ? "me" : "other");
  const time = new Date(m.createdAt || m.time || Date.now()).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
  div.innerHTML = `<div>${m.text}</div><div class="msg-time">${time}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendMessage() {
  const from = getMePhone();
  const to = selectedPhone;
  const text = msgInput.value.trim();
  if (!from) return alert("login first");
  if (!to) return alert("select a chat");
  if (!text) return;
  socket.emit("message", { from, to, text });
  msgInput.value = "";
}

function logout() {
  localStorage.removeItem("phone");
  location.reload();
}

socket.on("message", (m) => {
  const me = getMePhone();
  const other = selectedPhone;
  const relevant = (m.from === me && m.to === other) || (m.from === other && m.to === me);
  if (relevant) addMsg(m);
});

if (localStorage.getItem("phone")) {
  authScreen.classList.add("hidden");
  syncMe();
  loadContacts();
}

window.auth = auth;
window.findUser = findUser;
window.addFoundContact = addFoundContact;
window.sendMessage = sendMessage;
window.logout = logout;

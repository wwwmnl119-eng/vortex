const socket = io();

const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const mePhone = document.getElementById("mePhone");
const logoutBtn = document.getElementById("logoutBtn");
const findPhoneInput = document.getElementById("findPhoneInput");
const findBtn = document.getElementById("findBtn");
const findResult = document.getElementById("findResult");
const contactsEl = document.getElementById("contacts");
const chatEl = document.getElementById("chat");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");

let selectedPhone = "";

function getMePhone() {
  return localStorage.getItem("phone") || "";
}
function setMePhone(v) {
  localStorage.setItem("phone", v);
}
function syncHeader() {
  mePhone.textContent = getMePhone() || "not logged";
}

async function auth() {
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const res = await fetch("/auth", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ phone, password })
  });
  const data = await res.json();
  if (data.error) return alert(data.error);

  setMePhone(data.user.phone);
  authScreen.classList.add("hidden");
  syncHeader();
  await loadContacts();
}

async function loadContacts() {
  const me = getMePhone();
  if (!me) return;
  const res = await fetch("/contacts/" + encodeURIComponent(me));
  const data = await res.json();

  contactsEl.innerHTML = "";
  data.forEach(c => {
    const div = document.createElement("div");
    div.className = "contact" + (selectedPhone === c.phone ? " active" : "");
    div.innerHTML = `
      <div class="avatar">${(c.avatar || c.phone).charAt(0).toUpperCase()}</div>
      <div>
        <div class="contact-name">${c.phone}</div>
        <div class="contact-sub">${c.role || "user"}</div>
      </div>
    `;
    div.onclick = () => openChat(c.phone);
    contactsEl.appendChild(div);
  });
}

function addMessage(text, mine) {
  const div = document.createElement("div");
  div.className = "message " + (mine ? "me" : "other");
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

async function openChat(phone) {
  selectedPhone = phone;
  chatEl.innerHTML = "";
  await loadContacts();

  const me = getMePhone();
  const res = await fetch(`/messages/${encodeURIComponent(me)}/${encodeURIComponent(phone)}`);
  const data = await res.json();

  data.forEach(m => addMessage(m.text, m.from === me));
}

async function findUser() {
  const phone = findPhoneInput.value.trim();
  if (!phone) return;
  const res = await fetch("/users/find/" + encodeURIComponent(phone));
  const data = await res.json();

  if (!res.ok) {
    findResult.textContent = data.error || "not found";
    return;
  }

  findResult.innerHTML = `Found: ${data.phone} <button onclick="addFoundContact('${data.phone}')">Add</button>`;
}

async function addFoundContact(phone) {
  const owner = getMePhone();
  const res = await fetch("/contacts/add", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ owner, peer: phone })
  });
  const data = await res.json();
  if (data.error) return alert(data.error);
  findResult.textContent = "added";
  await loadContacts();
}

function sendMessage() {
  const from = getMePhone();
  const to = selectedPhone;
  const text = messageInput.value.trim();

  if (!from) return alert("login first");
  if (!to) return alert("select a contact");
  if (!text) return;

  socket.emit("message", { from, to, text });
  messageInput.value = "";
}

function logout() {
  localStorage.removeItem("phone");
  location.reload();
}

socket.on("message", (m) => {
  const me = getMePhone();
  if (!selectedPhone) return;
  const relevant = (m.from === me && m.to === selectedPhone) || (m.from === selectedPhone && m.to === me);
  if (relevant) addMessage(m.text, m.from === me);
});

authBtn.addEventListener("click", auth);
findBtn.addEventListener("click", findUser);
sendBtn.addEventListener("click", sendMessage);
logoutBtn.addEventListener("click", logout);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

if (localStorage.getItem("phone")) {
  authScreen.classList.add("hidden");
  syncHeader();
  loadContacts();
} else {
  syncHeader();
}

window.addFoundContact = addFoundContact;

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js");
  });
}

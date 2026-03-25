const socket = io();
const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const mePhone = document.getElementById("mePhone");
const settingsPhone = document.getElementById("settingsPhone");
const logoutBtn = document.getElementById("logoutBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const chatSearchInput = document.getElementById("chatSearchInput");
const findPhoneInput = document.getElementById("findPhoneInput");
const findBtn = document.getElementById("findBtn");
const findResult = document.getElementById("findResult");
const chatList = document.getElementById("chatList");
const contactsList = document.getElementById("contactsList");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatHeaderName = document.getElementById("chatHeaderName");
const chatHeaderSub = document.getElementById("chatHeaderSub");
const chatAvatar = document.getElementById("chatAvatar");
let selectedPhone = "";
let contactsCache = [];
let chatsCache = [];
function getMePhone(){ return localStorage.getItem("phone") || ""; }
function setMePhone(v){ localStorage.setItem("phone", v); }
function clearMePhone(){ localStorage.removeItem("phone"); }
function avatarLetter(v){ return String(v || "V").trim().charAt(0).toUpperCase() || "V"; }
function escapeHtml(s){ return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatTime(v){ const d = v ? new Date(v) : new Date(); return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }
function applyTheme(theme){ document.body.classList.toggle("theme-dark", theme === "dark"); themeToggleBtn.textContent = theme === "dark" ? "☀" : "🌙"; localStorage.setItem("theme", theme); }
function toggleTheme(){ applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark"); }
function syncHeader(){ const phone = getMePhone(); mePhone.textContent = phone || "not logged"; settingsPhone.textContent = phone || "not logged"; }
function setTab(tab){ document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab)); document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("active")); document.getElementById("panel" + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add("active"); }
function renderChats(items){
  chatList.innerHTML = "";
  if (!items.length){ chatList.innerHTML = `<div class="settings-card"><div class="small-muted">Пока нет чатов. Добавь контакт во вкладке «Контакты».</div></div>`; return; }
  items.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `<div class="avatar">${avatarLetter(c.avatar || c.phone)}</div><div class="chat-main"><div class="chat-topline"><div class="chat-title">${escapeHtml(c.username || c.phone)}</div><div class="chat-time">${formatTime(c.lastTime)}</div></div><div class="chat-bottomline"><div class="chat-preview">${escapeHtml(c.lastPreview || "Нажми чтобы открыть чат")}</div><div class="chat-badge">${c.unread || Math.max(1, idx + 1)}</div></div></div>`;
    row.onclick = () => openChat(c.phone, c.username || c.phone, c.avatar);
    chatList.appendChild(row);
  });
}
function renderContacts(items){
  contactsList.innerHTML = "";
  if (!items.length){ contactsList.innerHTML = `<div class="settings-card"><div class="small-muted">Контактов пока нет.</div></div>`; return; }
  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "contact-row";
    row.innerHTML = `<div class="avatar">${avatarLetter(c.avatar || c.phone)}</div><div class="contact-main"><div class="contact-title">${escapeHtml(c.username || c.phone)}</div><div class="contact-sub">${escapeHtml(c.role || "user")}</div></div>`;
    row.onclick = () => { setTab("chats"); openChat(c.phone, c.username || c.phone, c.avatar); };
    contactsList.appendChild(row);
  });
}
async function auth(){
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const res = await fetch("/auth", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ phone, password }) });
  const data = await res.json();
  if (data.error) return alert(data.error);
  setMePhone(data.user.phone);
  authScreen.classList.add("hidden");
  syncHeader();
  await loadContacts();
}
async function loadContacts(){
  const me = getMePhone();
  if (!me) return;
  const res = await fetch("/contacts/" + encodeURIComponent(me));
  const data = await res.json();
  contactsCache = Array.isArray(data) ? data : [];
  renderContacts(contactsCache);
  chatsCache = contactsCache.map((c, i) => ({ ...c, unread: i + 1, lastPreview: c.username ? "@" + c.username : "Нажми чтобы открыть чат", lastTime: new Date().toISOString() }));
  renderChats(chatsCache);
}
function addMessageBubble(text, mine, createdAt){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${formatTime(createdAt)}</div>`;
  if (messagesEl.querySelector(".empty-state")) messagesEl.innerHTML = "";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
async function openChat(phone, label, avatar){
  selectedPhone = phone;
  chatHeaderName.textContent = label || phone;
  chatHeaderSub.textContent = "last seen recently";
  chatAvatar.textContent = avatarLetter(avatar || phone);
  messagesEl.innerHTML = "";
  const me = getMePhone();
  const res = await fetch("/messages/" + encodeURIComponent(me) + "/" + encodeURIComponent(phone));
  const data = await res.json();
  (Array.isArray(data) ? data : []).forEach(m => addMessageBubble(m.text, m.from === me, m.createdAt));
}
async function findUser(){
  const phone = findPhoneInput.value.trim();
  if (!phone) return;
  const res = await fetch("/users/find/" + encodeURIComponent(phone));
  const data = await res.json();
  if (!res.ok){ findResult.textContent = data.error || "not found"; return; }
  findResult.innerHTML = `Found: ${escapeHtml(data.phone)} <button onclick="addFoundContact('${data.phone}')">Add</button>`;
}
async function addFoundContact(phone){
  const owner = getMePhone();
  const res = await fetch("/contacts/add", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ owner, peer: phone }) });
  const data = await res.json();
  if (data.error) return alert(data.error);
  findResult.textContent = "added";
  await loadContacts();
}
function sendMessage(){
  const from = getMePhone(), to = selectedPhone, text = messageInput.value.trim();
  if (!from) return alert("login first");
  if (!to) return alert("select a chat");
  if (!text) return;
  socket.emit("message", { from, to, text });
  messageInput.value = "";
}
function logout(){ clearMePhone(); location.reload(); }
socket.on("message", (m) => {
  const me = getMePhone();
  if (!selectedPhone) return;
  const relevant = (m.from === me && m.to === selectedPhone) || (m.from === selectedPhone && m.to === me);
  if (relevant) addMessageBubble(m.text, m.from === me, m.createdAt);
});
authBtn.addEventListener("click", auth);
findBtn.addEventListener("click", findUser);
sendBtn.addEventListener("click", sendMessage);
logoutBtn.addEventListener("click", logout);
themeToggleBtn.addEventListener("click", toggleTheme);
chatSearchInput.addEventListener("input", () => {
  const q = chatSearchInput.value.trim().toLowerCase();
  renderChats(chatsCache.filter(c => String(c.phone || "").toLowerCase().includes(q) || String(c.username || "").toLowerCase().includes(q)));
});
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));
if ("serviceWorker" in navigator){ window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js")); }
applyTheme(localStorage.getItem("theme") || "light");
setTab("chats");
if (localStorage.getItem("phone")){ authScreen.classList.add("hidden"); syncHeader(); loadContacts(); } else { syncHeader(); }
window.addFoundContact = addFoundContact;

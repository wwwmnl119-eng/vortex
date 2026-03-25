const socket = io();
const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const mePhone = document.getElementById("settingsPhone");
const profileAvatar = document.getElementById("profileAvatar");
const profileName = document.getElementById("profileName");
const profilePhone = document.getElementById("profilePhone");
const chatSearchInput = document.getElementById("chatSearchInput");
const findPhoneInput = document.getElementById("findPhoneInput");
const findBtn = document.getElementById("findBtn");
const findResult = document.getElementById("findResult");
const chatList = document.getElementById("chatList");
const contactsList = document.getElementById("contactsList");
const chatView = document.getElementById("chatView");
const chatHeaderName = document.getElementById("chatHeaderName");
const chatHeaderSub = document.getElementById("chatHeaderSub");
const backToChatsBtn = document.getElementById("backToChatsBtn");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const fabOpenContacts = document.getElementById("fabOpenContacts");
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
function setActiveTab(name){ document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name)); document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active")); document.getElementById("tab" + name).classList.add("active"); }
function syncProfile(){ const phone = getMePhone(); mePhone.textContent = phone || "not logged"; profilePhone.textContent = phone || "not logged"; profileName.textContent = phone ? "User " + phone : "Vortex user"; profileAvatar.textContent = avatarLetter(phone); }
function renderChatRows(items){
  chatList.innerHTML = "";
  if (!items.length){ chatList.innerHTML = `<div class="section-pad"><div class="info-text">Пока нет чатов. Открой контакты и добавь пользователя.</div></div>`; return; }
  items.forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `<div class="avatar">${avatarLetter(c.avatar || c.phone)}</div><div class="chat-main"><div class="chat-topline"><div class="chat-title">${escapeHtml(c.username || c.phone)}</div><div class="chat-time">${formatTime(c.lastTime)}</div></div><div class="chat-bottomline"><div class="chat-preview">${escapeHtml(c.lastPreview || "Нажми чтобы открыть чат")}</div><div class="chat-badge">${c.unread || Math.max(1, idx + 1)}</div></div></div>`;
    row.onclick = () => openChat(c.phone, c.username || c.phone);
    chatList.appendChild(row);
  });
}
function renderContacts(items){
  contactsList.innerHTML = "";
  if (!items.length){ contactsList.innerHTML = `<div class="section-pad"><div class="info-text">Контактов пока нет.</div></div>`; return; }
  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "contact-row";
    row.innerHTML = `<div class="avatar">${avatarLetter(c.avatar || c.phone)}</div><div class="contact-main"><div class="contact-title">${escapeHtml(c.username || c.phone)}</div><div class="contact-sub">${escapeHtml(c.role || "user")}</div></div>`;
    row.onclick = () => { setActiveTab("Chats"); openChat(c.phone, c.username || c.phone); };
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
  syncProfile();
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
  renderChatRows(chatsCache);
}
function addMsgBubble(text, mine, createdAt){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${formatTime(createdAt)}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}
async function openChat(phone, label){
  selectedPhone = phone;
  chatHeaderName.textContent = label || phone;
  chatHeaderSub.textContent = "last seen recently";
  chatView.classList.remove("hidden");
  messagesEl.innerHTML = "";
  const me = getMePhone();
  const res = await fetch("/messages/" + encodeURIComponent(me) + "/" + encodeURIComponent(phone));
  const data = await res.json();
  (Array.isArray(data) ? data : []).forEach(m => addMsgBubble(m.text, m.from === me, m.createdAt));
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
  if (relevant) addMsgBubble(m.text, m.from === me, m.createdAt);
});
authBtn.addEventListener("click", auth);
findBtn.addEventListener("click", findUser);
sendBtn.addEventListener("click", sendMessage);
logoutBtn.addEventListener("click", logout);
themeToggleBtn.addEventListener("click", toggleTheme);
backToChatsBtn.addEventListener("click", () => chatView.classList.add("hidden"));
fabOpenContacts.addEventListener("click", () => setActiveTab("Contacts"));
chatSearchInput.addEventListener("input", () => {
  const q = chatSearchInput.value.trim().toLowerCase();
  renderChatRows(chatsCache.filter(c => String(c.phone || "").toLowerCase().includes(q) || String(c.username || "").toLowerCase().includes(q)));
});
document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
applyTheme(localStorage.getItem("theme") || "light");
setActiveTab("Chats");
if (localStorage.getItem("phone")){ authScreen.classList.add("hidden"); syncProfile(); loadContacts(); } else { syncProfile(); }
window.addFoundContact = addFoundContact;

const socket = typeof io !== "undefined" ? io() : null;

const authScreen = document.getElementById("authScreen");
const appShell = document.getElementById("appShell");
const authPhone = document.getElementById("authPhone");
const authPassword = document.getElementById("authPassword");
const authBtn = document.getElementById("authBtn");
const authError = document.getElementById("authError");

const brandPhone = document.getElementById("brandPhone");
const settingsPhone = document.getElementById("settingsPhone");
const searchInput = document.getElementById("searchInput");
const chatList = document.getElementById("chatList");
const contactsList = document.getElementById("contactsList");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatAvatar = document.getElementById("chatAvatar");
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const logoutBtn = document.getElementById("logoutBtn");
const findInput = document.getElementById("findInput");
const findBtn = document.getElementById("findBtn");
const findResult = document.getElementById("findResult");

let me = null;
let currentChatType = null; // user | channel
let currentChatId = null;
let contactsCache = [];
let channelsCache = [];

function saveMe(user){
  localStorage.setItem("vortex_me", JSON.stringify(user));
  me = user;
}
function loadMe(){
  try {
    const raw = localStorage.getItem("vortex_me");
    me = raw ? JSON.parse(raw) : null;
  } catch { me = null; }
}
function clearMe(){
  localStorage.removeItem("vortex_me");
  me = null;
}
function showAuthError(text){
  authError.textContent = text;
  authError.classList.remove("hidden");
}
function hideAuthError(){
  authError.textContent = "";
  authError.classList.add("hidden");
}
function avatarLetter(v){
  return String(v || "V").trim().charAt(0).toUpperCase() || "V";
}
function safeText(v){
  return String(v ?? "").replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}
function timeText(dateStr){
  try{
    const d = new Date(dateStr || Date.now());
    return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
  }catch{ return ""; }
}
function switchTab(name){
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
  const panel = document.getElementById("panel" + name.charAt(0).toUpperCase() + name.slice(1));
  if(panel) panel.classList.add("active");
}
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));

async function auth(){
  hideAuthError();
  const phone = authPhone.value.trim();
  const password = authPassword.value;
  const res = await fetch("/auth", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ phone, password })
  });
  const data = await res.json();
  if(!res.ok || !data.ok){
    showAuthError(data.error || "Ошибка входа");
    return;
  }
  saveMe(data.user);
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  renderMe();
  await Promise.all([loadChannels(), loadContacts()]);
  if (channelsCache.length) openChannel(channelsCache[0].slug, channelsCache[0].title);
}
authBtn.addEventListener("click", auth);
authPassword.addEventListener("keydown", e => { if(e.key === "Enter") auth(); });
authPhone.addEventListener("keydown", e => { if(e.key === "Enter") auth(); });

function renderMe(){
  const phone = me?.phone || "not logged";
  brandPhone.textContent = phone;
  settingsPhone.textContent = phone;
}

function renderMessages(items, mode){
  messagesEl.innerHTML = "";
  if(!items.length){
    messagesEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">Пусто</div>
        <div class="empty-state-text">${mode === "channel" ? "В канале пока нет постов" : "В этом чате пока нет сообщений"}</div>
      </div>`;
    return;
  }

  items.forEach(item => {
    const mine = mode === "user" ? item.from === me.phone : item.createdBy === me.phone;
    const meta = mode === "channel"
      ? `${safeText(item.createdBy || "system")} · ${timeText(item.createdAt)}`
      : timeText(item.createdAt);

    const div = document.createElement("div");
    div.className = "msg " + (mine ? "me" : "other");
    div.innerHTML = `<div>${safeText(item.text)}</div><div class="msg-meta">${meta}</div>`;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function setHeader(title, subtitle, avatar){
  chatTitle.textContent = title;
  chatSubtitle.textContent = subtitle;
  chatAvatar.textContent = avatarLetter(avatar);
}

function renderChatList(filteredContacts = contactsCache, filteredChannels = channelsCache){
  chatList.innerHTML = "";

  filteredChannels.forEach(ch => {
    const row = document.createElement("div");
    row.className = "chat-item" + (currentChatType === "channel" && currentChatId === ch.slug ? " active" : "");
    row.innerHTML = `
      <div class="chat-avatar">V</div>
      <div class="chat-main">
        <div class="chat-top">
          <div class="chat-name">${safeText(ch.title)} <span class="chat-check">✔️</span></div>
          <div class="chat-meta">канал</div>
        </div>
        <div class="chat-preview">${safeText(ch.description || "Официальный канал")}</div>
      </div>`;
    row.addEventListener("click", () => openChannel(ch.slug, ch.title));
    chatList.appendChild(row);
  });

  filteredContacts.forEach(c => {
    const row = document.createElement("div");
    row.className = "chat-item" + (currentChatType === "user" && currentChatId === c.phone ? " active" : "");
    row.innerHTML = `
      <div class="chat-avatar">${safeText(avatarLetter(c.avatar || c.phone))}</div>
      <div class="chat-main">
        <div class="chat-top">
          <div class="chat-name">${safeText(c.username || c.phone)}</div>
          <div class="chat-meta">${safeText(c.role || "user")}</div>
        </div>
        <div class="chat-preview">${safeText(c.phone)}</div>
      </div>`;
    row.addEventListener("click", () => openChat(c.phone, c.username || c.phone, c.avatar || c.phone));
    chatList.appendChild(row);
  });

  if (!filteredChannels.length && !filteredContacts.length){
    chatList.innerHTML = `<div class="panel-card"><div class="settings-value">Чатов пока нет</div></div>`;
  }
}

function renderContacts(){
  contactsList.innerHTML = "";
  if (!contactsCache.length){
    contactsList.innerHTML = `<div class="panel-card"><div class="settings-value">Контактов пока нет</div></div>`;
    return;
  }
  contactsCache.forEach(c => {
    const row = document.createElement("div");
    row.className = "chat-item";
    row.innerHTML = `
      <div class="chat-avatar">${safeText(avatarLetter(c.avatar || c.phone))}</div>
      <div class="chat-main">
        <div class="chat-top">
          <div class="chat-name">${safeText(c.username || c.phone)}</div>
          <div class="chat-meta">${safeText(c.role || "user")}</div>
        </div>
        <div class="chat-preview">${safeText(c.phone)}</div>
      </div>`;
    row.addEventListener("click", () => {
      switchTab("chats");
      openChat(c.phone, c.username || c.phone, c.avatar || c.phone);
    });
    contactsList.appendChild(row);
  });
}

async function loadChannels(){
  const res = await fetch("/channels");
  const data = await res.json();
  channelsCache = Array.isArray(data) ? data : [];
  renderChatList();
}

async function loadContacts(){
  if (!me?.phone) return;
  const res = await fetch("/contacts/" + encodeURIComponent(me.phone));
  const data = await res.json();
  contactsCache = Array.isArray(data) ? data : [];
  renderContacts();
  renderChatList();
}

async function openChat(phone, title, avatar){
  currentChatType = "user";
  currentChatId = phone;
  renderChatList();
  setHeader(title || phone, phone, avatar || phone);

  const res = await fetch(`/messages/${encodeURIComponent(me.phone)}/${encodeURIComponent(phone)}`);
  const data = await res.json();
  renderMessages(Array.isArray(data) ? data : [], "user");
}

async function openChannel(slug, title){
  currentChatType = "channel";
  currentChatId = slug;
  renderChatList();
  setHeader(title || "Vortex Offical", "Официальный канал проекта", "V");

  const res = await fetch("/channel-messages/" + encodeURIComponent(slug));
  const data = await res.json();
  renderMessages(Array.isArray(data) ? data : [], "channel");
}

async function sendMessage(){
  const text = messageInput.value.trim();
  if(!text || !me?.phone || !currentChatId) return;

  if (currentChatType === "channel"){
    const res = await fetch("/admin/channel-send", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ me: me.phone, slug: currentChatId, text })
    });
    const data = await res.json();
    if (!res.ok || !data.ok){
      alert(data.error || "Нет прав на отправку в канал");
      return;
    }
    messageInput.value = "";
    await openChannel(currentChatId, chatTitle.textContent);
    return;
  }

  const res = await fetch("/message", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ from: me.phone, to: currentChatId, text })
  });
  const data = await res.json();
  if (!res.ok || !data.ok){
    alert(data.error || "Ошибка отправки");
    return;
  }
  messageInput.value = "";
  await openChat(currentChatId, chatTitle.textContent, chatAvatar.textContent);
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", e => { if(e.key === "Enter") sendMessage(); });

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  const fc = contactsCache.filter(c => (c.phone || "").toLowerCase().includes(q) || (c.username || "").toLowerCase().includes(q));
  const fch = channelsCache.filter(c => (c.slug || "").toLowerCase().includes(q) || (c.title || "").toLowerCase().includes(q));
  renderChatList(fc, fch);
});

findBtn.addEventListener("click", async () => {
  const phone = findInput.value.trim();
  if (!phone) return;
  findResult.textContent = "Поиск...";
  const res = await fetch("/users/find/" + encodeURIComponent(phone));
  const data = await res.json();
  if (!res.ok){
    findResult.textContent = data.error || "Не найден";
    return;
  }

  findResult.innerHTML = `
    <div class="chat-item">
      <div class="chat-avatar">${safeText(avatarLetter(data.avatar || data.phone))}</div>
      <div class="chat-main">
        <div class="chat-top">
          <div class="chat-name">${safeText(data.username || data.phone)}</div>
          <div class="chat-meta">${safeText(data.role || "user")}</div>
        </div>
        <div class="chat-preview">${safeText(data.phone)}</div>
      </div>
      <button id="addFoundBtn" class="tab-btn active" style="width:auto;padding:0 16px;">Добавить</button>
    </div>
  `;
  document.getElementById("addFoundBtn").addEventListener("click", async () => {
    const addRes = await fetch("/contacts/add", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ owner: me.phone, peer: data.phone })
    });
    const addData = await addRes.json();
    if (!addRes.ok || !addData.ok){
      alert(addData.error || "Не удалось добавить");
      return;
    }
    findInput.value = "";
    findResult.textContent = "Добавлено";
    await loadContacts();
  });
});

logoutBtn.addEventListener("click", () => {
  clearMe();
  location.reload();
});

if (socket){
  socket.on("message", payload => {
    if (currentChatType !== "user" || !currentChatId || !me?.phone) return;
    const relevant = (payload.from === me.phone && payload.to === currentChatId) || (payload.from === currentChatId && payload.to === me.phone);
    if (relevant) openChat(currentChatId, chatTitle.textContent, chatAvatar.textContent);
  });

  socket.on("channel-message", payload => {
    if (currentChatType === "channel" && currentChatId === payload.channelSlug){
      openChannel(currentChatId, chatTitle.textContent);
    }
  });
}

loadMe();
if (me?.phone){
  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
  renderMe();
  Promise.all([loadChannels(), loadContacts()]).then(() => {
    if (channelsCache.length) openChannel(channelsCache[0].slug, channelsCache[0].title);
  });
} else {
  authScreen.classList.remove("hidden");
  appShell.classList.add("hidden");
}

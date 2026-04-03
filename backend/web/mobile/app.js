const socket = io();
const authScreen = document.getElementById("authScreen");
const phoneInput = document.getElementById("phoneInput");
const passwordInput = document.getElementById("passwordInput");
const authBtn = document.getElementById("authBtn");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const logoutBtn = document.getElementById("logoutBtn");
const mePhone = document.getElementById("settingsPhone");
const settingsRole = document.getElementById("settingsRole");
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
const commentsView = document.getElementById("commentsView");
const backFromCommentsBtn = document.getElementById("backFromCommentsBtn");
const commentsHeaderSub = document.getElementById("commentsHeaderSub");
const commentPostCard = document.getElementById("commentPostCard");
const commentsList = document.getElementById("commentsList");
const commentInput = document.getElementById("commentInput");
const commentSendBtn = document.getElementById("commentSendBtn");
let selectedPhone = "";
let selectedChannelSlug = "";
let selectedCommentPostId = "";
let contactsCache = [];
let chatsCache = [];
let channelsCache = [];
function getMePhone(){ return localStorage.getItem("phone") || ""; }
function setMePhone(v){ localStorage.setItem("phone", v); }
function clearMePhone(){ localStorage.removeItem("phone"); localStorage.removeItem("role"); }
function getMeRole(){ return localStorage.getItem("role") || "guest"; }
function setMeRole(v){ localStorage.setItem("role", v || "user"); }
function canPostInChannel(){ return ["delover","admin"].includes(getMeRole()); }
function avatarLetter(v){ return String(v || "V").trim().charAt(0).toUpperCase() || "V"; }
function escapeHtml(s){ return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatTime(v){ const d = v ? new Date(v) : new Date(); return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" }); }
function applyTheme(theme){ document.body.classList.toggle("theme-dark", theme === "dark"); themeToggleBtn.textContent = theme === "dark" ? "☀" : "🌙"; localStorage.setItem("theme", theme); }
function toggleTheme(){ applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark"); }
function setActiveTab(name){ document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.tab === name)); document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active")); document.getElementById("tab" + name).classList.add("active"); }
function syncProfile(){ const phone = getMePhone(); const role = getMeRole(); mePhone.textContent = phone || "not logged"; settingsRole.textContent = "role: " + role; profilePhone.textContent = phone || "not logged"; profileName.textContent = phone ? "User " + phone : "Vortex user"; profileAvatar.textContent = avatarLetter(phone); }
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

function openChannel(slug, title){
  selectedPhone = "";
  selectedChannelSlug = slug;
  chatHeaderName.textContent = title || slug;
  chatHeaderSub.textContent = canPostInChannel() ? "official channel · можно писать" : "official channel · только чтение";
  commentsView.classList.add("hidden");
  chatView.classList.remove("hidden");
  messagesEl.innerHTML = "";
  messageInput.placeholder = "Сообщение";
  messageInput.placeholder = canPostInChannel() ? "Написать в канал" : "Только Delover может писать в канал";
  sendBtn.style.display = "inline-flex";
  sendBtn.disabled = false;
  fetch("/channel-messages/" + encodeURIComponent(slug))
    .then(r => r.json())
    .then(async data => {
      const items = Array.isArray(data) ? data : [];
      for (const m of items) {
        let count = 0;
        try {
          const r = await fetch("/channel-comments/" + encodeURIComponent(m._id));
          const c = await r.json();
          count = Array.isArray(c) ? c.length : 0;
        } catch (_e) {}
        addMsgBubble(m.text, false, m.createdAt, { postId: m._id, commentCount: count, author: m.createdBy || "channel" });
      }
    });
}


function addCommentBubble(text, mine, createdAt, from){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${escapeHtml(from || "")} · ${formatTime(createdAt)}</div>`;
  commentsList.appendChild(div);
  commentsList.scrollTop = commentsList.scrollHeight;
}

async function loadComments(postId){
  commentsList.innerHTML = "";
  const res = await fetch("/channel-comments/" + encodeURIComponent(postId));
  const data = await res.json();
  const me = getMePhone();
  (Array.isArray(data) ? data : []).forEach(m => addCommentBubble(m.text, m.from === me, m.createdAt, m.from));
}

function openComments(postId, postText, author, createdAt){
  selectedCommentPostId = postId;
  commentsHeaderSub.textContent = "Комментарии к посту";
  commentPostCard.innerHTML = `<div>${escapeHtml(postText)}</div><div class="comment-meta">${escapeHtml(author || "channel")} · ${formatTime(createdAt)}</div>`;
  commentsView.classList.remove("hidden");
  loadComments(postId);
}

async function sendComment(){
  const from = getMePhone();
  const text = commentInput.value.trim();
  if (!from) return alert("login first");
  if (!selectedCommentPostId) return alert("post not selected");
  if (!text) return;

  const res = await fetch("/channel-comments/send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ from, postId: selectedCommentPostId, text })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || "send error");
  commentInput.value = "";
  await loadComments(selectedCommentPostId);
}
function renderMixedChats(items, channels){
  chatList.innerHTML = "";
  (channels || []).forEach(ch => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `<div class="avatar">V</div><div class="chat-main"><div class="chat-topline"><div class="chat-title">${escapeHtml(ch.title || ch.slug)}${ch.verified ? " ✔️" : ""}</div><div class="chat-time">PIN</div></div><div class="chat-bottomline"><div class="chat-preview">${escapeHtml(ch.description || "Официальный канал")}</div><div class="chat-badge">•</div></div></div>`;
    row.onclick = () => openChannel(ch.slug, (ch.title || ch.slug) + (ch.verified ? " ✔️" : ""));
    chatList.appendChild(row);
  });
  (items || []).forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `<div class="avatar">${avatarLetter(c.avatar || c.phone)}</div><div class="chat-main"><div class="chat-topline"><div class="chat-title">${escapeHtml(c.username || c.phone)}</div><div class="chat-time">${formatTime(c.lastTime)}</div></div><div class="chat-bottomline"><div class="chat-preview">${escapeHtml(c.lastPreview || "Нажми чтобы открыть чат")}</div><div class="chat-badge">${c.unread || Math.max(1, idx + 1)}</div></div></div>`;
    row.onclick = () => openChat(c.phone, c.username || c.phone);
    chatList.appendChild(row);
  });
  if (!channels?.length && !items?.length){
    chatList.innerHTML = `<div class="section-pad"><div class="info-text">Пока нет чатов. Открой контакты и добавь пользователя.</div></div>`;
  }
}

async function loadChannels(){
  const res = await fetch("/channels");
  const data = await res.json();
  channelsCache = Array.isArray(data) ? data : [];
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
  setMeRole(data.user.role || "user");
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
  await loadChannels();
  renderMixedChats(chatsCache, channelsCache);
}

function addMsgBubble(text, mine, createdAt, options = {}){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  if (options.postId) {
    div.classList.add("post-card");
    const commentCount = Number(options.commentCount || 0);
    div.innerHTML = `<div>${escapeHtml(text)}</div>
      <div class="post-actions">
        <button class="comment-btn" data-post-id="${escapeHtml(options.postId)}">💬 Комментарии${commentCount ? " (" + commentCount + ")" : ""}</button>
        <div class="post-author">${escapeHtml(options.author || "channel")} · ${formatTime(createdAt)}</div>
      </div>`;
    const btn = div.querySelector(".comment-btn");
    btn.onclick = () => openComments(options.postId, text, options.author || "channel", createdAt);
  } else {
    div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${formatTime(createdAt)}</div>`;
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function openChat(phone, label){
  selectedChannelSlug = "";
  selectedPhone = phone;
  chatHeaderName.textContent = label || phone;
  chatHeaderSub.textContent = "last seen recently";
  commentsView.classList.add("hidden");
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
async function sendMessage(){
  const from = getMePhone(), to = selectedPhone, text = messageInput.value.trim();
  if (!from) return alert("login first");
  if (!text) return;
  if (selectedChannelSlug) {
    if (!canPostInChannel()) return alert("В канал может писать только Delover");
    const res = await fetch("/admin/channel-send", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ me: from, slug: selectedChannelSlug, text })
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "send error");
    messageInput.value = "";
    return;
  }
  if (!to) return alert("select a chat");
  socket.emit("message", { from, to, text });
  messageInput.value = "";
}
function logout(){ clearMePhone(); location.reload(); }
socket.on("message", (m) => {
  const me = getMePhone();
  if (!selectedPhone || selectedChannelSlug) return;
  const relevant = (m.from === me && m.to === selectedPhone) || (m.from === selectedPhone && m.to === me);
  if (relevant) addMsgBubble(m.text, m.from === me, m.createdAt);
});

socket.on("channel-message", async (m) => {
  if (!selectedChannelSlug) return;
  if (m.channelSlug === selectedChannelSlug) addMsgBubble(m.text, false, m.createdAt, { postId: m._id, commentCount: 0, author: m.createdBy || "channel" });
});

socket.on("channel-comment", (m) => {
  if (!selectedCommentPostId) return;
  if (m.postId === selectedCommentPostId) addCommentBubble(m.text, m.from === getMePhone(), m.createdAt, m.from);
});
authBtn.addEventListener("click", auth);
findBtn.addEventListener("click", findUser);
sendBtn.addEventListener("click", sendMessage);
commentSendBtn.addEventListener("click", sendComment);
logoutBtn.addEventListener("click", logout);
themeToggleBtn.addEventListener("click", toggleTheme);
backToChatsBtn.addEventListener("click", () => { selectedChannelSlug = ""; chatView.classList.add("hidden"); });
backFromCommentsBtn.addEventListener("click", () => { commentsView.classList.add("hidden"); });
fabOpenContacts.addEventListener("click", () => setActiveTab("Contacts"));
chatSearchInput.addEventListener("input", () => {
  const q = chatSearchInput.value.trim().toLowerCase();
  const filteredChats = chatsCache.filter(c => String(c.phone || "").toLowerCase().includes(q) || String(c.username || "").toLowerCase().includes(q));
  const filteredChannels = channelsCache.filter(c => String(c.slug || "").toLowerCase().includes(q) || String(c.title || "").toLowerCase().includes(q));
  renderMixedChats(filteredChats, filteredChannels);
});
document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setActiveTab(btn.dataset.tab)));
applyTheme(localStorage.getItem("theme") || "light");
setActiveTab("Chats");
if (localStorage.getItem("phone")){ authScreen.classList.add("hidden"); syncProfile(); loadContacts(); } else { syncProfile(); loadChannels().then(() => renderMixedChats([], channelsCache)); }
window.addFoundContact = addFoundContact;

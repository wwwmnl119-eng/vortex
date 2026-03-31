
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
const commentsPanel = document.getElementById("commentsPanel");
const closeCommentsBtn = document.getElementById("closeCommentsBtn");
const commentsSub = document.getElementById("commentsSub");
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
function clearMePhone(){ localStorage.removeItem("phone"); }
function avatarLetter(v){ return String(v || "V").trim().charAt(0).toUpperCase() || "V"; }
function escapeHtml(s){ return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }
function formatTime(v){
  const d = v ? new Date(v) : new Date();
  return d.toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });
}
function applyTheme(theme){
  document.body.classList.toggle("theme-dark", theme === "dark");
  themeToggleBtn.textContent = theme === "dark" ? "☀" : "🌙";
  localStorage.setItem("theme", theme);
}
function toggleTheme(){ applyTheme(document.body.classList.contains("theme-dark") ? "light" : "dark"); }
function syncHeader(){
  const phone = getMePhone();
  mePhone.textContent = phone || "not logged";
  settingsPhone.textContent = phone || "not logged";
}
function setTab(tab){
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".side-panel").forEach(p => p.classList.remove("active"));
  document.getElementById("panel" + tab.charAt(0).toUpperCase() + tab.slice(1)).classList.add("active");
}

async function loadChannels(){
  const res = await fetch("/channels");
  const data = await res.json();
  channelsCache = Array.isArray(data) ? data : [];
}

function renderMixedChats(items, channels){
  chatList.innerHTML = "";
  (channels || []).forEach(ch => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `
      <div class="avatar">V</div>
      <div class="chat-main">
        <div class="chat-topline">
          <div class="channel-title-row">
            <div class="chat-title">${escapeHtml(ch.title || ch.slug)}</div>
            ${ch.verified ? '<div class="verified-mark">✔️</div>' : ''}
          </div>
          <div class="chat-time">now</div>
        </div>
        <div class="chat-bottomline">
          <div class="chat-preview">${escapeHtml(ch.description || "Официальный канал")}</div>
          <div class="chat-badge">•</div>
        </div>
      </div>`;
    row.onclick = () => openChannel(ch.slug, (ch.title || ch.slug) + (ch.verified ? " ✔️" : ""));
    chatList.appendChild(row);
  });

  (items || []).forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "chat-row";
    row.innerHTML = `
      <div class="avatar">${avatarLetter(c.avatar || c.phone)}</div>
      <div class="chat-main">
        <div class="chat-topline">
          <div class="chat-title">${escapeHtml(c.username || c.phone)}</div>
          <div class="chat-time">${formatTime(c.lastTime)}</div>
        </div>
        <div class="chat-bottomline">
          <div class="chat-preview">${escapeHtml(c.lastPreview || "Нажми чтобы открыть чат")}</div>
          <div class="chat-badge">${c.unread || Math.max(1, idx + 1)}</div>
        </div>
      </div>`;
    row.onclick = () => openChat(c.phone, c.username || c.phone, c.avatar);
    chatList.appendChild(row);
  });

  if (!channels?.length && !items?.length){
    chatList.innerHTML = `<div class="settings-card"><div class="small-muted">Пока нет чатов. Добавь контакт во вкладке «Контакты».</div></div>`;
  }
}

function renderContacts(items){
  contactsList.innerHTML = "";
  if (!items.length){
    contactsList.innerHTML = `<div class="settings-card"><div class="small-muted">Контактов пока нет.</div></div>`;
    return;
  }
  items.forEach(c => {
    const row = document.createElement("div");
    row.className = "contact-row";
    row.innerHTML = `
      <div class="avatar">${avatarLetter(c.avatar || c.phone)}</div>
      <div class="contact-main">
        <div class="contact-title">${escapeHtml(c.username || c.phone)}</div>
        <div class="contact-sub">${escapeHtml(c.role || "user")}</div>
      </div>`;
    row.onclick = () => { setTab("chats"); openChat(c.phone, c.username || c.phone, c.avatar); };
    contactsList.appendChild(row);
  });
}

async function auth(){
  const phone = phoneInput.value.trim();
  const password = passwordInput.value;
  const res = await fetch("/auth", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ phone, password })
  });
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
  chatsCache = contactsCache.map((c, i) => ({
    ...c,
    unread: i + 1,
    lastPreview: c.username ? "@" + c.username : "Нажми чтобы открыть чат",
    lastTime: new Date().toISOString()
  }));
  await loadChannels();
  renderMixedChats(chatsCache, channelsCache);
}

function addMessageBubble(text, mine, createdAt, options = {}){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  if (options.postId){
    const commentCount = Number(options.commentCount || 0);
    div.classList.add("post-card");
    div.innerHTML = `
      <div>${escapeHtml(text)}</div>
      <div class="post-actions">
        <button class="comment-btn" data-post-id="${escapeHtml(options.postId)}">💬 Комментарии${commentCount ? " (" + commentCount + ")" : ""}</button>
        <div class="post-author">${escapeHtml(options.author || "channel")} · ${formatTime(createdAt)}</div>
      </div>`;
    div.querySelector(".comment-btn").onclick = () => openComments(options.postId, text, options.author || "channel", createdAt);
  } else {
    div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${formatTime(createdAt)}</div>`;
  }
  if (messagesEl.querySelector(".empty-state")) messagesEl.innerHTML = "";
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addCommentBubble(text, mine, createdAt, from){
  const div = document.createElement("div");
  div.className = "msg " + (mine ? "me" : "other");
  div.innerHTML = `<div>${escapeHtml(text)}</div><div class="msg-time">${escapeHtml(from || "")} · ${formatTime(createdAt)}</div>`;
  commentsList.appendChild(div);
  commentsList.scrollTop = commentsList.scrollHeight;
}

async function openChat(phone, label, avatar){
  selectedPhone = phone;
  selectedChannelSlug = "";
  commentsPanel.classList.add("hidden");
  chatHeaderName.textContent = label || phone;
  chatHeaderSub.textContent = "last seen recently";
  chatAvatar.textContent = avatarLetter(avatar || phone);
  messagesEl.innerHTML = "";
  const me = getMePhone();
  const res = await fetch("/messages/" + encodeURIComponent(me) + "/" + encodeURIComponent(phone));
  const data = await res.json();
  (Array.isArray(data) ? data : []).forEach(m => addMessageBubble(m.text, m.from === me, m.createdAt));
}

async function openChannel(slug, label){
  selectedPhone = "";
  selectedChannelSlug = slug;
  commentsPanel.classList.add("hidden");
  chatHeaderName.textContent = label || slug;
  chatHeaderSub.textContent = "official channel";
  chatAvatar.textContent = "V";
  messagesEl.innerHTML = "";
  const res = await fetch("/channel-messages/" + encodeURIComponent(slug));
  const data = await res.json();
  const items = Array.isArray(data) ? data : [];
  for (const m of items){
    let count = 0;
    try {
      const cr = await fetch("/channel-comments/" + encodeURIComponent(m._id));
      const cd = await cr.json();
      count = Array.isArray(cd) ? cd.length : 0;
    } catch (_e) {}
    addMessageBubble(m.text, false, m.createdAt, { postId: m._id, commentCount: count, author: m.createdBy || "channel" });
  }
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
  commentsSub.textContent = "Обсуждение поста";
  commentPostCard.innerHTML = `<div>${escapeHtml(postText)}</div><div class="comment-meta">${escapeHtml(author || "channel")} · ${formatTime(createdAt)}</div>`;
  commentsPanel.classList.remove("hidden");
  loadComments(postId);
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
  const res = await fetch("/contacts/add", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ owner, peer: phone })
  });
  const data = await res.json();
  if (data.error) return alert(data.error);
  findResult.textContent = "added";
  await loadContacts();
}

function sendMessage(){
  const from = getMePhone(), to = selectedPhone, text = messageInput.value.trim();
  if (!from) return alert("login first");
  if (selectedChannelSlug) return alert("В канал писать нельзя из обычного веб-чата");
  if (!to) return alert("select a chat");
  if (!text) return;
  socket.emit("message", { from, to, text });
  messageInput.value = "";
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

function logout(){ clearMePhone(); location.reload(); }

socket.on("message", (m) => {
  const me = getMePhone();
  if (!selectedPhone || selectedChannelSlug) return;
  const relevant = (m.from === me && m.to === selectedPhone) || (m.from === selectedPhone && m.to === me);
  if (relevant) addMessageBubble(m.text, m.from === me, m.createdAt);
});

socket.on("channel-message", (m) => {
  if (!selectedChannelSlug) return;
  if (m.channelSlug === selectedChannelSlug) addMessageBubble(m.text, false, m.createdAt, { postId: m._id, commentCount: 0, author: m.createdBy || "channel" });
});

socket.on("channel-comment", (m) => {
  if (!selectedCommentPostId) return;
  if (m.postId === selectedCommentPostId) addCommentBubble(m.text, m.from === getMePhone(), m.createdAt, m.from);
});

authBtn.addEventListener("click", auth);
findBtn.addEventListener("click", findUser);
sendBtn.addEventListener("click", sendMessage);
commentSendBtn?.addEventListener("click", sendComment);
closeCommentsBtn?.addEventListener("click", () => commentsPanel.classList.add("hidden"));
logoutBtn.addEventListener("click", logout);
themeToggleBtn.addEventListener("click", toggleTheme);
chatSearchInput.addEventListener("input", () => {
  const q = chatSearchInput.value.trim().toLowerCase();
  const filteredChats = chatsCache.filter(c => String(c.phone || "").toLowerCase().includes(q) || String(c.username || "").toLowerCase().includes(q));
  const filteredChannels = channelsCache.filter(c => String(c.slug || "").toLowerCase().includes(q) || String(c.title || "").toLowerCase().includes(q));
  renderMixedChats(filteredChats, filteredChannels);
});
document.querySelectorAll(".tab-btn").forEach(btn => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

if ("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js"));
}

applyTheme(localStorage.getItem("theme") || "light");
setTab("chats");
if (localStorage.getItem("phone")){
  authScreen.classList.add("hidden");
  syncHeader();
  loadContacts();
} else {
  syncHeader();
  loadChannels().then(() => renderMixedChats([], channelsCache));
}
window.addFoundContact = addFoundContact;

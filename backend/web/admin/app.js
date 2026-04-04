async function loadUsers() {
  const me = document.getElementById("me").value.trim();
  const res = await fetch(`/admin/users?me=${encodeURIComponent(me)}`);
  const data = await res.json();

  const usersDiv = document.getElementById("users");
  usersDiv.innerHTML = "";

  if (!Array.isArray(data)) {
    usersDiv.innerHTML = `<div class="user"><div class="meta">${data.error || "error"}</div></div>`;
    return;
  }

  data.forEach((u) => {
    const el = document.createElement("div");
    el.className = "user";
    el.innerHTML = `
      <div class="meta">
        <div><strong>${u.phone}</strong></div>
        <div>${u.username || "-"}</div>
        <div class="role">role: ${u.role}</div>
      </div>
      <div class="actions">
        <button onclick="setRole('${u.phone}','admin')">admin</button>
        <button onclick="setRole('${u.phone}','delover')">delover</button>
        <button onclick="setRole('${u.phone}','moderator')">mod</button>
        <button onclick="setRole('${u.phone}','beta')">beta</button>
        <button onclick="setRole('${u.phone}','user')">user</button>
      </div>
    `;
    usersDiv.appendChild(el);
  });
}

async function setRole(target, role) {
  const me = document.getElementById("me").value.trim();

  await fetch("/admin/set-role", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ me, target, role })
  });

  loadUsers();
}


async function sendChannelPost() {
  const me = document.getElementById("me").value.trim();
  const text = document.getElementById("channelText").value.trim();
  if (!me || !text) return;
  const res = await fetch("/admin/channel-send", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ me, slug: "vortex-official", text })
  });
  const data = await res.json();
  if (!res.ok) return alert(data.error || "send error");
  document.getElementById("channelText").value = "";
  alert("Пост отправлен");
}

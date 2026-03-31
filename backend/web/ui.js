
// FIX: allow delover/admin to post in channel

function canPostToChannel(user){
  return user && (user.role === "delover" || user.role === "admin");
}

// replace old sendMessage logic
function sendMessage(){
  const from = getMePhone(), to = selectedPhone, text = messageInput.value.trim();
  const me = window.currentUser || {};

  if (!from) return alert("login first");
  if (!text) return;

  if (selectedChannelSlug){
    if (!canPostToChannel(me)){
      return alert("В канал может писать только Delover");
    }

    fetch("/admin/channel-send", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        me: from,
        slug: selectedChannelSlug,
        text
      })
    });

    messageInput.value = "";
    return;
  }

  if (!to) return alert("select a chat");

  socket.emit("message", { from, to, text });
  messageInput.value = "";
}

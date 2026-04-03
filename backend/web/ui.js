
let me = "1234";

async function send(){
  let text = document.getElementById("msg").value;
  await fetch("/admin/channel-send", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({me, slug:"vortex-official", text})
  });
}

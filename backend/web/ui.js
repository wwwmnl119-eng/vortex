
let me = null;
let current = null;

async function login(){
  let phone = phoneInput().value;
  let password = passInput().value;

  let res = await fetch("/auth",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone,password})});
  let data = await res.json();

  if(data.ok){
    me = phone;
    showApp();
    loadContacts();
  } else alert("Ошибка");
}

function phoneInput(){return document.getElementById("phone")}
function passInput(){return document.getElementById("password")}

function showApp(){
  document.getElementById("auth").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
}

async function loadContacts(){
  let res = await fetch("/contacts/"+me);
  let list = await res.json();

  let el = document.getElementById("chatList");
  el.innerHTML = "";

  list.forEach(u=>{
    let div = document.createElement("div");
    div.className="chat-item";
    div.innerText = u.phone;
    div.onclick=()=>openChat(u.phone);
    el.appendChild(div);
  });

  let channel = document.createElement("div");
  channel.className="chat-item";
  channel.innerText="Vortex Offical ✔️";
  channel.onclick=()=>openChannel();
  el.prepend(channel);
}

async function openChat(phone){
  current = phone;
  let res = await fetch("/messages/"+me+"/"+phone);
  let msgs = await res.json();

  let box = document.getElementById("messages");
  box.innerHTML="";
  msgs.forEach(m=>{
    let div=document.createElement("div");
    div.innerText=m.text;
    box.appendChild(div);
  });
}

async function openChannel(){
  current="channel";
  let res = await fetch("/channel-messages/vortex-official");
  let msgs = await res.json();

  let box = document.getElementById("messages");
  box.innerHTML="";
  msgs.forEach(m=>{
    let div=document.createElement("div");
    div.innerText=m.text;
    box.appendChild(div);
  });
}

async function send(){
  let text = document.getElementById("msg").value;

  if(current==="channel"){
    await fetch("/admin/channel-send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({me,slug:"vortex-official",text})});
  }else{
    await fetch("/message",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({from:me,to:current,text})});
  }

  document.getElementById("msg").value="";
}

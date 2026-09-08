let currentConversationId = null;
let currentMode = "";
let pendingImage = null;
const $ = (selector) => document.querySelector(selector);

function showToast(text) {
  const toast = $("#toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function showView(name) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  $(`#${name}-view`).classList.add("active");
  if (name === "history") loadHistory();
  if (name === "home") loadRecent();
}

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

function addBubble(role, content) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${role}`;
  bubble.textContent = content;
  $("#chat-messages").appendChild(bubble);
  bubble.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function speakText(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-MX";
  utterance.rate = 0.98;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

function openChat(conversation) {
  currentConversationId = conversation.id;
  currentMode = "";
  $("#chat-title").textContent = conversation.title || "Conversación";
  $("#chat-messages").innerHTML = "";
  conversation.messages.forEach((message) => addBubble(message.role, message.content));
  showView("chat");
}

async function sendMessage(text, target, mode = "") {
  const message = text.trim();
  if (!message && !pendingImage) return;
  const button = target === "home" ? $("#send-btn") : $("#chat-send");
  const input = target === "home" ? $("#message") : $("#chat-message");
  const imageForRequest = pendingImage;
  button.disabled = true;
  if (target === "home") {
    const title = (message || "Imagen").slice(0, 70);
    $("#chat-title").textContent = title;
    $("#chat-messages").innerHTML = "";
    showView("chat");
  }
  addBubble("user", imageForRequest ? `${message || "Analiza esta imagen"} 📷` : message);
  input.value = "";
  pendingImage = null;
  clearImagePreview();
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, mode, image: imageForRequest, conversation_id: currentConversationId }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "No se pudo enviar");
    currentConversationId = data.conversation_id;
    addBubble("assistant", data.answer);
    speakText(data.answer);
    loadRecent();
  } catch (error) {
    addBubble("assistant", `No pude responder todavía: ${error.message}`);
  } finally {
    button.disabled = false;
    input.focus();
  }
}

$("#send-btn").addEventListener("click", () => sendMessage($("#message").value, "home"));
$("#chat-send").addEventListener("click", () => sendMessage($("#chat-message").value, "chat", currentMode));
$("#speak-btn").addEventListener("click", () => {
  const replies = [...document.querySelectorAll("#chat-messages .bubble.assistant")];
  if (!replies.length) return showToast("Todavía no hay una respuesta para leer");
  speakText(replies[replies.length - 1].textContent);
});
$("#message").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("#send-btn").click(); } });
$("#chat-message").addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); $("#chat-send").click(); } });

document.querySelectorAll(".mode").forEach((button) => {
  button.addEventListener("click", () => {
    currentMode = button.dataset.mode;
    const prompt = currentMode === "calma" ? "Necesito calmarme" : "Necesito ayuda para tomar una decisión";
    sendMessage(prompt, "home", currentMode);
  });
});

$("#daily-btn").addEventListener("click", async () => {
  const response = await fetch("/api/daily", { method: "POST" });
  const data = await response.json();
  showToast(data.message);
});

$("#voice-btn").addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return showToast("El dictado no está disponible en este navegador");
  const recognition = new Recognition();
  recognition.lang = "es-MX";
  recognition.onresult = (event) => { $("#message").value = event.results[0][0].transcript; };
  recognition.start();
});

document.querySelectorAll("[data-shortcut]").forEach((button) => {
  button.addEventListener("click", () => {
    const prompts = { correo: "Ayúdame a redactar un correo", concepto: "Explícame un concepto", semana: "Ayúdame a planificar mi semana" };
    $("#message").value = prompts[button.dataset.shortcut];
    $("#message").focus();
  });
});

function clearImagePreview() {
  $("#image-preview").hidden = true;
  $("#image-preview").innerHTML = "";
}

function handleImage(file) {
  if (!file || !file.type.startsWith("image/")) return showToast("Selecciona una imagen válida");
  if (file.size > 5 * 1024 * 1024) return showToast("La imagen debe pesar menos de 5 MB");
  const reader = new FileReader();
  reader.onload = () => {
    pendingImage = reader.result;
    $("#image-preview").hidden = false;
    $("#image-preview").innerHTML = `<img src="${reader.result}" alt="Imagen adjunta"><button type="button" id="remove-image">×</button>`;
    $("#remove-image").addEventListener("click", () => { pendingImage = null; clearImagePreview(); });
  };
  reader.readAsDataURL(file);
}

$("#image-btn").addEventListener("click", () => $("#image-input").click());
$("#chat-image-btn").addEventListener("click", () => $("#image-input").click());
$("#image-input").addEventListener("change", (event) => handleImage(event.target.files[0]));

$("#login-btn").addEventListener("click", async () => {
  const response = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: $("#login-email").value, password: $("#login-password").value }) });
  const data = await response.json();
  if (!response.ok) return showToast(data.error);
  $("#moderator-status").textContent = data.is_moderator ? "Moderador: acceso autorizado solo para tu cuenta." : "Sesión iniciada sin permisos de moderador.";
  showToast(data.is_moderator ? "Permisos de moderador activados" : "Sesión iniciada");
});
$("#logout-btn").addEventListener("click", async () => { await fetch("/api/logout", { method: "POST" }); $("#moderator-status").textContent = "No has iniciado sesión."; showToast("Sesión cerrada"); });

async function loadRecent() {
  const response = await fetch("/api/conversations");
  const conversations = await response.json();
  $("#conversation-count").textContent = `${conversations.length} conversaciones`;
  const list = $("#recent-list");
  list.innerHTML = "";
  conversations.slice(0, 5).forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "recent-item";
    row.innerHTML = `<span class="recent-icon">◇</span><span class="recent-copy"><div class="recent-title"></div><div class="recent-date">${new Date(conversation.updated_at).toLocaleString("es-MX")}</div></span><span class="status">En curso</span><span>›</span>`;
    row.querySelector(".recent-title").textContent = conversation.title;
    row.addEventListener("click", () => loadConversation(conversation.id));
    list.appendChild(row);
  });
}

async function loadHistory() {
  const response = await fetch("/api/conversations");
  const conversations = await response.json();
  const list = $("#history-list");
  list.innerHTML = conversations.length ? "" : '<div class="empty-card">Aún no tienes conversaciones.</div>';
  conversations.forEach((conversation) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `<strong></strong><small>${conversation.messages} mensajes · ${new Date(conversation.updated_at).toLocaleString("es-MX")}</small>`;
    row.querySelector("strong").textContent = conversation.title;
    row.addEventListener("click", () => loadConversation(conversation.id));
    list.appendChild(row);
  });
}

async function loadConversation(id) {
  const response = await fetch(`/api/conversations/${id}`);
  openChat(await response.json());
}

loadRecent();

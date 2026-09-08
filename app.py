import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request, session

load_dotenv()

BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR / "data" / "conversations.json"
DATA_FILE.parent.mkdir(exist_ok=True)

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "cambia-esta-clave-en-tu-env")
MODERATOR_EMAIL = os.getenv("MODERATOR_EMAIL", "").strip().lower()
MODERATOR_PASSWORD = os.getenv("MODERATOR_PASSWORD", "")

SYSTEM_PROMPT = """Eres Auxia, un asistente de IA cálido, claro y empático. Responde en español informal.
Ayudas a la persona a calmarse, ordenar ideas, tomar decisiones y crear cosas.
No sustituyes a un profesional de salud. Si la persona está en peligro inmediato,
recomienda contactar a emergencias o a alguien de confianza. Sé concreto y no juzgues."""


def read_conversations():
    if not DATA_FILE.exists():
        return []
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def save_conversations(conversations):
    DATA_FILE.write_text(
        json.dumps(conversations, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def local_reply(message, mode):
    """Respuesta de demostración cuando todavía no hay una API configurada."""
    if mode == "calma":
        return (
            "Vamos paso a paso. Inhala por la nariz durante 4 segundos, sostén 2 y "
            "exhala lentamente durante 6. Repite tres veces. Después dime qué es lo "
            "que más te está pesando ahora."
        )
    if mode == "decision":
        return (
            "Podemos ordenar esa decisión sin resolverla toda de golpe. Escribe: "
            "1) qué opciones tienes, 2) qué te importa más y 3) qué riesgo te "
            "preocupa. Con eso comparamos cada camino."
        )
    return (
        "Te leo. Esta versión está funcionando en modo local porque aún no has "
        "configurado una clave de IA. Añade OPENAI_API_KEY en tu archivo .env para "
        "recibir respuestas generadas por un modelo."
    )


def ai_reply(message, history, mode, image_data=None):
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        if image_data:
            return "Recibí tu imagen. Configura OPENAI_API_KEY en .env para que pueda analizarla con visión."
        return local_reply(message, mode)

    base_url = os.getenv("AI_BASE_URL", "https://api.openai.com/v1/chat/completions")
    model = os.getenv("AI_MODEL", "gpt-4o-mini")
    mode_hint = {
        "calma": "Guía un ejercicio breve de regulación emocional.",
        "decision": "Ayuda a ordenar la decisión con preguntas y una comparación clara.",
        "": "Responde de forma útil y concreta.",
    }.get(mode, "Responde de forma útil y concreta.")

    messages = [{"role": "system", "content": SYSTEM_PROMPT + "\n" + mode_hint}]
    for item in history[-12:]:
        messages.append({"role": item["role"], "content": item["content"]})
    current_content = [{"type": "text", "text": message or "Analiza esta imagen."}]
    if image_data:
        current_content.append({"type": "image_url", "image_url": {"url": image_data}})
    messages.append({"role": "user", "content": current_content if image_data else message})

    payload = json.dumps({"model": model, "messages": messages, "temperature": 0.7}).encode()
    req = Request(
        base_url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )
    try:
        with urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return "No pude conectar con el servicio de IA. Revisa tu clave y AI_BASE_URL en el archivo .env."


@app.get("/")
def home():
    return render_template("index.html")


@app.get("/manifest.webmanifest")
def manifest():
    return jsonify(
        {
            "name": "Auxia — Tu asistente de IA",
            "short_name": "Auxia",
            "start_url": "/",
            "display": "standalone",
            "background_color": "#fbfbf8",
            "theme_color": "#2e4435",
            "icons": [],
        }
    )


@app.get("/api/conversations")
def conversations():
    items = read_conversations()
    return jsonify(
        [
            {
                "id": item["id"],
                "title": item["title"],
                "updated_at": item["updated_at"],
                "messages": len(item["messages"]),
            }
            for item in reversed(items)
        ]
    )


@app.get("/api/conversations/<conversation_id>")
def get_conversation(conversation_id):
    item = next((x for x in read_conversations() if x["id"] == conversation_id), None)
    if not item:
        return jsonify({"error": "Conversación no encontrada"}), 404
    return jsonify(item)


@app.post("/api/login")
def login():
    body = request.get_json(silent=True) or {}
    email = str(body.get("email", "")).strip().lower()
    password = str(body.get("password", ""))
    if not email or not password:
        return jsonify({"error": "Escribe correo y contraseña"}), 400
    is_moderator = bool(MODERATOR_EMAIL and MODERATOR_PASSWORD and email == MODERATOR_EMAIL and password == MODERATOR_PASSWORD)
    session["user_email"] = email
    session["is_moderator"] = is_moderator
    return jsonify({"email": email, "is_moderator": is_moderator})


@app.get("/api/me")
def me():
    return jsonify({"email": session.get("user_email"), "is_moderator": bool(session.get("is_moderator"))})


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify({"ok": True})


@app.post("/api/chat")
def chat():
    body = request.get_json(silent=True) or {}
    message = str(body.get("message", "")).strip()
    mode = str(body.get("mode", "")).strip()
    conversation_id = body.get("conversation_id")
    image_data = body.get("image")
    if image_data and (not isinstance(image_data, str) or not image_data.startswith("data:image/") or len(image_data) > 8_000_000):
        return jsonify({"error": "La imagen no es válida o es demasiado grande"}), 400
    if not message and not image_data:
        return jsonify({"error": "Escribe un mensaje o adjunta una imagen"}), 400

    conversations = read_conversations()
    conversation = next((x for x in conversations if x["id"] == conversation_id), None)
    if conversation is None:
        conversation = {
            "id": str(uuid.uuid4()),
            "title": message[:70],
            "created_at": datetime.now().isoformat(timespec="seconds"),
            "updated_at": datetime.now().isoformat(timespec="seconds"),
            "messages": [],
        }
        conversations.append(conversation)

    history = conversation["messages"]
    answer = ai_reply(message, history, mode, image_data)
    saved_text = message or "[Imagen adjunta]"
    history.append({"role": "user", "content": saved_text, "has_image": bool(image_data), "created_at": datetime.now().isoformat(timespec="seconds")})
    history.append({"role": "assistant", "content": answer, "created_at": datetime.now().isoformat(timespec="seconds")})
    conversation["updated_at"] = datetime.now().isoformat(timespec="seconds")
    save_conversations(conversations)
    return jsonify({"conversation_id": conversation["id"], "answer": answer, "has_image": bool(image_data)})


@app.post("/api/daily")
def daily():
    return jsonify({"message": "Respirar también cuenta. ¿Qué pequeña cosa puedes celebrar hoy?"})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=True)

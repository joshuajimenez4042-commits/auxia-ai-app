# Auxia — app de IA programable

Starter sencillo, editable y funcional en **Python + Flask + HTML/CSS/JavaScript**. La interfaz está inspirada en la app que pediste, pero todo el código es tuyo para modificarlo.

## 1. Instalar

Necesitas Python 3.10 o más reciente.

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

## 2. Configurar la IA

Copia `.env.example` con el nombre `.env` y agrega tu clave de API:

```bash
OPENAI_API_KEY=tu_clave
AI_MODEL=gpt-4o-mini
```

La clave se usa únicamente en `app.py`, nunca en el navegador. Si no agregas una clave, la app funciona en modo demo con respuestas locales.

## 3. Ejecutar

```bash
python app.py
```

Abre http://127.0.0.1:5000 en tu navegador. Puedes instalarla desde el menú del navegador porque incluye un manifest de PWA.

## Dónde programar cada cosa

- `app.py`: servidor, respuestas de IA, historial y API.
- `templates/index.html`: estructura de las pantallas.
- `static/style.css`: colores y diseño.
- `static/app.js`: botones, chat, dictado e interacción.
- `data/conversations.json`: historial local, se crea al enviar el primer mensaje.

## Moderador, cámara e imágenes

Solo la cuenta cuyo correo y contraseña coincidan con `MODERATOR_EMAIL` y `MODERATOR_PASSWORD` recibe permisos de moderador. La sesión se guarda en una cookie firmada por Flask; cambia `FLASK_SECRET_KEY` antes de publicar.

El botón **Imagen** abre la cámara en celulares compatibles o el selector de archivos en computadora. Las imágenes se mandan al servidor como datos temporales y, con una clave compatible con visión, la IA puede analizarlas. No se guardan las imágenes en el historial.

## Personalizarla

Busca `SYSTEM_PROMPT` en `app.py` para cambiar la personalidad de la IA. Cambia las variables de color en la primera línea de `style.css` y los textos en `index.html`.

Para usar otro proveedor compatible con la API de Chat Completions, cambia `AI_BASE_URL` y `AI_MODEL` en `.env`.

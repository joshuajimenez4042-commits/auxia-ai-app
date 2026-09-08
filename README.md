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

## 2. Ejecutar sin claves

Auxia funciona de forma local, sin cuentas, claves ni servicios externos. Las respuestas básicas se generan dentro de `app.py`.

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

El botón **Imagen** abre la cámara en celulares compatibles o el selector de archivos en computadora. La imagen se adjunta a la conversación, pero esta versión no hace análisis automático de imágenes porque no depende de servicios externos.

## Personalizarla

Busca `SYSTEM_PROMPT` en `app.py` para cambiar la personalidad de la IA. Cambia las variables de color en la primera línea de `style.css` y los textos en `index.html`.

La app está preparada para que puedas modificar sus respuestas y agregar funciones directamente en el código.

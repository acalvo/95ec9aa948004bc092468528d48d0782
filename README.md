# Práctica de preguntas tipo test

Aplicación web estática para practicar una batería de 256 preguntas tipo test.

- Elige qué preguntas practicar: rangos (`1-128`), listas (`4 18 29 48 199`) o ambos (`1-50, 120, 200-220`).
- Orden secuencial, preguntas aleatorias, o preguntas y respuestas aleatorias.
- Una pregunta cada vez; al pulsar **Enviar**, si aciertas pasa a la siguiente; si fallas, muestra la respuesta correcta y espera a **Siguiente**.
- La cabecera muestra aciertos y fallos; al hacer click en el número de fallos se copia el listado de preguntas falladas.
- Al final: puntuación y opción de repetir las falladas.

Sin dependencias ni build: abre `index.html` en el navegador. Las preguntas están en `preguntas.js`.

El despliegue a GitHub Pages es automático con cada push a `main` (`.github/workflows/pages.yml`).

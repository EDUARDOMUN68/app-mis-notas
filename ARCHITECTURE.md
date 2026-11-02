# Arquitectura

Aplicación estática sin dependencias. `dist/index.html` y `style.css` definen la interfaz; `app.mjs` controla eventos y mensajes; `model.mjs` valida, interpreta entradas y persiste el estado.

Un único registro JSON incluye revisión, tareas con identificadores estables y compositor (texto y categoría). Cada escritura comprueba la revisión anterior y verifica la lectura posterior. Un fallo conserva el estado confirmado en pantalla y muestra un error. Un cambio desde otra pestaña bloquea la edición hasta recargar para evitar sobrescrituras silenciosas. No hay garantía de transacción entre procesos concurrentes de localStorage; se recomienda una sola pestaña.

El historial para Deshacer vive en memoria y guarda un único conjunto anterior de tareas. El borrador de texto persiste con los datos. El service worker cachea solo recursos estáticos y no modifica localStorage. Exportación y restauración utilizan JSON validado.

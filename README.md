# Mis notas

Lista sencilla en español para notas y tareas, organizada en Particular y Trabajo.

[Abrir Mis notas](https://eduardomun68.github.io/app-mis-notas/). Acceso directo, sin iniciar sesión. La primera apertura muestra una lista vacía; cada persona guarda sus propias notas en su navegador.

Cada marca se guarda automáticamente. El botón Añadir incorpora tareas separadas por comas, punto y coma o saltos de línea; `Trabajo: preparar contrato` selecciona esa sección. Las completadas siguen visibles hasta su retirada explícita. Deshacer recupera el último cambio de la lista mientras la pantalla permanezca abierta.

El texto sin añadir se guarda como borrador. Exportar copia descarga la lista y el borrador en JSON. Restaurar copia sustituye la lista tras confirmación y permite deshacer la sustitución de las tareas durante la sesión.

Las notas residen en localStorage del navegador, clave `mis-notas-v1`. No hay sincronización entre dispositivos. Borrar los datos del navegador elimina la lista; conservar una copia exportada. Las correcciones automáticas se limitan a unas pocas erratas conocidas; no se interpreta lenguaje natural ni se incluye dictado propio.

## Recordatorios opcionales

En Fecha y aviso puedes dejar la tarea sin fecha, elegir un día (aviso a las 09:00) o añadir una hora. Se usa la hora del dispositivo al crear el recordatorio y se conserva el instante al exportar. Mantén pulsada una tarea para cambiar o quitar su fecha. Completarla o retirarla cancela el aviso al conectar con el servicio; el receptor también comprueba el estado local para no mostrar tareas completadas.

Abre Avisos del teléfono, pulsa Activar avisos y acepta el permiso. Probar aviso en 1 minuto permite comprobar recepción con la app cerrada. Los avisos requieren conexión; el sistema operativo puede retrasarlos y no sustituyen una alarma exacta. Los errores de programación se muestran sin impedir el guardado local. Tras cambios sin conexión, vuelve a abrir la app con conexión para programarlos.

Servicio independiente en Cloudflare Workers y Durable Objects (`notifications/`), con claves VAPID propias en secretos. El servidor recibe identificadores y horas de las tareas pendientes, suscripción Web Push y revisión del dispositivo, sin el texto ni la categoría. El receptor recupera el texto desde IndexedDB local, comprueba la tarea y evita duplicados. Desactivar avisos borra el registro remoto del dispositivo al conectar. La activación debe hacerse en cada navegador; no viaja en las copias.

Para comprobar el servicio: `npm ci --prefix notifications` y `node --test tests/*.test.mjs notifications/*.test.mjs`. Configurar secretos VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY por un canal privado antes de desplegar con Wrangler. No incluir claves ni suscripciones en el repositorio.

Al cambiar de dirección o dispositivo, usa Exportar copia en el navegador original y Restaurar copia en el destino. El cambio de alojamiento no puede leer automáticamente el almacenamiento de otra dirección.

## Publicación

GitHub Actions comprueba los datos y publica únicamente `dist` en GitHub Pages al actualizar `main`. HTTPS, manifiesto y recursos usan rutas relativas compatibles con el ámbito `/app-mis-notas/`.

## Ejecutar y comprobar

Servir `dist` por HTTP para desarrollo o HTTPS para instalación. No necesita compilación ni dependencias.

```
python -m http.server 8765 --directory dist
node --test tests/*.test.mjs
```

Manifiesto standalone, iconos PNG 192/512 y service worker para acceso sin conexión tras la primera carga. El botón Instalar app aparece cuando Chrome ofrece la instalación. La instalación debe comprobarse en el dispositivo.

Mantén pulsada una tarea para editar su texto; Guardar conserva su sección y marca, y Cancelar deja la tarea intacta. También puedes usar clic derecho o F2 con el foco en su casilla. Un toque normal marca o desmarca; desplazar la lista cancela la pulsación larga.

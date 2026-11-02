# Mis notas

Lista sencilla en español para notas y tareas, organizada en Particular y Trabajo.

[Abrir Mis notas](https://eduardomun68.github.io/app-mis-notas/). Acceso directo, sin iniciar sesión. La primera apertura muestra una lista vacía; cada persona guarda sus propias notas en su navegador.

Cada marca se guarda automáticamente. El botón Añadir incorpora tareas separadas por comas, punto y coma o saltos de línea; `Trabajo: preparar contrato` selecciona esa sección. Las completadas siguen visibles hasta su retirada explícita. Deshacer recupera el último cambio de la lista mientras la pantalla permanezca abierta.

El texto sin añadir se guarda como borrador. Exportar copia descarga la lista y el borrador en JSON. Restaurar copia sustituye la lista tras confirmación y permite deshacer la sustitución de las tareas durante la sesión.

Los datos residen en localStorage del navegador, clave `mis-notas-v1`. No hay sincronización entre dispositivos ni servidor de datos. Borrar los datos del navegador elimina la lista; conservar una copia exportada. Las correcciones automáticas se limitan a unas pocas erratas conocidas; no se interpreta lenguaje natural ni se incluye dictado propio.

Al cambiar de dirección o dispositivo, usa Exportar copia en el navegador original y Restaurar copia en el destino. El cambio de alojamiento no puede leer automáticamente el almacenamiento de otra dirección.

## Publicación

GitHub Actions comprueba los datos y publica únicamente `dist` en GitHub Pages al actualizar `main`. HTTPS, manifiesto y recursos usan rutas relativas compatibles con el ámbito `/app-mis-notas/`.

## Ejecutar y comprobar

Servir `dist` por HTTP para desarrollo o HTTPS para instalación. No necesita compilación ni dependencias.

```
python -m http.server 8765 --directory dist
node --test tests/model.test.mjs
```

Manifiesto standalone, iconos PNG 192/512 y service worker para acceso sin conexión tras la primera carga. El botón Instalar app aparece cuando Chrome ofrece la instalación. La instalación debe comprobarse en el dispositivo.

# Pon arriba los ojos — PWA

App web progresiva (PWA) del tratado devocional *Pon arriba los ojos. La Regla, la Lámpara y el Resto Fiel* (Francisco de Paula Requena Paredes). Un solo paquete estático, sin dependencias, instalable en iOS y Android y funcional sin conexión.

## Contenido embebido
- **Tratado**: 3 Libros, 17 capítulos (I–XVII), **116 lecturas diarias**, cada una con su porción de Regla, su Salmo y su meditación.
- **Regla de San Benito** íntegra (edición Torras y Corominas, Barcelona 1850): Prólogo + 73 capítulos, en **107 porciones diarias**.
- **Glosario** de 38 términos del tratado.

## Funciones
- **Hoy** — resuelve la fecha del dispositivo contra el **ciclo triple** (cada lectura se repasa tres veces al año: enero–abril, mayo–agosto, setiembre–diciembre) y muestra la lectura correcta, indicando en qué de las **tres vueltas** va. Navegación día a día. Si un día no tiene lectura asignada, ofrece la más próxima del ciclo.
- **Lector** — recorrido completo por Tratado (Libro → Capítulo → lecturas), Regla (capítulo a capítulo) y Glosario.
- **Buscar** — texto completo sobre tratado, Regla y glosario, con resaltado.
- **Marcadores** — guardado local de lecturas.
- **Ajustes** — tema claro/oscuro/automático, tamaño de letra, progreso de lecturas leídas, nota sobre la Regla y presentación.
- **Offline + auto-actualización** — *service worker* que cachea todo y actualiza solo al abrir con conexión.

## Archivos
```
index.html              app.js              content.js          sw.js
manifest.json           README.md
icon-192.png  icon-512.png  icon-maskable-512.png  apple-touch-icon.png  favicon-32.png
pelayo.jpg              (Don Pelayo, Covadonga — icono y presentación)
```
Todas las rutas son **relativas** (`./`), por lo que funciona igual en la raíz de un dominio o bajo un subdirectorio de GitHub Pages.

## Despliegue en GitHub Pages
1. Crea un repositorio (p. ej. `Pon_arriba_los_ojos`) y sube **todo el contenido de esta carpeta a la raíz** del repo.
2. En **Settings → Pages**, en *Build and deployment*, elige *Deploy from a branch*, rama `main`, carpeta `/ (root)`. Guarda.
3. A los pocos minutos estará en `https://<usuario>.github.io/Pon_arriba_los_ojos/`.
4. Ábrela en el móvil y usa *Añadir a pantalla de inicio* para instalarla como app.

## Publicar cambios
Al editar contenido o código, sube **una unidad** el número de versión en `sw.js`:
```js
const VERSION = "pon-v2";   // v1 -> v2 -> v3 ...
```
El *service worker* invalidará la caché anterior y los usuarios recibirán la nueva versión automáticamente al abrir la app con conexión.

## Regenerar el contenido desde el .docx
El texto de la app se genera automáticamente desde el documento original con `extract.py`, que produce `content.js`. Si revisas el libro, vuelve a ejecutarlo y sustituye `content.js`.

## Notas
- El «Capítulo IV» duplicado del original (Enero 23–28, texto idéntico) se consolidó en uno solo; no se perdió contenido.
- «Hoy» usa la fecha local del dispositivo; no requiere servidor ni conexión.

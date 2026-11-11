# Mi Rodalies · PWA V1

PWA estática, sin backend ni coste obligatorio. Consulta trayectos mediante `https://trenes.valfiguer.com/api/v1/trayecto`, un servicio independiente gratuito que reutiliza datos abiertos. Tiene dos rutas: **Terrassa Est → Barcelona Plaça de Catalunya** y **Barcelona-Sants → Terrassa Est**. Muestra avisos que la API atribuye a R4.

## Instalación en GitHub Pages

1. Crea un repositorio **público** en github.com, p. ej. `mi-rodalies-r4`.
2. Sube **los archivos de esta carpeta a la raíz del repositorio** (no subas una carpeta contenedora).
3. En **Settings → Pages → Build and deployment**, elige **Deploy from a branch**, rama **main**, carpeta **/(root)** y guarda.
4. Accede a `https://TU_USUARIO.github.io/mi-rodalies-r4/` desde Chrome en Android. Elige **⋮ → Instalar aplicación** o **Añadir a pantalla de inicio**.

## Datos, cautelas y límites

- El acceso gratuito, CORS y endpoint de trayectos se documentan en https://trenes.valfiguer.com/desarrolladores y https://trenes.valfiguer.com/api/openapi.json (consultados el 11/11/2026).
- Los **códigos de estación se resuelven dinámicamente** consultando `/stations`; no se presupone un código determinado.
- El contrato de respuesta del endpoint `/trayecto` se ha implementado con reconocimiento flexible de campos. **No se pudo ejecutar una prueba de extremo a extremo desde el entorno de creación por carecer de acceso de red directo**. Si cambia el esquema o resulta incompatible, la PWA muestra un error, sin inventar salidas. Debe verificarse en la URL HTTPS publicada y adaptarse el parser a una respuesta real si es necesario.
- Los rótulos «Con posición» y «Solo horario» reflejan señales de la fuente, no garantías de paso ni información del panel físico.
- No se consulta la API en segundo plano cuando la página está oculta. La interfaz se puede cargar sin conexión después de instalada; los datos en directo no.
- El servicio de datos pertenece a terceros y su disponibilidad no está garantizada. Atribución CC BY 4.0 incluida en la pantalla principal.
- La lista de resultados, por ahora, depende de los datos de `/trayecto`; no se fabrican trenes u horarios de demostración.

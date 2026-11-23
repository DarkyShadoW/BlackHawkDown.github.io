# Black Hawk Down

> **Mogadiscio · 3 y 4 de octubre de 1993**  
> Juego táctico 3D en tiempo real con pausa táctica para navegador web, desarrollado por **Jesús Navas Aller** (*Épsilon Games Studio*).

---

## 📖 Descripción

**Black Hawk Down** recrea desde una perspectiva táctica a nivel de escuadra las dieciséis horas de la Batalla de Mogadiscio del 3 y 4 de octubre de 1993, inspirado en el libro histórico de Mark Bowden y en la película de Ridley Scott.

El jugador toma el mando de las escuadras de **Rangers (75.º Regimiento)** y los equipos de operadores de la **Fuerza Delta** dentro de una recreación 3D completa de Mogadiscio, su costa y la base de la *Task Force Ranger* en el aeropuerto.

---

## 🎮 Características Principales

- **Campaña Histórica + Tutorial**:
  - **Tutorial**: Instrucción básica de movimiento, cobertura, fuego de supresión y asalto en el campo de entrenamiento junto a la playa.
  - **1 · Operación Irene**: Embarque en la base aérea, vuelo de inserción en formación sobre la ciudad, descenso por cuerda rápida (*fast-rope*) y aseguramiento de las esquinas del edificio objetivo.
  - **2 · Calle Hawlwadig**: Cruce bajo fuego de las avenidas hacia el primer helicóptero derribado.
  - **3 · Super 6-1**: Aproximación a pie de Kilo 1-1 y Romeo 4-1 por rutas distintas hasta el lugar del impacto.
  - **4 · Wolcott**: Defensa del perímetro del Super 6-1 y cobertura de la inserción del equipo MEDEVAC del Super 6-8.
  - **5 · El convoy perdido**: Escolta y defensa de la columna motorizada de McKnight a través de las barricadas al oeste de la rotonda K-4.
  - **6 · Super 6-4**: Inserción y defensa desesperada de Gary Gordon y Randy Shughart junto al helicóptero de Mike Durant.
  - **7 · Héroes (Anochecer)**: Traslado de los heridos bajo fuego y avance nocturno hacia el segundo punto de impacto.
  - **8 · Fuego de mortero**: Combate nocturno con visores NVG, neutralización de morteros y marcaje láser IR en azoteas para los *Little Birds*.
  - **9 · La Milla**: Llegada de la columna blindada de rescate de la ONU/Pakistán, excarcelación y repliegue final a pie hasta el estadio, cerrando con la cinemática de epílogo.
- **Táctica con Pausa Activa y Auto-Pausa**:
  - Planificación de rutas punto a punto o dibujadas a mano sobre el terreno (al estilo *Door Kickers*).
  - **4 formaciones tácticas**: *Columna*, *Punta de flecha*, *Columna escalonada* y *Escalón izquierda*.
  - **Balística, cobertura y destrucción**: Los impactos degradan y derriban progresivamente muros, sacos terreros y parapetos; el fuego de supresión fija al enemigo aunque no tenga línea de tiro limpia.
  - **Combate vertical**: Ocupación de plantas bajas (protección sólida tras muros) y azoteas (tiro por encima de tejados bajos).
  - **Sanitarios y heridos**: Evacuación y estabilización de caídos bajo fuego.
  - **Apoyo aéreo y nocturno**: Pasadas de ametralladora de *AH-6 Little Bird*, bengalas de iluminación nocturna y visores nocturnos (*NVG*).
- **Manual de Campo (FM 93-M) y Mapa Táctico**:
  - Cuaderno manuscrito paginado dinámicamente con bocetos tácticos en SVG.
  - Plano cartográfico interactivo a dos escalas (*Ciudad* y *Región*).
- **Multilenguaje**: Español (idioma nativo) e Inglés completo.

---

## ⌨️ Controles

| Acción | Teclado | Ratón / Pantalla Táctil |
| :--- | :---: | :--- |
| **Pausa táctica** | `Espacio` | Botón **Pausa** en el HUD superior derecho |
| **Seleccionar unidad / grupo** | `1` – `9` | Toque sobre soldado (doble toque o tarjeta selecciona el grupo) |
| **Mover / Encadenar ruta** | `M` | Toque breve sobre el suelo (o mantener pulsado soldado y arrastrar) |
| **Atacar objetivo** | `A` | Toque sobre un enemigo visible |
| **Fuego de supresión** | `S` | Botón **Suprimir** + toque sobre la zona a barrer |
| **Buscar cobertura** | `C` | Botón **Cubrirse** |
| **Alto / Detenerse** | `X` | Botón **Alto** |
| **Atender heridos** | `H` | Botón **Sanitario** |
| **Pasada de Little Bird** | `L` | Menú **Apoyo** → Arrastrar franja de ataque (máx. 100 m) |
| **Bengala (Noche)** | `F` | Menú **Apoyo** → Toque sobre la zona a iluminar |
| **Visor nocturno (Delta)** | `V` | Menú **Apoyo** → **Visor NV** |
| **Mapa táctico** | `N` | Botón **Mapa** |
| **Girar cámara** | `Q` / `E` | Giro con dos dedos o botones `↺` / `↻` |
| **Desplazar cámara / Zoom** | Rueda del ratón | Arrastrar por la pantalla / Pellizcar (*pinch*) o `+` / `−` |
| **Menú de pausa** | `Esc` | Botón `☰` |

---

## 🗂️ Estructura del Proyecto

El proyecto sigue una arquitectura modular estática (**Zero-Build**), diseñada para servirse directamente en **GitHub Pages** sin requerir empaquetadores ni pasos de compilación, facilitando la edición colaborativa sin conflictos en Git:

```text
BlackHawkDown.github.io/
├── index.html                      # Documento HTML principal (~240 líneas) y carga ordenada de scripts
├── css/
│   ├── splash.css                  # Animación y estilos del splash de Épsilon Games Studio
│   └── main.css                    # Estilos del HUD militar, menús, pantallas y manual de campo
├── js/
│   ├── vendor/
│   │   └── three.min.js            # Motor 3D Three.js r128 (MIT)
│   ├── core/
│   │   ├── assets.js               # Cargadores asíncronos de binarios 3D (.bin), texturas y precarga base
│   │   └── config.js               # Constantes de mundo, RNG determinista, presets gráficos y escena Three.js
│   ├── data/
│   │   ├── i18n-en.js              # Diccionario y reglas de traducción al inglés
│   │   ├── manual-sketches.js      # Bocetos tácticos en SVG para el manual de campo
│   │   ├── manual-pages.js         # Capítulos y textos bilingües del manual de campo (FM 93-M)
│   │   └── sfx-meta.js             # Metadatos acústicos de los efectos de sonido (duración, ráfagas, loops)
│   ├── world/
│   │   ├── shaders-materials.js    # Shaders GLSL procedurales y materiales instanciados
│   │   ├── city-gen.js             # Generación por chunks de Mogadiscio, mercados, carreteras, base y mar
│   │   ├── atmosphere.js           # Ciclo solar, sombras, partículas, humo, fuego y luces dinámicas
│   │   └── ambience.js             # Viento en GPU, palmeras, bandadas de pájaros, basura y ropa tendida
│   ├── entities/
│   │   ├── soldiers.js             # Esqueletos articulados, mallas con skinning, armas, IK y batching
│   │   ├── vehicles.js             # UH-60 Black Hawk, MH-6 Little Bird, C-130, Humvee, M939, BTR y Technicals
│   │   └── civilians.js            # Civiles, multitudes y fauna en las calles
│   ├── gameplay/
│   │   ├── pathfinding-los.js      # Pathfinding A*, línea de visión (LOS), coberturas y edificios ocupables
│   │   ├── orders-combat.js        # Órdenes, formaciones, balística, impactos y destrucción estructural
│   │   ├── air-support.js          # Registro de modelos 3D, apoyo aéreo Little Bird, bengalas y visores NV
│   │   └── simulation.js           # Bucle de simulación física/táctica, fatiga, convoyes y cinemáticas
│   ├── audio/
│   │   ├── sound-engine.js         # Motor Web Audio API con espacialización, eco urbano, disparos y motores
│   │   └── music-engine.js         # Banda sonora procedural en Web Audio y streaming de música
│   ├── missions/                   # Misiones separadas en ficheros independientes para edición en paralelo
│   │   ├── m1-irene.js             # Misión 1: Operación Irene (asalto y defensa en tierra)
│   │   ├── m1-flight.js            # Misión 1: Embarque en la base e inserción aérea hasta el objetivo
│   │   ├── m2-hawlwadig.js         # Misión 2: Calle Hawlwadig
│   │   ├── m3-super61.js           # Misión 3: Super 6-1
│   │   ├── m4-wolcott.js           # Misión 4: Wolcott
│   │   ├── m5-lost-convoy.js       # Misión 5: El convoy perdido
│   │   ├── m6-super64.js           # Misión 6: Super 6-4
│   │   ├── m7-nightfall.js         # Misión 7: Héroes (Anochecer)
│   │   ├── m8-mortar.js            # Misión 8: Fuego de mortero
│   │   ├── m9-mile.js              # Misión 9: La Milla y epílogo cinemático
│   │   └── tutorial-attract.js     # Tutorial y combate continuo de fondo en la pantalla de título
│   └── ui/
│       ├── splash.js               # Secuencia audiovisual de arranque del estudio
│       ├── camera-post.js          # Cámara isométrica/táctica y post-procesado (gradación cinematográfica)
│       ├── hud-controls.js         # HUD, radio chat, eventos de entrada y menús de órdenes
│       ├── screens-save.js         # Flujo de pantallas, persistencia en localStorage, opciones y manual
│       ├── tactical-map.js         # Renderizado e interacción del mapa táctico 2D
│       └── main.js                 # Punto de entrada, precarga crítica, resolución dinámica y bucle de render
└── assets/
    ├── images/
    │   ├── splash/                 # Logotipos en formato WebP de la pantalla de inicio
    │   └── ui/                     # Texturas de interfaz y manual de campo
    ├── textures/
    │   ├── terrain/                # Texturas JPEG de arena, detalle de suelo, asfalto e isletas
    │   └── models/                 # 36 atlas de texturas PNG/JPG para modelos 3D
    ├── models/
    │   ├── world/                  # 33 geometrías 3D en formato binario compacto HELI (.bin)
    │   ├── soldiers/               # Mallas binarias con pesos de skinning (militia, ranger, delta)
    │   └── weapons/                # Mallas binarias de armamento y equipo (M16, CAR-15, M249, AK-47, RPG-7, ALICE)
    ├── audio/
    │   ├── music/                  # Pista musical de introducción (streaming bajo demanda)
    │   └── sfx/                    # 36 efectos de sonido en MP3 cargados asíncronamente
    └── video/
        └── finale.{mp4,webm}       # Vídeo de epílogo (descargado bajo demanda solo al completar la campaña)
```

---

## 🚀 Ejecución en Local

Al utilizar peticiones `fetch()` para cargar los binarios 3D, texturas y sonidos, el proyecto debe abrirse a través de un servidor HTTP estático local (no mediante `file://`):

```bash
# Opción 1: Con Python 3 (incluido en Linux/macOS/Windows)
python3 -m http.server 8000

# Opción 2: Con Node.js
npx serve -l 8000
```

Después abre [`http://localhost:8000`](http://localhost:8000) en tu navegador.

---

## 🤝 Guía Rápida para Colaboradores

- **Editar o ajustar una misión existente**: Cada misión se encuentra aislada en su propio fichero dentro de `js/missions/` (`m1-irene.js` a `m9-mile.js` y `tutorial-attract.js`) y se registra en el objeto global `MISSIONS`.
- **Añadir traducciones**: El texto fuente del juego está en español; las cadenas traducidas al inglés se gestionan en `js/data/i18n-en.js`.
- **Modificar el Manual de Campo**: Los capítulos bilingües están en `js/data/manual-pages.js` y las ilustraciones vectoriales en `js/data/manual-sketches.js`.
- **Añadir o reemplazar efectos de sonido**: Coloca el archivo `.mp3` en `assets/audio/sfx/` y ajusta sus puntos de bucle o marcas de tiempo de ráfaga en `js/data/sfx-meta.js`.

---

## 📜 Créditos

- **Creado y desarrollado por**: Jesús Navas Aller (*Épsilon Games Studio*)
- **Versión actual**: Prototipo 0.60
- **Motor 3D**: [Three.js r128](https://threejs.org/) (Licencia MIT)
- **Tipografías**: *Saira Stencil One*, *Barlow Condensed*, *IBM Plex Mono* y *Caveat*

*En recuerdo de los dieciocho soldados estadounidenses, el soldado malasio y los cientos de somalíes que murieron en aquellos dos días.*

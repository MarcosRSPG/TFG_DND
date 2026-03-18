# INFORME DE FLUJOS DE TRABAJO Y REQUISITOS - GRIMLEDGER

## 1. INTRODUCCIÓN

Este documento complementa el informe de requisitos principal, detallando los flujos de trabajo específicos que los usuarios podrán realizar en la plataforma Grimledger, organizados en **3 niveles de implementación progresiva**.

### 1.1 Tipos de Usuarios
- **Jugador (Player)**: Usuario que participa en campañas con un personaje
- **Dungeon Master (DM)**: Usuario que crea y gestiona campañas
- **Usuario Creador**: Cualquier usuario que crea contenido homebrew (monstruos, hechizos, objetos)

### 1.2 Estructura del Documento por Niveles

Este documento organiza los flujos de trabajo en 3 niveles de implementación:

**NIVEL 1 - CREACIÓN Y GESTIÓN DE CONTENIDO (Foundation)**
- Visualización, creación, modificación y eliminación de contenido
- Contenido oficial y homebrew (hechizos, monstruos, objetos, backgrounds)
- Creación y gestión de personajes
- Sistema fundamental antes de funcionalidades multijugador

**NIVEL 2 - CAMPAÑA Y MULTIJUGADOR (Core Gameplay)**
- Creación y gestión de campañas
- Sistema de tiempo real (chat, dados, iniciativas)
- Combate básico con stats y turnos
- Colaboración entre jugadores y DM

**NIVEL 3 - GRID DE BATALLA TÁCTICO (Advanced Features)**
- Mapa de batalla con grid
- Posicionamiento visual de combatientes
- Drag & drop de tokens
- Herramientas de dibujo y medición
- Integración con encuentros pregenerados

---

# NIVEL 1: CREACIÓN Y GESTIÓN DE CONTENIDO

## 2. FLUJOS DE VISUALIZACIÓN Y GESTIÓN DE PERSONAJES

### 2.1 Flujo: Creación de Personaje

#### 2.1.1 Descripción del Flujo
El jugador crea un nuevo personaje desde cero seleccionando raza, clase, trasfondo y configurando sus características.

#### 2.1.2 Pasos del Flujo
1. El jugador accede a la sección "Mis Personajes"
2. Selecciona "Crear Nuevo Personaje"
3. Introduce información básica (nombre, alineamiento)
4. Selecciona raza de la lista disponible (contenido oficial)
5. Si aplica, selecciona subraza
6. Selecciona clase principal
7. Si aplica, selecciona subclase
8. Selecciona un trasfondo (background) de la lista disponible
9. Asigna puntos de características (STR, DEX, CON, INT, WIS, CHA)
10. Selecciona competencias (proficiencies) según clase y trasfondo
11. Selecciona equipo inicial
12. Si es caster, selecciona hechizos conocidos/preparados
13. Añade descripción física y personalidad
14. Guarda el personaje

#### 2.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-PJ-001: El sistema debe validar que las selecciones de raza y clase sean compatibles con las reglas de D&D 5e
- RF-PJ-002: El sistema debe calcular automáticamente los modificadores de características
- RF-PJ-003: El sistema debe aplicar bonificadores raciales a las características
- RF-PJ-004: El sistema debe limitar las competencias según la clase y trasfondo seleccionados
- RF-PJ-005: El sistema debe validar que el equipo inicial no exceda las restricciones de peso o valor inicial
- RF-PJ-006: Para clases con magia, el sistema debe filtrar hechizos disponibles según nivel de personaje y clase
- RF-PJ-007: El personaje debe guardarse en la base de datos asociado al usuario autenticado
- RF-PJ-008: El sistema debe generar automáticamente una ficha de personaje con todos los datos introducidos

**Requisitos de Interfaz:**
- RI-PJ-001: La creación debe seguir un asistente paso a paso (wizard)
- RI-PJ-002: Cada paso debe mostrar información de ayuda relevante de las reglas
- RI-PJ-003: Debe existir navegación entre pasos (anterior/siguiente)
- RI-PJ-004: Los datos deben guardarse temporalmente entre pasos sin confirmar

**Requisitos de Datos:**
- RD-PJ-001: Acceso de solo lectura a razas, subrazas, clases y subclases
- RD-PJ-002: Acceso de solo lectura a backgrounds existentes
- RD-PJ-003: Acceso de lectura a hechizos y objetos iniciales

**Requisitos de Validación:**
- RV-PJ-001: No se puede guardar un personaje sin nombre
- RV-PJ-002: La suma de puntos de características debe seguir el método seleccionado (point buy, standard array, o rolling)
- RV-PJ-003: El número de hechizos conocidos/preparados debe respetar las limitaciones de clase y nivel

---

### 2.2 Flujo: Unirse a una Campaña

#### 2.2.1 Descripción del Flujo
El jugador utiliza un código proporcionado por el DM para unirse a una campaña existente.

#### 2.2.2 Pasos del Flujo
1. El jugador recibe un código de campaña del DM (fuera de la aplicación)
2. Accede a la sección "Campañas"
3. Selecciona "Unirse a Campaña"
4. Introduce el código de campaña
5. El sistema valida el código
6. El jugador visualiza información básica de la campaña
7. Selecciona uno de sus personajes para vincular a la campaña
8. Confirma la unión
9. El sistema lo añade a la campaña

#### 2.2.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-CAMP-001: El sistema debe validar que el código de campaña exista y esté activo
- RF-CAMP-002: El sistema debe impedir que un jugador se una dos veces a la misma campaña
- RF-CAMP-003: El sistema debe permitir que el jugador seleccione solo personajes que no estén ya vinculados a otra campaña
- RF-CAMP-004: El sistema debe notificar al DM cuando un nuevo jugador se une
- RF-CAMP-005: El jugador debe poder ver la lista de campañas en las que participa
- RF-CAMP-006: El jugador debe poder desvincular su personaje de una campaña cerrada

**Requisitos de Interfaz:**
- RI-CAMP-001: El código debe validarse en tiempo real al introducirlo
- RI-CAMP-002: Debe mostrarse información previa de la campaña antes de confirmar
- RI-CAMP-003: Solo deben aparecer personajes disponibles para vincular

**Requisitos de Seguridad:**
- RS-CAMP-001: El código de campaña debe ser único y no predecible
- RS-CAMP-002: El código debe tener una longitud mínima de 6 caracteres alfanuméricos
- RS-CAMP-003: Solo usuarios autenticados pueden unirse a campañas

**Requisitos de Tiempo Real:**
- RTR-CAMP-002: La lista de jugadores de la campaña debe actualizarse en tiempo real para todos los participantes

---

### 2.3 Flujo: Participación en Combate

#### 2.3.1 Descripción del Flujo
Durante una sesión, el DM inicia un combate y el jugador participa introduciendo iniciativa, realizando acciones y lanzando dados.

#### 2.3.2 Pasos del Flujo
1. El DM activa el modo de combate
2. El jugador recibe notificación de inicio de combate
3. El sistema solicita el valor de iniciativa
4. El jugador puede lanzar d20 + modificador de destreza o introducir valor manualmente
5. El sistema ordena la lista de iniciativa automáticamente
6. Cuando llega el turno del jugador:
   - Se resalta visualmente que es su turno
   - Puede lanzar dados de ataque (d20 + modificadores)
   - Puede lanzar dados de daño (según arma/hechizo)
   - Puede realizar tiradas de salvación
   - Puede consultar su ficha de personaje
7. El jugador puede elegir si sus tiradas son visibles para todos o solo para el DM
8. El jugador finaliza su turno
9. El sistema pasa al siguiente combatiente

#### 2.3.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-COMB-001: El sistema debe calcular automáticamente el modificador de iniciativa según la destreza del personaje
- RF-COMB-002: El sistema debe permitir lanzar múltiples tipos de dados (d4, d6, d8, d10, d12, d20, d100)
- RF-COMB-003: El sistema debe aplicar modificadores a las tiradas según los atributos del personaje
- RF-COMB-004: El sistema debe registrar todas las tiradas en un log visible para referencia
- RF-COMB-005: El jugador debe poder ver su ficha completa durante el combate sin salir de la pantalla
- RF-COMB-006: El sistema debe mostrar claramente de quién es el turno actual
- RF-COMB-007: El jugador debe poder modificar (aumentar/reducir) sus puntos de golpe actuales durante el combate
- RF-COMB-008: El sistema debe calcular automáticamente HP máximos desde la ficha del personaje
- RF-COMB-009: El jugador debe poder ver y trackear HP temporales separados de los HP normales
- RF-COMB-010: El sistema debe notificar al jugador cuando sea su turno
- RF-COMB-011: El jugador debe poder aplicarse estados/condiciones (envenenado, aturdido, invisible, etc.)
- RF-COMB-012: Los estados deben mostrarse como iconos visibles sobre el nombre del combatiente
- RF-COMB-013: El jugador debe poder ver descripciones de los estados aplicados (tooltip al hacer hover)
- RF-COMB-014: El sistema debe alertar cuando HP del jugador llegue a 0 o menos (inconsciente/muerte)
- RF-COMB-015: El jugador debe poder trackear death saves si cae a 0 HP
- RF-COMB-016: El jugador debe poder ver estadísticas rápidas de su PJ (AC, velocidad, salvaciones)
- RF-COMB-017: El sistema debe permitir consultar hechizos conocidos y slots disponibles durante el combate
- RF-COMB-018: El jugador debe poder trackear recursos limitados (Ki, Rage, Channel Divinity, etc.)

**Requisitos de Interfaz:**
- RI-COMB-001: La interfaz de combate debe mostrar el orden de iniciativa visible en todo momento
- RI-COMB-002: Debe existir un panel de dados de fácil acceso con botones para cada tipo
- RI-COMB-003: Las tiradas deben mostrarse con animación y resultado claro, diferenciando críticos (nat 20/1)
- RI-COMB-004: El turno actual debe resaltarse visualmente con borde o highlight
- RI-COMB-005: Debe existir un botón de "Finalizar Turno" visible solo durante el turno del jugador
- RI-COMB-006: Los HP actuales/máximos deben mostrarse como barra de progreso con números
- RI-COMB-007: Los HP temporales deben aparecer como capa adicional sobre los HP normales
- RI-COMB-008: debe existir botón rápido +/- para modificar HP sin abrir modal
- RI-COMB-009: Los estados activos deben mostrarse como iconos de estado con tooltips descriptivos
- RI-COMB-010: Debe existir panel colapsable con quick stats del PJ (AC, velocidad, iniciativa, percepción pasiva)
- RI-COMB-011: El panel de ficha debe incluir pestañas: Stats / Hechizos / Inventario / Habilidades
- RI-COMB-012: Si el jugador cae a 0 HP, debe aparecer tracker de death saves (success/failure)
- RI-COMB-013: Los recursos limitados deben mostrarse con checkboxes o círculos rellenables

**Requisitos de Tiempo Real:**
- RTR-COMB-001: Los cambios en el orden de iniciativa deben reflejarse instantáneamente para todos
- RTR-COMB-002: Las tiradas de dados deben aparecer en tiempo real para los usuarios con permisos de visualización
- RTR-COMB-003: El cambio de turno debe notificarse en menos de 500ms
- RTR-COMB-004: El log de combate debe actualizarse en tiempo real para todos los jugadores

**Requisitos de Rendimiento:**
- RP-COMB-001: El sistema debe soportar hasta 5 combatientes simultáneos sin degradación de rendimiento
- RP-COMB-002: Las animaciones de dados no deben bloquear otras acciones
- RP-COMB-003: La actualización de HP debe reflejarse instantáneamente sin delay perceptible

**Requisitos de Estados/Condiciones:**
- REC-COMB-001: Debe soportarse todos los estados oficiales de D&D 5e (cegado, encantado, ensordecido, asustado, agarrado, incapacitado, invisible, paralizado, petrificado, envenenado, derribado, aturdido, inconsciente)
- REC-COMB-002: Cada estado debe tener descripción de efectos mecánicos
- REC-COMB-003: Los estados deben poder tener duración (número de turnos o "hasta final de siguiente turno")
- REC-COMB-004: El sistema debe auto-remover estados cuando expira la duración
- REC-COMB-005: Debe poder aplicarse múltiples estados simultáneamente

**Requisitos de Visualización de Datos del PJ:**
- RVD-COMB-001: El AC (Clase de Armadura) debe mostrarse destacado en la interfaz de combate
- RVD-COMB-002: La velocidad de movimiento debe estar visible (en pies)
- RVD-COMB-003: Los modificadores de atributos deben ser accesibles sin scroll
- RVD-COMB-004: Las salvaciones deben mostrar modificador total (atributo + competencia + otros bonos)
- RVD-COMB-005: Los ataques deben mostrar bonus de ataque y dados de daño calculados
- RVD-COMB-006: Los slots de hechizos deben mostrarse por nivel con indicador de usados/disponibles

---

### 2.4 Flujo: Gestión de Notas en Campaña

#### 2.4.1 Descripción del Flujo
El jugador crea notas privadas sobre la campaña y puede solicitar publicarlas para compartirlas con el grupo.

#### 2.4.2 Pasos del Flujo
1. El jugador accede a la campaña activa
2. Navega a la sección "Notas"
3. Crea una nueva nota (título + contenido)
4. Por defecto, la nota es privada (solo visible para él)
5. Puede editar o eliminar sus notas privadas
6. Si desea compartir una nota:
   - Selecciona la nota
   - Pulsa "Solicitar Publicación"
   - El sistema envía solicitud al DM
7. El jugador recibe notificación cuando el DM aprueba o rechaza
8. Si se aprueba, la nota pasa a ser visible para todo el grupo
9. Las notas públicas ya no pueden editarse por el jugador original

#### 2.4.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-NOTA-001: Las notas deben guardarse con marca de tiempo de creación
- RF-NOTA-002: El sistema debe diferenciar claramente entre notas privadas y públicas
- RF-NOTA-003: Solo las notas privadas pueden editarse o eliminarse por el creador
- RF-NOTA-004: El sistema debe enviar notificación al DM cuando se solicita publicación
- RF-NOTA-005: El sistema debe notificar al jugador cuando su solicitud es procesada
- RF-NOTA-006: Las notas deben soportar formato de texto enriquecido (negrita, cursiva, listas)
- RF-NOTA-007: El DM debe poder ver todas las notas (privadas y públicas)
- RF-NOTA-008: Una vez publicada, la nota debe aparecer en la vista de todos los participantes

**Requisitos de Interfaz:**
- RI-NOTA-002: Debe existir un indicador visual del estado de la solicitud (pendiente/aprobada/rechazada)
- RI-NOTA-004: Las notas deben poder filtrarse por fecha y tipo

**Requisitos de Seguridad:**
- RS-NOTA-001: Un jugador solo puede ver sus propias notas privadas y las notas públicas del grupo
- RS-NOTA-002: Solo el DM puede aprobar o rechazar solicitudes de publicación
- RS-NOTA-003: Las notas deben asociarse al usuario creador y no pueden reasignarse

**Requisitos de Tiempo Real:**
- RTR-NOTA-001: Las notificaciones de aprobación/rechazo deben ser instantáneas
- RTR-NOTA-002: Cuando una nota se publica, debe aparecer inmediatamente en la vista de todos los jugadores conectados

---

### 2.5 Flujo: Visualización de Contenido Existente

#### 2.5.1 Descripción del Flujo
El usuario explora y consulta todo el contenido disponible en la plataforma: razas, subrazas, clases, subclases, hechizos, objetos, monstruos y backgrounds.

#### 2.5.2 Pasos del Flujo
1. El usuario accede al menú principal de "Explorar Contenido"
2. Selecciona una categoría específica:
   - Razas
   - Subrazas
   - Clases
   - Subclases
   - Backgrounds
   - Hechizos
   - Objetos
   - Monstruos
3. El sistema muestra la lista completa con vista de tarjetas o tabla
4. El usuario puede aplicar filtros:
   - **Razas**: Por tamaño, velocidad, rasgos especiales
   - **Clases**: Por dado de golpe, competencias, tipo de magia
   - **Hechizos**: Por nivel, escuela, clase que puede lanzarlo, tiempo de conjuración
   - **Objetos**: Por categoría (armas, armaduras, consumibles), rareza, tipo
   - **Monstruos**: Por CR (Challenge Rating), tipo, tamaño, alineamiento
   - **Backgrounds**: Por competencias otorgadas, origen
5. El usuario puede usar barra de búsqueda para encontrar por nombre
6. Puede filtrar por origen:
   - Contenido oficial (D&D 5e API)
   - Contenido personal (homebrew propio)
   - Contenido de la comunidad (homebrew de otros usuarios)
7. Al hacer clic en un elemento, se abre vista detallada con:
   - Toda la información oficial
   - Estadísticas completas
   - Descripción y lore
   - Si es homebrew: autor y fecha de creación
8. Desde la vista detallada puede:
   - Agregar a favoritos
   - Si es homebrew comunitario: dar like o guardar en biblioteca personal
   - Si es propio: editar o eliminar
   - Exportar a PDF

#### 2.5.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-VIS-001: El sistema debe cargar contenido de forma paginada (20-50 elementos por página)
- RF-VIS-002: Los filtros deben aplicarse sin recargar la página completa
- RF-VIS-003: La búsqueda debe funcionar en tiempo real (debounce de 300ms)
- RF-VIS-004: El sistema debe mostrar contador de resultados tras aplicar filtros
- RF-VIS-005: El contenido oficial debe cargarse desde la API de D&D 5e o desde caché local
- RF-VIS-006: El contenido homebrew debe distinguirse claramente del oficial
- RF-VIS-007: Los filtros activos deben mostrarse como chips/badges removibles
- RF-VIS-008: El usuario debe poder combinar múltiples filtros (AND lógico)
- RF-VIS-009: Debe existir botón "Limpiar filtros" para resetear búsqueda
- RF-VIS-010: El sistema debe recordar los últimos filtros aplicados por el usuario

**Requisitos de Interfaz:**
- RI-VIS-001: Debe existir toggle para cambiar entre vista de tarjetas y vista de lista/tabla
- RI-VIS-002: Las tarjetas deben mostrar información resumida más relevante (nombre, tipo, nivel/CR)
- RI-VIS-003: La vista detallada debe abrirse en modal o panel lateral deslizable
- RI-VIS-004: Los filtros deben estar organizados en panel lateral colapsable
- RI-VIS-005: Debe existir breadcrumb para navegación (Contenido > Hechizos > Bola de Fuego)
- RI-VIS-006: El contenido favorito debe marcarse con icono de estrella o corazón

**Requisitos de Rendimiento:**
- RP-VIS-001: La carga inicial de la lista debe completarse en menos de 2 segundos
- RP-VIS-002: El cambio de filtros debe reflejarse en menos de 500ms
- RP-VIS-003: El scroll infinito o paginación debe ser smooth sin saltos visuales
- RP-VIS-004: Las imágenes de tarjetas deben cargarse con lazy loading

**Requisitos de Datos:**
- RD-VIS-001: El contenido oficial debe cachearse localmente (localStorage o IndexedDB)
- RD-VIS-002: El caché debe actualizarse cada 30 días o cuando hay nueva versión de la API
- RD-VIS-003: El contenido homebrew debe sincronizarse desde la base de datos en tiempo real
- RD-VIS-004: Los favoritos del usuario deben persistirse en su perfil

---

## 3. FLUJOS DE CREACIÓN DE CONTENIDO HOMEBREW

### 3.1 Flujo: Creación de Hechizo Personalizado

#### 3.1.1 Descripción del Flujo
El jugador crea un hechizo personalizado que puede usar en sus personajes y opcionalmente compartir con la comunidad.

#### 3.1.2 Pasos del Flujo
1. El jugador accede a la sección "Hechizos"
2. Selecciona "Crear Hechizo Homebrew"
3. Completa el formulario:
   - Nombre del hechizo
   - Nivel (0-9)
   - Escuela de magia
   - Tiempo de lanzamiento
   - Rango/Alcance
   - Componentes (V, S, M)
   - Duración
   - Descripción del efecto
   - Clases que pueden aprenderlo
4. Puede añadir etiquetas para facilitar búsqueda
5. Elige visibilidad:
   - Solo personal
   - Compartir con la comunidad
6. Guarda el hechizo
7. El hechizo aparece en su lista de contenido homebrew
8. Si tiene personajes caster compatibles, puede añadirlo a sus grimoires

#### 3.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-HB-001: El sistema debe validar que todos los campos obligatorios estén completos
- RF-HB-002: El nivel de hechizo debe estar entre 0 (cantrip) y 9
- RF-HB-003: El usuario debe poder elegir múltiples clases compatibles
- RF-HB-004: Los hechizos homebrew deben poder filtrarse separadamente de los oficiales
- RF-HB-005: El creador debe poder editar o eliminar sus hechizos homebrew
- RF-HB-006: Si un hechizo se elimina, debe desvincularse automáticamente de cualquier personaje que lo tenga
- RF-HB-007: Los hechizos compartidos con la comunidad deben aparecer en las búsquedas con un indicador de "Homebrew"
- RF-HB-008: El sistema debe mostrar el autor del contenido homebrew comunitario

**Requisitos de Interfaz:**
- RI-HB-001: El formulario debe seguir la estructura estándar de los hechizos oficiales para consistencia
- RI-HB-002: Debe existir vista previa del hechizo antes de guardar
- RI-HB-003: Los campos deben incluir tooltips explicando cada propiedad del hechizo
- RI-HB-004: Debe haber templates predefinidos para géneros comunes de hechizos

**Requisitos de Validación:**
- RV-HB-001: El nombre del hechizo no puede estar vacío
- RV-HB-002: La descripción debe tener al menos 50 caracteres
- RV-HB-003: Debe seleccionarse al menos una escuela de magia
- RV-HB-004: Si se incluyen componentes materiales (M), debe especificarse cuáles son

**Requisitos de Datos:**
- RD-HB-001: Los hechizos homebrew deben almacenarse con referencia al usuario creador
- RD-HB-002: Debe registrarse fecha de creación y última modificación
- RD-HB-003: Debe existir flag de visibilidad (personal/comunitario)

---

### 3.2 Flujo: Creación de Monstruo Personalizado

#### 3.2.1 Descripción del Flujo
El usuario (jugador o DM) crea un monstruo personalizado con todas sus estadísticas, acciones y habilidades especiales.

#### 3.2.2 Pasos del Flujo
1. El usuario accede a la sección "Monstruos"
2. Selecciona "Crear Monstruo Homebrew"
3. Completa el formulario dividido en secciones:
   
   **Información Básica:**
   - Nombre del monstruo
   - Tipo (aberración, bestia, celestial, constructo, dragón, elemental, feérico, infernal, humanoide, monstruosidad, cieno, planta, no-muerto)
   - Tamaño (diminuto, pequeño, mediano, grande, enorme, colosal)
   - Alineamiento
   - Imagen o icono
   
   **Estadísticas de Combate:**
   - Challenge Rating (CR) - selector de 0 a 30
   - Puntos de Golpe (fórmula de dados: ej. 8d10+16)
   - Clase de Armadura (AC) y tipo de armadura
   - Velocidades (caminar, volar, nadar, excavar, trepar)
   
   **Atributos:**
   - STR, DEX, CON, INT, WIS, CHA (sliders de 1-30)
   - Sistema calcula automáticamente modificadores
   
   **Competencias y Resistencias:**
   - Salvaciones competentes (lista de checkboxes)
   - Skills competentes (con nivel: competente/experto)
   - Resistencias a daño
   - Inmunidades a daño
   - Inmunidades a condiciones
   - Vulnerabilidades a daño
   
   **Sentidos y Lenguajes:**
   - Percepción pasiva (auto-calculada desde WIS)
   - Visión en la oscuridad (rango en pies)
   - Visión ciega, visión verdadera, etc.
   - Lenguajes que habla y entiende
   
   **Rasgos Especiales:**
   - Lista de rasgos pasivos (nombre + descripción)
   - Ejemplo: "Resistencia Mágica", "Anfibio", "Olfato Agudo"
   
   **Acciones:**
   - Acción Múltiple (si aplica)
   - Lista de ataques (nombre, bonus de ataque, daño, alcance/rango, descripción)
   - Acciones especiales (habilidades que se usan con acción)
   
   **Acciones Legendarias (opcional):**
   - Número de acciones legendarias por turno
   - Lista de opciones de acción legendaria
   
   **Acciones de Guarida (opcional):**
   - Efectos regionales
   - Acciones en iniciativa 20

4. El sistema valida que el CR sea apropiado para las estadísticas (warning si no coincide)
5. Vista previa del statblock completo en formato oficial D&D
6. Elige visibilidad (personal/comunitario)
7. Guarda el monstruo
8. El monstruo aparece en su bestiario personal
9. Si es DM, puede añadirlo directamente a encuentros de combate

#### 3.2.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-MONS-001: El sistema debe calcular automáticamente el CR sugerido basándose en HP, AC, DPR y bonus de ataque
- RF-MONS-002: Debe mostrar warning (no error) si el CR seleccionado difiere del sugerido en más de 2 niveles
- RF-MONS-003: Los modificadores de atributos deben calcularse automáticamente ((valor - 10) / 2)
- RF-MONS-004: Los HP deben poder introducirse como valor fijo o como fórmula de dados
- RF-MONS-005: Si se introduce fórmula de dados, el sistema debe calcular HP promedio
- RF-MONS-006: El bonus de ataque debe poder calcularse automáticamente o introducirse manualmente
- RF-MONS-007: Los ataques deben soportar múltiples tipos de daño (ej: 2d6+4 cortante + 1d6 veneno)
- RF-MONS-008: Debe existir biblioteca de rasgos comunes predefinidos (plantillas)
- RF-MONS-009: El usuario debe poder duplicar monstruos existentes como plantilla
- RF-MONS-010: El statblock generado debe seguir el formato oficial de D&D 5e

**Requisitos de Interfaz:**
- RI-MONS-001: El formulario debe organizarse en pestañas o acordeón para no abrumar
- RI-MONS-002: Debe existir vista previa en vivo del statblock mientras se edita
- RI-MONS-003: Los campos numéricos deben tener spinners (+/-) además de input directo
- RI-MONS-004: Debe existir calculadora de CR integrada con tooltips explicativos
- RI-MONS-005: Los rasgos, acciones y habilidades deben poder reordenarse con drag & drop

**Requisitos de Validación:**
- RV-MONS-001: El nombre del monstruo no puede estar vacío
- RV-MONS-002: Debe seleccionarse tipo y tamaño obligatoriamente
- RV-MONS-003: Los atributos deben estar entre 1 y 30
- RV-MONS-004: Los HP deben ser al menos 1
- RV-MONS-005: Si se incluyen acciones legendarias, debe especificarse el número disponible por turno

**Requisitos de Datos:**
- RD-MONS-001: Los monstruos deben almacenarse en formato compatible con D&D 5e API
- RD-MONS-002: Debe registrarse el creador, fecha de creación y modificación
- RD-MONS-003: Los monstruos comunitarios deben ser de solo lectura para no-creadores

---

### 3.3 Flujo: Creación de Objeto Personalizado

#### 3.3.1 Descripción del Flujo
El usuario crea un objeto personalizado (arma, armadura, objeto mágico, herramienta, o consumible).

#### 3.3.2 Pasos del Flujo
1. Accede a la sección "Objetos"
2. Selecciona "Crear Objeto Homebrew"
3. Selecciona tipo principal de objeto:
   - Arma
   - Armadura
   - Objeto Mágico
   - Herramienta
   - Consumible
   - Equipo Aventurero
4. Según el tipo, completa el formulario específico:

   **Si es Arma:**
   - Nombre
   - Categoría (simple, marcial, exótica)
   - Tipo (cuerpo a cuerpo, a distancia)
   - Daño (dados + tipo de daño)
   - Propiedades (fineza, pesada, ligera, alcance, lanzable, etc.)
   - Alcance (si aplica)
   - Peso y coste
   
   **Si es Armadura:**
   - Nombre
   - Tipo (ligera, media, pesada, escudo)
   - Clase de Armadura base
   - Máximo modificador DEX (si aplica)
   - Requisito de STR (si aplica)
   - Desventaja en Sigilo (sí/no)
   - Peso y coste
   
   **Si es Objeto Mágico:**
   - Nombre
   - Rareza (común, poco común, raro, muy raro, legendario, artefacto)
   - Tipo (poción, pergamino, varita, anillo, arma +X, armadura +X, objeto maravilloso)
   - Requiere sintonización (sí/no)
   - Clases que pueden sintonizarlo (si aplica)
   - Efectos y propiedades mágicas (descripción detallada)
   - Cargas (si aplica) y cómo se recargan
   
   **Si es Consumible:**
   - Nombre
   - Subcategoría (poción, pergamino, munición, comida)
   - Efecto al consumir
   - Duración del efecto
   - Peso y coste
   
   **Para todos:**
   - Descripción lore/flavor
   - Imagen o icono

5. Vista previa del objeto con formato oficial
6. Elige visibilidad (personal/comunitario)
7. Guarda el objeto
8. Aparece en su inventario de objetos homebrew
9. Puede añadirse al inventario de sus personajes

#### 3.3.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-OBJ-001: El formulario debe adaptarse dinámicamente según el tipo de objeto seleccionado
- RF-OBJ-002: Debe existir biblioteca de propiedades de arma predefinidas (del SRD)
- RF-OBJ-003: El sistema debe validar que las propiedades de arma sean compatibles entre sí
- RF-OBJ-004: Los objetos mágicos con cargas deben poder configurar recarga automática
- RF-OBJ-005: Los pergaminos deben poder vincular hechizos existentes del sistema
- RF-OBJ-006: El peso debe poder configurarse en libras (lb) o sistema métrico
- RF-OBJ-007: El coste debe soportar múltiples denominaciones (pp, po, pe, pp, pc)
- RF-OBJ-008: El usuario debe poder duplicar objetos existentes como plantilla
- RF-OBJ-009: Los objetos mágicos deben poder marcarse como "malditos" con descripción de maldición

**Requisitos de Interfaz:**
- RI-OBJ-001: El selector de tipo de objeto debe mostrar iconos representativos
- RI-OBJ-002: Las propiedades de arma deben mostrarse como checkboxes con tooltips explicativos
- RI-OBJ-003: Debe existir vista previa del objeto en formato de ficha
- RI-OBJ-004: Los campos de daño deben tener selector visual de dados

**Requisitos de Validación:**
- RV-OBJ-001: El nombre no puede estar vacío
- RV-OBJ-002: Las armas deben tener al menos un dado de daño especificado
- RV-OBJ-003: Las armaduras deben tener AC válido (10-30)
- RV-OBJ-004: Los objetos mágicos deben tener rareza seleccionada
- RV-OBJ-005: El peso no puede ser negativo

**Requisitos de Datos:**
- RD-OBJ-001: Los objetos deben almacenarse con compatibilidad JSON estándar
- RD-OBJ-002: Debe registrarse creador y timestamps
- RD-OBJ-003: Los objetos en uso por personajes deben mantener referencia al original

---

### 3.4 Flujo: Modificación y Eliminación de Contenido Personalizado

#### 3.4.1 Descripción del Flujo
El usuario modifica o elimina contenido personalizado (monstruos, hechizos u objetos) que ha creado previamente.

#### 3.4.2 Pasos del Flujo

**Para Editar:**
1. El usuario accede a la sección correspondiente (Hechizos/Monstruos/Objetos)
2. Filtra por "Mi Contenido" o "Contenido Personal"
3. Selecciona el elemento que desea editar
4. Hace clic en el botón "Editar" (solo visible si es el creador)
5. Se abre el formulario de edición con los datos actuales
6. Modifica los campos deseados
7. El sistema muestra warning si el elemento está en uso:
   - "Este monstruo está presente en 3 campañas activas"
   - "Este hechizo lo tienen 5 personajes"
   - "Este objeto está en el inventario de 2 personajes"
8. Confirma los cambios
9. El sistema actualiza el elemento
10. Si está compartido con la comunidad, los cambios se propagan a todos los usuarios que lo usan
11. Se envía notificación a usuarios afectados: "[Creador] ha actualizado [Elemento] que estás usando"

**Para Eliminar:**
1. Selecciona el elemento a eliminar
2. Hace clic en "Eliminar"
3. El sistema muestra diálogo de confirmación:
   - Si no está en uso: "¿Seguro que quieres eliminar [Nombre]? Esta acción no se puede deshacer"
   - Si está en uso: "Este elemento está en uso. Al eliminarlo se removerá de: [lista de personajes/campañas]. ¿Continuar?"
4. Usuario debe confirmar escribiendo el nombre del elemento (para prevenir eliminaciones accidentales)
5. El sistema elimina el elemento
6. Se desvincula automáticamente de todos los personajes/campañas que lo usaban
7. Si era comunitario, desaparece de las búsquedas públicas

#### 3.4.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-EDIT-001: Solo el creador original puede editar o eliminar su contenido
- RF-EDIT-002: El contenido oficial (de la API) no puede editarse ni eliminarse
- RF-EDIT-003: Las ediciones deben propagarse automáticamente a todas las referencias
- RF-EDIT-004: El sistema debe rastrear dónde está en uso cada elemento homebrew
- RF-EDIT-005: La eliminación debe ser soft delete (marcar como eliminado) para mantener integridad referencial
- RF-EDIT-006: Si un elemento se elimina, debe reemplazarse por referencia "[Eliminado]" en personajes/campañas
- RF-EDIT-007: Debe mantenerse historial de versiones de elementos compartidos con la comunidad
- RF-EDIT-008: Los usuarios que usan contenido comunitario deben poder "desvincularse" de actualizaciones automáticas creando copia local

**Requisitos de Interfaz:**
- RI-EDIT-001: Los botones de Editar/Eliminar solo deben aparecer para contenido propio
- RI-EDIT-002: El diálogo de eliminación debe ser diferente según esté o no en uso
- RI-EDIT-003: Debe mostrarse badge con número de usos en la vista de detalle
- RI-EDIT-004: El warning de propagación de cambios debe ser claro y destacado

**Requisitos de Seguridad:**
- RS-EDIT-001: Debe validarse en backend que el usuario es el creador antes de permitir edición
- RS-EDIT-002: La confirmación de eliminación debe requerir escribir nombre exacto
- RS-EDIT-003: Elementos en uso por más de 10 entidades requieren doble confirmación

**Requisitos de Notificación:**
- RN-EDIT-001: Los usuarios afectados por cambios deben recibir notificación in-app
- RN-EDIT-002: Las notificaciones deben agruparse si hay múltiples cambios del mismo creador
- RN-EDIT-003: Los usuarios deben poder configurar si reciben estas notificaciones por email

---

### 2.6 Flujo: Subir de Nivel un Personaje

#### 2.6.1 Descripción del Flujo
El jugador incrementa el nivel de su personaje, obteniendo mejoras automáticas (HP, competencia, rasgos de clase) y realizando selecciones cuando hay opciones disponibles (hechizos adicionales, aumentos de atributo, subclase, etc.).

#### 2.6.2 Pasos del Flujo
1. El jugador accede a su personaje desde "Mis Personajes"
2. Hace clic en "Subir de Nivel" (botón visible si el personaje está por debajo del nivel 20)
3. El sistema muestra pantalla de confirmación:
   - Nivel actual → Nivel nuevo
   - Vista previa de mejoras que obtendrá
4. El jugador confirma la subida de nivel
5. El sistema aplica automáticamente las mejoras garantizadas:
   
   **Siempre (todos los niveles):**
   - Incrementa el nivel del personaje en 1
   - Actualiza el bonus de competencia si corresponde (niveles 5, 9, 13, 17)
   - Otorga los rasgos de clase del nuevo nivel (si los hay)
   - Si el nivel es múltiplo de 4 (4, 8, 12, 16, 19): Habilita selector de Ability Score Improvement
   
   **HP (Puntos de Golpe):**
   - Calcula HP adicionales: dado de golpe de clase + modificador de CON
   - Pregunta al jugador: "¿Tirar dado o tomar el promedio?"
     - Si tira: lanza el dado correspondiente (resultado aleatorio)
     - Si toma promedio: asigna valor fijo (dado/2 + 1)
   - Añade el resultado + modificador CON a HP máximos
   
   **Slots de Hechizos (si es caster):**
   - Actualiza automáticamente los slots disponibles según la tabla de progresión de la clase
   - Si obtiene acceso a nuevo nivel de hechizos, lo indica claramente

6. El sistema identifica si hay **selecciones obligatorias** para este nivel:
   
   **Selección de Subclase (niveles 2-3 según clase):**
   - Si alcanza el nivel donde debe elegir subclase:
   - Muestra lista de subclases disponibles para su clase
   - Bloquea el proceso hasta que seleccione una
   - Al seleccionar, aplica los rasgos iniciales de la subclase
   
   **Hechizos Adicionales (clases con hechizos conocidos):**
   - Si la clase aprende hechizos por nivel (Bardo, Hechicero, Ranger, Warlock):
   - Muestra número de hechizos que puede aprender
   - Filtra hechizos disponibles según nivel del personaje y clase
   - El jugador debe seleccionar exactamente el número indicado
   - No puede continuar sin seleccionarlos
   
   **Reemplazo de Hechizos (opcional pero debe decidir):**
   - Si la clase permite reemplazar hechizos conocidos al subir nivel:
   - Pregunta: "¿Deseas reemplazar algún hechizo conocido?"
   - Si sí: muestra lista de hechizos actuales y permite intercambiar uno
   - Si no: continúa sin cambios
   
   **Ability Score Improvement (niveles 4, 8, 12, 16, 19):**
   - Muestra DOS opciones:
     - **Opción A**: Aumentar dos atributos diferentes en +1 cada uno (o el mismo en +2)
     - **Opción B**: Seleccionar un Feat (dote) de la lista disponible
   - Debe elegir obligatoriamente una opción
   - Si elige aumentar atributos:
     - Usa selector con dropdowns o botones +
     - Ningún atributo puede superar 20
     - Debe gastar exactamente 2 puntos
   - Si elige Feat:
     - Muestra lista de Feats con requisitos
     - Filtra los que no cumpla (ej: pre-requisito de atributo mínimo)
     - Al seleccionar, aplica los beneficios del Feat
   
   **Selecciones de Rasgos de Clase (varía según clase):**
   - Ejemplos específicos:
     - **Fighter nivel 3**: Elegir especialización marcial (Arquetipo Marcial)
     - **Warlock**: Elegir nuevas Invocaciones Arcanas según el nivel
     - **Cleric**: Preparar hechizos adicionales del dominio
     - **Rogue nivel 3**: Elegir Arquetipo de Pícaro
   - Cada selección muestra opciones disponibles con descripciones
   - Debe completarse antes de finalizar el level-up

7. Una vez realizadas todas las selecciones obligatorias:
   - El sistema valida que todo esté completo
   - Muestra resumen final de cambios:
     - HP ganados
     - Nuevos rasgos obtenidos
     - Hechizos aprendidos
     - Atributos mejorados / Feat elegido
     - Nuevos slots de hechizos
8. El jugador confirma "Finalizar Subida de Nivel"
9. El sistema guarda todos los cambios
10. Muestra pantalla de celebración: "¡Has alcanzado el nivel [X]!"
11. La ficha del personaje se actualiza con todos los cambios aplicados

#### 2.6.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-LVLUP-001: El sistema debe conocer la progresión completa de todas las clases oficiales según las tablas de D&D 5e
- RF-LVLUP-002: El bonus de competencia debe actualizarse automáticamente: +2 (niveles 1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17-20)
- RF-LVLUP-003: El dado de HP debe poder tirarse con resultado aleatorio real (usando RNG criptográfico)
- RF-LVLUP-004: Si el jugador elige tirar HP y obtiene resultado muy bajo, debe poder optar por re-tirar una vez (opcional, configurable por DM)
- RF-LVLUP-005: Los HP máximos deben recalcularse si el modificador de CON cambia retroactivamente
- RF-LVLUP-006: El sistema debe bloquear la finalización del level-up si hay selecciones obligatorias pendientes
- RF-LVLUP-007: Debe mostrarse indicador visual de "X selecciones pendientes" en todo momento
- RF-LVLUP-008: Los hechizos disponibles para aprender deben filtrarse por nivel de hechizo accesible y clase
- RF-LVLUP-009: Al aprender hechizos, no debe poder seleccionarse el mismo hechizo dos veces
- RF-LVLUP-010: Los Feats deben validar pre-requisitos antes de permitir selección
- RF-LVLUP-011: Si un Feat otorga aumento de atributo, debe aplicarse inmediatamente
- RF-LVLUP-012: Los cambios en atributos deben recalcular todas las estadísticas dependientes (salvaciones, CA si aplica, modificadores de ataque, etc.)
- RF-LVLUP-013: El sistema debe permitir "deshacer" el level-up si no se ha finalizado (botón "Cancelar")
- RF-LVLUP-014: Una vez finalizado, el nivel anterior debe guardarse en el historial del personaje
- RF-LVLUP-015: Para multiclase (si se soporta), debe permitir elegir en qué clase subir de nivel

**Requisitos de Interfaz:**
- RI-LVLUP-001: El proceso debe seguir un wizard/asistente paso a paso claramente numerado
- RI-LVLUP-002: Cada paso debe tener título descriptivo: "Paso 1: HP", "Paso 2: Hechizos", etc.
- RI-LVLUP-003: Debe existir barra de progreso mostrando pasos completados vs pendientes
- RI-LVLUP-004: Las selecciones obligatorias deben marcarse con asterisco rojo o badge "OBLIGATORIO"
- RI-LVLUP-005: Las mejoras automáticas deben mostrarse en panel resumen lateral siempre visible
- RI-LVLUP-006: Los botones "Siguiente" deben deshabilitarse si faltan selecciones obligatorias del paso actual
- RI-LVLUP-007: Debe existir botón "Anterior" para revisar selecciones previas antes de confirmar
- RI-LVLUP-008: Los hechizos disponibles para aprender deben mostrarse como tarjetas con información resumida
- RI-LVLUP-009: Los Feats deben mostrarse con descripción completa y beneficios listados
- RI-LVLUP-010: La pantalla de resumen final debe usar checkmarks verdes para indicar qué se obtuvo
- RI-LVLUP-011: El selector de Ability Score debe mostrar valores actuales y nuevos lado a lado
- RI-LVLUP-012: Debe mostrar claramente cuántos puntos le quedan por gastar en la selección actual

**Requisitos de Validación:**
- RV-LVLUP-001: No se puede subir de nivel por encima de 20
- RV-LVLUP-002: Los atributos no pueden superar 20 (salvo efectos mágicos especiales)
- RV-LVLUP-003: Debe seleccionarse exactamente el número de hechizos indicado (no más, no menos)
- RV-LVLUP-004: Si hay selector de ASI, deben gastarse exactamente 2 puntos
- RV-LVLUP-005: No puede finalizarse el level-up con selecciones obligatorias sin completar
- RV-LVLUP-006: Los hechizos de reemplazo deben ser del mismo nivel o inferior que el reemplazado
- RV-LVLUP-007: Si se elige un Feat con pre-requisito, debe validarse que se cumple

**Requisitos de Cálculo:**
- RC-LVLUP-001: HP promedio debe calcularse como: (dado_clase / 2) + 1 + modificador_CON
- RC-LVLUP-002: HP por tirada debe calcularse como: resultado_dado + modificador_CON (mínimo 1 HP total)
- RC-LVLUP-003: El modificador de competencia debe ser: (nivel - 1) / 4 (redondeado hacia abajo) + 2
- RC-LVLUP-004: Los slots de hechizos deben seguir las tablas oficiales de spell progression por clase
- RC-LVLUP-005: Si hay multiclase, los slots de hechizos deben calcularse según caster level combinado

**Requisitos de Datos:**
- RD-LVLUP-001: Debe almacenarse historial completo de level-ups (qué se eligió en cada nivel)
- RD-LVLUP-002: Las tiradas de HP deben guardarse individuales para auditoría
- RD-LVLUP-003: Los cambios en atributos deben trazarse (nivel X: STR 14→16)
- RD-LVLUP-004: Los Feats adquiridos deben registrarse con el nivel en que se obtuvieron
- RD-LVLUP-005: La progresión de hechizos conocidos debe mantenerse por nivel

**Requisitos Especiales por Clase:**
- RCL-LVLUP-001: **Clérigos y Druidas** (preparadores de hechizos): actualizar número de hechizos que pueden preparar
- RCL-LVLUP-002: **Paladines y Rangers**: otorgar hechizos solo a partir de ciertos niveles (Paladín: 2, Ranger: 2)
- RCL-LVLUP-003: **Warlocks**: actualizar número de invocaciones conocidas según tabla
- RCL-LVLUP-004: **Monks**: actualizar puntos de Ki (igual al nivel de monje)
- RCL-LVLUP-005: **Bardos**: actualizar Inspiration Dice según nivel
- RCL-LVLUP-006: **Sorcerers**: otorgar Sorcery Points adicionales (igual al nivel de hechicero)
- RCL-LVLUP-007: **Fighters**: verificar Action Surge y Extra Attacks en niveles específicos
- RCL-LVLUP-008: **Wizards**: permitir agregar 2 hechizos al grimorio automáticamente (gratis) por nivel

**Requisitos de Experiencia:**
- RXP-LVLUP-001: Opcionalmente, el sistema puede trackear XP y sugerir subida de nivel cuando se alcanza el umbral
- RXP-LVLUP-002: Debe mostrarse XP actual y XP necesario para siguiente nivel
- RXP-LVLUP-003: Si el DM usa milestone leveling, debe poder habilitar level-up manualmente sin XP

---

# NIVEL 2: CAMPAÑAS Y MULTIJUGADOR

## 4. FLUJOS DE GESTIÓN DE CAMPAÑAS

### 4.1 Flujo: Creación de Campaña

#### 4.1.1 Descripción del Flujo
El DM crea una nueva campaña, configura sus parámetros y recibe un código para invitar jugadores.

#### 4.1.2 Pasos del Flujo
1. El DM accede a "Mis Campañas"
2. Selecciona "Crear Nueva Campaña"
3. Introduce información de la campaña:
   - Nombre de la campaña
   - Descripción/sinopsis
   - Ambientación
   - Nivel inicial de los personajes
   - Configuración de reglas (opcionales/homebrew)
4. Configura opciones de privacidad y gestión
5. Guarda la campaña
6. El sistema genera un código único de 8 caracteres
7. El DM puede copiar y compartir el código con jugadores
8. La campaña aparece en su lista como "Campaña Creada"

#### 4.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-DM-001: El sistema debe generar un código único, alfanumérico y no predecible
- RF-DM-002: El código debe validarse para evitar duplicados
- RF-DM-003: El DM debe poder editar la información de la campaña después de crearla
- RF-DM-004: El DM debe poder ver estadísticas de la campaña (número de jugadores, sesiones realizadas)
- RF-DM-005: El DM debe poder archivar o eliminar campañas
- RF-DM-006: Al eliminar una campaña, se debe notificar a todos los jugadores
- RF-DM-007: El DM debe poder regenerar el código si se ha compartido inadecuadamente
- RF-DM-008: El sistema debe permitir múltiples campañas activas por DM

**Requisitos de Interfaz:**
- RI-DM-001: Debe existir un botón destacado para copiar el código al portapapeles
- RI-DM-002: La interfaz debe mostrar claramente qué campañas están activas y cuáles archivadas
- RI-DM-003: Debe existir un panel de control (dashboard) con resumen de cada campaña

**Requisitos de Seguridad:**
- RS-DM-001: Solo el creador original puede ser DM de la campaña
- RS-DM-002: El código no debe ser visible públicamente, solo compartible manualmente
- RS-DM-003: Al regenerar código, el anterior debe invalidarse inmediatamente

**Requisitos de Datos:**
- RD-DM-001: La campaña debe almacenar referencia al DM creador
- RD-DM-002: Debe registrarse fecha de creación
- RD-DM-003: Debe mantenerse log de jugadores que se han unido/salido

---

### 4.2 Flujo: Unirse a Campaña (Jugador)

#### 4.2.1 Descripción del Flujo
Duplicado del flujo 2.2 - Ver sección anterior.

---

## 5. FLUJOS DE SESIÓN Y TIEMPO REAL

### 5.1 Flujo: Gestión de Notas en Campaña

#### 5.1.1 Descripción del Flujo
Duplicado del flujo 2.4 - Ver sección anterior.

---

### 5.2 Flujo: Gestión de Solicitudes de Notas (DM)

#### 5.2.1 Descripción del Flujo
El DM recibe solicitudes de jugadores para publicar notas y debe aprobarlas o rechazarlas.

#### 5.2.2 Pasos del Flujo
1. El jugador solicita publicar una nota
2. El DM recibe notificación en tiempo real
3. El DM accede a "Solicitudes Pendientes"
4. Visualiza el contenido de la nota solicitada
5. Ve el autor y fecha de creación
6. Decide:
   - **Aprobar**: La nota se publica y todos los jugadores pueden verla
   - **Rechazar**: La nota permanece privada, el jugador recibe notificación
7. El sistema procesa la decisión
8. Se envía notificación al jugador solicitante

#### 5.2.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-DM-NOT-001: El sistema debe mantener una cola de solicitudes pendientes
- RF-DM-NOT-002: El DM debe ver el contenido completo de la nota antes de decidir
- RF-DM-NOT-003: El sistema debe permitir aprobar o rechazar en batch (múltiples solicitudes)
- RF-DM-NOT-004: Una vez procesada, la solicitud debe desaparecer de la cola
- RF-DM-NOT-005: El DM debe poder revocar la publicación de una nota después de aprobarla
- RF-DM-NOT-006: Debe existir historial de solicitudes aprobadas/rechazadas

**Requisitos de Interfaz:**
- RI-DM-NOT-001: Debe existir badge de notificación con número de solicitudes pendientes
- RI-DM-NOT-002: Las solicitudes deben ordenarse por antigüedad
- RI-DM-NOT-003: Debe mostrar preview de la nota sin necesidad de abrir modal

**Requisitos de Tiempo Real:**
- RTR-DM-NOT-001: La notificación de nueva solicitud debe aparecer instantáneamente
- RTR-DM-NOT-002: Cuando el DM aprueba, la nota debe aparecer inmediatamente para todos los jugadores conectados

---

### 5.3 Flujo: Gestión de Combate (DM)

#### 5.3.1 Descripción del Flujo
El DM inicia un encuentro de combate, añade enemigos y jugadores, gestiona turnos y controla el flujo de batalla.

#### 5.3.2 Pasos del Flujo
1. El DM decide iniciar un combate
2. Pulsa "Iniciar Combate" en la campaña activa
3. El sistema activa vista de combate para todos los jugadores
4. El DM puede:
   - **Opción A - Manual**: Arrastrar monstruos del bestiario a la lista de iniciativa
   - **Opción B - Generador**: Usar el generador automático de encuentros
     - Selecciona dificultad (fácil, media, difícil, mortal)
     - El sistema calcula CR apropiado según nivel del grupo
     - Genera selección aleatoria de monstruos
     - El DM puede aceptar o regenerar
5. Los PJs de los jugadores se añaden automáticamente
6. El sistema solicita iniciativa a todos (jugadores y monstruos)
7. El DM puede introducir valores de iniciativa para monstruos
8. El sistema ordena la lista de iniciativa
9. El combate comienza:
   - El sistema señala el turno actual
   - El DM avanza manualmente entre turnos
   - El DM puede:
     - Ver estadísticas completas de monstruos
     - Modificar HP de cualquier combatiente
     - Aplicar condiciones de estado
     - Realizar tiradas por los monstruos
     - Eliminar combatientes caídos
10. Cuando el combate finaliza, el DM pulsa "Finalizar Combate"
11. El sistema genera resumen de combate (daño total, rondas, bajas)

#### 5.3.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-DM-COMB-001: El sistema debe calcular automáticamente el CR apropiado basándose en nivel y número de jugadores
- RF-DM-COMB-002: El generador de encuentros debe seguir las tablas de dificultad de D&D 5e
- RF-DM-COMB-003: El DM debe poder añadir múltiples instancias del mismo monstruo (numeradas automáticamente)
- RF-DM-COMB-004: El sistema debe calcular automáticamente la iniciativa de monstruos basándose en su bonus
- RF-DM-COMB-005: El DM debe poder modificar el orden de iniciativa manualmente (drag & drop)
- RF-DM-COMB-006: El sistema debe permitir aplicar condiciones de estado (envenenado, aturdido, etc.) con temporizador de duración
- RF-DM-COMB-007: El DM debe poder hacer tiradas ocultas que solo él vea
- RF-DM-COMB-008: El sistema debe trackear HP de todos los combatientes
- RF-DM-COMB-009: El DM debe poder añadir combatientes durante el combate ya iniciado
- RF-DM-COMB-010: El resumen final debe incluir experiencia ganada calculada automáticamente

**Requisitos de Interfaz:**
- RI-DM-COMB-001: La interfaz del DM debe mostrar estadísticas completas de monstruos (AC, HP, ataques, salvaciones)
- RI-DM-COMB-002: Debe existir un panel lateral con acceso rápido al bestiario
- RI-DM-COMB-003: Los HP de cada combatiente deben poder modificarse con botones +/- o input directo
- RI-DM-COMB-004: Debe existir visualización de condiciones activas sobre cada combatiente
- RI-DM-COMB-005: El turno actual debe destacarse claramente y debe existir botón "Siguiente Turno"

**Requisitos de Tiempo Real:**
- RTR-DM-COMB-001: Todos los jugadores deben ver actualizaciones en tiempo real del estado de combate
- RTR-DM-COMB-002: Los cambios en HP deben reflejarse instantáneamente
- RTR-DM-COMB-003: El avance de turno debe sincronizarse para todos en menos de 500ms

**Requisitos de Cálculo:**
- RC-DM-COMB-001: El CR del encuentro debe calcularse según la fórmula: XP total de monstruos × multiplicador de cantidad
- RC-DM-COMB-002: La experiencia concedida debe distribuirse entre todos los PJs participantes
- RC-DM-COMB-003: El multiplicador de dificultad debe ajustarse según número de enemigos (1=×1, 2=×1.5, 3-6=×2, 7-10=×2.5, 11-14=×3, 15+=×4)

---

### 2.3 Flujo: Participación en Combate (Jugador)

Duplicado - ver sección anterior.

---

### 5.4 Flujo: Sesión de Juego en Tiempo Real

Duplicado del flujo 4.1 - ver sección más adelante.

---

### 5.5 Flujo: Visualización de Contenido de Jugadores (DM)

#### 5.5.1 Descripción del Flujo
El DM tiene permisos especiales para ver y gestionar todo el contenido de la campaña, incluyendo notas privadas y fichas completas de personajes.

#### 5.5.2 Pasos del Flujo
1. El DM accede a su campaña activa
2. Visualiza un dashboard con secciones:
   - **Jugadores**: Lista de todos los participantes
   - **Personajes**: Fichas completas de todos los PJs
   - **Notas**: Todas las notas (privadas y públicas) organizadas por autor
   - **Inventario del Grupo**: Items colectivos
3. Para cada jugador, puede:
   - Ver su ficha de personaje completa
   - Consultar sus notas privadas (solo lectura)
   - Ver historial de tiradas
4. El DM puede crear sus propias notas visibles para todos
5. El DM puede editar información compartida (lore, NPCs, localizaciones)

#### 5.5.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-DM-VIS-001: El DM debe tener acceso de solo lectura a notas privadas de jugadores
- RF-DM-VIS-002: El DM debe poder ver estadísticas completas de todos los personajes
- RF-DM-VIS-003: El DM debe poder crear notas públicas directamente sin aprobación
- RF-DM-VIS-004: El sistema debe diferenciar visualmente entre notas del DM y notas de jugadores
- RF-DM-VIS-005: El DM debe poder exportar información de la campaña (PDF, JSON)
- RF-DM-VIS-006: El DM no debe poder editar directamente las fichas de personajes de los jugadores
- RF-DM-VIS-007: El DM debe poder ver el inventario individual de cada PJ

**Requisitos de Interfaz:**
- RI-DM-VIS-001: Debe existir un panel de control centralizado con acceso a todas las secciones
- RI-DM-VIS-002: Las notas privadas deben tener indicador visual de "privada" incluso para el DM
- RI-DM-VIS-003: Debe existir filtro para ver notas por jugador

**Requisitos de Seguridad:**
- RS-DM-VIS-001: Solo el DM creador de la campaña tiene estos permisos elevados
- RS-DM-VIS-002: El sistema debe registrar cuando el DM accede a notas privadas (auditoría)
- RS-DM-VIS-003: Los jugadores no pueden ver notas privadas de otros jugadores, incluso si el DM las ha publicado

---

## 6. FLUJOS ADICIONALES

### 6.1 Flujo: Sesión de Juego en Tiempo Real

#### 6.1.1 Descripción del Flujo
Durante una sesión activa, jugadores y DM interactúan simultáneamente usando chat, tiradas de dados y gestión de turnos.

#### 6.1.2 Pasos del Flujo
1. El DM inicia la sesión de juego
2. Todos los jugadores conectados reciben notificación
3. Se abre el espacio de sesión que incluye:
   - Chat en tiempo real
   - Panel de tiradas de dados rápidas
   - Vista de fichas de personajes
   - Estado de iniciativa (si hay combate activo)
4. Durante roleplay:
   - Los jugadores chatean
   - Pueden realizar tiradas de habilidad/salvación cuando el DM lo pide
   - Las tiradas aparecen en el chat con resultado destacado
5. Si se inicia combate, el flujo pasa a gestión de combate
6. Los jugadores pueden tomar notas durante la sesión
7. El sistema auto-guarda todo el progreso
8. Cuando la sesión finaliza:
   - El DM cierra la sesión
   - Se genera un resumen de la sesión (tiradas, eventos, experiencia)
   - El resumen se guarda en el historial de la campaña

#### 6.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-SES-001: El sistema debe soportar al menos 8 usuarios conectados simultáneamente por sesión
- RF-SES-002: Todas las tiradas deben registrarse en log persistente con timestamp
- RF-SES-003: El chat debe soportar menciones de jugadores (@nombre)
- RF-SES-004: El sistema debe permitir tiradas contextuales (ej: "tirada de Percepción" debe autoaplicar mod. de sabiduría)
- RF-SES-005: Las tiradas deben poder realizarse con ventaja/desventaja (roll 2d20, usar mejor/peor)
- RF-SES-006: El sistema debe auto-guardar estado cada 2 minutos
- RF-SES-007: Si un jugador se desconecta, su estado debe restaurarse al reconectar
- RF-SES-008: El resumen de sesión debe poder editarse por el DM antes de guardar definitivamente

**Requisitos de Interfaz:**
- RI-SES-001: El chat debe ocupar un lateral y ser deslizable sin perder contenido
- RI-SES-002: Las tiradas deben diferenciarse visualmente del texto normal en el chat
- RI-SES-003: Debe existir botón de "tirada rápida" para habilidades comunes
- RI-SES-004: El estado de conexión de cada jugador debe ser visible

**Requisitos de Tiempo Real:**
- RTR-SES-001: Los mensajes de chat deben aparecer en menos de 200ms para todos
- RTR-SES-002: Las tiradas deben sincronizarse instantáneamente
- RTR-SES-003: El sistema debe reconectar automáticamente si se pierde conexión temporalmente

**Requisitos de Rendimiento:**
- RP-SES-001: El chat debe soportar al menos 500 mensajes sin degradación de rendimiento
- RP-SES-002: Tiradas simultáneas (ej: todos los jugadores tirando iniciativa) deben procesarse sin retraso
- RP-SES-003: La latencia de websocket debe mantenerse bajo 100ms en condiciones normales

---

### 6.2 Flujo: Compartir Contenido Personalizado con la Comunidad

#### 6.2.1 Descripción del Flujo
Un usuario crea contenido personalizado de calidad y decide compartirlo públicamente para que otros usuarios puedan usarlo.

#### 6.2.2 Pasos del Flujo
1. Usuario crea contenido homebrew (monstruo, hechizo, objeto, background)
2. Inicialmente, el contenido es privado (solo él puede verlo)
3. Decide compartirlo:
   - Accede al contenido creado
   - Selecciona "Compartir con Comunidad"
   - Añade etiquetas descriptivas
   - Puede añadir notas de autor (créditos, inspiración, balance)
4. El sistema valida que el contenido esté completo
5. El contenido pasa a estar disponible en búsquedas comunitarias
6. Otros usuarios pueden:
   - Buscar y visualizar el contenido
   - Usar el contenido en sus personajes/campañas
   - Valorar el contenido (sistema de likes o rating)
   - Reportar contenido inapropiado
7. El autor original puede:
   - Ver estadísticas de uso (cuántas veces se ha usado)
   - Editar el contenido (se actualiza para todos)
   - Retirar el contenido de la comunidad

#### 6.2.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-COM-001: El contenido compartido debe mantener referencia al autor original
- RF-COM-002: El sistema debe impedir que usuarios reclamen como propio contenido de otros
- RF-COM-003: Las actualizaciones del autor deben propagarse a todas las instancias en uso
- RF-COM-004: El sistema debe permitir filtrar contenido comunitario por:
  - Tipo (monstruo, hechizo, etc.)
  - Rating/popularidad
  - Etiquetas
  - Autor
- RF-COM-005: El sistema debe implementar sistema de reportes de contenido inadecuado
- RF-COM-006: Debe existir moderación básica (filtro de palabras, validación de formato)
- RF-COM-007: Los usuarios deben poder guardar contenido comunitario favorito en su biblioteca personal
- RF-COM-008: El contenido comunitario debe ser de solo lectura para usuarios que no son el autor

**Requisitos de Interfaz:**
- RI-COM-001: El contenido comunitario debe tener badge distintivo ("Homebrew Community")
- RI-COM-002: Debe mostrarse el nombre del autor claramente en cada elemento
- RI-COM-003: Debe existir sección dedicada "Explorar Comunidad"
- RI-COM-004: Los usuarios deben poder previsualizar contenido antes de añadirlo a su biblioteca

**Requisitos de Seguridad:**
- RS-COM-001: Solo el autor original puede editar o eliminar su contenido compartido
- RS-COM-002: El sistema debe validar que no se comparta contenido con código malicioso o scripts
- RS-COM-003: Los reportes deben notificar a moderadores/administradores

**Requisitos de Datos:**
- RD-COM-001: Debe registrarse fecha de publicación comunitaria
- RD-COM-002: Debe mantenerse contador de usos/descargas
- RD-COM-003: Debe guardarse historial de versiones del contenido compartido

---

## 7. FLUJOS DE GESTIÓN DE CUENTA

### 7.1 Flujo: Registro de Usuario

#### 7.1.1 Descripción del Flujo
Un nuevo usuario crea una cuenta en Grimledger para acceder a todas las funcionalidades.

#### 7.1.2 Pasos del Flujo
1. Usuario accede a la landing page de Grimledger
2. Selecciona "Registrarse"
3. Completa formulario:
   - Nombre de usuario (único)
   - Email
   - Contraseña (con requisitos de seguridad)
   - Confirmación de contraseña
4. Acepta términos y condiciones
5. Puede opcionalmente completar perfil:
   - Nombre para mostrar
   - Avatar/imagen de perfil
   - Bio breve
6. El sistema valida que el username y email no existan
7. El sistema envía email de verificación
8. Usuario verifica email mediante link
9. Accede a su dashboard inicial con tutorial de primeros pasos

#### 7.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-REG-001: El username debe ser único en toda la plataforma
- RF-REG-002: El email debe ser único y válido
- RF-REG-003: La contraseña debe cumplir requisitos: mínimo 8 caracteres, al menos una mayúscula, un número y un símbolo
- RF-REG-004: El sistema debe enviar email de verificación automáticamente
- RF-REG-005: La cuenta debe permanecer inactiva hasta verificar email
- RF-REG-006: El link de verificación debe expirar en 24 horas
- RF-REG-007: El sistema debe sugerir usernames alternativos si el elegido está ocupado
- RF-REG-008: Debe existir opción de registro mediante OAuth (Google, Discord, GitHub)

**Requisitos de Interfaz:**
- RI-REG-001: El formulario debe validar campos en tiempo real (checkmarks verdes)
- RI-REG-002: Debe mostrar fuerza de contraseña con barra de progreso
- RI-REG-003: Los errores deben ser descriptivos y específicos

**Requisitos de Seguridad:**
- RS-REG-001: Las contraseñas deben hashearse con bcrypt o argon2
- RS-REG-002: Debe implementarse rate limiting (máximo 5 intentos de registro por IP por hora)
- RS-REG-003: El sistema debe detectar y prevenir registro de bots (CAPTCHA o similar)
- RS-REG-004: Los emails de verificación deben usar tokens firmados

---

### 7.2 Flujo: Configuración de Preferencias

#### 7.2.1 Descripción del Flujo
El usuario personaliza su experiencia en la plataforma ajustando preferencias de interfaz, notificaciones y privacidad.

#### 7.2.2 Pasos del Flujo
1. Usuario accede a "Configuración" desde su perfil
2. Navega por las secciones disponibles:
   - **Perfil**: Editar información personal, avatar, bio
   - **Apariencia**: Tema (claro/oscuro), tamaño de fuente, idioma
   - **Notificaciones**: Configurar qué notificaciones recibir y por qué canales
   - **Privacidad**: Visibilidad de perfil, contenido compartido
   - **Sesiones**: Ver sesiones activas, cerrar sesión en otros dispositivos
3. Modifica las preferencias deseadas
4. Guarda los cambios
5. El sistema aplica cambios inmediatamente

#### 7.2.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-CONF-001: Los cambios de tema deben aplicarse sin recargar la página
- RF-CONF-002: El usuario debe poder activar/desactivar notificaciones por tipo:
  - Nuevas campañas
  - Solicitudes de notas
  - Inicio de sesión
  - Turno de combate
  - Mensajes de chat
- RF-CONF-003: El usuario debe poder elegir recibir notificaciones por:
  - In-app
  - Email
  - Push (si PWA está instalada)
- RF-CONF-004: El usuario debe poder configurar visibilidad de perfil:
  - Público (visible en búsquedas)
  - Privado (solo visible para contactos/campañas)
- RF-CONF-005: El usuario debe poder descargar todos sus datos (GDPR compliance)
- RF-CONF-006: El usuario debe poder eliminar su cuenta permanentemente

**Requisitos de Interfaz:**
- RI-CONF-001: Los cambios deben guardarse automáticamente o mostrar botón "Guardar" persistente
- RI-CONF-002: Debe existir confirmación para acciones destructivas (eliminar cuenta)
- RI-CONF-003: El idioma debe cambiar inmediatamente al seleccionarlo

**Requisitos de Seguridad:**
- RS-CONF-001: Cambios críticos (email, contraseña) deben requerir reautenticación
- RS-CONF-002: La eliminación de cuenta debe requerir confirmación mediante password
- RS-CONF-003: El download de datos debe generarse under demanda y caducar en 24h

---

# NIVEL 3: GRID DE BATALLA TÁCTICO

## 8. FLUJO DE MAPA Y GRID TÁCTICO

### 8.1 Flujo: Crear y Gestionar Mapa de Batalla con Grid

#### 8.1.1 Descripción del Flujo
El DM crea un mapa de batalla con grid cuadriculado para combate táctico, donde puede posicionar tokens de personajes y enemigos, y utilizar herramientas de dibujo y medición.

#### 8.1.2 Pasos del Flujo
1. El DM inicia un combate y selecciona "Activar Mapa Táctico"
2. El sistema muestra interfaz de mapa con grid cuadriculado
3. El DM puede:
   - **Configurar Grid:**
     - Seleccionar tamaño de casilla (5 pies por defecto)
     - Mostrar/ocultar líneas del grid
     - Configurar color y opacidad del grid
   - **Agregar Fondo:**
     - Subir imagen de mapa personalizada
     - Seleccionar de biblioteca de mapas predefinidos
     - Ajustar escala de la imagen al grid
   - **Posicionar Combatientes:**
     - Arrastrar tokens de PJs desde panel lateral
     - Arrastrar monstruos del bestiario al mapa
     - Los tokens se ajustan automáticamente al grid (snap to grid)
     - Tokens de diferentes tamaños ocupan casillas correspondientes (Mediano=1x1, Grande=2x2, Enorme=3x3, Colosal=4x4)
   - **Herramientas de Dibujo:**
     - Dibujar líneas y formas (círculos, cuadrados, conos)
     - Marcar áreas de efecto de hechizos
     - Usar herramienta de medición (mide distancia en casillas/pies)
     - Colocar marcadores y pines
     - Borrador para eliminar elementos
   - **Gestión de Tokens:**
     - Cambiar color/borde del token
     - Añadir indicadores de estado sobre tokens
     - Mostrar nombre o número sobre tokens
     - Eliminar tokens del mapa
4. Durante el combate:
   - Los jugadores pueden ver el mapa completo
   - Solo el DM puede mover tokens y dibujar
   - Opcionalmente, jugadores pueden mover solo su propio token
   - El token del turno actual se resalta
5. Herramientas de medición:
   - Click y arrastrar para medir distancia desde un punto
   - El sistema muestra distancia en casillas y pies
   - Muestra si está dentro de alcance de movimiento/ataque
6. Áreas de efecto:
   - Templates de AoE para hechizos (cono 15 pies, esfera 20 pies, etc.)
   - Se posicionan con preview antes de confirmar
   - Sistema cuenta automáticamente cuántos combatientes afecta
7. Fog of War (opcional avanzado):
   - DM puede ocultar partes del mapa
   - Jugadores solo ven lo que sus personajes ven
8. Guardar y cargar:
   - El estado del mapa se guarda automáticamente
   - El DM puede guardar configuraciones como templates
   - Los mapas de encuentros pregenerados cargan con posiciones predefinidas

#### 8.1.3 Requisitos del Flujo

**Requisitos Funcionales:**
- RF-GRID-001: El grid debe ser configurable en tamaño (5 pies por defecto, ajustable)
- RF-GRID-002: Los tokens deben ajustarse automáticamente al grid (snap to grid)
- RF-GRID-003: Tokens de diferentes tamaños deben ocupar el número correcto de casillas según D&D 5e
- RF-GRID-004: El sistema debe soportar imágenes de mapa personalizadas (PNG, JPG, máx 10MB)
- RF-GRID-005: Debe existir biblioteca de mapas predefinidos (mín. 20 mapas variados)
- RF-GRID-006: La herramienta de medición debe calcular distancia tanto en línea recta como siguiendo el grid
- RF-GRID-007: Los templates de AoE deben seguir las reglas de D&D 5e para formas (conos, esferas, cubos, líneas)
- RF-GRID-008: El sistema debe detectar automáticamente qué tokens están en un área de efecto
- RF-GRID-009: Solo el DM puede mover tokens de monstruos, los jugadores solo sus PJs (si está habilitado)
- RF-GRID-010: Los cambios en el mapa deben sincronizarse en tiempo real para todos los participantes
- RF-GRID-011: Los encuentros pregenerados deben poder cargar con posiciones iniciales de enemigos
- RF-GRID-012: El mapa debe soportar zoom in/out y pan/desplazamiento
- RF-GRID-013: Los dibujos y marcadores deben poder eliminarse individualmente
- RF-GRID-014: El estado completo del mapa debe guardarse con la campaña

**Requisitos de Interfaz:**
- RI-GRID-001: El mapa debe ocupar la zona principal de la pantalla durante combate táctico
- RI-GRID-002: Debe existir toolbar con herramientas accesibles (seleccionar, mover, dibujar, medir, borrar)
- RI-GRID-003: Los tokens deben mostrar preview de posición antes de soltar (drag preview)
- RI-GRID-004: La herramienta de medición debe mostrar línea visual con distancia en tiempo real
- RI-GRID-005: Los templates de AoE deben ser semi-transparentes para ver qué hay debajo
- RI-GRID-006: Debe existir panel lateral con lista de combatientes para arrastrar al mapa
- RI-GRID-007: El zoom debe centrarse en el cursor del ratón
- RI-GRID-008: Los controles deben ser intuitivos (click derecho para menú contextual, scroll para zoom)
- RI-GRID-009: Los tokens deben tener indicadores visuales de tamaño (borde de diferente grosor)
- RI-GRID-010: Los estados de combatiente deben mostrarse como iconos sobre los tokens

**Requisitos de Rendimiento:**
- RP-GRID-001: El mapa debe renderizarse sin lag con hasta 50 tokens simultáneos
- RP-GRID-002: El drag & drop debe ser fluido (60 FPS)
- RP-GRID-003: La sincronización de movimientos debe tener latencia < 200ms
- RP-GRID-004: Las imágenes de mapas grandes deben optimizarse automáticamente

**Requisitos de WebSockets/Tiempo Real:**
- RWS-GRID-001: Los movimientos de tokens deben sincronizarse en tiempo real
- RWS-GRID-002: Los dibujos deben aparecer simultáneamente en todas las pantallas
- RWS-GRID-003: Si múltiples usuarios intentan mover el mismo token, el DM tiene prioridad

**Requisitos de Drag & Drop:**
- RDD-GRID-001: Los tokens deben poder arrastrarse desde el bestiario/lista de PJs al mapa
- RDD-GRID-002: Los tokens en el mapa deben poder moverse entre casillas
- RDD-GRID-003: Debe existir validación de colisión (no 2 tokens medianos en la misma casilla)
- RDD-GRID-004: La operación debe poder cancelarse (ESC o soltar fuera del mapa)

**Requisitos de Integración con Encuentros:**
- RI-ENC-001: El generador de encuentros debe tener opción "Cargar en Mapa Táctico"
- RI-ENC-002: Los encuentros pregenerados deben incluir un mapa recomendado
- RI-ENC-003: Las posiciones iniciales de enemigos deben estar predefinidas en encuentros pregenerados
- RI-ENC-004: El DM debe poder modificar posiciones después de cargar el encuentro

---

## 9. REQUISITOS TRANSVERSALES POR FLUJO

### 9.1 Requisitos de Accesibilidad

Todos los flujos deben cumplir:
- RA-001: Navegación completa por teclado (tab, enter, escape)
- RA-002: Soporte para lectores de pantalla (ARIA labels)
- RA-003: Contraste de color suficiente (WCAG AA mínimo)
- RA-004: Textos alternativos en imágenes y iconos
- RA-005: Tamaño de fuente ajustable
- RA-006: Formularios con labels claros y mensajes de error descriptivos

### 9.2 Requisitos de Compatibilidad

Todos los flujos deben funcionar en:
- RC-001: Navegadores modernos (Chrome, Firefox, Safari, Edge - últimas 2 versiones)
- RC-002: Dispositivos móviles (responsive design)
- RC-003: Tabletas (layouts adaptados)
- RC-004: PWA instalada en escritorio y móvil

### 9.3 Requisitos de Persistencia

- RP-001: Los datos deben guardarse automáticamente cada cambio significativo
- RP-002: Debe existir indicador de "guardando..." y "guardado"
- RP-003: En caso de pérdida de conexión, los datos deben quedar en cola para sincronizar
- RP-004: Formularios largos deben guardar drafts localmente

### 9.4 Requisitos de Rendimiento General

- RPG-001: Tiempo de carga inicial < 3 segundos
- RPG-002: Interacciones UI deben responder en < 100ms
- RPG-003: Transiciones entre páginas < 500ms
- RPG-004: Imágenes y assets optimizados (lazy loading)

---

## 10. MATRIZ DE PRIORIZACIÓN DE FLUJOS

### 10.1 NIVEL 1 - Flujos Críticos (Creación y Gestión de Contenido)

| Flujo | Prioridad | Complejidad | Dependencias |
|-------|-----------|-------------|--------------|
| 7.1 Registro de Usuario | CRÍTICA | Media | Ninguna |
| 2.5 Visualización de Contenido | CRÍTICA | Media | API D&D 5e, caché |
| 2.1 Creación de Personaje | CRÍTICA | Alta | 2.5 Visualización |
| 2.6 Subir Nivel Personaje | ALTA | Alta | 2.1 Creación PJ |
| 3.1 Creación Hechizo | MEDIA | Media | 2.5 Visualización |
| 3.2 Creación Monstruo | MEDIA | Alta | 2.5 Visualización |
| 3.3 Creación Objeto | MEDIA | Alta | 2.5 Visualización |
| 3.4 Modificación/Eliminación | MEDIA | Media | 3.1, 3.2, 3.3 |

### 10.2 NIVEL 2 - Flujos de Campañas y Multijugador

| Flujo | Prioridad | Complejidad | Dependencias |
|-------|-----------|-------------|--------------|
| 4.1 Creación de Campaña | CRÍTICA | Media | 7.1 Registro |
| 4.2 Unirse a Campaña | CRÍTICA | Media | 4.1 Creación Campaña |
| 5.3 Gestión de Combate (DM) | ALTA | Muy Alta | WebSockets, iniciativa |
| 2.3 Participación en Combate | ALTA | Alta | 5.3 Gestión Combate |
| 6.1 Sesión en Tiempo Real | ALTA | Muy Alta | WebSockets, chat |
| 2.4 Gestión de Notas | MEDIA | Media | WebSockets |
| 5.2 Aprobación de Notas (DM) | MEDIA | Media | 2.4 Gestión Notas |
| 5.5 Visualización Contenido DM | MEDIA | Media | Permisos |

### 10.3 NIVEL 3 - Grid Táctico (Features Avanzadas)

| Flujo | Prioridad | Complejidad | Dependencias |
|-------|-----------|-------------|--------------|
| 8.1 Mapa con Grid Táctico | MEDIA | Muy Alta | Canvas, drag&drop, 5.3 Combate |
| 6.2 Compartir Comunidad | BAJA | Alta | Sistema de moderación |
| 7.2 Configuración Avanzada | BAJA | Media | Sistema de preferencias |

---

## 11. ESCENARIOS DE ERROR Y MANEJO

### 11.1 Errores en Flujo de Combate

**Escenario**: Pérdida de conexión durante combate activo

**Requisitos de Manejo:**
- RME-COMB-001: El sistema debe detectar pérdida de conexión en menos de 5 segundos
- RME-COMB-002: El estado de combate se debe guardar en localStorage del cliente
- RME-COMB-003: Al reconectar, el sistema debe sincronizar automáticamente el estado actual
- RME-COMB-004: Si hay conflictos (varios jugadores desconectados/reconectados), el estado del DM prevalece
- RME-COMB-005: Debe mostrarse mensaje claro "Reconectando..." durante interrupción

### 11.2 Errores en Creación de Personaje

**Escenario**: Usuario cierra navegador durante creación de personaje

**Requisitos de Manejo:**
- RME-PJ-001: Los datos del form deben guardarse en localStorage cada cambio
- RME-PJ-002: Al reabrir, debe mostrarse opción "Continuar personaje guardado"
- RME-PJ-003: El draft debe expirar después de 7 días
- RME-PJ-004: Usuario debe poder descartar draft manualmente

### 11.3 Errores en Sistema de Notas

**Escenario**: DM aprueba nota mientras jugador la está editando

**Requisitos de Manejo:**
- RME-NOTA-001: El sistema debe detectar conflicto
- RME-NOTA-002: debe notificar al jugador que la nota ha sido publicada
- RME-NOTA-003: Los cambios no guardados se pierden (prioridad a versión publicada)
- RME-NOTA-004: Opcionalmente, guardar versión editada como nueva nota privada

---

## 12. TESTING E INTEGRACIÓN

### 12.1 Criterios de Aceptación por Flujo

Cada flujo debe pasar:

**Tests Funcionales:**
- TF-001: Todos los pasos del flujo se completan sin errores
- TF-002: Las validaciones funcionan correctamente
- TF-003: Los datos se persisten correctamente
- TF-004: Los permisos se respetan

**Tests de Integración:**
- TI-001: La comunicación entre frontend y backend es correcta
- TI-002: Las actualizaciones en tiempo real funcionan
- TI-003: Los datos se sincronizan correctamente entre usuarios

**Tests de UI/UX:**
- TU-001: La interfaz es intuitiva y no requiere documentación para completar el flujo
- TU-002: Los mensajes de error son claros y accionables
- TU-003: El flujo es responsive en todos los dispositivos soportados

### 12.2 Tests de Carga

Para flujos de tiempo real:
- TC-001: El sistema debe soportar 50 usuarios simultáneos por campaña sin degradación
- TC-002: El sistema debe soportar 100 campañas activas simultáneas
- TC-003: El chat debe soportar 500 mensajes sin lag

---

## 13. CONCLUSIONES Y PRÓXIMOS PASOS

### 13.1 Resumen de Flujos por Nivel

Este documento ha definido **19 flujos principales** organizados en 3 niveles:

**NIVEL 1 - Creación y Gestión de Contenido (8 flujos):**
- Visualización de contenido
- Creación y gestión de personajes
- Subir nivel de personaje
- Creación de hechizos, monstruos y objetos personalizados
- Modificación y eliminación de contenido personalizado

**NIVEL 2 - Campañas y Multijugador (8 flujos):**
- Creación de campaña (DM)
- Unirse a campaña (Jugadores)
- Gestión de notas y aprobaciones
- Gestión de combate (DM)
- Participación en combate (Jugadores)
- Sesión en tiempo real
- Visualización de contenido de jugadores (DM)

**NIVEL 3 - Grid Táctico (1 flujo principal):**
- Mapa de batalla con grid, drag & drop, herramientas de dibujo y medición

**Adicionales (2 flujos):**
- Compartir contenido con comunidad
- Registro y configuración de usuario

### 13.2 Roadmap de Implementación

**Fase 1 - NIVEL 1: Creación y Gestión de Contenido (Mes 1-3):**
- Registro y autenticación de usuarios
- Sistema de visualización de contenido (API D&D 5e)
- Creación completa de personajes (wizard paso a paso)
- Sistema de subida de nivel
- Creación de contenido homebrew (hechizos, monstruos, objetos)
- Modificación y eliminación de contenido propio

**Fase 2 - NIVEL 2: Campañas y Multijugador (Mes 4-7):**
- Infraestructura de WebSockets
- Creación y gestión de campañas
- Sistema de unirse a campaña con códigos
- Chat en tiempo real
- Sistema de iniciativas y combate básico
- Gestión de notas y aprobaciones
- Tiradas de dados en tiempo real
- Sesiones de juego completas

**Fase 3 - NIVEL 3: Grid Táctico (Mes 8-10):**
- Chat en tiempo real
- Sistema de sesiones
- Sincronización completa

**Fase 4 - Community (Mes 7-8):**
- Contenido homebrew
- Sistema comunitario
- Moderación

### 10.3 Métricas de Éxito

Los flujos serán considerados exitosos si:
- MS-001: El 80% de usuarios completan su primer personaje en menos de 15 minutos
- MS-002: El 90% de campañas creadas tienen al menos 3 jugadores unidos
- MS-003: El 95% de las sesiones de combate se completan sin errores críticos
- MS-004: La latencia promedio de tiempo real es inferior a 200ms
- MS-005: El 70% de usuarios utilizan la plataforma en sesiones de más de 1 hora

---

**Documento generado el:** 1 de Marzo de 2026  
**Versión:** 1.0  
**Autor:** Equipo Grimledger  
**Estado:** Borrador para Revisión

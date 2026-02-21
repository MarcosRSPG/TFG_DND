# INFORME DE REQUISITOS - GRIMLEDGER

## 1. INFORMACIÓN GENERAL

### 1.1 Descripción
Grimledger es una aplicación web y webapp de gestión integral de personajes y campañas de Dungeons & Dragons. Combina funcionalidades de gestión de bases de datos con características de tiempo real para proporcionar una experiencia centralizada donde jugadores y Dungeon Masters pueden gestionar tanto el seguimiento de campañas como dinámicas de batalla.

### 1.2 Objetivo Principal
Los jugadores de D&D han estado fragmentados entre múltiples herramientas especializadas: Roll20 para mapas y batalla, Obsidian para lore e historia, etc. Grimledger centraliza estas funcionalidades en una única plataforma, permitiendo a los usuarios tener un seguimiento completo de sus campañas con herramientas de batalla integradas como iniciativas y tiradas de dados en tiempo real.

### 1.3 Usuarios Objetivo
Jugadores de Dungeons & Dragons que buscan una solución centralizada para mantener toda la información de sus campañas y personajes en un mismo lugar.

---

## 2. REQUISITOS FUNCIONALES

### 2.1 Rama de Bases de Datos

#### 2.1.1 Secciones CRUD Principales
El sistema proporciona acceso a 9 secciones principales:

| Sección | Crear | Modificar | Eliminar | Visibilidad |
|---------|-------|-----------|----------|-------------|
| Razas | ❌ | ❌ | ❌ | Pública/Comunidad |
| Subrazas | ❌ | ❌ | ❌ | Pública/Comunidad |
| Clases | ❌ | ❌ | ❌ | Pública/Comunidad |
| Subclases | ❌ | ❌ | ❌ | Pública/Comunidad |
| Backgrounds | ✅ | ✅ | ✅ | Personal/Comunidad |
| Monstruos | ✅ | ✅ | ✅ | Personal/Comunidad/Bestiario |
| Objetos | ✅ | ✅ | ✅ | Personal/Comunidad |
| Hechizos | ✅ | ✅ | ✅ | Personal/Comunidad |
| Personajes (PJ) | ✅ | ✅ | ✅ | Personal (solo propios) |

#### 2.1.2 Funcionalidades de los CRUD
- **Visualización múltiple**: Filtrado por contenido personal, contenido general/público y contenido de la comunidad
- **Sistema de búsqueda avanzado**: Filtrado por tipo (monstruos, hechizos, objetos), origen (personales, otros, originales)
- **Gestión de personajes**: Los PJ solo son visibles para el propietario
- **Bestiario comunitario**: Acceso a monstruos creados por otros usuarios

### 2.2 Rama de Tiempo Real - Campañas

#### 2.2.1 Gestión de Campañas
- **Creación de campañas**: El DM crea la campaña y obtiene un código único
- **Unión a campañas**: Los jugadores utilizan el código para unirse
- **Vista de campañas**: Sección personal mostrando campañas creadas y campañas en las que participa

#### 2.2.2 Sistema de Notas
- **Notas privadas**: Cada jugador puede crear notas visibles solo para él
- **Solicitud de publicación**: Los jugadores pueden solicitar permiso al DM para publicar notas
- **Gestión de permisos**: El DM puede aceptar o rechazar solicitudes de publicación
- **Acceso del DM**: El DM puede ver todas las notas de todos los jugadores y crear sus propias notas

#### 2.2.3 Fichas de Personajes
- **Asociación de PJ**: Los jugadores pueden vincular sus personajes a la campaña
- **Visibilidad**: Todos los participantes pueden ver las fichas vinculadas
- **Información mostrada**: Rasgos, habilidades y características principales del PJ

#### 2.2.4 Sistema de Iniciativas
- **Activación por DM**: El DM activa el sistema de iniciativas cuando es necesario
- **Entrada de valores**: Los jugadores introducen su valor de iniciativa
- **Gestión del turno**: El DM avanza entre jugadores automáticamente
- **Tiradas de dados**: Cada jugador puede lanzar dados de diferentes tipos durante su turno
- **Control de visibilidad**: Los dados pueden ser visibles para todos o solo para el DM

#### 2.2.5 Sistema de Combate (DM)
- **Generador de encuentros**: Generador automático de encuentros autoajustables según el nivel del grupo
- **Arrastrar y soltar**: El DM puede arrastrar monstruos del bestiario o fichas de jugadores a la lista de iniciativas
- **Ordenamiento automático**: La lista se ordena automáticamente por valor de iniciativa
- **Gestión de turnos**: El DM controla el avance entre combatientes
- **Acceso total**: El DM puede ver todas las notas, fichas y estadísticas

#### 2.2.6 Chat en Tiempo Real
- **Comunicación grupal**: Chat integrado para la comunicación en tiempo real
- **Compartir información**: Los jugadores pueden compartir ideas e información táctica
- **Soporte para roleplay**: Facilita la comunicación simultánea durante sesiones de roleplay

---

## 3. REQUISITOS NO FUNCIONALES

### 3.1 INTERFACES

#### 3.1.1 Tipo de Interfaz
- **Aplicación Web**: Accesible desde cualquier navegador web
- **Progressive Web App (PWA)**: Descargable como aplicación nativa en dispositivos

#### 3.1.2 Tecnologías de Interfaz
- **Frontend**: Angular
- **Renderizado en tiempo real**: Uso de bibliotecas de Angular para tiempo real (WebSockets)
- **PWA**: Configuración de manifest.json y service workers para instalabilidad

#### 3.1.3 API REST
- **Backend API**: Endpoints REST para todas las operaciones de base de datos
- **Acceso autorizado**: Endpoints públicos para CRUD básicos; endpoints privados con autenticación para servicios de usuario, campañas, personajes, etc.

---

### 3.2 ESTÁNDARES

#### 3.2.1 Estándares de Arquitectura

**Frontend (Angular)**:
- Separación por directorios: `interfaces`, `services`, `components`
- Estructura de componentes: `pages` (componentes de nivel de página) y `components` (componentes reutilizables)
- Servicios para el acceso a la API
- Modelos TypeScript tipados para todas las entidades

**Backend (FastAPI)**:
- Organización modular: Rutas separadas por funcionalidad (usuarios, campañas, CRUD, tiempo real, etc.)
- Estructura clara: `routes/`, `models/`, `utils/`

#### 3.2.2 Estándares de Accesibilidad (WCAG)
- **Validación de accesibilidad**: Implementación de script WCAG 2.1 para cumplimiento normativo
- **Atributos ARIA**: Uso apropiado de ARIA en elementos interactivos
- **Textos alternativos**: Alt text descriptivo en todas las imágenes
- **Navegación por teclado**: Soporte completo para navegación sin ratón
- **Contraste de colores**: Cumplimiento de ratios de contraste WCAG AA mínimo
- **Estructura semántica**: Uso correcto de etiquetas HTML semánticas

#### 3.2.3 Internacionalización
- **API de traducción**: Integración de APIs de traducción automática en el cliente
- **Fallback**: Compatibilidad con traductor del navegador para navegadores sin soporte de API

---

### 3.3 ARQUITECTURA TÉCNICA

#### 3.3.1 Componentes de la Aplicación

| Componente | Tecnología | Propósito |
|------------|-----------|----------|
| Frontend | Angular + TypeScript | Interfaz de usuario y lógica de cliente |
| Backend API | FastAPI + Python | Gestión de CRUD y lógica de negocio |
| BD Principal | MongoDB | Almacenamiento de datos persistentes (usuarios, personajes, campañas, CRUD) |
| BD Tiempo Real | Redis | Almacenamiento en caché y sincronización en tiempo real (iniciativas, chat) |
| Logs | ELK Stack | Registro de interacciones, errores y estadísticas |

#### 3.3.2 Comunicación
- **API REST**: Endpoints HTTPS para operaciones tradicionales
- **WebSockets**: Tiempo real (chat, iniciativas, actualizaciones de batalla)

---

### 3.4 HARDWARE

#### 3.4.1 Requisitos del Cliente
- **Dispositivo**: Cualquier dispositivo con acceso a internet
- **Navegador**: Navegador web moderno (Chrome, Firefox, Safari, Edge)
- **Conexión**: Conexión a internet estable

#### 3.4.2 Requisitos del Servidor

**Opción A - Servidor On-Premise**:
- Servidor local con puerto publicado
- Dominio adquirido
- Nginx como proxy inverso
- **Limitaciones**: Ancho de banda limitado y capacidad de procesamiento

**Opción B - Servidor en la Nube (AWS)**:
- Instancia EC2 de AWS
- Dominio adquirido
- Nginx como proxy inverso

---

### 3.5 SEGURIDAD

#### 3.5.1 Autenticación
- **Login/Register**: Sistema de autenticación de usuario basado en usuario/contraseña
- **Hashing de contraseñas**: Todas las contraseñas hasheadas usando algoritmos seguros
- **JWT**: Tokens JWT para mantener sesiones autenticadas

#### 3.5.2 Autorización y Protección de API
- **Headers de autenticación**: Base64 encoding para credenciales en headers
- **Endpoints privados**: Todos los endpoints de servicios privados (usuarios, campañas, personajes, notas) requieren autenticación
- **Control de acceso**: Validación de permisos para cada operación (solo el propietario puede modificar sus datos)

#### 3.5.3 Encriptación
- **En tránsito**: HTTPS para todas las comunicaciones
- **En reposo**: Encriptación de datos sensibles en MongoDB (contraseñas, información personal)
- **Headers**: Credenciales en Base64 (reforzado con HTTPS)

#### 3.5.4 Protección de Datos
- **Privacidad de usuario**: Ningún dato de usuario es expuesto públicamente
- **Archivo .env**: Todas las credenciales y claves privadas en variables de entorno
- **Repositorio GitHub**: Código abierto pero sin información privada
- **.gitignore**: Configuración para excluir archivos de credenciales

#### 3.5.5 Licencia y Cumplimiento Legal
- **Licencia MIT**: Aplicada para evitar contratiempos legales

---

### 3.6 PORTABILIDAD

#### 3.6.1 Compatibilidad Multiplataforma
- **Responsive Design**: Media queries configuradas para todos los tamaños de pantalla
  - Desktop (≥1200px)
  - Tablet (768px - 1199px)
  - Mobile (< 768px)
- **Dispositivos soportados**: Teléfonos, tablets, ordenadores de escritorio

#### 3.6.2 Compatibilidad de Navegadores
- **Navegadores principales**: Chrome, Firefox, Safari, Edge
- **APIs de traducción**: Algunos navegadores pueden no soportar APIs de traducción automática; deben usar el traductor integrado del navegador
- **Fallback graceful**: La aplicación debe funcionar completamente aunque ciertas APIs no estén disponibles

#### 3.6.3 Instalación como PWA
- **Instalable**: Los usuarios pueden instalar la app como aplicación nativa desde la web

---

### 3.7 RENDIMIENTO

#### 3.7.1 Escalabilidad

**Opción A - Servidor On-Premise**:
- **Limitación**: Escalabilidad limitada por hardware local
- **Capacidad estimada**: Soportaría 10-50 usuarios simultáneos
- **Impacto**: Degradación de rendimiento con múltiples campañas y usuarios concurrentes

**Opción B - AWS**:
- **Auto-scaling**: Auto Scaling Groups configurados para escalar según demanda
- **Capacidad**: Escalable a miles de usuarios simultáneos
- **Costo**: Escalado automático según consumo

#### 3.7.2 Optimizaciones

- **Paginación**: Resultados de búsqueda y listados paginados

---

### 3.8 LOGS Y MONITOREO

#### 3.8.1 Sistema de Logs
- **Eventos registrados**: 
  - Autenticación (login, logout, fallos)
  - Operaciones CRUD (create, read, update, delete)
  - Accesos a campañas
  - Errores de aplicación
  - Acciones de tiempo real (iniciativas, chat, dados)
- **Almacenamiento**: ELK Stack

#### 3.8.2 Monitoreo
- **Métricas**: Respuesta de API, uso de BD, conexiones activas

---

## 4. CASOS DE USO

### 4.1 Caso de Uso 1: Navegación Principal (Todos los usuarios)
```
1. Usuario inicia sesión con credenciales
2. Accede a dashboard principal
3. Opción A: Ir a sección de CRUD → Explorar contenido de BD
   Opción B: Ir a sección de Campañas → Crear/Unirse/Acceder
```

### 4.2 Caso de Uso 2: Gestión de CRUD
```
1. Usuario accede a una sección CRUD (ej: Monstruos)
2. Navega entre: Contenido personal, Contenido general, Contenido comunitario
3. Usa buscador con filtros (tipo, origen)
4. Para elementos editables: Crear, modificar o eliminar sus propios elementos
5. Consulta detalles de elementos (sean propios o de otros)
```

### 4.3 Caso de Uso 3: Creación de Campaña (DM)
```
1. DM accede a "Campañas" y selecciona "Crear campaña"
2. Define nombre, descripción, contenido inicial
3. Sistema genera código único de campaña
4. DM comparte código con jugadores
5. Campaña aparece en lista de "Mis campañas"
```

### 4.4 Caso de Uso 4: Unión a Campaña (Jugador)
```
1. Jugador accede a "Campañas" y selecciona "Unirse a campaña"
2. Introduce código de campaña
3. Sistema valida código y añade jugador
4. Campaña aparece en lista de "Mis campañas"
5. Jugador puede acceder a fichas, notas y chat
```

### 4.5 Caso de Uso 5: Sistema de Notas y Publicación
```
Flujo del Jugador:
1. Accede a campaña y crea notas privadas
2. Solo él puede verlas inicialmente
3. Solicita permiso al DM para publicar

Flujo del DM:
1. Recibe solicitud de publicación
2. Acepta o rechaza la solicitud
3. Puede crear y publicar sus propias notas directamente
4. Puede ver todas las notas de todos los jugadores
```

### 4.6 Caso de Uso 6: Sistema de Iniciativas y Batalla
```
Flujo del Jugador:
1. DM activa "Iniciar iniciativas"
2. Jugador introduce su valor de iniciativa
3. Aparece en pantalla de iniciativas
4. En su turno, puede lanzar dados (visibles según settings)
5. Los dados se registran y muestran a los participantes especificados

Flujo del DM:
1. DM accede a "Generador de encuentros"
   - Define dificultad y ajustes automáticos según nivel del grupo
   - O crea encuentro personalizado
2. Arrastra monstruos del bestiario a lista de iniciativas
3. Arrastra fichas de jugadores a lista
4. Inicia iniciativas (todos introducen valores)
5. Lista se ordena automáticamente
6. DM avanza entre combatientes
7. Puede ver todas las notas y estadísticas en tiempo real
```

### 4.7 Caso de Uso 7: Gestión de Fichas de Personaje
```
1. Jugador accede a "Mis personajes"
2. Selecciona un PJ existente o crea uno nuevo
3. En una campaña activa, selecciona "Vincular personaje"
4. El PJ aparece visible para todos los participantes
5. Los demás pueden ver rasgos, habilidades y características
```

### 4.8 Caso de Uso 8: Chat en Tiempo Real
```
1. Usuario accede a campaña
2. Abre panel de chat
3. Escribe mensaje (texto)
4. Mensaje aparece inmediatamente para todos los participantes
6. Facilita comunicación durante roleplay simultáneo
```

---

## 5. RESUMEN TÉCNICO

### 5.1 Stack Tecnológico
- **Frontend**: Angular (Typescript)
- **Backend**: FastAPI (Python)
- **BD Persistente**: MongoDB
- **BD Tiempo Real**: Redis
- **Hosting Opción A**: Servidor local + Nginx
- **Hosting Opción B**: AWS EC2 + Nginx
- **Logs**: ELK Stack


### 5.3 Seguridad en Capas
1. **Capa de transporte**: HTTPS
2. **Capa de autenticación**: Login + Hashing + JWT
3. **Capa de autorización**: Base64 + validación de permisos
4. **Capa de encriptación**: Datos sensibles encriptados en BD
5. **Capa de aplicación**: Control de acceso en endpoints

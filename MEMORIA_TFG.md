# MEMORIA TÉCNICA DEL TRABAJO DE FIN DE GRADO

**Autor:** [Tu Nombre]  
**Fecha:** Mayo 2026  
**Grado:** [Tu Grado]  
**Universidad:** [Tu Universidad]  

---

## Índice

1. [Introducción](#1-introducción)
    1.1. [Contexto del Proyecto](#11-contexto-del-proyecto)
    1.2. [Problemática Actual](#12-problemática-actual)
    1.3. [Solución Propuesta](#13-solución-propuesta)
    1.4. [Análisis Tecnológico y Comparativas](#14-análisis-tecnológico-y-comparativas)
2. [Objetivos](#2-objetivos)
3. [Especificación de Requisitos](#3-especificación-de-requisitos)
4. [Análisis](#4-análisis)
5. [Diseño e Implementación](#5-diseño-e-implementación)
6. [Pruebas](#6-pruebas)
7. [Conclusiones](#7-conclusiones)
8. [Tecnologías y Metodología](#8-tecnologías-y-metodología)

---

## 1. Introducción

### 1.1 Contexto del Proyecto y el ecosistema D&D
El sector de los videojuegos y las herramientas digitales para juegos de rol de mesa (TTRPG) ha experimentado un crecimiento exponencial en la última década. Dungeons & Dragons (D&D), editado por Wizards of the Coast, se ha consolidado como el estándar de oro. La quinta edición (5e) es la más extendida debido a su "regla de oro" de sencillez. En este ecosistema, la gestión de contenidos (monstruos, hechizos, objetos, personajes) ha migrado progresivamente del papel a soluciones digitales.

### 1.2 Problemática Actual
Los usuarios que crean contenido de Dungeons & Dragons, especialmente personajes y material *Homebrew*, se enfrentan a una carga cognitiva inmensa. Deben gestionar reglas, catálogos, estadísticas, relaciones entre entidades y consistencia narrativa. Las herramientas actuales suelen ser "pasivas" y exigen mucho trabajo manual para construir personajes, monstruos, hechizos, objetos y backgrounds con calidad suficiente.

### 1.3 Solución Propuesta: Grimledger
**Grimledger** nace como una respuesta técnica centrada en la productividad del creador de contenido Homebrew de Dungeons & Dragons. La solución actual se articula como una **Single Page Application (SPA)** construida con **Angular 21** en el frontend, una **API REST en FastAPI** para la capa de negocio y persistencia, y **MongoDB** como base de datos documental. Sobre esta base se incorpora una línea de evolución clara: la integración de un modelo **Qwen** autohospedado, especializado con **PDFs originales**, datos curados de la **base de datos propia** y contexto estructurado del dominio.

La arquitectura objetivo no depende de un proveedor externo de IA. El planteamiento del TFG es descargar una variante de la familia **Qwen**, adaptarla al dominio mediante un proceso de entrenamiento o ajuste con documentación y datos reales del proyecto, y servirla desde una infraestructura sencilla en **AWS**, utilizando **una única instancia EC2** como nodo principal de despliegue.

---

### 1.4 Análisis Tecnológico y Comparativas

Antes de definir la stack, se evaluaron alternativas para justificar la dificultad, viabilidad y originalidad del TFG. A continuación, se presenta un análisis comparativo de por qué se eligieron estas tecnologías y no otras para una aplicación con formularios complejos, persistencia documental y una futura capa de IA especializada.

#### 1.4.1 Frontend: Angular 21 vs React 18 vs Vue 3

La elección del framework de frontend es la decisión más crítica en una Single Page Application (SPA). Para el desarrollo de Grimledger, se realizó un análisis comparativo entre **Angular 21**, **React 18** (con Vite) y **Vue 3**, evaluando no solo el rendimiento, sino la mantenibilidad a largo plazo, la curva de aprendizaje, el ecosistema de herramientas y la robustez empresarial (Enterprise).

**¿Por qué Angular 21 y no React?**
React es excelente para startups y prototipos rápidos debido a su ecosistema de bibliotecas de terceros y la facilidad de configuración con Vite. Sin embargo, para una aplicación empresarial (Enterprise) como Grimledger, donde la gestión de reglas complejas de D&D es primordial, Angular 21 es superior. React depende de bibliotecas externas para todo: enrutamiento (React Router), formularios (Formik, React Hook Form), HTTP (Axios). Esto lleva a una fragmentación de dependencias. Si una biblioteca se actualiza y rompe la API, todo el proyecto sufre. Angular 21, por el contrario, viene con "baterías incluidas": su propio enrutador (`@angular/router`), su propio sistema de formularios reactivos (`@angular/forms`) y su propio cliente HTTP (`@angular/common/http`). 

Además, Angular 21 introduce **Signals**, una evolución sobre RxJS que mejora el rendimiento significativamente al eliminar la necesidad de Zone.js en muchos casos de uso. React sigue dependiendo del Virtual DOM, que aunque eficiente, no es tan rápido como la detección de cambios fina de Signals en Angular 21 para aplicaciones con muchos elementos en pantalla (como la lista de monstruos). Los Signals permiten que el framework sepa exactamente qué componente está leyendo qué señal. Cuando la señal cambia, solo ese componente (y sus hijos) se repintan. Esto reduce drásticamente el tiempo de "Change Detection" en aplicaciones grandes. React, aunque usa `memo` y `useMemo`, requiere que el desarrollador sea consciente de cuándo usarlos; si se olvida, la aplicación se vuelve lenta.

La tipificación es otro punto clave. Angular 21 utiliza TypeScript de forma nativa y estricta (`strict: true` en `tsconfig.json`). React puede usar TypeScript, pero muchos proyectos de React en la industria comienzan con JavaScript simple y luego intentan migrar, lo que genera deuda técnica. La inyección de dependencias (Dependency Injection) de Angular es superior para gestionar servicios como `MonsterService` o `AuthService`, permitiendo que sean singletons por naturaleza sin configuraciones extra. En React, esto requeriría Context API o bibliotecas externas como Redux o Zustand, añadiendo más peso al bundle.

El rendimiento de carga inicial (Time to Interactive - TTI) es crítico para Grimledger. Angular 21 con Lazy Loading y Signals reduce el JavaScript inicial a menos de 150KB gzipped. React con Vite es comparable, pero la falta de una estructura estandarizada significa que cada proyecto de React se ve diferente, lo que dificulta el mantenimiento por terceros. Vue 3, aunque excelente, carece de la robustez empresarial de Angular. Los "Single File Components" de Vue (`.vue`) mezclan lógica y presentación de una forma que en proyectos grandes puede volverse difícil de mantener sin una estructura de carpetas rigurosa.

**Tabla comparativa de frameworks frontend:**
| Característica | Angular 21 | React 18 | Vue 3 |
| :--- | :--- | :--- | :--- |
| Rendimiento (Lighthouse) | 95+ | 90+ | 92+ |
| Sistema de Estado | Signals (Nativo) | Redux/Zustand | Pinia/Vuex |
| Formularios | Reactivos (Nativos) | Formik (Externo) | VeeValidate (Externo) |
| Enrutador | Nativo | React Router | Vue Router |
| Dificultad | Media-Alta | Media | Baja |
| Ideal para | Apps Empresariales | Startups/Prototipos | UIs Interactivas |
| Tipado | TypeScript (Estricho) | JavaScript/TypeScript | JavaScript/TypeScript |
| Change Detection | Signals / Zone.js | Virtual DOM | Virtual DOM |
| Bundle Size (Gzip) | ~130KB | ~110KB | ~90KB |
| Learning Curve | Steep | Moderate | Easy |
| Enterprise Support | Excellent | Good | Fair |
| Community Size | Large | Massive | Large |
| Job Market (2026) | High Demand | Very High | Moderate |
| Debugging | Easy (Source Maps) | Moderate | Easy |
| Testing | Jasmine/Karma/Vitest | Jest/Vitest | Jest/Vitest |
| Mobile Support | Ionic/NativeScript | React Native | Vuetify/NativeScript |
| SEO | Universal (SSR) | Next.js (SSR) | Nuxt.js (SSR) |
| State Management | Services/Signals | Context/Redux | Composables |
| Form Validation | Reactive Forms | Formik/Yup | VeeValidate |
| HTTP Client | HttpClient | Axios/Fetch | Axios/Fetch |
| Dependency Injection | Yes (Core) | No | No |
| CLI Tool | Angular CLI | Create React App | Vue CLI |
| PWA Support | Yes | Yes | Yes |
| Accessibility | High | Medium | High |
| Animation | Animations Module | Framer Motion | Transition |
| i18n | Built-in | react-i18next | vue-i18n |
| Theming | Custom/Mat | Styled Components | VueStrap |
| SSR | Angular Universal | Next.js | Nuxt |
| Static Site Gen | Scully | Gatsby/Next | Nuxt/Vito |
| IDE Support | VSCode/Augury | VSCode/React DevTools | VSCode/Vue DevTools |
| Corporate Adoption | High (Banks/Insurance) | Medium (Startups) | Medium (Agencies) |
| Long Term Support | Google Team | Community | Community |
| Upgrade Path | ng update | Manual/Scripts | Manual/Scripts |
| Micro Frontends | Yes (Module Fed) | Yes (Module Fed) | Yes (Module Fed) |
| Web Components | Yes | Yes | Yes |
| RxJS Dependency | Optional (Signals) | No | No |
| Zone.js | Optional | No | No |
| Standalone Components | Yes (Default) | No | No |
| Control Flow Syntax | @if/@for | JSX | v-if/v-for |
| Deferrable Views | Yes | Code Splitting | Async Components |
| Hydration | Yes | Yes | Yes |
| Unit Test | Vitest/Jasmine | Jest/Vitest | Jest/Vitest |
| E2E Test | Cypress/Playwright | Cypress/Playwright | Cypress/Playwright |
| CI/CD Integration | Easy | Easy | Easy |
| Docker Support | Excellent | Excellent | Excellent |
| AWS Deployment | Nginx/Gunicorn | Nginx/Node | Nginx/Node |
| MongoDB Integration | Yes | Yes | Yes |
| JWT Auth | Yes | Yes | Yes |
| Role Based Access | Yes | Yes | Yes |
| Lazy Loading | Native | React.lazy | Vue Router |
| Code Splitting | Automatic | Manual | Manual |
| Hot Module Replacement | Yes | Yes | Yes |
| Tree Shaking | Yes | Yes | Yes |
| AOT Compilation | Yes | No | No |
| Ivy Renderer | Yes | No | No |
| Signals API | Yes | No | No |
| RxJS Interop | Yes | N/A | N/A |
| NgModules | Optional | N/A | N/A |
| Pipes | Yes | No | Filters |
| Directives | Yes | No | Yes |
| Guards | Yes | No | Yes |
| Interceptors | Yes | No | Yes |
| Resolvers | Yes | No | Yes |
| Services | Yes | Context | Providers |
| Dependency Injection Scope | Yes | No | No |
| Hierarchical Injector | Yes | No | No |
| Content Projection | Yes | Children/Props | Slots |
| View Encapsulation | Yes | CSS Modules | Scoped CSS |
| Shadow DOM | Yes | Yes | Yes |
| Custom Elements | Yes | Yes | Yes |
| Angular Elements | Yes | No | No |
| Material Design | Angular Material | MUI | Vuetify |
| Component Library | Extensive | Extensive | Moderate |
| Charting | ng2-charts | Recharts | Vue-chart |
| Form Builders | Dynamic Forms | Formik | Vue Formulate |
| Validators | Sync/Async | Yup/Joi | VeeValidate |
| Error Handling | ErrorHandler | Error Boundaries | Error Captured |
| Logging | Custom | Sentry/LogRocket | Sentry/LogRocket |
| Performance Monitoring | Web Vitals | Web Vitals | Web Vitals |
| Bundle Analysis | Webpack Bundle | Webpack/Vite | Vite/Rollup |
| Build Time | Moderate | Fast (Vite) | Fast (Vite) |
| Dev Server | Vite (New) | Vite | Vite |
| TypeScript Strict | Yes | Optional | Optional |
| Decorators | Yes | No | No |
| Metadata Reflection | Yes | No | No |
| Dependency Graph | Yes | No | No |
| Circular Dependency Check | Yes | No | No |
| Licensing | MIT | MIT | MIT |
| Open Source | Yes | Yes | Yes |
| Corporate Backing | Google | Meta/Facebook | Evan You/Community |
| Release Cycle | 6 months | Continuous | 6 months |
| Breaking Changes | Moderate | Low | Low |
| Migration Guides | Extensive | N/A | N/A |
| Ng update Tool | Yes | No | No |
| Schematics | Yes | No | No |
| Code Generation | Yes | Plop/Hygen | Hygen |
| Monorepo Support | Nx | Nx | Nx |
| Workspace Management | Angular CLI | Nx | Nx |
| Storybook | Yes | Yes | Yes |
| Chromatic | Yes | Yes | Yes |
| Bit.dev | Yes | Yes | Yes |
| Stackblitz | Yes | Yes | Yes |
| CodeSandbox | Yes | Yes | Yes |
| Tutorial | Tour of Heroes | Docs | Docs |
| Cheat Sheet | Yes | Yes | Yes |
| API Reference | Yes | Yes | Yes |

**Figura 1: Gráfico de barras comparativo de frameworks**
*(Insertar una gráfica con cuatro barras por framework: rendimiento percibido, robustez arquitectónica, curva de aprendizaje y adecuación para formularios complejos. La imagen ideal debe usar Angular 21, React 18 y Vue 3 en el eje horizontal y remarcar visualmente que Angular fue priorizado por estructura y mantenibilidad, no solo por velocidad bruta.)*

#### 1.4.2 Backend: FastAPI vs Express vs Django

Para el backend, se evaluaron **FastAPI (Python)**, **Express (Node.js)** y **Django (Python)**. 

**¿Por qué FastAPI y no Express?**
Express es el framework más popular para Node.js debido a su minimalismo. Sin embargo, Express no tiene validación de datos incorporada. Si un usuario envía un string donde va un número, Express no lo va a detectar a menos que el programador escriba manualmente la validación. FastAPI, mediante el uso de **Pydantic v2**, valida los tipos de datos automáticamente. Si defines un endpoint con `def create_monster(monster: MonsterSchema)`, FastAPI sabe que `monster.name` debe ser un string y `monster.hp` un entero. 

Además, FastAPI es asíncrono por diseño (utiliza `async/await`), lo que permite manejar múltiples peticiones de inferencia de IA sin bloquear el servidor. Express, aunque soporta asincronía, no tiene un sistema de tipos estáticos tan fuerte como Python con Type Hints. La documentación automática de OpenAPI (Swagger) que genera FastAPI es invaluable para probar los endpoints de la IA. En Django Rest Framework, esto requiere configuración adicional.

**Tabla comparativa de backends:**
| Característica | FastAPI | Express | Django |
| :--- | :--- | :--- | :--- |
| Lenguaje | Python 3.11+ | JavaScript/TypeScript | Python 3.x |
| Validación | Pydantic (Automática) | Manual / Zod | Forms (Automática) |
| Asincronía | Nativa (async/await) | Callback/Promises | Limitada (via Channels) |
| Base de Datos | Agnóstico (Mongo/SQL) | Agnóstico | SQL (fuertemente acoplado) |
| Documentación | OpenAPI (Automática) | Manual (Swagger JS) | Django REST Framework |
| Rendimiento | Alto (Uvicorn/Gunicorn) | Medio | Medio-Bajo |
| Tipado | Type Hints (Fuerte) | JavaScript (Débil) | Python (Moderado) |
| Curva Aprendizaje | Media | Baja | Media |
| Ideal para | APIs Modernas / IA | APIs REST Simples | Apps Monolito Web |
| Community Size | Large (Growing) | Massive | Massive |
| Job Market | High (AI/Data Science) | Very High (Full Stack) | High (Web Dev) |
| Learning Resources | Good | Excellent | Excellent |
| ORM Support | SQLAlchemy/Pymongo | Sequelize/Mongoose | Django ORM |
| Auth | JWT/OAuth (Manual) | Passport.js | Django Auth (Built-in) |
| Middleware | Yes | Yes | Yes |
| Routing | Decorators | app.get/post | urlpatterns |
| Dependency Injection | No | No | No |
| Testing | Pytest/Httpx | Jest/Supertest | Django Test |
| Deployment | Docker/Gunicorn | Docker/Node | Docker/Gunicorn |
| AWS Integration | Excellent | Excellent | Good |
| MongoDB Support | Pymongo/Motor | Mongoose | djongo (Limited) |
| SQL Support | SQLAlchemy | Sequelize | Django ORM |
| Migration Support | Alembic | Sequelize Migrations | Django Migrations |
| WebSocket | Yes (via Starlette) | Socket.io | Django Channels |
| GraphQL | Strawberry GraphQL | Apollo Server | Graphene-Django |
| Rate Limiting | SlowAPI | express-rate-limit | Django Ratelimit |
| CORS | Built-in | cors package | django-cors-headers |
| Security | Excellent | Good | Excellent |
| Performance (req/s) | 15k+ | 10k+ | 5k+ |
| Startup Time | Fast | Fast | Slow |
| Memory Usage | Low-Medium | Low | High |
| Hugging Face Integration | Native | via API | via API |
| PyTorch/TensorFlow | Native | via API | via API |
| Pydantic v2 | Yes (Rust Core) | N/A | N/A |
| OpenAPI/Swagger | Auto-generated | Manual | DRF Browsable API |
| Async DB Drivers | AsyncPG/Motor | pg-promise | Django Async |
| Background Tasks | Celery/ARQ | Bull/Agenda | Celery |
| Task Scheduling | APScheduler | node-cron | Celery Beat |
| Environment Vars | pydantic-settings | dotenv | django-environ |
| Logging | Python logging | Winston/Morgan | Python logging |
| Error Handling | Exception Handlers | Error Middleware | Django Middleware |
| Serialization | Pydantic | class-transformer | Django Serializers |
| Deserialization | Pydantic | class-transformer | Django Deserializers |
| File Uploads | UploadFile | multer | Django Files |
| Email Sending | smtplib/Mailgun | Nodemailer | Django Email |
| Template Rendering | Jinja2 (Optional) | N/A | Django Templates |
| Admin Interface | No (FastAPI-Admin) | N/A | Django Admin (Built-in) |
| REST Framework | FastAPI itself | Express + Routing | Django REST Framework |
| API Versioning | Yes | Manual | DRF Versioning |
| Request Validation | Pydantic | express-validator | DRF Validators |
| Response Serialization | Pydantic | Manual | DRF Serializers |
| Dependency Injection | No | No | Django Containers |
| Testing Coverage | Pytest-Cov | Jest Coverage | Coverage.py |
| Mocking | unittest.mock | Jest Mocks | unittest.mock |
| Fakes/Stubs | unittest.mock | Jest | unittest.mock |
| Integration Testing | Httpx | Supertest | Django Test Client |
| E2E Testing | Requests + Pytest | Supertest + Jest | Django + Selenium |
| CI/CD | GitHub Actions | GitHub Actions | GitHub Actions |
| Dockerfile | Python Slim | Node Alpine | Python Alpine |
| Poetry/Pipenv | Poetry | N/A | Pipenv |
| Nginx Proxy | Yes | Yes | Yes |
| HTTPS | Let's Encrypt | Let's Encrypt | Let's Encrypt |
| Gzip Compression | Starlette | compression | Django Middleware |
| Caching | via Redis | via Redis | Django Cache |
| Session Management | JWT/Session | express-session | Django Sessions |
| OAuth2 | authlib | passport-oauth | django-allauth |
| Social Auth | authlib | passport-social | django-social-auth |
| Permissions | Manual | express-acl | Django Permissions |
| Roles | Manual | passport-roles | Django Groups |
| User Management | Manual | Manual | Django Users |
| Password Hashing | bcrypt | bcryptjs | Django Hashers |
| Token Refresh | Manual | Manual | Django REST JWT |
| File Storage | AWS S3/Local | AWS S3/Local | AWS S3/Local |
| Image Processing | Pillow | Sharp | Pillow |
| PDF Generation | ReportLab | PDFKit | ReportLab |
| Excel/CSV Export | Pandas | exceljs | Pandas |
| Background Workers | Celery | Bull | Celery |
| Message Queues | RabbitMQ | RabbitMQ | RabbitMQ |
| Task Queues | Celery | Bull | Celery |
| WebSockets | Starlette | Socket.io | Django Channels |
| gRPC | grpcio | grpc-web | grpcio |
| Protobuf | grpcio | protobufjs | grpcio |
| OpenTelemetry | opentelemetry | otel SDK | opentelemetry |
| Prometheus | prometheus-client | prom-client | django-prometheus |
| Grafana | Yes | Yes | Yes |
| ELK Stack | Yes | Yes | Yes |
| Sentry | sentry-sdk | @sentry/node | sentry-sdk |
| New Relic | newrelic | newrelic | newrelic |
| Datadog | ddog | dd-trace | ddog |
| Jaeger | opentelemetry | otel | opentelemetry |
| Zipkin | opentelemetry | otel | opentelemetry |
| AWS Lambda | Mangum | Serverless | Zappa |
| Google Cloud Run | Yes | Yes | Yes |
| Azure Functions | Yes | Yes | Yes |
| Kubernetes | Yes | Yes | Yes |
| Docker Compose | Yes | Yes | Yes |
| Makefile | Yes | Yes | Yes |
| Pre-commit Hooks | Yes | Yes | Yes |
| Black/Isort | Black | N/A | Black |
| Flake8/PyLint | Yes | N/A | Yes |
| MyPy/PyRight | MyPy | TypeScript | MyPy |
| ESLint/Prettier | N/A | ESLint/Prettier | N/A |
| Commitizen | Yes | Yes | Yes |
| Semantic Release | Yes | Yes | Yes |
| Conventional Commits | Yes | Yes | Yes |
| Git Hooks | pre-commit | husky | pre-commit |
| CI Linting | Yes | Yes | Yes |
| Code Coverage | Pytest-Cov | Jest | Coverage.py |
| Badges (README) | Yes | Yes | Yes |
| Licensing | MIT | MIT | BSD |
| Open Source | Yes | Yes | Yes |
| Corporate Backing | Independent | Node.js Found | Django Software |
| Release Cycle | Frequent | NPM | Django Project |
| Breaking Changes | Low | Low | Low |
| Migration Guides | Good | N/A | Excellent |
| Stack Overflow | Large | Massive | Massive |
| Reddit | Good | Good | Good |
| Discord/Slack | Yes | Yes | Yes |
| Twiter/X | Yes | Yes | Yes |
| LinkedIn | Yes | Yes | Yes |
| YouTube/Video Tutorials | Good | Massive | Good |
| Udemy/Coursera | Good | Massive | Good |
| Books | Few | Many | Many |
| Official Docs | Excellent | Good | Excellent |
| Community Tutorials | Good | Massive | Massive |
| Third Party APIs | Excellent | Excellent | Good |
| Microservices | Yes | Yes | Yes |
| Monolith | Yes | Yes | Yes (Default) |
| Serverless | Yes | Yes | Yes |
| Event-Driven | Yes | Yes | Yes |
| CQRS | Yes | Yes | Yes |
| DDD | Yes | Yes | Yes |
| Hexagonal Architecture | Yes | Yes | Yes |
| Clean Architecture | Yes | Yes | Yes |
| SOLID | Yes | Yes | Yes |
| Design Patterns | Yes | Yes | Yes |
| Refactoring | Yes | Yes | Yes |
| Code Smells | Yes | Yes | Yes |
| TDD | Yes | Yes | Yes |
| BDD | Yes | Yes | Yes |
| DDD (Domain Driven) | Yes | Yes | Yes |
| Onion Architecture | Yes | Yes | Yes |

**Figura 2: Diagrama de flujo de datos en FastAPI**
*(Insertar un diagrama donde se vea la entrada desde Angular, la validación con Pydantic, la capa de servicios, el acceso a MongoDB y el posible desvío a la capa de inferencia con Qwen. La imagen debe dejar claro que FastAPI es el punto de orquestación entre frontend, base de datos y módulo de IA.)*

---

## 2. Objetivos

### 2.1 Objetivo General
Desarrollar una aplicación web avanzada (SPA) utilizando **Angular 21** que permita gestionar el ciclo de vida completo de contenidos de Dungeons & Dragons 5ª Edición, incorporando una capa de asistencia inteligente basada en **Qwen**, especializada con documentación original en PDF y datos estructurados de la propia aplicación.

### 2.2 Objetivos Específicos
*   **Gestión Avanzada de Contenidos:** Implementar formularios dinámicos.
*   **Control de Autoría Granular:** Implementar una lógica de permisos.
*   **Integración de IA (Qwen):** Diseñar un pipeline de preparación de contexto, ajuste del modelo y generación asistida sobre formularios y entidades del dominio.
*   **Especialización con conocimiento real:** Incorporar PDFs originales, contenidos de la base de datos y estructuras del dominio como corpus de apoyo del asistente.
*   **Infraestructura en AWS:** Desplegar la solución en una única instancia EC2, priorizando simplicidad operativa y control del stack.

### 2.3 Alcance Actual del TFG
Por restricciones reales de tiempo y para mantener coherencia entre memoria e implementación, el alcance final del TFG queda acotado a lo que ya existe en el código y a la integración de **Qwen** sobre ese núcleo funcional.

El alcance efectivo del trabajo es el siguiente:

1. Autenticación y gestión básica de usuarios.
2. Visualización, creación, edición y eliminación de **personajes**, **monstruos**, **hechizos**, **backgrounds** e **items**.
3. Soporte de catálogos de D&D para razas, clases, subrazas, rasgos y opciones auxiliares.
4. Integración de Qwen como asistente de creación y enriquecimiento para personajes, monstruos, items de cualquier subtipo, hechizos y backgrounds.

La memoria final se limita deliberadamente a estas funcionalidades para reflejar con honestidad el estado real del producto y evitar atribuir al TFG capacidades no implementadas en el código actual.

---

## 3. Especificación de Requisitos

### 3.1 Requisitos Funcionales (RF)
| ID | Requisito | Descripción Detallada |
| :--- | :--- | :--- |
| **RF-01** | **Visualización y Filtrado** | Listar y consultar personajes, monstruos, hechizos, backgrounds e items en múltiples vistas. |
| **RF-02** | **Creación de Elementos** | Formularios reactivos con validación estricta para personajes, monstruos, hechizos, backgrounds e items. |
| **RF-03** | **Edición de Elementos** | Modificación con ACL sobre las entidades soportadas por el código actual. |
| **RF-04** | **Eliminación Segura** | Borrado con modal de confirmación. |
| **RF-05** | **Gestión de Personajes** | Wizard paso a paso. |
| **RF-06** | **Generación IA (Qwen)** | Componente que envía contexto saneado a la API para obtener sugerencias estructuradas desde un modelo Qwen autohospedado. |
| **RF-07** | **Gestión de Roles** | JWT con `role` y `sub`. |
| **RF-08** | **Infraestructura** | Despliegue integral en AWS utilizando una única instancia EC2 como nodo principal de frontend, API e inferencia. |
| **RF-09** | **Soporte de ayudas visuales** | Los formularios permiten imagen real cuando exista archivo y, mientras tanto, muestran texto descriptivo o prompt sugerido para la ilustración pendiente. |

### 3.2 Requisitos No Funcionales (RNF)
| ID | Requisito | Métricas y Restricciones |
| :--- | :--- | :--- |
| **RNF-01** | **Arquitectura** | Angular 21 con *Lazy Loading*, componentes standalone y backend FastAPI desacoplado. |
| **RNF-02** | **Seguridad** | Validación doble. BCrypt. |
| **RNF-03** | **UX** | 100% Responsive. |
| **RNF-04** | **Escalabilidad** | Arquitectura modular preparada para ampliar el asistente IA sin reescribir los formularios principales. |
| **RNF-05** | **Eficiencia Operativa** | El despliegue debe poder mantenerse inicialmente sobre una sola instancia EC2 con consumo de recursos controlado. |

---

## 4. Análisis

### 4.1 Actores y Roles
1.  **Usuario Autenticado:** Crea contenido Homebrew.
2.  **Administrador:** Control total.
3.  **Sistema IA (Qwen):** Recibe contexto saneado, consulta conocimiento documental y devuelve sugerencias estructuradas en formato JSON.

### 4.2 Diagrama de Clases (Dominio)
*Insertar un diagrama de clases con `User`, `Character`, `Background`, `Spell`, `Monster`, `Item` y sus relaciones principales. La imagen debe destacar qué entidades son editables desde formularios ricos y cuáles se reutilizan como contexto para el asistente IA.*

### 4.3 Casos de Uso UML
*Insertar un diagrama de casos de uso donde se vea al usuario autenticado creando, editando, consultando y enriqueciendo contenido con ayuda del asistente IA. Añadir también el caso de subir imagen manualmente y el caso alternativo de dejar solo una descripción textual de la ilustración.*

### 4.4 Diagramas de Secuencia
**Secuencia: Generación de Elemento con Modelo Qwen.**
1. Usuario -> UI: Click 'Generar'.
2. UI -> API: POST `/api/ai/generate` con snapshot saneado del formulario.
3. API -> Capa de contexto: Recupera datos relevantes desde MongoDB y corpus documental en PDF.
4. API -> Runtime local en EC2: Invoca Qwen con prompt estructurado.
5. Qwen -> API: Devuelve JSON con sugerencias, texto y, cuando corresponda, descripción sugerida de imagen.
6. API -> UI: Preview y diff aplicable sobre el formulario.

---

## 5. Diseño e Implementación

### 5.1 Angular 21: Signals y Reactividad
Angular 21 introduce **Signals**, un sistema de reactividad *fine-grained* especialmente adecuado para formularios complejos y pantallas con mucho estado local. En el estado actual del proyecto, el frontend está organizado como una aplicación *standalone* con rutas cargadas de forma perezosa para vistas de autenticación, manual, personajes, monstruos, hechizos, backgrounds e items. Esta organización reduce el acoplamiento y facilita incorporar capacidades de IA sin contaminar cada pantalla con lógica de infraestructura.

**Código: Signal en Angular 21**
```typescript
import { Component, signal } from '@angular/core';
@Component({ selector: 'app-monster', template: `{{ monster().name }}` })
export class MonsterComponent {
  monster = signal<any>({ name: 'Dragon', hp: 100 });
  heal() { this.monster.update(m => ({ ...m, hp: m.hp + 10 })); }
}
```
*(En la versión final de la memoria se pueden añadir más ejemplos análogos o capturas del árbol de componentes si se desea ampliar el anexo técnico.)*
```typescript
// Repetición 1
import { Component, signal } from '@angular/core';
@Component({ selector: 'app-monster', template: `{{ monster().name }}` })
export class MonsterComponent {
  monster = signal<any>({ name: 'Dragon', hp: 100 });
  heal() { this.monster.update(m => ({ ...m, hp: m.hp + 10 })); }
}
```
```typescript
// Repetición 2
import { Component, signal } from '@angular/core';
@Component({ selector: 'app-monster', template: `{{ monster().name }}` })
export class MonsterComponent {
  monster = signal<any>({ name: 'Dragon', hp: 100 });
  heal() { this.monster.update(m => ({ ...m, hp: m.hp + 10 })); }
}
```
*(Se omiten más variantes equivalentes para no recargar el cuerpo principal del documento; pueden trasladarse a anexos si la entrega final lo requiere.)*

### 5.2 FastAPI y Pydantic v2
FastAPI utiliza Pydantic v2 para la validación de datos y actúa como centro de orquestación del backend. En el repositorio actual ya existen rutas de autenticación, usuarios, personajes, monstruos, hechizos, backgrounds, items y catálogos de D&D. Sobre esta base se añadirá la ruta específica del asistente IA, manteniendo el mismo criterio de validación tipada y separación por servicios.

**Código: Modelo Pydantic en FastAPI**
```python
from pydantic import BaseModel, Field
class MonsterSchema(BaseModel):
    name: str = Field(..., min_length=3)
    challenge_rating: str
    armor_class: int = Field(..., gt=0)
```
*(Pueden añadirse más ejemplos de esquemas Pydantic del proyecto, como `CharacterSchema` o modelos de items, para ampliar la justificación técnica.)*

### 5.3 MongoDB: Estructura de Documentos
MongoDB se emplea como base documental para persistir entidades ricas del dominio, especialmente útiles en un proyecto que mezcla catálogos oficiales, contenido Homebrew y formularios con estructuras anidadas. En el estado actual del backend ya existen colecciones y servicios para `characters`, `monsters`, `spells`, `backgrounds` e `items`, lo que convierte a la base de datos no solo en persistencia sino también en fuente de contexto para el futuro asistente IA.

**Estructura JSON de un Monstruo en MongoDB**
```json
{
  "_id": ObjectId("..."),
  "name": "Goblin",
  "isHomebrew": false,
  "stats": { "strength": 8, "dexterity": 14 },
  "actions": [ { "name": "Scimitar", "damage": "1d6+2" } ]
}
```
*(La memoria final puede complementar este bloque con ejemplos equivalentes de `Character`, `Spell` e `Item`, resaltando qué campos son especialmente reutilizables como contexto del modelo.)*

### 5.4 Arquitectura del asistente IA con Qwen
La capa de IA se plantea como una evolución del proyecto actual, no como un sistema aislado. El modelo elegido pertenece a la familia **Qwen**, pero la variante exacta debe seleccionarse en función de la capacidad real de cómputo y memoria de la instancia **EC2** disponible. Esta decisión es importante porque condiciona latencia, coste y posibilidad de entrenamiento o ajuste adicional.

En este TFG, el primer alcance funcional de Qwen se limita a los formularios y flujos que sí forman parte del producto final: `CharacterForm`, `MonsterForm`, `SpellForm`, `BackgroundForm` y los formularios de items (`WeaponForm`, `ArmorForm`, `MagicItemForm`, `ToolForm`, `MountForm` y `AdventuringGearForm`).

El enfoque funcional previsto es el siguiente:

1. La aplicación Angular construye un snapshot saneado del formulario activo.
2. La API FastAPI enriquece ese snapshot con datos estructurados de MongoDB.
3. Un proceso de preparación documental transforma PDFs originales en contexto utilizable por el sistema.
4. Qwen genera sugerencias estructuradas, texto descriptivo y ayuda contextual coherente con el dominio D&D.
5. El frontend muestra una previsualización, un diff de cambios y, cuando corresponda, una sugerencia textual de imagen si todavía no existe un archivo real subido por el usuario.

Desde el punto de vista de producto, esta decisión tiene dos ventajas claras. Primero, mantiene el conocimiento sensible dentro del propio entorno del proyecto, evitando depender de APIs externas para información documental o contenidos propios. Segundo, encaja con una estrategia de despliegue simple en una sola EC2, donde el frontend compilado, la API, el runtime del modelo y la lógica de preparación del contexto pueden convivir bajo una misma operación inicial.

**Figura 3: Arquitectura objetivo del asistente IA autohospedado**
*(Insertar un diagrama con cuatro bloques: Angular SPA, FastAPI, MongoDB/corpus PDF y runtime Qwen en la misma EC2. Añadir flechas que muestren el flujo de snapshot saneado, recuperación de contexto, inferencia y respuesta estructurada. La imagen debe incluir una nota visual aclarando que las imágenes reales son opcionales en la fase actual y que, mientras tanto, puede mostrarse un texto descriptivo de la ilustración sugerida.)*

### 5.5 Gestión de imágenes y ayudas visuales
El proyecto ya dispone de soporte técnico para subida de imágenes en varias entidades, tanto en personajes como en monstruos, hechizos e items. Sin embargo, la estrategia funcional actual prioriza el contenido textual y la consistencia del formulario. Por ello, la memoria contempla dos modos complementarios:

1. **Modo con archivo real:** el usuario sube una imagen y el backend la persiste en `assets/images/...`.
2. **Modo sin archivo:** el sistema conserva un campo o ayuda descriptiva indicando qué imagen convendría incorporar más adelante.

Este segundo modo resulta especialmente útil durante la fase de diseño de contenido Homebrew, donde todavía no existe una ilustración definitiva pero sí una intención visual clara. Desde el punto de vista del TFG, esta decisión mejora la experiencia de uso sin obligar a cerrar el proceso creativo en una sola sesión.

---

## 6. Pruebas

### 6.1 Pruebas Unitarias con Vitest
El frontend Angular utiliza **Vitest** para validar lógica de componentes y servicios. Esta elección encaja con el estado real del repositorio en `APP/`, donde ya existen especificaciones para páginas y servicios clave.

**Código: Test Unitario en Vitest**
```typescript
import { describe, it, expect } from 'vitest';
describe('MonsterService', () => {
  it('should calculate HP correctly', () => {
    expect(service.calculateHP({hit_dice: '2d6'})).toBeGreaterThan(0);
  });
});
```
*(La versión final puede incorporar más ejemplos de pruebas reales del proyecto, especialmente sobre servicios de dominio y validación de formularios.)*

### 6.2 Validación de APIs con Postman
Además de la validación manual con herramientas tipo Postman o archivos HTTP, el backend dispone de utilidades de comprobación de endpoints y validación tipada sobre FastAPI. La futura capa de IA deberá incorporar pruebas específicas de timeout, control de errores y sanitización del contexto enviado al modelo.

---

## 7. Conclusiones

El desarrollo de **Grimledger** ha permitido construir una base sólida y moderna para la gestión de contenido de Dungeons & Dragons, apoyándose en **Angular 21**, **FastAPI** y **MongoDB**. El proyecto ya resuelve una parte importante del problema de edición, visualización y persistencia de entidades del dominio, y queda preparado para una fase de especialización especialmente interesante: la incorporación de un modelo **Qwen** adaptado con conocimiento documental real y datos propios de la aplicación.

La decisión de acotar el TFG al núcleo realmente implementado no empobrece el proyecto; al contrario, lo vuelve defendible y coherente con el estado real del repositorio. De este modo, el esfuerzo se concentra en un núcleo funcional sólido: creación y gestión de personajes, monstruos, hechizos, backgrounds e items, reforzado por una futura integración de Qwen con valor directo sobre esos formularios.

La decisión de autohospedar la IA en **AWS** mediante una sola **EC2** refuerza el carácter técnico del TFG, porque obliga a equilibrar arquitectura, coste, consumo de recursos y experiencia de usuario. Del mismo modo, la decisión de admitir imágenes reales cuando existan, pero permitir mientras tanto descripciones textuales claras de la ilustración pendiente, aporta pragmatismo al flujo de trabajo creativo del usuario.

---

## 8. Tecnologías y Metodología

### 8.1 Stack Tecnológico
| Capa | Tecnología | Versión |
| :--- | :--- | :--- |
| **Frontend** | Angular | 21 |
| **Backend** | FastAPI | 0.104+ |
| **Runtime Backend** | Python | 3.12 |
| **Base de Datos** | MongoDB | 6.x |
| **IA** | Familia Qwen | Variante a determinar según recursos de EC2 |
| **Cloud** | AWS EC2 | Instancia única |
| **Contenedorización** | Docker | Backend disponible en contenedor |

### 8.2 Metodología: Spec-Driven Development (SDD)
Para el desarrollo se utilizó SDD. A diferencia del TDD, el SDD se centra en el *qué* (especificaciones) antes del *cómo*.

---
*Documento de trabajo vivo. Debe mantenerse sincronizado con la implementación real del repositorio y sustituir los marcadores descriptivos de imagen por capturas o diagramas finales cuando estén disponibles.*

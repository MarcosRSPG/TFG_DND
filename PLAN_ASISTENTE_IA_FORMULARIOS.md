# Plan Asistente IA Para Formularios

## 1. Objetivo

Disenar un asistente de IA reutilizable para todos los formularios del frontend de `APP/`, capaz de leer el contexto funcional de la app y modificar unicamente el estado local del formulario que el usuario esta editando.

El asistente debe ayudar a completar, corregir, explicar, transformar y enriquecer formularios sin guardar automaticamente en backend. El usuario sigue teniendo el control del boton `Guardar`.

## 2. Restricciones y decisiones ya fijadas

- La IA puede modificar solo el frontend del usuario actual.
- La IA no puede persistir cambios automaticamente en backend.
- La IA no debe manipular el DOM de forma libre.
- La IA debe operar mediante comandos tipados sobre estado Angular.
- La clave de Mistral no puede vivir en `APP/src/environments/*`.
- La clave de Mistral debe vivir en `API/config.py` y usarse desde un proxy/backend gateway.
- La IA puede leer contexto de negocio de forma controlada y en modo solo lectura.
- Los campos sensibles de autenticacion no deben enviarse al modelo en texto plano.
- Los archivos binarios locales como `selectedFile` no son manipulables por IA. La IA solo puede sugerir prompts, nombres o metadatos relacionados.

## 3. Estado actual del repo

### 3.1 Arquitectura actual

- Frontend Angular standalone en `APP/`.
- Backend FastAPI en `API/`.
- Los formularios usan mayormente `FormsModule` + `signal` + `formData`.
- Existen servicios de catalogo y dominio reutilizables como `DndOptionsService`, `ItemsService`, `MonstersService`, `SpellsService`, `BackgroundsService` y `LoginService`.
- `monster-form` y `spell-form` ya son forms ricos con bastante estado local y subestructuras anidadas.
- Los item forms son mas simples, pero suficientemente consistentes como para entrar en una capa comun.

### 3.2 Formularios detectados

| Formulario | Archivo | Dominio | Complejidad | Prioridad IA |
| --- | --- | --- | --- | --- |
| Login | `APP/src/app/pages/login/login.ts` | Autenticacion | Baja | Baja |
| Register | `APP/src/app/pages/register/register.ts` | Autenticacion | Baja | Baja |
| BackgroundForm | `APP/src/app/pages/background-form/background-form.ts` | Backgrounds | Alta | Alta |
| SpellForm | `APP/src/app/pages/spell-form/spell-form.ts` | Spells | Alta | Muy alta |
| MonsterForm | `APP/src/app/pages/monster-form/monster-form.ts` | Monsters | Muy alta | Muy alta |
| AdventuringGearForm | `APP/src/app/pages/item-forms/adventuring-gear-form/adventuring-gear-form.ts` | Items | Baja | Media |
| ArmorForm | `APP/src/app/pages/item-forms/armor-form/armor-form.ts` | Items | Baja | Media |
| WeaponForm | `APP/src/app/pages/item-forms/weapon-form/weapon-form.ts` | Items | Media | Alta |
| MagicItemForm | `APP/src/app/pages/item-forms/magic-item-form/magic-item-form.ts` | Items | Media | Alta |
| ToolForm | `APP/src/app/pages/item-forms/tool-form/tool-form.ts` | Items | Baja | Media |
| MountForm | `APP/src/app/pages/item-forms/mount-form/mount-form.ts` | Items | Baja | Media |

### 3.3 Dependencias y fuentes de contexto util para IA

- `APP/src/app/interfaces/monster.ts`
- `APP/src/app/interfaces/spell.ts`
- `APP/src/app/interfaces/background.ts`
- `APP/src/app/interfaces/item.ts`
- `APP/src/app/services/dnd-options-service.ts`
- `APP/src/app/services/items-service.ts`
- `APP/src/app/services/monsters-service.ts`
- `APP/src/app/services/spells-service.ts`
- `APP/src/app/services/backgrounds-service.ts`

## 4. Vision funcional del asistente

El asistente debe comportarse como un copiloto de formularios, no como un agente con control total de la aplicacion.

### 4.1 Capacidades principales

- Explicar campos y conceptos de D&D.
- Detectar inconsistencias y datos faltantes.
- Completar campos automaticamente a pedido.
- Generar texto de descripcion, lore y reglas.
- Recomendar valores segun objetivos de diseno.
- Reestructurar texto para mejor claridad.
- Sugerir selecciones validas de catalogo.
- Generar listas complejas como acciones, rasgos o equipo inicial.
- Aplicar cambios en lote sobre el estado local del form.
- Mostrar diff de cambios antes y despues.
- Permitir deshacer la ultima aplicacion de comandos.

### 4.2 Lo que NO debe hacer

- Guardar automaticamente en backend.
- Borrar datos persistidos por su cuenta.
- Enviar passwords actuales al modelo.
- Acceder a tokens, secretos o storage sensible.
- Simular clicks arbitrarios sobre cualquier elemento del DOM.
- Modificar otras pantallas fuera del formulario activo.

## 5. Arquitectura propuesta

## 5.1 Resumen

La arquitectura correcta es `frontend tool execution + backend model proxy`.

Flujo base:

1. El usuario interactua con el panel de IA en un formulario.
2. Angular genera un snapshot sanitizado del estado del form.
3. Angular envia ese snapshot y el catalogo de herramientas disponibles al backend.
4. FastAPI llama a Mistral y devuelve respuesta estructurada.
5. Angular valida la respuesta.
6. Angular ejecuta los comandos permitidos sobre el estado local del form.
7. Angular muestra resumen, diff y opcion de deshacer.

## 5.2 Por que el frontend ejecuta las tools

- El estado editable real vive en Angular signals y modelos locales.
- El backend no conoce el estado temporal completo del formulario ni su UI.
- El usuario pidio que la IA toque solo el frontend del usuario, no el backend.
- El backend solo debe actuar como gateway seguro para ocultar la API key y centralizar prompts, logs y rate limiting.

## 5.3 Capas a crear

### Frontend

- `ai-assistant-service`
- `ai-command-engine`
- `ai-form-adapter` por formulario
- `ai-session-store` para historial de cambios y conversacion
- `ai-assistant-panel` reusable
- `ai-change-preview` reusable
- `ai-quick-actions` reusable

### Backend

- `API/routes/ai.py`
- `API/services/mistral_service.py`
- `API/services/ai_prompt_service.py`
- `API/models/ai.py`
- config de `MISTRAL_API_KEY`, `MISTRAL_MODEL`, timeouts y rate limit

## 6. Contratos tecnicos propuestos

## 6.1 Snapshot de formulario

Cada form debe exponer un snapshot serializable y sanitizado.

Campos del snapshot:

- `formType`
- `route`
- `entityDraft`
- `derivedState`
- `availableOptions`
- `uiState`
- `validationState`
- `sensitiveFieldsOmitted`

Ejemplos:

- En `monster-form`, `entityDraft` incluye `formData`, `actions`, `specialAbilities`, `legendaryActions`, `selectedLanguages`, `selectedSpells`, `spellSlots`.
- En `spell-form`, `entityDraft` incluye `formData`, toggles de damage, AOE, components y selections de class/subclass.
- En `login/register`, `entityDraft` excluye `password` y `confirmPassword` del payload hacia el modelo.

## 6.2 Comandos de IA

La IA no devuelve instrucciones libres como "hace click aca". Debe devolver comandos tipados.

Comandos genericos base:

- `set_field`
- `patch_object`
- `replace_object`
- `append_list_item`
- `replace_list`
- `remove_list_item`
- `move_list_item`
- `toggle_flag`
- `set_text_value`
- `set_number_value`
- `set_selection`
- `clear_field`
- `set_error_hint`
- `set_info_hint`

Comandos de alto nivel opcionales:

- `apply_monster_role_preset`
- `generate_monster_actions`
- `complete_spell_damage_profile`
- `build_background_choice_groups`
- `suggest_weapon_properties`
- `normalize_item_cost_and_weight`

Recomendacion:

- Empezar con motor de comandos genericos.
- Encima de eso agregar helpers de dominio que terminen traducidos a los mismos comandos base.

## 6.3 Ejemplo de respuesta estructurada

```json
{
  "summary": "Ajuste el monstruo para que funcione como caster fragil de CR medio.",
  "commands": [
    {
      "type": "set_field",
      "path": "formData.intelligence",
      "value": 18,
      "reason": "El rol pedido requiere foco en magia."
    },
    {
      "type": "set_field",
      "path": "formData.strength",
      "value": 8,
      "reason": "No es un combatiente fisico."
    },
    {
      "type": "append_list_item",
      "path": "actions",
      "value": {
        "name": "Arcane Burst",
        "desc": "Ranged spell attack..."
      },
      "reason": "Le agrega una accion ofensiva principal."
    }
  ],
  "warnings": [
    "Revisa manualmente el challenge rating final."
  ]
}
```

## 6.4 Adaptador por formulario

Cada formulario deberia implementar una interfaz conceptual similar a esta:

```ts
interface AiFormAdapter<TSnapshot> {
  formType: string;
  getSnapshot(): TSnapshot;
  getAvailableCommands(): string[];
  validateCommands(commands: unknown[]): ValidationResult;
  applyCommands(commands: AiCommand[]): ApplyResult;
  undoLastApply(): void;
  getQuickActions(): AiQuickAction[];
}
```

## 7. Utilidades comunes para TODOS los formularios

## 7.1 Utilidades de ayuda y explicacion

- Explicar para que sirve un campo.
- Explicar por que una sugerencia tiene sentido.
- Explicar conceptos de D&D ligados al formulario actual.
- Resumir la entidad actual en lenguaje natural.
- Traducir o simplificar texto tecnico.

## 7.2 Utilidades de autocompletado

- Completar campos faltantes con defaults razonables.
- Completar texto base de descripcion.
- Completar etiquetas, listas, arrays y objetos incompletos.
- Rellenar estructuras complejas segun plantillas de dominio.

## 7.3 Utilidades de calidad

- Detectar campos vacios importantes.
- Detectar incoherencias internas.
- Detectar texto redundante o poco claro.
- Detectar combinaciones improbables o rotas.
- Detectar valores fuera de patron del dominio.

## 7.4 Utilidades de transformacion

- Reescribir descripciones.
- Cambiar tono narrativo o tecnico.
- Convertir bullets en parrafos y viceversa.
- Compactar o expandir texto.
- Normalizar nombres y capitalizacion.

## 7.5 Utilidades de generacion

- Generar nombres.
- Generar descripciones cortas y largas.
- Generar variantes de una misma entidad.
- Generar presets iniciales segun objetivo.
- Generar prompts para imagen o ilustracion.

## 7.6 Utilidades de productividad

- Aplicar cambios por lote.
- Mostrar diff antes de aplicar.
- Deshacer ultima aplicacion.
- Rehacer si se implementa stack de cambios.
- Guardar sugerencias favoritas del usuario a futuro.

## 7.7 Utilidades de catalogo solo lectura

- Buscar spells.
- Buscar monsters existentes para comparacion.
- Buscar items.
- Buscar proficiencies, classes, subclasses, schools, alignments, languages.
- Buscar ejemplos similares a la entidad actual.

## 8. Utilidades por formulario

## 8.1 Login

Objetivo:

- Ayuda minima y segura.

Utilidades:

- Explicar errores de login de forma mas humana.
- Sugerir correccion de email mal formateado.
- Detectar campos vacios antes de enviar.
- Explicar requisitos de acceso si existen.

Limitaciones especiales:

- No enviar `password` al modelo.
- No autocompletar contrasenas desde IA.
- No guardar ni recordar credenciales.

## 8.2 Register

Objetivo:

- Ayudar al usuario a crear cuenta sin comprometer seguridad.

Utilidades:

- Sugerir nombre de usuario.
- Normalizar email.
- Explicar por que falla la validacion.
- Proponer nombres mas claros o consistentes con tono fantasy si el usuario quiere.
- Mostrar checklist de password segura sin enviar el password real al modelo.

Limitaciones especiales:

- No enviar `password` ni `confirmPassword` al modelo.
- La IA puede evaluar reglas de password solo con metadatos locales como longitud, presencia de numeros o simbolos, sin exponer el valor.

## 8.3 MonsterForm

Objetivo:

- Ser el form mas potente del asistente.

Utilidades:

- Definir concepto del monstruo a partir de una idea libre.
- Proponer stat spread segun rol.
- Revisar coherencia de CR, HP, AC y dano.
- Generar acciones, reacciones y legendary actions.
- Generar special abilities.
- Completar spellcasting.
- Recomendar idiomas, sentidos, resistencias e inmunidades.
- Ajustar alignment y subtype segun fantasia buscada.
- Detectar monstruos demasiado rotos o demasiado flojos.
- Generar descripcion narrativa y tactica de combate.
- Sugerir imagen prompt.

Quick actions recomendadas:

- `Crear glass cannon`
- `Crear tank`
- `Crear soporte`
- `Balancear CR`
- `Generar acciones`
- `Completar spellcasting`
- `Mejorar descripcion`

## 8.4 SpellForm

Objetivo:

- Ayudar a construir spells coherentes y legibles.

Utilidades:

- Proponer school y level.
- Completar `casting_time`, `range`, `duration` y `components`.
- Generar descripcion base y `higher_level`.
- Sugerir `damage`, `dc` y `area_of_effect` coherentes.
- Recomendar classes y subclasses adecuadas.
- Revisar si el spell esta overpowered para su nivel.
- Generar variantes de daño, control, soporte o utility.
- Normalizar wording estilo SRD.

Quick actions recomendadas:

- `Convertir a spell de dano`
- `Convertir a spell de control`
- `Balancear por nivel`
- `Completar AoE`
- `Asignar clases`

## 8.5 BackgroundForm

Objetivo:

- Construir backgrounds consistentes en mecanicas y fantasia.

Utilidades:

- Proponer nombre y concepto del background.
- Generar feature principal y variante.
- Recomendar starting proficiencies.
- Recomendar equipo inicial y cantidades.
- Generar choice groups de proficiencies y equipo.
- Generar personalidad, ideales, bonds y flaws.
- Detectar incoherencias entre feature, equipo y fantasia.
- Reescribir flavor text para mejor tono.

Quick actions recomendadas:

- `Generar background completo`
- `Crear feature principal`
- `Completar rasgos sociales`
- `Armar equipo inicial`

## 8.6 WeaponForm

Objetivo:

- Ayudar con arma mecanicamente coherente y bien descrita.

Utilidades:

- Sugerir categoria simple o martial.
- Sugerir melee o ranged.
- Recomendar `damage_dice` y `damage_type`.
- Recomendar `properties` segun fantasias de uso.
- Generar descripcion especial para propiedad `special`.
- Ajustar `range` y `two_handed_damage`.
- Revisar si esta demasiado fuerte comparada con armas base.
- Generar flavor text del arma.

Quick actions recomendadas:

- `Arma ligera`
- `Arma pesada`
- `Arma a distancia`
- `Agregar propiedades validas`
- `Balancear dano`

## 8.7 ArmorForm

Objetivo:

- Agilizar armaduras simples pero validas.

Utilidades:

- Recomendar `armor_category`.
- Calcular `armor_class.base` razonable.
- Sugerir `dex_bonus`, `str_minimum` y `stealth_disadvantage`.
- Generar descripcion de apariencia y uso.
- Detectar armaduras fuera de patron del sistema.

Quick actions recomendadas:

- `Armadura ligera`
- `Armadura media`
- `Armadura pesada`
- `Revisar balance`

## 8.8 MagicItemForm

Objetivo:

- Generar items magicos con valor narrativo y mecanico.

Utilidades:

- Proponer nombre evocador.
- Sugerir `rarity`.
- Generar `desc` y `special`.
- Crear variantes.
- Sugerir coste orientativo y peso.
- Generar hooks narrativos o condiciones de uso.
- Detectar efectos demasiado fuertes para la rareza.

Quick actions recomendadas:

- `Crear item comun`
- `Crear item raro`
- `Generar efecto magico`
- `Crear variantes`

## 8.9 ToolForm

Objetivo:

- Mejorar formularios simples con valor creativo.

Utilidades:

- Sugerir `tool_category`.
- Generar descripcion y casos de uso.
- Sugerir coste y peso orientativos.
- Proponer nombre mas claro o fantasy.

Quick actions recomendadas:

- `Herramienta artesanal`
- `Instrumento musical`
- `Set de juego`

## 8.10 MountForm

Objetivo:

- Crear monturas o vehiculos coherentes.

Utilidades:

- Recomendar `vehicle_category`.
- Proponer `capacity` y `speed`.
- Ajustar unidad de velocidad.
- Generar descripcion de uso y limitaciones.
- Detectar valores desbalanceados.

Quick actions recomendadas:

- `Montura ligera`
- `Vehiculo terrestre`
- `Vehiculo acuatico`
- `Vehiculo aereo`

## 8.11 AdventuringGearForm

Objetivo:

- Aportar creatividad y consistencia a items simples.

Utilidades:

- Generar descripcion funcional.
- Sugerir coste y peso.
- Sugerir usos practicos en aventura.
- Reescribir nombre o descripcion.

Quick actions recomendadas:

- `Generar item basico`
- `Ajustar coste`
- `Agregar usos`

## 9. UI y experiencia de usuario

## 9.1 Componentes UX propuestos

- Panel lateral de chat/contexto IA.
- Barra de quick actions por formulario.
- Vista de diff antes de aplicar.
- Chips de cambios aplicados.
- Boton `Deshacer ultimo cambio IA`.
- Boton `Aplicar todo` y `Aplicar por bloques`.
- Estado de carga y streaming si se implementa despues.

## 9.2 Patrones de interaccion

- Chat libre para pedir cambios complejos.
- Quick actions para tareas frecuentes.
- Sugerencias inline debajo de campos complejos.
- Preview de arrays complejos antes de insertar.
- Advertencias no bloqueantes cuando la IA detecta problemas.

## 9.3 UX para confianza del usuario

- Siempre mostrar `que cambio` y `por que`.
- Nunca aplicar cambios silenciosos a campos sensibles.
- Marcar visualmente los campos tocados por IA.
- Permitir revertir sin esfuerzo.
- Separar claramente sugerencia de persistencia.

## 10. Seguridad y guardrails

## 10.1 Guardrails de datos

- Excluir passwords del snapshot.
- Excluir tokens o headers sensibles.
- Excluir objetos no serializables como `File`.
- Enmascarar cualquier valor sensible en logs.

## 10.2 Guardrails de comandos

- Allowlist de tipos de comando.
- Allowlist de paths editables por formulario.
- Rechazo de paths desconocidos.
- Rechazo de tipos incompatibles.
- Limite de cantidad de comandos por respuesta.
- Limite de longitud de texto generado.

## 10.3 Guardrails de producto

- No autoguardar.
- No autoenviar forms.
- No navegar fuera del contexto activo sin confirmacion.
- No mutar estado global ajeno al form.

## 11. Plan tecnico por fases

## Fase 0. Contratos y base comun

Objetivo:

- Preparar la infraestructura reutilizable.

Entregables:

- Tipos `AiCommand`, `AiResponse`, `AiFormSnapshot`.
- Interfaz `AiFormAdapter`.
- Esquema de validacion de comandos en frontend.
- Documento de prompts base por dominio.

## Fase 1. Proxy backend a Mistral

Objetivo:

- Hablar con Mistral sin exponer la API key.

Entregables:

- `POST /ai/chat`
- Modelos Pydantic de request y response.
- Servicio Mistral con timeout, retries y logs.
- Configuracion en `API/config.py`.

## Fase 2. Motor de comandos en Angular

Objetivo:

- Poder recibir y aplicar cambios locales de forma segura.

Entregables:

- `AiAssistantService`
- `AiCommandEngine`
- Historial de comandos aplicados.
- `undoLastApply()`.
- Componente reusable de preview.

## Fase 3. Primer vertical de alto valor

Objetivo:

- Salir rapido con forms donde la IA realmente aporta valor.

Orden recomendado:

1. `MonsterForm`
2. `SpellForm`
3. `BackgroundForm`

Entregables:

- Adaptadores por form.
- Quick actions por dominio.
- Prompts especificos por entidad.

## Fase 4. Item forms

Objetivo:

- Expandir a todo el ecosistema de items.

Orden recomendado:

1. `WeaponForm`
2. `MagicItemForm`
3. `ArmorForm`
4. `MountForm`
5. `ToolForm`
6. `AdventuringGearForm`

Entregables:

- Adaptador base comun para `Item`.
- Modo simple para forms cortos.
- Utilidades especializadas por subtipo.

## Fase 5. Forms de autenticacion

Objetivo:

- Cubrir todos los forms del repo sin comprometer seguridad.

Entregables:

- Ayuda de validacion para `Login` y `Register`.
- Exclusion estricta de secretos.
- Modo IA minimalista en auth.

## Fase 6. Pulido de producto

Objetivo:

- Mejorar confianza, trazabilidad y ergonomia.

Entregables:

- Diffs mas claros.
- Streaming de respuesta.
- Persistencia local de historial de sesion si se desea.
- Telemetria funcional y errores.

## 12. Orden de implementacion recomendado

1. Base comun de contratos.
2. Proxy Mistral backend.
3. Motor de comandos frontend.
4. MonsterForm.
5. SpellForm.
6. BackgroundForm.
7. WeaponForm.
8. MagicItemForm.
9. Resto de item forms.
10. Login y Register.

Razon:

- Maximiza valor temprano.
- Valida arquitectura con los forms mas complejos.
- Evita duplicar soluciones en item forms simples.

## 13. Testing planificado

## 13.1 Frontend

- Tests unitarios del parser y validador de comandos.
- Tests unitarios del `AiCommandEngine`.
- Tests por adaptador de formulario.
- Tests de `undo`.
- Tests de exclusiones de campos sensibles.

## 13.2 Backend

- Tests del schema de request/response.
- Tests del servicio proxy a Mistral con mocks.
- Tests de timeouts y errores del proveedor.
- Tests de sanitizacion de logs.

## 13.3 Casos E2E a cubrir despues

- Usuario pide generar monstruo completo.
- Usuario pide balancear spell.
- Usuario pide completar background.
- Usuario aplica y deshace cambios.
- Usuario usa auth form sin filtrar passwords a la IA.

## 14. Riesgos y deuda tecnica a vigilar

- `weapon-form` usa `fetch` con `API_URL` hardcodeado y conviene alinearlo con el resto antes o durante la integracion.
- Los forms no comparten aun una abstraccion comun de adaptador.
- La calidad de IA cae si el snapshot enviado es pobre o ruidoso.
- Sin allowlist de paths, el motor de comandos se vuelve fragil.
- Sin diff y undo, la confianza del usuario cae muchisimo.
- Los forms con listas anidadas como `monster-form` y `background-form` necesitan validacion mas estricta.

## 15. Archivos que probablemente habra que crear cuando llegue `HAZLO`

### Frontend

- `APP/src/app/interfaces/ai-command.ts`
- `APP/src/app/interfaces/ai-form-snapshot.ts`
- `APP/src/app/interfaces/ai-response.ts`
- `APP/src/app/services/ai-assistant-service.ts`
- `APP/src/app/services/ai-command-engine.ts`
- `APP/src/app/services/ai-session-store.ts`
- `APP/src/app/ai/adapters/monster-form-ai-adapter.ts`
- `APP/src/app/ai/adapters/spell-form-ai-adapter.ts`
- `APP/src/app/ai/adapters/background-form-ai-adapter.ts`
- `APP/src/app/ai/adapters/item-form-ai-adapter.ts`
- `APP/src/app/ai/adapters/login-form-ai-adapter.ts`
- `APP/src/app/ai/adapters/register-form-ai-adapter.ts`
- `APP/src/app/components/ai-assistant-panel/*`
- `APP/src/app/components/ai-change-preview/*`
- `APP/src/app/components/ai-quick-actions/*`

### Backend

- `API/routes/ai.py`
- `API/services/mistral_service.py`
- `API/services/ai_prompt_service.py`
- `API/models/ai.py`

## 16. Definition of done del planning

Este planning se considerara correctamente ejecutado cuando exista una implementacion que cumpla todo esto:

- La IA funciona en todos los forms detectados.
- La IA solo modifica estado local del form activo.
- No hay guardado automatico por IA.
- Los campos sensibles no viajan al modelo.
- Existe diff visible y opcion de deshacer.
- Existe al menos una capa comun reusable y no soluciones copiadas por form.
- `MonsterForm`, `SpellForm` y `BackgroundForm` quedan cubiertos con utilidades de alto valor.
- Los item forms quedan cubiertos con un adaptador comun y extensiones por subtipo.

## 17. Siguiente paso recomendado antes de implementar

Antes de tocar codigo, conviene hacer dos mini decisiones de detalle:

1. Elegir si el asistente va a usar solo `commands` estructurados o `commands + texto conversacional`.
2. Definir la allowlist inicial exacta de paths editables por `MonsterForm`, `SpellForm` y `BackgroundForm`.

Con esas dos decisiones, la fase de implementacion arranca mucho mas limpia.

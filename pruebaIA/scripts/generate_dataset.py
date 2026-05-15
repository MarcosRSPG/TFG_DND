"""
generate_dataset.py — Genera 300 ejemplos de entrenamiento para Qwen LoRA.

Crea conversaciones extensas y naturales (usuario <> asistente) que terminan con
JSON válido en el formato exacto que usa la API de la app Angular.

El asistente actúa como un DM experimentado que EXPLICA las opciones al jugador:
- "No sabés qué rareza hay? Te cuento..."
- "Las propiedades de arma son... cuál te va?"
- "Los tipos de armadura se dividen en..."

Tipos cubiertos:
  - weapon, armor, magicitem, tool, mount, adventuringgear
  - monster, spell, character, race, class, subclass, subrace, background

Uso:
  python scripts/generate_dataset.py
"""

import json
import random
from pathlib import Path

random.seed(3407)

OUTPUT_PATH = Path("data/train.jsonl")
REQUIRED_JSONL = 300


# ============================================================
# HELPERS
# ============================================================

RARITIES = ["common", "uncommon", "rare", "very rare", "legendary"]

def make_ref(name: str) -> dict:
    index = name.lower().replace(" ", "-").replace("'", "")
    return {"index": index, "name": name, "url": f"/api/items/{index}"}


# ============================================================
# 1. WEAPON — 35 ejemplos
# ============================================================

WEAPON_NAMES = [
    "Colmillo Solar", "Hoja Veloz", "Martillo del Trueno", "Arco Celeste",
    "Daga Sombría", "Hacha del Alba", "Bastón del Errante", "Espada Vorpal",
    "Ballesta de Hueso", "Maza Sagrada", "Cimitarra Lunar", "Tridente Marino",
    "Látigo Ígneo", "Hoz de Sangre", "Mandoble del Norte", "Jabalina del Cazador",
    "Martillo de Guerra Enano", "Espada Larga Élfica", "Hacha de Batalla Bárbara",
    "Dardo Envenenado", "Pica del Guardián", "Alabarda del Sol",
    "Espada Corta del Asesino", "Bastón del Mago", "Honda del Pastor",
    "Cuchillo de Lanzamiento", "Garrote del Gigante", "Clava Espinosa",
    "Lanza del Jinete", "Ballesta de Mano", "Arco Largo Élfico",
    "Espada Bastarda", "Hacha de Drow", "Maza de la Luz", "Chakram del Viento",
]

WEAPON_CATEGORIES = [
    ("simple melee weapon", "Melee"), ("martial melee weapon", "Melee"),
    ("simple ranged weapon", "Ranged"), ("martial ranged weapon", "Ranged"),
]

WEAPON_DAMAGE = [
    ("1d4", "slashing"), ("1d6", "piercing"), ("1d8", "bludgeoning"),
    ("2d4", "slashing"), ("1d10", "piercing"), ("1d12", "slashing"),
]

WEAPON_EXTRA = [
    ("1d4", "fire"), ("1d6", "cold"), ("1d6", "lightning"),
    ("1d4", "necrotic"), ("1d8", "radiant"), ("1d6", "acid"),
    ("1d4", "psychic"), ("1d6", "thunder"), ("1d8", "force"),
]

WEAPON_PROPS = [
    ["versatile"], ["light", "finesse"], ["heavy", "two-handed"],
    ["thrown", "finesse"], ["loading", "two-handed"], ["reach"],
    ["range", "two-handed"], ["versatile", "special"],
]

RARITY_EXPLANATION = (
    "Las rarezas en D&D van de menor a mayor poder: "
    "common (común, sin efectos mágicos, solo calidad del material), "
    "uncommon (poco común, pequeños efectos mágicos o mejoras menores), "
    "rare (rara, objetos mágicos con poderes notables), "
    "very rare (muy rara, objetos extremadamente poderosos), "
    "y legendary (legendaria, artefactos únicos de poder inmenso). "
    "¿Qué rareza te llama la atención?"
)

PROPS_EXPLANATION = (
    "Las propiedades definen cómo se usa el arma en combate. Algunas importantes: "
    "light te permite atacar con otra arma ligera como acción bonus (dual wield), "
    "finesse deja elegir entre FUE o DES para ataque y daño, "
    "heavy da desventaja si sos de tamaño Pequeño pero permite hazañas como Great Weapon Master, "
    "versatile se usa a 1 o 2 manos cambiando el dado (ej. 1d8 → 1d10), "
    "reach te da 10 pies de alcance en vez de 5, "
    "thrown permite lanzar el arma (vuelve a tu mano si es mágica), "
    "loading limita a un disparo por turno sin importar ataques extras, "
    "y two-handed requiere dos manos sí o sí. "
    "¿Cuáles te interesan?"
)


def json_weapon(name, category, dmg_dice, dmg_type, extra, props, weight, cost_qty, cost_unit, rarity):
    extra_dmg = ""
    if extra:
        extra_dmg = f',"extra_damage":{{"damage_dice":"{extra[0]}","damage_type":{json.dumps(make_ref(extra[1]))}}}'
    is_ranged = "ranged" in category
    range_o = ',"range":{"normal":80,"long":320}' if is_ranged else ',"range":{"normal":5}'
    props_json = "[" + ",".join(json.dumps(make_ref(p)) for p in props) + "]"
    idx = name.lower().replace(" ", "-").replace("'", "")
    return f'{{"type":"weapon","name":"{name}","desc":["{name} forjada con maestria."],"equipment_category":{json.dumps(make_ref("weapons"))},"weapon_category":"{category.split()[0].title()}","weapon_range":"{category.split()[1]}","category_range":"{category}","cost":{{"quantity":{cost_qty},"unit":"{cost_unit}"}},"damage":{{"damage_dice":"{dmg_dice}","damage_type":{json.dumps(make_ref(dmg_type))}}}{range_o},"weight":{weight},"rarity":"{rarity}","properties":{props_json},"url":"/api/weapons/{idx}"{extra_dmg}}}'


def generate_weapon_example(i: int) -> dict:
    name = WEAPON_NAMES[i % len(WEAPON_NAMES)]
    category, range_type = WEAPON_CATEGORIES[i % len(WEAPON_CATEGORIES)]
    dmg_dice, dmg_type = WEAPON_DAMAGE[i % len(WEAPON_DAMAGE)]
    rarity = random.choice(RARITIES)
    has_extra = random.random() > 0.4
    extra = random.choice(WEAPON_EXTRA) if has_extra else None
    props = random.choice(WEAPON_PROPS)
    weight = random.choice([2, 3, 4, 6, 8, 10])
    cost_qty = random.choice([5, 10, 15, 25, 50, 100, 300])
    cost_unit = "gp" if cost_qty > 20 else "sp"

    extra_text = f" y {extra[0]} de {extra[1]}" if extra else ""
    cat_label = category.split()[0].title()
    cat_group = category.split()[1]

    json_output = json_weapon(name, category, dmg_dice, dmg_type, extra, props, weight, cost_qty, cost_unit, rarity)
    system = "TYPE: weapon\n\nEres un asistente experto en crear armas para una app de DnD 5e. Explica las opciones al usuario y guialo paso a paso hasta tener todos los datos. Cuando tengas todo, responde SOLO con JSON valido."

    cat_name = category.split()[0].title()
    cat_dist = category.split()[1]

    conversations = [
        # Variante A: educativa y extensa — explica categorías, rareza y propiedades
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Quiero crearme un arma nueva para mi personaje."},
            {"role": "assistant", "content": "¡Buenísimo! Primero lo primero: ¿de qué categoría la querés? Las armas se dividen en:\n- **Simples cuerpo a cuerpo**: fáciles de usar, cualquier clase las maneja (ej: daga, lanza, maza)\n- **Simples a distancia**: arcos cortos, hondas, ballestas ligeras\n- **Marciales cuerpo a cuerpo**: más daño pero requieren entrenamiento (ej: espada larga, hacha de batalla)\n- **Marciales a distancia**: arcos largos, ballestas de mano, etc.\n¿Cuál te va?"},
            {"role": "user", "content": f"La quiero {cat_dist}, {cat_name}."},
            {"role": "assistant", "content": f"Perfecto. ¿Cómo se llama el arma? Y {RARITY_EXPLANATION}"},
            {"role": "user", "content": f"Se llama {name}, de rareza {rarity}."},
            {"role": "assistant", "content": f"Bien. Ahora el daño: ¿qué dado y qué tipo de daño hace? Por ejemplo: 1d8 cortante (espada), 1d6 perforante (lanza), 1d12 contundente (martillo a 2 manos). ¿Tenés algo en mente o tiro yo una sugerencia?"},
            {"role": "user", "content": f"Que haga {dmg_dice} de {dmg_type}{extra_text}."},
            {"role": "assistant", "content": f"{PROPS_EXPLANATION}"},
            {"role": "user", "content": f"Que tenga {', '.join(props)}. Y pesa {weight} libras, cuesta como {cost_qty} {cost_unit}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: educativa pero más corta
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Dale, un arma cuerpo a cuerpo."},
            {"role": "assistant", "content": "Simple o marcial? Las simples son más básicas (daga, maza) y las marciales hacen más daño pero necesitás competencia (espada larga, hacha). ¿Cuál?"},
            {"role": "user", "content": f"{cat_name}."},
            {"role": "assistant", "content": f"Nombre? Y {RARITY_EXPLANATION}"},
            {"role": "user", "content": f"{name}, {rarity}."},
            {"role": "assistant", "content": f"Daño? Ej: 1d8 cortante, 1d6 perforante, 1d12 contundente... También decime propiedades clave: ¿light para dual wield, finesse para usar DES, heavy para Great Weapon Master, versatile para usar a 1 o 2 manos, reach para alcance, thrown para lanzar?"},
            {"role": "user", "content": f"Hace {dmg_dice} de {dmg_type}. Tiene {', '.join(props)}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: el usuario ya sabe lo que quiere
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Necesito un arma: {name}, {cat_name} {cat_dist}, {rarity}. Daño {dmg_dice} {dmg_type}{extra_text}. Propiedades: {', '.join(props)}. Peso {weight} lb, cuesta {cost_qty} {cost_unit}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante D: el usuario describe concepto -> IA interpreta y crea
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Un arma que pegue re fuerte a distancia para mi picaro."},
            {"role": "assistant", "content": "Para un picaro (Rogue) a distancia la clave es un arma con finesse, asi usas DES para ataque y daño y aplicas Sneak Attack. Tambien ranged para mantener distancia. Lo ideal: un arco corto (1d6 perforante, 80/320 ft, two-handed) o una ballesta de mano (1d6 perforante, 30/120 ft, loading, ligera para dual wield). Tambien podria ser un arma arrojadiza con finesse como una daga. Nombre y rareza?"},
            {"role": "user", "content": f"{name}, {rarity}."},
            {"role": "assistant", "content": f"Perfecto. Te armo un arma {cat_name} {cat_dist} que haga {dmg_dice} de {dmg_type}{extra_text}, con propiedades {', '.join(props)}. Pesa unas {weight} libras, cuesta {cost_qty} {cost_unit}. Esto le va como anillo al dedo a tu picaro."},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 2. ARMOR — 30 ejemplos
# ============================================================

ARMOR_NAMES = [
    "Armadura de Placas", "Cota de Malla", "Armadura de Cuero", "Armadura de Mithril",
    "Armadura de Dragon", "Coraza de Plata", "Armadura de Escamas", "Armadura de Sombras",
    "Armadura de Hielo", "Coraza del Fenix", "Armadura de Obsidiana", "Cota de Anillas",
    "Armadura de Pinchos", "Armadura de Cuero Tachonado", "Armadura de Guerra Enana",
    "Armadura Eterea", "Armadura de la Luz", "Coraza del Guardian", "Armadura de Viento",
    "Armadura de Tierra", "Cota de Malla Elfica", "Armadura de Huesos",
    "Armadura de Plata Lunar", "Armadura del Abismo", "Armadura Real",
    "Armadura de Bronce", "Escudo del Guardian", "Escudo de la Fe",
    "Escudo de Dragon", "Escudo de Adamantita",
]

ARMOR_CATEGORIES = ["light", "medium", "heavy", "shield"]
ARMOR_BASES = {"light": [11, 12, 13], "medium": [13, 14, 15], "heavy": [14, 16, 18], "shield": [2]}
ARMOR_DEX = {"light": True, "medium": True, "heavy": False, "shield": False}
ARMOR_STEALTH = {"light": False, "medium": False, "heavy": True, "shield": False}


def json_armor(name, cat, base_ac, stealth, weight, cost_qty):
    idx = name.lower().replace(" ", "-").replace("'", "").replace("é", "e").replace("ó", "o").replace("í", "i").replace("á", "a").replace("ú", "u")
    max_bonus = 'null' if cat == "light" else ('2' if cat == "medium" else 'null')
    str_min = '15' if cat == "heavy" else '0'
    return f'{{"type":"armor","name":"{name}","desc":["Una armadura de notable factura."],"equipment_category":{{"index":"armor","name":"Armor","url":"/api/equipment-categories/armor"}},"armor_category":"{cat}","armor_class":{{"base":{base_ac},"dex_bonus":{"true" if ARMOR_DEX[cat] else "false"},"max_bonus":{max_bonus},"str_minimum":{str_min}}},"str_minimum":{str_min},"stealth_disadvantage":{"true" if stealth else "false"},"weight":{weight},"cost":{{"quantity":{cost_qty},"unit":"gp"}},"url":"/api/armor/{idx}"}}'


def generate_armor_example(i: int) -> dict:
    name = ARMOR_NAMES[i % len(ARMOR_NAMES)]
    cat = random.choice(ARMOR_CATEGORIES)
    base_ac = random.choice(ARMOR_BASES[cat])
    stealth = ARMOR_STEALTH[cat] if random.random() > 0.3 else (not ARMOR_STEALTH[cat])
    weight = random.choice([5, 8, 12, 20, 30, 45, 65])
    cost_qty = random.choice([5, 10, 25, 50, 75, 150, 300, 1500])

    json_output = json_armor(name, cat, base_ac, stealth, weight, cost_qty)
    cat_es = {"light": "ligera", "medium": "media", "heavy": "pesada", "shield": "escudo"}[cat]
    stealth_txt = "tiene desventaja en sigilo" if stealth else "no tiene desventaja en sigilo"

    system = "TYPE: armor\n\nEres un asistente experto en crear armaduras para DnD 5e. Explica los tipos de armadura y guía al usuario. Cuando tengas todo, responde SOLO con JSON valido."

    conversations = [
        # Variante A: educativa — explica tipos
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Necesito una armadura para mi pj."},
            {"role": "assistant", "content": "¡Dale! Las armaduras se dividen en:\n- **Ligera** (CA 11-13): sumás tu bonificador de DES completo. Ideal para pícaros, magos, bardos. Ej: cuero tachonado CA 13 + DES.\n- **Media** (CA 13-15): sumás DES hasta +2 máximo. Ej: cota de escamas CA 14 + DES (máx +2).\n- **Pesada** (CA 14-18): no suma DES, requiere 15 FUE o perdés velocidad. Da desventaja en Sigilo. Ej: armadura de placas CA 18.\n- **Escudo**: +2 CA directo, ocupa una mano.\n¿Qué tipo te interesa?"},
            {"role": "user", "content": f"{cat_es.title()}."},
            {"role": "assistant", "content": f"¿Nombre? Y ¿qué CA base le ponemos? Para {cat_es} los valores típicos son {ARMOR_BASES[cat]}."},
            {"role": "user", "content": f"{name}. CA {base_ac}."},
            {"role": "assistant", "content": f"¿Peso? Y ¿{stealth_txt.replace('tiene', 'tiene').replace('no tiene', 'no tiene')} como viene?"},
            {"role": "user", "content": f"Pesa {weight} lb y {stealth_txt}. Sale {cost_qty} gp."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: semi-educativa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Quiero una armadura {cat_es}."},
            {"role": "assistant", "content": f"Bien. Las {cat_es} {'suman DES completa' if cat == 'light' else 'suman DES hasta +2' if cat == 'medium' else 'no suman DES y requieren 15 FUE'}. ¿Nombre y CA base?"},
            {"role": "user", "content": f"{name}, CA {base_ac}."},
            {"role": "assistant", "content": f"Peso y sigilo? ¿Y costo?"},
            {"role": "user", "content": f"Pesa {weight} lb, {stealth_txt}, {cost_qty} gp."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: todo de una
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Armadura {cat_es} \"{name}\": CA base {base_ac}, pesa {weight} lb, {stealth_txt}, cuesta {cost_qty} gp."},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 3. MAGIC ITEM — 28 ejemplos
# ============================================================

MAGIC_NAMES = [
    "Anillo del Alba", "Baston del Meteorito", "Capa de Invisibilidad", "Botas del Viento",
    "Guantes de Fuerza", "Amuleto de la Salud", "Diadema de Intelecto", "Pergamino de Poder",
    "Varita de Maravillas", "Gema Elemental", "Collar de Adaptacion", "Cinturon de Fuerza de Gigante",
    "Tunica del Archimago", "Yelmo de Telepatia", "Caliz de la Vida", "Orbe de Disrupcion",
    "Pluma de Susurros", "Espejo del Alma", "Manto de la Noche", "Anillo de Proteccion",
    "Botas de Levitacion", "Capa del Murcielago", "Guantes de Destreza", "Medallon de los Pensamientos",
    "Brazaletes de Defensa", "Cristal de Vision", "Tambor de Trueno", "Flauta de los Vientos",
]

MAGIC_RARITIES = ["common", "uncommon", "rare", "very rare", "legendary", "artifact"]
MAGIC_TYPES = ["ring", "staff", "wand", "cloak", "boots", "gloves", "amulet", "helm", "robe", "belt", "gem", "scroll"]


def generate_magic_example(i: int) -> dict:
    name = MAGIC_NAMES[i % len(MAGIC_NAMES)]
    rarity = random.choice(MAGIC_RARITIES)
    mtype = random.choice(MAGIC_TYPES)
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    flav = random.choice([
        "Brilla con luz propia.", "Pulsa con energia arcana.",
        "Cubierto de runas antiguas.", "Desprende un tenue resplandor.",
        "Se siente calido al tacto.",
    ])
    desc = f"Un objeto magico de rareza {rarity}. {flav}"

    json_output = f'{{"index":"{idx}","name":"{name}","type":"magicitem","desc":["{desc}"],"equipment_category":{{"index":"magic-items","name":"Magic Items","url":"/api/equipment-categories/magic-items"}},"rarity":{{"name":"{rarity}"}},"variants":[],"variant":false,"url":"/api/magic-items/{idx}"}}'

    system = "TYPE: magicitem\n\nEres un asistente experto en crear objetos magicos para DnD 5e. Explica las opciones de rareza y tipo. Responde SOLO con JSON valido."

    conv_rarity_exp = (
        "Las rarezas en D&D son: common (objeto mundano con un toque mágico mínimo, ej: una pluma que nunca se moja), "
        "uncommon (el punto dulce para objetos de nivel bajo-medio, ej: espada +1), "
        "rare (objetos poderosos que deberían ser un tesoro importante, ej: espada +2), "
        "very rare (artefactos menores, ej: espada +3), "
        "legendary (objetos que cuentan con su propia historia, ej: Martillo de Trueno), "
        "y artifact (objetos de poder divino, ej: Ojo de Vecna). "
        "¿Qué rareza te gusta?"
    )

    conversations = [
        # Variante A: educativa completa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Quiero un objeto magico che."},
            {"role": "assistant", "content": f"¡Perfecto! {conv_rarity_exp}"},
            {"role": "user", "content": rarity},
            {"role": "assistant", "content": "¿Cómo se llama? Y ¿qué tipo de objeto es? Tipos comunes: ring (anillo), staff (bastón), wand (varita), cloak (capa), boots (botas), gloves (guantes), amulet (amuleto), helm (yelmo), robe (túnica), belt (cinturón), gem (gema), scroll (pergamino)."},
            {"role": "user", "content": f"{name}, es un {mtype}."},
            {"role": "assistant", "content": "Dame una breve descripción visual o mágica."},
            {"role": "user", "content": flav},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: explicación corta de rareza
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Necesito un objeto magico: {name}."},
            {"role": "assistant", "content": f"{conv_rarity_exp}"},
            {"role": "user", "content": f"{rarity}. Es un {mtype}. {flav}"},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: usuario sabe
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Objeto magico {rarity}: {name}, tipo {mtype}. {flav}"},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 4. TOOL — 15 ejemplos
# ============================================================

TOOL_NAMES = [
    "Kit de Herrero", "Herramientas de Alquimista", "Instrumentos de Carpintero",
    "Kit de Venenos", "Kit de Disfraces", "Herramientas de Ladron",
    "Instrumentos de Musico", "Kit de Alquimia", "Herramientas de Navegante",
    "Kit de Venenos Mejorado", "Herramientas de Joyero", "Kit de Supervivencia",
    "Herramientas de Picapedrero", "Instrumentos de Bardo", "Kit de Herrero Enano",
]

TOOL_CATEGORIES = ["artisan's tools", "gaming sets", "musical instruments", "other tools"]


def generate_tool_example(i: int) -> dict:
    name = TOOL_NAMES[i % len(TOOL_NAMES)]
    tcat = random.choice(TOOL_CATEGORIES)
    weight = random.choice([1, 2, 3, 5, 8])
    cost_qty = random.choice([5, 10, 25, 50])
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    json_output = f'{{"index":"{idx}","name":"{name}","desc":["Un conjunto de {name.lower()}."],"equipment_category":{{"index":"tools","name":"Tools","url":"/api/equipment-categories/tools"}},"tool_category":"{tcat}","cost":{{"quantity":{cost_qty},"unit":"gp"}},"weight":{weight},"url":"/api/tools/{idx}","contents":[],"properties":[]}}'

    system = "TYPE: tool\n\nEres un asistente experto en crear herramientas para DnD 5e. Explica las categorías y orienta al usuario. Responde SOLO con JSON valido."

    cat_exp = (
        "Las herramientas se clasifican en: artisan's tools (herramientas de artesano, ej: herrería, alquimia), "
        "gaming sets (juegos, ej: dados, ajedrez), "
        "musical instruments (instrumentos musicales), "
        "y other tools (otras, ej: kit de venenos, herramientas de ladrón). "
        "¿Para qué categoría va?"
    )

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito herramientas para mi artesano."},
        {"role": "assistant", "content": cat_exp},
        {"role": "user", "content": f"{tcat}, unas {name.lower()}."},
        {"role": "assistant", "content": "Peso y costo aproximado?"},
        {"role": "user", "content": f"Pesan {weight} libras, salen {cost_qty} gp."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 5. MOUNT — 12 ejemplos
# ============================================================

MOUNT_NAMES = [
    "Caballo de Guerra", "Poni", "Mula", "Elefante de Guerra",
    "Caballo Ligero", "Caballo de Tiro", "Yegua Veloz", "Grifo de Monta",
    "Carro de Guerra", "Carreta de Mercader", "Bote de Remos", "Barco de Vela",
]


def generate_mount_example(i: int) -> dict:
    name = MOUNT_NAMES[i % len(MOUNT_NAMES)]
    speed_qty = random.choice([30, 40, 50, 60, 80])
    capacity = f"{random.choice([200, 300, 400, 500])} lb."
    weight = random.choice([100, 200, 400])
    cost_qty = random.choice([15, 30, 50, 75, 100, 200, 400])
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    json_output = f'{{"index":"{idx}","name":"{name}","desc":["{name} listo para montar."],"equipment_category":{{"index":"mounts-and-vehicles","name":"Mounts and Vehicles","url":"/api/equipment-categories/mounts-and-vehicles"}},"vehicle_category":"mount","cost":{{"quantity":{cost_qty},"unit":"gp"}},"speed":{{"quantity":{speed_qty},"unit":"ft."}},"capacity":"{capacity}","weight":{weight},"url":"/api/mounts/{idx}","contents":[],"properties":[]}}'

    system = "TYPE: mount\n\nEres un asistente experto en crear monturas y vehiculos para DnD 5e. Explica opciones. Responde SOLO con JSON valido."

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Che, me haces una montura?"},
        {"role": "assistant", "content": "Dale! Las monturas van desde caballos básicos (30-40 ft velocidad, ~15-75 gp) hasta bestias exóticas como grifos (60-80 ft, ~200-400 gp). También hay vehículos como carros y botes. ¿Cómo se llama y qué velocidad aproximada querés?"},
        {"role": "user", "content": f"Se llama {name}, velocidad como {speed_qty} pies."},
        {"role": "assistant", "content": "Capacidad de carga, peso y costo?"},
        {"role": "user", "content": f"Capacidad {capacity}, pesa {weight} lb, sale {cost_qty} gp."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 6. ADVENTURING GEAR — 10 ejemplos
# ============================================================

GEAR_NAMES = [
    "Mochila de Aventurero", "Cuerda de Cannamo", "Antorchas (5)", "Yesca y Pedernal",
    "Raciones de Viaje", "Odre de Agua", "Cobertor de Lona", "Martillo de Mineria",
    "Pico de Montana", "Linterna con Capucha",
]


def generate_gear_example(i: int) -> dict:
    name = GEAR_NAMES[i % len(GEAR_NAMES)]
    weight = random.choice([1, 2, 5, 10])
    cost_qty = random.choice([1, 2, 5, 10, 25])
    idx = name.lower().replace(" ", "-").replace("'", "").replace("(", "").replace(")", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    json_output = f'{{"index":"{idx}","name":"{name}","desc":["Util para aventuras."],"equipment_category":{{"index":"adventuring-gear","name":"Adventuring Gear","url":"/api/equipment-categories/adventuring-gear"}},"gear_category":{{"index":"standard-gear","name":"Standard Gear","url":"/api/equipment-categories/standard-gear"}},"cost":{{"quantity":{cost_qty},"unit":"gp"}},"weight":{weight},"url":"/api/gear/{idx}","contents":[],"properties":[]}}'

    system = "TYPE: adventuringgear\n\nEres un asistente experto en crear equipo de aventura para DnD 5e. Responde SOLO con JSON valido."

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito equipo basico para un viaje."},
        {"role": "assistant", "content": "Decime qué necesitás: mochila, cuerda, antorchas, raciones, odre, linterna, martillo, pico... cada aventurero lleva su kit. ¿Qué se te ocurre?"},
        {"role": "user", "content": f"{name}, que pese como {weight} lb y cueste {cost_qty} gp."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 7. MONSTER — 40 ejemplos
# ============================================================

MONSTER_NAMES = [
    "Goblin", "Ogro", "Dragon Joven de Fuego", "Lobo Sombrio", "Espectro",
    "Trol", "Gelatina Negra", "Arpia", "Minotauro", "Quimera",
    "Basilisco", "Gargola", "Hidra", "Kraken Joven", "Leon de Montana",
    "Murcielago Gigante", "Nigromante", "Orco", "Sombra", "Vampiro",
    "Wyvern", "Yeti", "Zombi", "Esqueleto", "Manticora",
    "Gnoll", "Hobgoblin", "Bugbear", "Driade", "Centauro",
    "Gigante de Colina", "Gigante de Hielo", "Gigante de Fuego", "Golem de Arcilla",
    "Golem de Hierro", "Demonio Menor", "Angel Vengador", "Lich", "Dragon Turtle", "Behir",
]

SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"]
TYPES = ["aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey", "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"]
ALIGNMENTS = ["lawful good", "neutral good", "chaotic good", "lawful neutral", "true neutral", "chaotic neutral", "lawful evil", "neutral evil", "chaotic evil", "unaligned"]

MONSTER_TEMPLATES = [
    {"hp_dice": "2d6", "hp": 7, "cr": "1/4", "xp": 50, "stats": {"str": 8, "dex": 14, "con": 10, "int": 10, "wis": 8, "cha": 8}},
    {"hp_dice": "4d8+4", "hp": 22, "cr": "1/2", "xp": 100, "stats": {"str": 14, "dex": 10, "con": 12, "int": 6, "wis": 8, "cha": 6}},
    {"hp_dice": "10d10+30", "hp": 85, "cr": "3", "xp": 700, "stats": {"str": 12, "dex": 16, "con": 16, "int": 14, "wis": 12, "cha": 14}},
    {"hp_dice": "5d8+15", "hp": 37, "cr": "2", "xp": 450, "stats": {"str": 10, "dex": 18, "con": 16, "int": 6, "wis": 12, "cha": 6}},
    {"hp_dice": "8d8+24", "hp": 60, "cr": "5", "xp": 1800, "stats": {"str": 18, "dex": 8, "con": 16, "int": 6, "wis": 10, "cha": 8}},
    {"hp_dice": "15d12+75", "hp": 172, "cr": "10", "xp": 5900, "stats": {"str": 22, "dex": 10, "con": 20, "int": 8, "wis": 10, "cha": 8}},
    {"hp_dice": "20d12+100", "hp": 230, "cr": "15", "xp": 13000, "stats": {"str": 26, "dex": 10, "con": 20, "int": 10, "wis": 12, "cha": 8}},
    {"hp_dice": "6d8+18", "hp": 45, "cr": "3", "xp": 700, "stats": {"str": 16, "dex": 12, "con": 16, "int": 8, "wis": 10, "cha": 8}},
    {"hp_dice": "12d10+36", "hp": 102, "cr": "6", "xp": 2300, "stats": {"str": 20, "dex": 14, "con": 16, "int": 10, "wis": 12, "cha": 10}},
    {"hp_dice": "8d8", "hp": 36, "cr": "1/2", "xp": 100, "stats": {"str": 6, "dex": 14, "con": 10, "int": 14, "wis": 12, "cha": 16}},
]

MONSTER_SIZE_EXP = (
    "Los tamaños en D&D: Tiny (ej: rata, murciélago), Small (goblin, gnomo), "
    "Medium (humano, elfo, orco — la mayoría de los PJ), "
    "Large (ogro, caballo — ocupa 2x2 casillas), "
    "Huge (gigante, dragón adulto — 3x3), "
    "Gargantuan (dragón anciano, tarrasque — 4x4+). "
    "¿Qué tamaño te va?"
)

MONSTER_CR_EXP = (
    "El CR (Challenge Rating) mide la dificultad del encuentro: "
    "CR 0-1/4 son bichos débiles (rata, murciélago, trampa menor), "
    "CR 1/2-1 son enemigos básicos para nivel 1-2 (goblin, lobo, esqueleto), "
    "CR 2-4 son desafíos para niveles 3-4 (ogro, nigromante), "
    "CR 5-10 para grupos de nivel medio-alto (gigante, dragón joven), "
    "CR 11-16 para aventureros veteranos, "
    "CR 17+ para leyendas (dragón anciano, tarrasque). "
    "¿Qué tan fuerte lo querés?"
)


def _monster_inference_variant(name, mtype, align_es, alignment, speed, has_fly, has_swim, ac_value):
    """Construye una conversacion donde la IA infiere stats a partir de una descripcion conceptual.
    Usa templates con FUE >= 16 para ser consistente con 'grande y fuerte'."""
    strong_templates = [t for t in MONSTER_TEMPLATES if t['stats']['str'] >= 16 and t['stats']['con'] >= 14]
    if not strong_templates:
        strong_templates = [t for t in MONSTER_TEMPLATES if t['stats']['str'] >= 14]
    inf_temp = random.choice(strong_templates)

    size = random.choice(["Large", "Huge"])
    inf_speed = random.choice([30, 40])
    inf_ac = ac_value or random.randint(14, 18)
    inf_has_fly = random.random() > 0.6

    inf_speed_dict = {"walk": str(inf_speed)}
    if inf_has_fly:
        inf_speed_dict["fly"] = str(random.choice([30, 40, 60]))

    cr_val = int(str(inf_temp['cr']).split('/')[0]) if '/' in str(inf_temp['cr']) else int(inf_temp['cr'])
    if cr_val <= 2:
        grupo_nivel = '3-5'
    elif cr_val <= 5:
        grupo_nivel = '4-6'
    elif cr_val <= 10:
        grupo_nivel = '7-10'
    else:
        grupo_nivel = '10+'

    senses = {"passive_perception": 10}
    if random.random() > 0.4:
        senses["darkvision"] = "60 ft."

    desc = f"A {size.lower()} {mtype} of {alignment} alignment."
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    json_inf = f'{{"index":"{idx}","name":"{name}","desc":"{desc}","size":"{size}","type":"{mtype}","alignment":"{alignment}","armor_class":[{{"type":"natural","value":{inf_ac}}}],"hit_points":{inf_temp["hp"]},"hit_dice":"{inf_temp["hp_dice"]}","speed":{json.dumps(inf_speed_dict)},"strength":{inf_temp["stats"]["str"]},"dexterity":{inf_temp["stats"]["dex"]},"constitution":{inf_temp["stats"]["con"]},"intelligence":{inf_temp["stats"]["int"]},"wisdom":{inf_temp["stats"]["wis"]},"charisma":{inf_temp["stats"]["cha"]},"senses":{json.dumps(senses)},"challenge_rating":"{inf_temp["cr"]}","xp":{inf_temp["xp"]},"url":"/api/monsters/{idx}"}}'

    system = "TYPE: monster\n\nEres un asistente experto en crear monstruos para DnD 5e. Explica las opciones de tamaño, tipo y CR al usuario. Cuando tengas todos los datos, responde SOLO con JSON valido."

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Quiero un bicho grande y fuerte, un boss para mi grupo de nivel {grupo_nivel}."},
        {"role": "assistant", "content": f"Dale. Por lo que me decis, deberia ser al menos {size} (ocupa 2x2 o 3x3 casillas), con FUE alta ({inf_temp['stats']['str']}+), CON alta ({inf_temp['stats']['con']}+) y muchos HP para bancarse al grupo. Para ese nivel algo de CR {inf_temp['cr']} viene bien. Nombre?"},
        {"role": "user", "content": name},
        {"role": "assistant", "content": "Tipo? Por grande y fuerte se me ocurre: giant (gigante), monstrosity (bestia magica como un troll) o dragon. Alineamiento?"},
        {"role": "user", "content": f"Es un {mtype}, {align_es.get(alignment, alignment)}."},
        {"role": "assistant", "content": f"Perfecto. Te propongo: tamaño {size}, CA {inf_ac} (armadura natural), HP {inf_temp['hp']} ({inf_temp['hp_dice']}), CR {inf_temp['cr']}. Stats acordes: FUE {inf_temp['stats']['str']}, CON {inf_temp['stats']['con']}, DES {inf_temp['stats']['dex']}. Velocidad {inf_speed} pies{' y vuela' if inf_has_fly else ''}. Asi te queda un boss solido."},
        {"role": "user", "content": "Dale, mandale."},
        {"role": "assistant", "content": json_inf},
    ]


def generate_monster_example(i: int) -> dict:
    name = MONSTER_NAMES[i % len(MONSTER_NAMES)]
    size = random.choice(SIZES)
    mtype = random.choice(TYPES)
    alignment = random.choice(ALIGNMENTS)
    template = MONSTER_TEMPLATES[i % len(MONSTER_TEMPLATES)]

    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    speed = random.choice([30, 40, 20, 50, 10, 0, 60])
    has_fly = random.random() > 0.7
    has_swim = random.random() > 0.8

    speed_dict = {"walk": str(speed)}
    if has_fly:
        speed_dict["fly"] = str(random.choice([20, 30, 40, 60, 80]))
    if has_swim:
        speed_dict["swim"] = str(random.choice([20, 30, 40]))

    ac_type = random.choice(["natural", "hide", "plate", "leather"])
    ac_value = random.randint(10, 20)
    senses = {"passive_perception": 10 + (template["stats"]["wis"] - 10) // 2 if template["stats"]["wis"] >= 10 else 10}
    if random.random() > 0.6:
        senses["darkvision"] = f"{random.choice([30, 60, 90, 120])} ft."

    desc = f"{'A' if name[0] in 'AEIOU' else 'A'} {size.lower()} {mtype} of {alignment} alignment."

    json_output = f'{{"index":"{idx}","name":"{name}","desc":"{desc}","size":"{size}","type":"{mtype}","alignment":"{alignment}","armor_class":[{{"type":"{ac_type}","value":{ac_value}}}],"hit_points":{template["hp"]},"hit_dice":"{template["hp_dice"]}","speed":{json.dumps(speed_dict)},"strength":{template["stats"]["str"]},"dexterity":{template["stats"]["dex"]},"constitution":{template["stats"]["con"]},"intelligence":{template["stats"]["int"]},"wisdom":{template["stats"]["wis"]},"charisma":{template["stats"]["cha"]},"senses":{json.dumps(senses)},"challenge_rating":"{template["cr"]}","xp":{template["xp"]},"url":"/api/monsters/{idx}"}}'

    system = "TYPE: monster\n\nEres un asistente experto en crear monstruos para DnD 5e. Explica las opciones de tamaño, tipo y CR al usuario. Cuando tengas todos los datos, responde SOLO con JSON valido."

    align_es = {"lawful good": "legal bueno", "neutral good": "neutral bueno", "chaotic good": "caotico bueno", "lawful neutral": "legal neutral", "true neutral": "neutral", "chaotic neutral": "caotico neutral", "lawful evil": "legal malvado", "neutral evil": "neutral malvado", "chaotic evil": "caotico malvado", "unaligned": "no alineado"}

    type_exp = (
        "Los tipos de criatura definen su naturaleza: "
        "aberration (seres de otro plano, ej: mind flayer), "
        "beast (animales normales), "
        "celestial (seres divinos), "
        "construct (golems, autómatas), "
        "dragon (dragones y sus primos), "
        "elemental (fuego, aire, agua, tierra), "
        "fey (hadas, duendes), "
        "fiend (demonios, diablos), "
        "giant (gigantes de todo tipo), "
        "humanoid (humanos, elfos, orcos — la mayoría de los PJ), "
        "monstrosity (bestias mágicas como quimeras), "
        "ooze (limos, gelatinas), "
        "plant (plantas animadas), "
        "undead (muertos vivientes). "
        "¿Qué tipo te interesa?"
    )

    conversations = [
        # Variante A: educativa completa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Quiero crear un bicho para una mazmorra."},
            {"role": "assistant", "content": f"¡Excelente! Arranquemos por el nombre. ¿Cómo se llama tu criatura?"},
            {"role": "user", "content": name},
            {"role": "assistant", "content": f"Buen nombre. Ahora, {MONSTER_SIZE_EXP}"},
            {"role": "user", "content": f"{size.lower()}."},
            {"role": "assistant", "content": type_exp},
            {"role": "user", "content": f"Es un {mtype}."},
            {"role": "assistant", "content": f"¿Alineamiento? Los más comunes son: {', '.join(list(align_es.values())[:5])}."},
            {"role": "user", "content": align_es.get(alignment, alignment)},
            {"role": "assistant", "content": f"{MONSTER_CR_EXP}"},
            {"role": "user", "content": f"CR {template['cr']}."},
            {"role": "assistant", "content": "CA, HP, dados de golpe y stats? Dame los números."},
            {"role": "user", "content": f"CA {ac_value} ({ac_type}), HP {template['hp']} ({template['hp_dice']}). FUE {template['stats']['str']} DES {template['stats']['dex']} CON {template['stats']['con']} INT {template['stats']['int']} SAB {template['stats']['wis']} CAR {template['stats']['cha']}. Velocidad {speed} pies{' y vuela' if has_fly else ''}{' y nada' if has_swim else ''}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: educativa semi-extensa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Dale, necesito un monstruo que se llame {name}."},
            {"role": "assistant", "content": f"Tamaño? {MONSTER_SIZE_EXP}"},
            {"role": "user", "content": f"{size.lower()}, tipo {mtype}, {align_es.get(alignment, alignment)}."},
            {"role": "assistant", "content": f"{MONSTER_CR_EXP}"},
            {"role": "user", "content": f"CR {template['cr']}. CA {ac_value}, HP {template['hp']} ({template['hp_dice']}), velocidad {speed}. Stats: FUE {template['stats']['str']} DES {template['stats']['dex']} CON {template['stats']['con']} INT {template['stats']['int']} SAB {template['stats']['wis']} CAR {template['stats']['cha']}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: rápido
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Monstruo: {name}, {size.lower()} {mtype} {alignment}. CA {ac_value}, HP {template['hp']} ({template['hp_dice']}), CR {template['cr']}. Stats FUE {template['stats']['str']} DES {template['stats']['dex']} CON {template['stats']['con']} INT {template['stats']['int']} SAB {template['stats']['wis']} CAR {template['stats']['cha']}. Vel {speed} ft."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante D: el usuario describe conceptualmente -> IA infiere stats
        # Para esta variante usamos templates con FUE alta (>= 16) para que sea consistente
        {"messages": _monster_inference_variant(name, mtype, align_es, alignment, speed, has_fly, has_swim, ac_value)},
        # Variante E: "hacelo todo vos" — la IA crea solo
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Che, necesito un monstruo para una mazmorra. Hacelo vos, confio en tu criterio."},
            {"role": "assistant", "content": f"¡Dale! Te voy a crear un {mtype} de tamaño {size.lower()}, alineamiento {align_es.get(alignment, alignment)}. Se llama {name}. Es un enemigo de CR {template['cr']}, con CA {ac_value}, {template['hp']} HP. Sus stats principales: FUE {template['stats']['str']}, CON {template['stats']['con']}, DES {template['stats']['dex']}. Ideal para un grupo de nivel {'1-2' if '1/4' in template['cr'] or '1/2' in template['cr'] or template['cr'] == '1' else '3-5' if int(str(template['cr']).split('/')[0]) <= 5 else '6-10'}."},
            {"role": "user", "content": "Uh dale, suena bien."},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 8. SPELL — 32 ejemplos
# ============================================================

SPELL_NAMES = [
    "Bola de Fuego", "Relampago", "Curar Heridas", "Escudo", "Mano del Mago",
    "Proyectil Magico", "Dungeon de la Mente", "Telarana", "Invisibilidad", "Volar",
    "Resurreccion", "Muro de Fuego", "Tormenta de Hielo", "Desintegrar", "Deseo",
    "Detectar Magia", "Dormir", "Encantar Persona", "Adivinacion", "Alarma",
    "Campo Antimagico", "Circulo Magico", "Clarividencia", "Controlar Clima",
    "Corona del Miedo", "Crear Muertos Vivientes", "Dedo de la Muerte", "Disipar Magia",
    "Don de las Lenguas", "Globo de Invulnerabilidad", "Hipnotizar", "Identificar",
]

SCHOOLS = ["Abjuration", "Conjuration", "Divination", "Enchantment", "Evocation", "Illusion", "Necromancy", "Transmutation"]
COMPONENTS_LIST = [["V", "S"], ["V", "S", "M"], ["V"], ["S"], ["V", "M"]]
CASTING_TIMES = ["1 action", "1 bonus action", "1 reaction", "1 minute", "10 minutes", "1 hour"]
DURATIONS = ["Instantaneous", "1 minute", "10 minutes", "1 hour", "8 hours", "24 hours", "Concentration, up to 1 minute", "Concentration, up to 1 hour"]
RANGES = ["Self", "Touch", "30 feet", "60 feet", "90 feet", "120 feet", "150 feet", "1 mile", "500 miles"]

SCHOOL_EXP = (
    "Las escuelas de magia en D&D son 8:\n"
    "- **Abjuration**: protección, escudos mágicos (ej: Escudo, Campo Antimagia)\n"
    "- **Conjuration**: invocar criaturas u objetos del aire (ej: Telaraña, Volar)\n"
    "- **Divination**: obtener información oculta (ej: Detectar Magia, Adivinación)\n"
    "- **Enchantment**: manipular mentes (ej: Encantar Persona, Hipnotizar)\n"
    "- **Evocation**: canalizar energía elemental para daño (ej: Bola de Fuego, Relámpago)\n"
    "- **Illusion**: crear imágenes y engaños (ej: Invisibilidad)\n"
    "- **Necromancy**: manipular vida y muerte (ej: Dedo de la Muerte, Curar Heridas)\n"
    "- **Transmutation**: cambiar propiedades de objetos o seres (ej: Volar)\n"
    "¿Qué escuela te llama?"
)

COMP_EXP = (
    "Los componentes de un conjuro son:\n"
    "- V (Verbal): tenés que hablar en voz alta — no funciona si estás silenciado\n"
    "- S (Somatic): necesitas mover las manos — no funciona si tenés las manos atadas\n"
    "- M (Material): requiere un objeto físico (un foco mágico o component pouch lo reemplaza si no tiene costo)\n"
    "¿Qué componentes tiene tu conjuro?"
)

CONC_EXP = (
    "Concentración: si el conjuro la requiere, el lanzador no puede lanzar OTRO conjuro que requiera concentración mientras este esté activo. "
    "Si recibe daño, debe hacer una tirada de CON para mantenerlo. "
    "Ej: Volar requiere concentración, Bola de Fuego no (es instantáneo). "
    "¿Tu conjuro requiere concentración o es instantáneo/de corta duración?"
)


def generate_spell_example(i: int) -> dict:
    name = SPELL_NAMES[i % len(SPELL_NAMES)]
    level = random.choices([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], weights=[5, 20, 20, 20, 10, 10, 5, 5, 3, 2])[0]
    school_name = random.choice(SCHOOLS)
    comps = random.choice(COMPONENTS_LIST)
    casting = random.choice(CASTING_TIMES)
    duration = random.choice(DURATIONS)
    range_spell = random.choice(RANGES)
    ritual = random.random() > 0.9
    concentration = "Concentration" in duration
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    school = {"index": school_name.lower(), "name": school_name, "url": f"/api/magic-schools/{school_name.lower()}"}
    desc = [f"Descripcion de {name}. Conjuro de nivel {level} de {school_name}."]

    has_damage = random.random() > 0.5 and school_name == "Evocation"
    damage_obj = ""
    if has_damage:
        dmg_dice = f"{level + 1}d{random.choice([4, 6, 8, 10, 12])}"
        dt = random.choice(["fire", "lightning", "cold", "acid", "thunder", "force", "radiant", "necrotic"])
        damage_obj = f',"damage":{{"damage_type":{{"index":"{dt}","name":"{dt.title()}","url":"/api/damage-types/{dt}"}},"damage_at_slot_level":{{"{level}":"{dmg_dice}"}}}}'

    json_output = f'{{"index":"{idx}","name":"{name}","desc":{json.dumps(desc)},"range":"{range_spell}","components":{json.dumps(comps)},"ritual":{str(ritual).lower()},"duration":"{duration}","concentration":{str(concentration).lower()},"casting_time":"{casting}","level":{level},"school":{json.dumps(school)},"url":"/api/spells/{idx}"{damage_obj}}}'

    system = "TYPE: spell\n\nEres un asistente experto en crear conjuros para DnD 5e. Explica las escuelas, componentes y duración. Responde SOLO con JSON valido."

    comps_text = ", ".join(comps)
    casting_es = casting.replace("action", "accion").replace("bonus", "bonus").replace("reaction", "reaccion")
    duration_es = duration.replace("Concentration", "Concentracion").replace("up to", "hasta")
    tier = "truco (nivel 0)" if level == 0 else f"nivel {level}"

    conversations = [
        # Variante A: educativa completa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Necesito un conjuro nuevo."},
            {"role": "assistant", "content": f"¡Dale! ¿Cómo se llama y de qué nivel? Los niveles van de 0 (trucos, se lanzan sin gastar slots) hasta 9 (magia de poder divino prácticamente). Los niveles 1-3 son los más comunes para aventureros."},
            {"role": "user", "content": f"{name}, {tier}."},
            {"role": "assistant", "content": SCHOOL_EXP},
            {"role": "user", "content": school_name},
            {"role": "assistant", "content": f"{COMP_EXP}"},
            {"role": "user", "content": f"{comps_text}."},
            {"role": "assistant", "content": f"¿Tiempo de lanzamiento? 1 action (lo más común para combate), 1 bonus action (más rápido, ej: Escudo), 1 reaction (respuesta a un evento), 1 minute o más (fuera de combate). ¿Cuál?"},
            {"role": "user", "content": casting_es},
            {"role": "assistant", "content": f"¿Duración? {CONC_EXP}"},
            {"role": "user", "content": f"{duration_es}.{' Es ritual, se puede lanzar sin slot si tomás +10 min.' if ritual else ''}"},
            {"role": "assistant", "content": f"Rango: Self (solo a vos mismo), Touch (tocar al objetivo), 30/60/90/120 ft (distancia de combate típica), 1 mile o más (conjuros de exploración). ¿Cuál?"},
            {"role": "user", "content": range_spell},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: semi-extensa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Quiero un conjuro que se llame {name}, {tier}."},
            {"role": "assistant", "content": f"Escuela? {SCHOOL_EXP}"},
            {"role": "user", "content": school_name},
            {"role": "assistant", "content": f"Componentes ({COMP_EXP}), tiempo de lanzamiento, duración y rango?"},
            {"role": "user", "content": f"{comps_text}, {casting_es}, dura {duration_es}, rango {range_spell}.{' Es ritual.' if ritual else ''}"},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: rápido
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Conjuro: {name}, {tier}, {school_name}. Componentes {comps_text}. {casting_es}, {duration_es}, {range_spell}.{' Ritual.' if ritual else ''}"},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante D: el usuario describe el efecto -> IA crea el conjuro
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Necesito un conjuro que haga pupa en area, algo tipo explosion."},
            {"role": "assistant", "content": "Para daño en area la escuela es Evocacion. El clasico es Bola de Fuego (nivel 3, 8d6 fuego, 20 ft radio). Si queres algo de menos nivel: Manos Ardientes (nivel 1, 3d6 fuego, cono 15 ft). Si queres mas alto: Tormenta de Hielo (nivel 4, 2d8 contundente + 4d6 hielo, 20 ft radio). Que nombre y nivel aproximado?"},
            {"role": "user", "content": f"{name}, que sea de nivel {level}."},
            {"role": "assistant", "content": f"Evocacion, perfecto. Te pongo componentes {comps_text}, tiempo de lanzamiento {casting_es}, duracion {duration_es}, rango {range_spell}.{' Es ritual.' if ritual else ''} Un conjuro solido para hacer pupa."},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 9. CHARACTER — 42 ejemplos
# ============================================================

CHAR_NAMES = [
    "Aragorn", "Legolas", "Gimli", "Gandalf", "Frodo", "Samwise", "Merry", "Pippin",
    "Bilbo", "Elrond", "Galadriel", "Saruman", "Boromir", "Faramir", "Eowyn", "Theoden",
    "Drizzt", "Cattie-brie", "Wulfgar", "Bruenor", "Regis", "Artemis", "Jarlaxle",
    "Elminster", "Mordenkainen", "Volothamp", "Strahd", "Rahadin", "Ezmeralda", "Van Richten",
    "Tasslehoff", "Raistlin", "Caramon", "Tanis", "Flint", "Goldmoon", "Riverwind",
    "Viconia", "Jaheira", "Minsc", "Boo", "Imoen",
]

CLASSES = ["Barbarian", "Bard", "Cleric", "Druid", "Fighter", "Monk", "Paladin", "Ranger", "Rogue", "Sorcerer", "Warlock", "Wizard"]
RACES = ["Dragonborn", "Dwarf", "Elf", "Gnome", "Half-Elf", "Halfling", "Half-Orc", "Human", "Tiefling", "Aarakocra", "Genasi", "Goliath"]
BACKGROUNDS = ["Acolyte", "Criminal", "Folk Hero", "Noble", "Sage", "Soldier", "Outlander", "Urchin", "Entertainer", "Guild Artisan", "Hermit", "Sailor"]

CLASS_EXP = (
    "Las clases en D&D definen tu rol: "
    "Barbarian (tanque con furia, dado de golpe d12), "
    "Bard (apoyo con magia y habilidades, d8), "
    "Cleric (sanador divino con armadura, d8), "
    "Druid (naturaleza y formas salvajes, d8), "
    "Fighter (combatiente versátil, d10), "
    "Monk (artes marciales y ki, d8), "
    "Paladin (tanque divino con smite, d10), "
    "Ranger (explorador con arco o dos espadas, d10), "
    "Rogue (sigilo y daño furtivo, d8), "
    "Sorcerer (magia innata, metamagia, d6), "
    "Warlock (magia por pacto, d8), "
    "Wizard (magia estudiada, el más versátil, d6). "
    "¿Qué clase te copa?"
)

RACE_EXP_PJ = (
    "Las razas comunes: "
    "Dragonborn (+FUE +CAR, aliento elemental), "
    "Dwarf (enano, +CON, resistencia al veneno), "
    "Elf (elfo, +DES, trance, visión nocturna), "
    "Gnome (gnomo, +INT, ingenio), "
    "Half-Elf (semielfo, +CAR, versatilidad), "
    "Halfling (mediano, +DES, suerte), "
    "Half-Orc (semiorco, +FUE +CON, resistencia), "
    "Human (humano, +1 a todo, versátil), "
    "Tiefling (+INT +CAR, resistencia al fuego), "
    "Aarakocra (ave, +DES +SAB, vuelo), "
    "Genasi (elemental, +CON), "
    "Goliath (+FUE +CON, fuerza atlética). "
    "¿Cuál te gusta?"
)

BG_EXP = (
    "Los trasfondos definen tu pasado y te dan competencias: "
    "Acolyte (religión, sabiduría), "
    "Criminal (engaño, sigilo), "
    "Folk Hero (trato con animales, supervivencia), "
    "Noble (historia, persuasión), "
    "Sage (arcano, historia, erudito), "
    "Soldier (atletismo, intimidación), "
    "Outlander (atletismo, supervivencia), "
    "Urchin (prestidigitación, sigilo), "
    "Entertainer (acrobacias, actuación), "
    "Guild Artisan (perspicacia, persuasión), "
    "Hermit (medicina, religión), "
    "Sailor (atletismo, percepción). "
    "¿Cuál va con tu personaje?"
)


def generate_character_example(i: int) -> dict:
    name = CHAR_NAMES[i % len(CHAR_NAMES)]
    cls = random.choice(CLASSES)
    race = random.choice(RACES)
    bg = random.choice(BACKGROUNDS)
    level = random.choices([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], weights=[10,8,8,8,7,5,5,4,4,3,3,2,2,2,1,1,1,1,1,1])[0]
    alignment = random.choice(["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"])

    hit_die = {"Barbarian": 12, "Fighter": 10, "Paladin": 10, "Ranger": 10, "Bard": 8, "Cleric": 8, "Druid": 8, "Monk": 8, "Rogue": 8, "Warlock": 8, "Sorcerer": 6, "Wizard": 6}
    hd = hit_die.get(cls, 8)
    hp = hd + random.randint(1, 8) + level * (random.randint(1, 4) + 2) if level > 1 else hd + random.randint(1, hd)

    stats_arr = [15, 14, 13, 12, 10, 8]
    random.shuffle(stats_arr)
    stats = {"strength": stats_arr[0], "dexterity": stats_arr[1], "constitution": stats_arr[2], "intelligence": stats_arr[3], "wisdom": stats_arr[4], "charisma": stats_arr[5]}
    pb = 2 + (level - 1) // 4
    idx = name.lower().replace(" ", "-").replace("'", "").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")

    json_output = f'{{"name":"{name}","level":{level},"character_class":{{"index":"{cls.lower()}","name":"{cls}","url":"/api/classes/{cls.lower()}"}},"race":{{"index":"{race.lower()}","name":"{race}","url":"/api/races/{race.lower()}"}},"alignment":"{alignment}","background":{{"index":"{bg.lower().replace(chr(32),chr(45))}","name":"{bg}","url":"/api/backgrounds/{bg.lower().replace(chr(32),chr(45))}"}},"hit_points":{hp},"hit_dice":"1d{hd}","strength":{stats["strength"]},"dexterity":{stats["dexterity"]},"constitution":{stats["constitution"]},"intelligence":{stats["intelligence"]},"wisdom":{stats["wisdom"]},"charisma":{stats["charisma"]},"proficiency_bonus":{pb},"speed":{{"walk":"30 ft."}},"inventory":{{"items":[],"cash":{{"cp":0,"sp":0,"ep":0,"gp":{random.randint(5,50)},"pp":0}}}},"traits":[],"custom_traits":[]}}'

    system = "TYPE: character\n\nEres un asistente experto en crear personajes (PJ) para DnD 5e. Explica las opciones de clase, raza y trasfondo al usuario. Pregunta paso a paso. Cuando tengas todos los datos, responde SOLO con JSON valido."

    align_es = {"Lawful Good": "Legal Bueno", "Neutral Good": "Neutral Bueno", "Chaotic Good": "Caotico Bueno", "Lawful Neutral": "Legal Neutral", "True Neutral": "Verdadero Neutral", "Chaotic Neutral": "Caotico Neutral", "Lawful Evil": "Legal Malvado", "Neutral Evil": "Neutral Malvado", "Chaotic Evil": "Caotico Malvado"}

    conversations = [
        # Variante A: educativa completa
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Quiero crearme un pj para una campania nueva."},
            {"role": "assistant", "content": f"¡Excelente! Arranquemos por lo básico. {CLASS_EXP}"},
            {"role": "user", "content": cls},
            {"role": "assistant", "content": f"Buena elección. {RACE_EXP_PJ}"},
            {"role": "user", "content": race},
            {"role": "assistant", "content": "¿Nombre del personaje y nivel? Si es nivel 1 arrancás con lo básico. A mayor nivel más habilidades tenés."},
            {"role": "user", "content": f"{name}, nivel {level}."},
            {"role": "assistant", "content": f"{BG_EXP}"},
            {"role": "user", "content": bg},
            {"role": "assistant", "content": "Alineamiento: Legal/Neutral/Caótico y Bueno/Neutral/Malvado. Por ejemplo: Legal Bueno (sigue el código, heroico), Caótico Bueno (libertad sobre todo, pero bien intencionado), Neutral Malvado (egoísta sin restricciones). ¿Cuál?"},
            {"role": "user", "content": align_es.get(alignment, alignment)},
            {"role": "assistant", "content": "Stats! Puntajes típicos con compra de puntos o 4d6: FUE (fuerza física), DES (reflejos, puntería), CON (aguante, HP), INT (saberes, magia de wizard), SAB (percepción, magia divina), CAR (personalidad, magia de brujo/bardo). Decime los 6 valores."},
            {"role": "user", "content": f"FUE {stats['strength']}, DES {stats['dexterity']}, CON {stats['constitution']}, INT {stats['intelligence']}, SAB {stats['wisdom']}, CAR {stats['charisma']}. HP {hp}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante B: semi-extensa con explicación de trasfondo y stats
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"Me armas un personaje? {race} {cls}, se llama {name}."},
            {"role": "assistant", "content": f"Qué nivel? {BG_EXP}"},
            {"role": "user", "content": f"Nivel {level}, trasfondo {bg}."},
            {"role": "assistant", "content": "Alineamiento y stats? FUE, DES, CON, INT, SAB, CAR. Por ej: 15,14,13,12,10,8."},
            {"role": "user", "content": f"{align_es.get(alignment, alignment)}. FUE {stats['strength']} DES {stats['dexterity']} CON {stats['constitution']} INT {stats['intelligence']} SAB {stats['wisdom']} CAR {stats['charisma']}. HP {hp}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante C: rápido
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": f"PJ: {name}, {cls} {race} nivel {level}. Trasfondo {bg}, {align_es.get(alignment, alignment)}. Stats FUE {stats['strength']} DES {stats['dexterity']} CON {stats['constitution']} INT {stats['intelligence']} SAB {stats['wisdom']} CAR {stats['charisma']}. HP {hp}."},
            {"role": "assistant", "content": json_output},
        ]},
        # Variante D: "hacelo vos" — el usuario delega completamente
        {"messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": "Che, armame un pj que sea un mago re potente. Hacelo todo vos."},
            {"role": "assistant", "content": f"¡Dale! Para un mago potente la prioridad es INT altisima (para lanzar conjuros), seguido de CON (para concentración) y DES (para CA). Te recomiendo Elfo (High Elf) por el +1 a INT y el truco extra, o Humano por la versatilidad. Nivel? Te sugiero nivel 5 que es donde los magos consiguen conjuros de nivel 3 (Bola de Fuego, Relámpago...)."},
            {"role": "user", "content": "Dale, nivel 5."},
            {"role": "assistant", "content": f"Perfecto. Te creo a {name}, un {cls} {race} nivel {level}. Trasfondo Sage (sabio, le va perfecto a un mago). Stats: INT 17, CON 14, DES 13, SAB 12, CAR 10, FUE 8. HP {hp}. Alineamiento {align_es.get(alignment, alignment)}."},
            {"role": "user", "content": "Genial, dale."},
            {"role": "assistant", "content": json_output},
        ]},
    ]
    return random.choice(conversations)


# ============================================================
# 10. RACE — 18 ejemplos
# ============================================================

RACE_FULL = [
    {"name": "Dragonborn", "speed": 30, "size": "Medium", "bonus": "FUE +2 y CAR +1"},
    {"name": "Dwarf", "speed": 25, "size": "Medium", "bonus": "CON +2"},
    {"name": "Elf", "speed": 30, "size": "Medium", "bonus": "DES +2"},
    {"name": "Gnome", "speed": 25, "size": "Small", "bonus": "INT +2"},
    {"name": "Half-Elf", "speed": 30, "size": "Medium", "bonus": "CAR +2 y dos a eleccion +1"},
    {"name": "Halfling", "speed": 25, "size": "Small", "bonus": "DES +2"},
    {"name": "Half-Orc", "speed": 30, "size": "Medium", "bonus": "FUE +2 y CON +1"},
    {"name": "Human", "speed": 30, "size": "Medium", "bonus": "todos +1"},
    {"name": "Tiefling", "speed": 30, "size": "Medium", "bonus": "INT +1 y CAR +2"},
    {"name": "Aarakocra", "speed": 30, "size": "Medium", "bonus": "DES +2 y SAB +1"},
    {"name": "Genasi", "speed": 30, "size": "Medium", "bonus": "CON +2"},
    {"name": "Goliath", "speed": 30, "size": "Medium", "bonus": "FUE +2 y CON +1"},
    {"name": "Aasimar", "speed": 30, "size": "Medium", "bonus": "CAR +2"},
    {"name": "Firbolg", "speed": 30, "size": "Medium", "bonus": "SAB +2 y FUE +1"},
    {"name": "Kenku", "speed": 30, "size": "Medium", "bonus": "DES +2 y SAB +1"},
    {"name": "Tabaxi", "speed": 30, "size": "Medium", "bonus": "DES +2 y CAR +1"},
    {"name": "Tortle", "speed": 30, "size": "Medium", "bonus": "FUE +2 y SAB +1"},
    {"name": "Triton", "speed": 30, "size": "Medium", "bonus": "FUE +1 CON +1 CAR +1"},
]


def generate_race_example(i: int) -> dict:
    r = RACE_FULL[i % len(RACE_FULL)]
    idx = r["name"].lower()

    json_output = f'{{"index":"{idx}","name":"{r["name"]}","speed":{r["speed"]},"ability_bonuses":[],"age":"Edad tipica de la raza.","alignment":"Tendencia moral tipica.","size":"{r["size"]}","size_description":"{r["size"].lower()} sized.","language_desc":"Comun y su idioma racial.","url":"/api/races/{idx}"}}'

    system = "TYPE: race\n\nEres un asistente experto en crear razas para DnD 5e. Explica los bonos raciales. Responde SOLO con JSON valido."

    race_exp = (
        "Cada raza da bonos de característica distintos. Algunos ejemplos:\n"
        "- Dragonborn: +FUE +CAR, respiran ácido/fuego/etc.\n"
        "- Dwarf (enano): +CON, veneno resistente, visión oscura\n"
        "- Elf (elfo): +DES, trance (no duermen), visión en la penumbra\n"
        "- Gnome: +INT, ingenio gnómico (ventaja en sabes mágicos)\n"
        "- Half-Elf: +CAR +2, +1 a dos stats a elegir — muy versátil\n"
        "- Halfling (mediano): +DES, suerte (repites 1 natural)\n"
        "- Half-Orc: +FUE +CON, aguante implacable (1 HP cuando te noquean)\n"
        "- Human: +1 a todo\n"
        "- Tiefling: +INT +CAR, resistencia al fuego, oscuridad innata\n"
        "- Aarakocra: +DES +SAB, ¡tienen vuelo!\n"
        "- Goliath: +FUE +CON, fuerza atlética, resistencia a daño\n"
        "¿Qué raza necesitás?"
    )

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito crear una raza para mi mundo."},
        {"role": "assistant", "content": race_exp},
        {"role": "user", "content": f"{r['name']}, velocidad {r['speed']} pies, tamano {r['size']}. Sus bonos son {r['bonus']}."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 11. CLASS — 14 ejemplos
# ============================================================

CLASSES_FULL = [
    {"name": "Barbarian", "hd": 12, "saves": "FUE y CON"},
    {"name": "Bard", "hd": 8, "saves": "DES y CAR"},
    {"name": "Cleric", "hd": 8, "saves": "SAB y CAR"},
    {"name": "Druid", "hd": 8, "saves": "INT y SAB"},
    {"name": "Fighter", "hd": 10, "saves": "FUE y CON"},
    {"name": "Monk", "hd": 8, "saves": "FUE y DES"},
    {"name": "Paladin", "hd": 10, "saves": "SAB y CAR"},
    {"name": "Ranger", "hd": 10, "saves": "FUE y DES"},
    {"name": "Rogue", "hd": 8, "saves": "DES e INT"},
    {"name": "Sorcerer", "hd": 6, "saves": "CON y CAR"},
    {"name": "Warlock", "hd": 8, "saves": "SAB y CAR"},
    {"name": "Wizard", "hd": 6, "saves": "INT y SAB"},
    {"name": "Artificer", "hd": 8, "saves": "CON e INT"},
    {"name": "Blood Hunter", "hd": 10, "saves": "FUE y DES"},
]


def generate_class_example(i: int) -> dict:
    cls = CLASSES_FULL[i % len(CLASSES_FULL)]
    idx = cls["name"].lower().replace(" ", "-")

    json_output = f'{{"index":"{idx}","name":"{cls["name"]}","hit_die":{cls["hd"]},"proficiency_choices":[],"proficiencies":[],"saving_throws":[],"starting_equipment":[],"starting_equipment_options":[],"class_levels":"/api/classes/{idx}/levels","subclasses":[],"url":"/api/classes/{idx}"}}'

    system = "TYPE: class\n\nEres un asistente experto en crear clases para DnD 5e. Explica el dado de golpe y salvaciones. Responde SOLO con JSON valido."

    class_exp = (
        "Cada clase tiene un dado de golpe (HD) que determina cuántos HP gana por nivel: "
        "d6 (lanzadores puros: Wizard, Sorcerer — más frágiles), "
        "d8 (clases intermedias: Rogue, Cleric, Bard, Warlock), "
        "d10 (combatientes: Fighter, Ranger, Paladin), "
        "d12 (tanque puro: Barbarian — el que más HP tiene). "
        "Las salvaciones fuertes también varían: por ejemplo, Wizard salva bien en INT y SAB, "
        "Fighter en FUE y CON, Rogue en DES e INT. "
        "¿Qué clase querés crear?"
    )

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito una clase para mi campaña."},
        {"role": "assistant", "content": class_exp},
        {"role": "user", "content": f"La clase {cls['name']}. Dado de golpe d{cls['hd']}, salvaciones fuertes en {cls['saves']}."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 12. SUBCLASS — 10 ejemplos
# ============================================================

SUBCLASSES = [
    ("Berserker", "Barbarian", "Furia implacable."),
    ("Lore", "Bard", "Conocimiento secreto."),
    ("Life", "Cleric", "Canalizar energia divina."),
    ("Moon", "Druid", "Formas salvajes mejoradas."),
    ("Champion", "Fighter", "Criticos mejorados."),
    ("Open Hand", "Monk", "Tecnicas de la mano abierta."),
    ("Devotion", "Paladin", "Juramento sagrado."),
    ("Hunter", "Ranger", "Rastrear y cazar."),
    ("Thief", "Rogue", "Habilidades de ladron."),
    ("Evocation", "Wizard", "Magia destructiva."),
]


def generate_subclass_example(i: int) -> dict:
    sub_name, class_name, flavor = SUBCLASSES[i % len(SUBCLASSES)]
    idx = f"{class_name.lower()}-{sub_name.lower()}"

    json_output = f'{{"index":"{idx}","class":{{"index":"{class_name.lower()}","name":"{class_name}","url":"/api/classes/{class_name.lower()}"}},"name":"{sub_name}","subclass_flavor":"{flavor}","desc":["Los {sub_name} son {sub_name.lower()}s."],"subclass_levels":"/api/classes/{class_name.lower()}/subclasses/{idx}/levels","url":"/api/subclasses/{idx}","spells":[]}}'

    system = "TYPE: subclass\n\nEres un asistente experto en crear subclases para DnD 5e. Explica las opciones. Responde SOLO con JSON valido."

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito una subclase."},
        {"role": "assistant", "content": "Dale, las subclases (o arquetipos) se eligen generalmente en nivel 2-3 y definen tu especialización. Por ejemplo: un Fighter puede ser Champion (críticos mejorados), Battle Master (maniobras) o Eldritch Knight (magia). ¿Para qué clase principal va?"},
        {"role": "user", "content": f"Para {class_name}."},
        {"role": "assistant", "content": f"Qué subclase de {class_name}? {flavor}"},
        {"role": "user", "content": sub_name},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 13. SUBRACE — 10 ejemplos
# ============================================================

SUBRACES = [
    ("High Elf", "Elf", "INT +1, un truco de mago"),
    ("Hill Dwarf", "Dwarf", "SAB +1, +1 HP por nivel"),
    ("Lightfoot", "Halfling", "CAR +1, esconderse tras aliados"),
    ("Wood Elf", "Elf", "SAB +1, velocidad 35, ocultarse en bosque"),
    ("Stout", "Halfling", "CON +1, resistencia al veneno"),
    ("Mountain Dwarf", "Dwarf", "FUE +2, prof. armaduras ligeras y medias"),
    ("Dark Elf (Drow)", "Elf", "CAR +1, vision oscura 120, magia drow"),
    ("Duergar", "Dwarf", "FUE +1, vision oscura 120, crecer/invisibilidad"),
    ("Deep Gnome", "Gnome", "DES +1, vision oscura 120, camuflaje"),
    ("Forest Gnome", "Gnome", "DES +1, ilusion menor, hablar con animales"),
]


def generate_subrace_example(i: int) -> dict:
    sub_name, race_name, desc = SUBRACES[i % len(SUBRACES)]
    idx = sub_name.lower().replace(" ", "-").replace("(", "").replace(")", "")

    json_output = f'{{"index":"{idx}","name":"{sub_name}","race":{{"index":"{race_name.lower()}","name":"{race_name}","url":"/api/races/{race_name.lower()}"}},"desc":"{desc}","ability_bonuses":[],"racial_traits":[],"url":"/api/subraces/{idx}"}}'

    system = "TYPE: subrace\n\nEres un asistente experto en crear subrazas para DnD 5e. Explica las opciones. Responde SOLO con JSON valido."

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Necesito una subraza."},
        {"role": "assistant", "content": "Las subrazas refinan una raza principal dándole bonos adicionales. Por ejemplo: los Elfos tienen High Elves (+INT, truco de mago), Wood Elves (+SAB, más velocidad) o Drow (+CAR, magia oscura). Los Enanos: Hill (+SAB, más HP) o Mountain (+FUE, armaduras). ¿De qué raza principal?"},
        {"role": "user", "content": race_name},
        {"role": "assistant", "content": f"Qué subraza de {race_name}? Opciones para {race_name}: ... {desc}. ¿Cuál?"},
        {"role": "user", "content": sub_name},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 14. BACKGROUND — 16 ejemplos
# ============================================================

BACKGROUNDS_FULL = [
    {"name": "Acolyte", "skills": "Insight y Religion"},
    {"name": "Criminal", "skills": "Deception y Stealth"},
    {"name": "Folk Hero", "skills": "Animal Handling y Survival"},
    {"name": "Noble", "skills": "History y Persuasion"},
    {"name": "Sage", "skills": "Arcana y History"},
    {"name": "Soldier", "skills": "Athletics e Intimidation"},
    {"name": "Outlander", "skills": "Athletics y Survival"},
    {"name": "Urchin", "skills": "Sleight of Hand y Stealth"},
    {"name": "Entertainer", "skills": "Acrobatics y Performance"},
    {"name": "Guild Artisan", "skills": "Insight y Persuasion"},
    {"name": "Hermit", "skills": "Medicine y Religion"},
    {"name": "Sailor", "skills": "Athletics y Perception"},
    {"name": "Charlatan", "skills": "Deception y Sleight of Hand"},
    {"name": "Gladiator", "skills": "Athletics y Performance"},
    {"name": "Knight", "skills": "History y Persuasion"},
    {"name": "Spy", "skills": "Deception y Stealth"},
]


def generate_background_example(i: int) -> dict:
    bg = BACKGROUNDS_FULL[i % len(BACKGROUNDS_FULL)]
    idx = bg["name"].lower().replace(" ", "-")

    json_output = f'{{"index":"{idx}","name":"{bg["name"]}","starting_proficiencies":[],"starting_equipment":[],"language_desc":"","url":"/api/backgrounds/{idx}"}}'

    system = "TYPE: background\n\nEres un asistente experto en crear trasfondos para DnD 5e. Explica las opciones de trasfondo y las competencias que dan. Responde SOLO con JSON valido."

    return {"messages": [
        {"role": "system", "content": system},
        {"role": "user", "content": "Quiero un trasfondo para mi pj."},
        {"role": "assistant", "content": "Los trasfondos representan la vida de tu personaje antes de aventurar y dan 2 competencias en habilidades. Acolyte (Saber + Religión), Criminal (Engaño + Sigilo), Folk Hero (Trato Animal + Supervivencia), Noble (Historia + Persuasión), Sage (Arcano + Historia), Soldier (Atletismo + Intimidación), Outlander (Atletismo + Supervivencia), Urchin (Juego Manos + Sigilo), Entertainer (Acrobacias + Actuación). ¿Cuál te gusta?"},
        {"role": "user", "content": f"{bg['name']}, con competencias en {bg['skills']}."},
        {"role": "assistant", "content": json_output},
    ]}


# ============================================================
# 15. EDGE CASES — 6 ejemplos
# ============================================================

def generate_edge_case(i: int) -> dict:
    cases = [
        {"messages": [
            {"role": "system", "content": "TYPE: weapon\n\nEres un asistente experto en crear armas para DnD 5e."},
            {"role": "user", "content": "Una espada que hace mucho danio."},
            {"role": "assistant", "content": "Dame más datos. ¿Cómo se llama? ¿Cuerpo a cuerpo o a distancia? Tipos de daño: cortante (slashing), perforante (piercing), contundente (bludgeoning). Y propiedades: ¿light para dual wield, heavy para Great Weapon Master, versatile para 1 o 2 manos?"},
            {"role": "user", "content": "Se llama Tajo Profundo. Hace 1d8 cortante."},
            {"role": "assistant", "content": "Rareza? Las opciones son common, uncommon, rare, very rare, legendary."},
            {"role": "user", "content": "Es rara, versatil. Cuerpo a cuerpo marcial."},
            {"role": "assistant", "content": '{"type":"weapon","name":"Tajo Profundo","desc":["Una espada afilada que causa heridas profundas."],"equipment_category":{"index":"weapons","name":"Weapons","url":"/api/equipment-categories/weapons"},"weapon_category":"Martial","weapon_range":"Melee","category_range":"martial melee weapon","cost":{"quantity":25,"unit":"gp"},"damage":{"damage_dice":"1d8","damage_type":{"index":"slashing","name":"Slashing","url":"/api/damage-types/slashing"}},"range":{"normal":5},"weight":3,"rarity":"rare","properties":[{"index":"versatile","name":"Versatile","url":"/api/weapon-properties/versatile"}],"url":"/api/weapons/tajo-profundo"}'},
        ]},
        {"messages": [
            {"role": "system", "content": "TYPE: magicitem\n\nEres un asistente experto en crear objetos magicos para DnD 5e."},
            {"role": "user", "content": "Quiero un arma que mate al toque."},
            {"role": "assistant", "content": "Eso no existe en DnD 5e asi directamente. Podria ser una Espada Vorpal legendaria que decapita con 20 natural. Te copa?"},
            {"role": "user", "content": "Dale, mandale."},
            {"role": "assistant", "content": '{"index":"espada-vorpal","name":"Espada Vorpal","type":"magicitem","desc":["Legendaria espada que decapita con un 20 natural."],"equipment_category":{"index":"magic-items","name":"Magic Items","url":"/api/equipment-categories/magic-items"},"rarity":{"name":"legendary"},"variants":[],"variant":false,"url":"/api/magic-items/espada-vorpal"}'},
        ]},
        {"messages": [
            {"role": "system", "content": "TYPE: armor\n\nEres un asistente experto en crear armaduras para DnD 5e."},
            {"role": "user", "content": "Mi armadura se llama Coraza de Plata. Es pesada."},
            {"role": "assistant", "content": "CA base? Las pesadas van de 14 (cota de anillas) a 18 (placas completas). Las pesadas NO suman DES y requieren 15 FUE mínimo."},
            {"role": "user", "content": "CA 20, pesa 30 lb."},
            {"role": "assistant", "content": "Ojo, las pesadas tienen CA maxima 18. CA 20 es muy alto a menos que sea mágica. ¿CA 18 mejor?"},
            {"role": "user", "content": "Ah tenes razon, CA 18. No es magica."},
            {"role": "assistant", "content": '{"type":"armor","name":"Coraza de Plata","desc":["Una solida armadura de placas de plata."],"equipment_category":{"index":"armor","name":"Armor","url":"/api/equipment-categories/armor"},"armor_category":"heavy","armor_class":{"base":18,"dex_bonus":false,"max_bonus":null,"str_minimum":15},"str_minimum":15,"stealth_disadvantage":true,"weight":30,"cost":{"quantity":1500,"unit":"gp"},"url":"/api/armor/coraza-de-plata"}'},
        ]},
        {"messages": [
            {"role": "system", "content": "TYPE: monster\n\nEres un asistente experto en crear monstruos para DnD 5e."},
            {"role": "user", "content": "CR 1/2, 25 HP, CA 14, FUE 12 DES 14 CON 12 INT 6 SAB 10 CAR 8, velocidad 30. Se llama Cazador Nocturno, humanoide, caotico neutral."},
            {"role": "assistant", "content": "Tamaño? Tipo exacto de humanoide (humano, elfo, gnoll, etc.)? Sentidos: ¿visión oscura? ¿Percepción pasiva?"},
            {"role": "user", "content": "Mediano, humanoide generico. Vision oscura 60 ft."},
            {"role": "assistant", "content": '{"index":"cazador-nocturno","name":"Cazador Nocturno","desc":"A medium humanoid of chaotic neutral alignment.","size":"Medium","type":"humanoid","alignment":"chaotic neutral","armor_class":[{"type":"natural","value":14}],"hit_points":25,"hit_dice":"4d8+4","speed":{"walk":"30"},"strength":12,"dexterity":14,"constitution":12,"intelligence":6,"wisdom":10,"charisma":8,"senses":{"passive_perception":10,"darkvision":"60 ft."},"challenge_rating":"1/2","xp":100,"url":"/api/monsters/cazador-nocturno"}'},
        ]},
        {"messages": [
            {"role": "system", "content": "TYPE: spell\n\nEres un asistente experto en crear conjuros para DnD 5e."},
            {"role": "user", "content": "Quiero un conjuro que haga danio en area."},
            {"role": "assistant", "content": "Nombre? Nivel? Escuela: Evocación es la típica para daño elemental. Componentes: V (verbal), S (somático), M (material). ¿Tiempo de lanzamiento?"},
            {"role": "user", "content": "Lluvia de Cenizas, nivel 3, Evocacion."},
            {"role": "assistant", "content": "Componentes, duracion (concentración o instantáneo?), rango, tiempo de lanzamiento?"},
            {"role": "user", "content": "V S, Instantanea, 60 pies, 1 accion. Hace 6d6 de fuego."},
            {"role": "assistant", "content": '{"index":"lluvia-de-cenizas","name":"Lluvia de Cenizas","desc":["Lluvia de cenizas que quema a los enemigos."],"range":"60 feet","components":["V","S"],"ritual":false,"duration":"Instantaneous","concentration":false,"casting_time":"1 action","level":3,"school":{"index":"evocation","name":"Evocation","url":"/api/magic-schools/evocation"},"damage":{"damage_type":{"index":"fire","name":"Fire","url":"/api/damage-types/fire"},"damage_at_slot_level":{"3":"6d6"}},"url":"/api/spells/lluvia-de-cenizas"}'},
        ]},
        {"messages": [
            {"role": "system", "content": "TYPE: character\n\nEres un asistente experto en crear personajes para DnD 5e."},
            {"role": "user", "content": "Me ayudas con un pj? Es un mago elfo."},
            {"role": "assistant", "content": "Nombre y nivel? Los magos (Wizard) lanzan con INT, tienen el repertorio más grande de conjuros pero son frágiles (d6). Los elfos dan +DES y tienen visión en la penumbra."},
            {"role": "user", "content": "Finrod, nivel 5."},
            {"role": "assistant", "content": "Trasfondo? Sage (sabio) va perfecto con mago. También Acolyte o Hermit. ¿Alineamiento? Legal/Neutral/Caótico + Bueno/Malo/Neutral."},
            {"role": "user", "content": "Sage, Legal Bueno."},
            {"role": "assistant", "content": "Stats? Como mago priorizá INT (para lanzar), luego CON (para concentración) y DES (para CA)."}, 
            {"role": "user", "content": "FUE 8 DES 14 CON 13 INT 17 SAB 12 CAR 10."},
            {"role": "assistant", "content": '{"name":"Finrod","level":5,"character_class":{"index":"wizard","name":"Wizard","url":"/api/classes/wizard"},"race":{"index":"elf","name":"Elf","url":"/api/races/elf"},"alignment":"Lawful Good","background":{"index":"sage","name":"Sage","url":"/api/backgrounds/sage"},"hit_points":32,"hit_dice":"1d6","strength":8,"dexterity":14,"constitution":13,"intelligence":17,"wisdom":12,"charisma":10,"proficiency_bonus":3,"speed":{"walk":"30 ft."},"inventory":{"items":[],"cash":{"cp":0,"sp":0,"ep":0,"gp":25,"pp":0}},"traits":[],"custom_traits":[]}'},
        ]},
        # Edge case 7: interpretacion difusa — "algo que vuele y escupa fuego"
        {"messages": [
            {"role": "system", "content": "TYPE: monster\n\nEres un asistente experto en crear monstruos para DnD 5e."},
            {"role": "user", "content": "Necesito algo que vuele y escupa fuego para mi mazmorra."},
            {"role": "assistant", "content": "Eso me suena a dragon joven. Volar (velocidad 60-80 ft), arma de fuego (aliento en cono 30 ft). Para una mazmorra de nivel bajo-medio te sugiero un Dragon Joven de Fuego (CR 6-8) o algo mas debil como una Guiverno (wyvern, CR 6, vuela 80 ft, cola venenosa pero sin fuego). Queres un dragon propiamente dicho o algo mas original?"},
            {"role": "user", "content": "Dragon de Fuego Joven, CR 7."},
            {"role": "assistant", "content": '{"index":"dragon-de-fuego-joven","name":"Dragon Joven de Fuego","desc":"A large dragon of chaotic evil alignment.","size":"Large","type":"dragon","alignment":"chaotic evil","armor_class":[{"type":"natural","value":18}],"hit_points":168,"hit_dice":"16d10+80","speed":{"walk":"40","fly":"80"},"strength":24,"dexterity":10,"constitution":20,"intelligence":14,"wisdom":14,"charisma":18,"senses":{"passive_perception":12,"darkvision":"120 ft.","blindsight":"30 ft."},"challenge_rating":"7","xp":2900,"url":"/api/monsters/dragon-de-fuego-joven"}'},
        ]},
        # Edge case 8: interpretacion difusa — "re duro, pega re fuerte"
        {"messages": [
            {"role": "system", "content": "TYPE: armor\n\nEres un asistente experto en crear armaduras para DnD 5e."},
            {"role": "user", "content": "Mi pj es re duro, no usa armadura pero es dificil de pegarle."},
            {"role": "assistant", "content": "Ah, queres algo como la Unarmored Defense del Barbaro o del Monje. Para Barbaro: CA = 10 + DES + CON. Para Monje: CA = 10 + DES + SAB. Tambien podria ser una armadura magica ligera que no parezca armadura, como un brazalete de defensa o una tunica de mago. Te hago una armadura ligera con buena CA?"},
            {"role": "user", "content": "Dale, una ligera que se llame Toga del Heroe, CA 13 + DES."},
            {"role": "assistant", "content": '{"type":"armor","name":"Toga del Heroe","desc":["Una toga de combate que fluye con energia."],"equipment_category":{"index":"armor","name":"Armor","url":"/api/equipment-categories/armor"},"armor_category":"light","armor_class":{"base":13,"dex_bonus":true,"max_bonus":null,"str_minimum":0},"str_minimum":0,"stealth_disadvantage":false,"weight":3,"cost":{"quantity":50,"unit":"gp"},"url":"/api/armor/toga-del-heroe"}'},
        ]},
    ]
    return random.choice(cases)


# ============================================================
# GENERADOR PRINCIPAL
# ============================================================

GENERATORS = [
    ("weapon", generate_weapon_example, 35),
    ("armor", generate_armor_example, 30),
    ("magicitem", generate_magic_example, 28),
    ("tool", generate_tool_example, 15),
    ("mount", generate_mount_example, 12),
    ("adventuringgear", generate_gear_example, 10),
    ("monster", generate_monster_example, 40),
    ("spell", generate_spell_example, 32),
    ("character", generate_character_example, 42),
    ("race", generate_race_example, 18),
    ("class", generate_class_example, 14),
    ("subclass", generate_subclass_example, 10),
    ("subrace", generate_subrace_example, 10),
    ("background", generate_background_example, 16),
    ("edge_case", generate_edge_case, 8),
]


def main():
    print("Generando 300 ejemplos...")
    all_examples = []
    counts = {}

    for type_name, generator, count in GENERATORS:
        generated = 0
        examples_for_type = 0
        while examples_for_type < count:
            example = generator(generated)
            all_examples.append(example)
            examples_for_type += 1
            generated += 1
        counts[type_name] = examples_for_type
        print(f"  OK {type_name}: {examples_for_type}")

    random.shuffle(all_examples)
    all_examples = all_examples[:REQUIRED_JSONL]

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        for example in all_examples:
            f.write(json.dumps(example, ensure_ascii=False) + "\n")

    print(f"\nOK {len(all_examples)} ejemplos guardados en {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

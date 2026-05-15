"""
main.py — Punto de entrada para pruebas del ecosistema DnD IA.

Usa QwenClient (con LoRA + RAG + API) para ejecutar cuestionarios
paso a paso y generar JSON válido para la app DnD.

Uso:
  python main.py

Requisitos:
  - Modelo base en models/Qwen3-8B/ (descargado por vos)
  - LoRA entrenado en models/qwen3-dnd-lora/ (opcional)
  - API en http://localhost:8000 (opcional, para datos reales)
  - ChromaDB con PDFs indexados (opcional, para RAG)
"""

from qwen_client import QwenClient
import json


def test_simple():
    """Test básico: preguntar algo al modelo sin LoRA/RAG/API."""
    print("\n" + "=" * 50)
    print("TEST 1 — CHAT SIMPLE")
    print("=" * 50)

    client = QwenClient()

    respuesta = client.ask("Hola, respondé en español. ¿Qué sos?")
    print(f"\n🤖: {respuesta}")


def test_json_creation():
    """Test de creación de JSON con RAG + API."""
    print("\n" + "=" * 50)
    print("TEST 2 — CREACIÓN DE JSON (arma)")
    print("=" * 50)

    client = QwenClient()
    history = []

    user_msg = "Quiero crear una espada larga de fuego llamada Colmillo Solar"
    print(f"\n👤: {user_msg}")

    response = client.questionnaire_step(
        element_type="weapon",
        user_message=user_msg,
        history=history,
    )
    print(f"🤖: {response}")

    history.append({"role": "user", "content": user_msg})
    history.append({"role": "assistant", "content": response})

    user_msg2 = "Es rara, hace 1d8 cortante y 1d6 fuego, tiene la propiedad versátil."
    print(f"\n👤: {user_msg2}")

    response2 = client.questionnaire_step(
        element_type="weapon",
        user_message=user_msg2,
        history=history,
    )
    print(f"🤖: {response2}")

    parsed = client.try_parse_json(response2)

    if parsed:
        print("\n✅ JSON generado:")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))

        # Validar con Pydantic
        is_valid, result = client.validate_json(parsed)
        if is_valid:
            print(f"\n✅ JSON válido según esquema: {result.name}")
        else:
            print(f"\n⚠️  Errores de validación: {result}")
    else:
        print("\n⚠️  La respuesta NO es JSON — el modelo sigue preguntando.")


def test_rag_only():
    """Test solo con RAG (sin API)."""
    print("\n" + "=" * 50)
    print("TEST 3 — SOLO RAG (sin API)")
    print("=" * 50)

    client = QwenClient()

    response = client.questionnaire_step(
        element_type="armor",
        user_message="Decime las reglas para armadura pesada",
        use_api=False,      # sin API
        use_rag=True,       # solo RAG
    )
    print(f"\n🤖: {response}")


def test_api_only():
    """Test solo con API (sin RAG)."""
    print("\n" + "=" * 50)
    print("TEST 4 — SOLO API (sin RAG)")
    print("=" * 50)

    client = QwenClient()

    response = client.questionnaire_step(
        element_type="weapon",
        user_message="Buscame datos sobre la espada larga en la base de datos",
        use_api=True,       # solo API
        use_rag=False,      # sin RAG
    )
    print(f"\n🤖: {response}")


def test_validate():
    """Test de validación de JSON."""
    print("\n" + "=" * 50)
    print("TEST 5 — VALIDACIÓN DE JSON")
    print("=" * 50)

    from scripts.validate_generated_json import (
        validate_weapon,
        validate_armor,
    )

    # JSON válido
    weapon_data = {
        "type": "weapon",
        "name": "Colmillo Solar",
        "category": "martial melee weapon",
        "rarity": "rare",
        "damage": {"dice": "1d8", "type": "slashing"},
        "extra_damage": {"dice": "1d6", "type": "fire"},
        "properties": ["versatile"],
        "description": ["Una espada dorada con runas ardientes."],
    }

    is_valid, result = validate_weapon(weapon_data)
    print(f"\nArma válida: {'✅' if is_valid else '❌'}")
    if is_valid:
        print(f"  Nombre: {result.name}")
    else:
        print(f"  Errores: {result}")

    # JSON inválido
    bad_data = {"type": "weapon", "name": "Rota"}
    is_valid, result = validate_weapon(bad_data)
    print(f"\nArma inválida: {'✅' if is_valid else '❌'}")
    if not is_valid:
        print(f"  Errores:")
        for err in result:
            print(f"    - {err}")


if __name__ == "__main__":
    print("""
   ╔══════════════════════════════════════════════╗
   ║     DND IA — Ecosistema Qwen + LoRA + RAG   ║
   ║                                              ║
   ║  Tests disponibles:                          ║
   ║  1. Chat simple                              ║
   ║  2. Creación de JSON con RAG + API           ║
   ║  3. Solo RAG                                 ║
   ║  4. Solo API                                 ║
   ║  5. Validación Pydantic                      ║
   ╚══════════════════════════════════════════════╝
    """)

    # Descomentá el test que quieras ejecutar:
    # test_simple()
    test_json_creation()
    # test_rag_only()
    # test_api_only()
    # test_validate()

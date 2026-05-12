from qwen_client import QwenClient


def main():
    qwen = QwenClient()

    print("\n--- TEST 1 ---")
    print(qwen.ask("Hola, responde en español."))

    print("\n--- TEST 2 ---")
    print(qwen.create_json_element(
        "weapon",
        "Espada larga de fuego que hace daño cortante y fuego"
    ))

    print("\n--- TEST 3 (DICT) ---")
    print(qwen.create_json_as_dict(
        "weapon",
        "Daga mágica rara que hace 1d4 perforante y 1d6 necrótico"
    ))


if __name__ == "__main__":
    main()
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM


MODEL_PATH = "Qwen3-8B"  # o "../Qwen3-8B" si está fuera


print("Cargando tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(
    MODEL_PATH,
    trust_remote_code=True
)

print("Cargando modelo...")
model = AutoModelForCausalLM.from_pretrained(
    MODEL_PATH,
    torch_dtype="auto",
    device_map="auto",
    trust_remote_code=True
)

print("Modelo listo.\n")


def ask(prompt):
    print("Generando...")

    messages = [
        {"role": "user", "content": prompt}
    ]

    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False
    )

    inputs = tokenizer(
        [text],
        return_tensors="pt"
    ).to(model.device)

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_new_tokens=20,  # MUY IMPORTANTE (rápido)
            temperature=0.7,
            do_sample=True
        )

    response_ids = output[0][inputs.input_ids.shape[-1]:]

    response = tokenizer.decode(
        response_ids,
        skip_special_tokens=True
    )

    print("Respuesta lista.\n")

    return response.strip()


# -------- LOOP --------

while True:
    user_input = input("Tú: ")

    if user_input.lower() in ["exit", "salir"]:
        break

    respuesta = ask(user_input)

    print("IA:", respuesta)
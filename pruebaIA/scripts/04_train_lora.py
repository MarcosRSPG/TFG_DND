"""
04_train_lora.py — Entrena un adaptador LoRA sobre Qwen3-8B.

El modelo base debe estar en models/Qwen3-8B/ (descargado con 02_download_model.py).
El dataset debe estar en data/train.jsonl y data/eval.jsonl.

El adaptador LoRA se guarda en models/qwen3-dnd-lora/.

Requiere:
  - Unsloth (pip install unsloth)
  - GPU con CUDA (RTX 3080+, 5080 recomendada)

Uso:
  python scripts/04_train_lora.py
"""

from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig
from pathlib import Path

# ============================================================
# CONFIGURACIÓN — ajustá estos paths si es necesario
# ============================================================
BASE_MODEL_PATH = "models/Qwen3-8B"
TRAIN_DATA_PATH = "data/train.jsonl"
EVAL_DATA_PATH = "data/eval.jsonl"
OUTPUT_DIR = "models/qwen3-dnd-lora"

MAX_SEQ_LENGTH = 2048

# ============================================================
# 1. Cargar modelo base con Unsloth (4 bits)
# ============================================================
print("=" * 50)
print("Cargando modelo base con Unsloth...")
print(f"Modelo: {BASE_MODEL_PATH}")
print("=" * 50)

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL_PATH,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,          # QLoRA: carga en 4 bits para ahorrar VRAM
)

# ============================================================
# 2. Configurar LoRA
# ============================================================
print("\nAplicando configuración LoRA...")

model = FastLanguageModel.get_peft_model(
    model,
    r=16,                       # Rango del adaptador (16 es buen balance)
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    lora_alpha=16,              # Escala del adaptador
    lora_dropout=0,             # Sin dropout (mejor para datasets pequeños)
    bias="none",
    use_gradient_checkpointing="unsloth",  # Ahorra VRAM
    random_state=3407,
)

# ============================================================
# 3. Cargar datasets
# ============================================================
print("\nCargando datasets...")

if not Path(TRAIN_DATA_PATH).exists():
    raise FileNotFoundError(
        f"No existe {TRAIN_DATA_PATH}. Creá tu dataset primero. "
        "Usá data/train.jsonl con formato ChatML messages."
    )

train_dataset = load_dataset("json", data_files=TRAIN_DATA_PATH, split="train")
eval_dataset = load_dataset("json", data_files=EVAL_DATA_PATH, split="train") if Path(EVAL_DATA_PATH).exists() else None

# ============================================================
# 4. Formatear con chat template de Qwen
# ============================================================
print("Formateando dataset con chat template de Qwen...")


def format_example(example):
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
        enable_thinking=False,
    )
    return {"text": text}


train_dataset = train_dataset.map(format_example)

if eval_dataset:
    eval_dataset = eval_dataset.map(format_example)

print(f"Train: {len(train_dataset)} ejemplos")
if eval_dataset:
    print(f"Eval: {len(eval_dataset)} ejemplos")

# ============================================================
# 5. Entrenar
# ============================================================
print("\nIniciando entrenamiento...")
print(f"Output: {OUTPUT_DIR}")
print(f"Épocas: 3 | Batch: 1 | Grad Acc: 4 | LR: 2e-4")

trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    args=SFTConfig(
        output_dir=OUTPUT_DIR,
        dataset_text_field="text",
        max_seq_length=MAX_SEQ_LENGTH,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        warmup_steps=10,
        logging_steps=1,
        eval_strategy="epoch" if eval_dataset else "no",
        save_strategy="epoch",
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=3407,
        fp16=True,
        bf16=False,
        report_to="none",
    ),
)

trainer.train()

# ============================================================
# 6. Guardar LoRA
# ============================================================
print(f"\nGuardando LoRA en {OUTPUT_DIR}...")

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"✅ LoRA guardado en: {OUTPUT_DIR}")
print("   Pesos del adaptador listos.")
print("   Próximo paso: python scripts/05_test_lora.py")

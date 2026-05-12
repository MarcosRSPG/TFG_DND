# Guía completa: entrenar Qwen con LoRA para cuestionario + JSON, usar RAG con PDFs y consultar MongoDB

> Objetivo: entrenar un modelo Qwen en un PC potente, por ejemplo con RTX 5080 y 64 GB de RAM, para que aprenda a comportarse como un asistente que hace preguntas paso a paso y finalmente genera JSON válido para tu aplicación DnD. Además, se explica cómo convertir PDFs a RAG, cómo consultar una base de datos MongoDB, cómo juntar todo en código y cómo exportar solo lo necesario para llevarlo a tu proyecto.

---

## 0. Idea principal antes de empezar

La arquitectura correcta no es meterlo todo dentro del entrenamiento.

```txt
LoRA = aprende comportamiento y formato
RAG = consulta documentos/PDFs en tiempo real
MongoDB = consulta datos estructurados reales
Validador Python = comprueba que el JSON sea correcto
```

### Qué aprende el LoRA

El LoRA debe aprender cosas como:

```txt
- No generar JSON antes de tener datos suficientes.
- Hacer preguntas de una en una.
- Detectar qué campos faltan.
- Devolver solo JSON válido cuando ya tiene toda la información.
- Mantener el estilo de tu app.
```

### Qué NO debe aprender el LoRA

No conviene entrenar el LoRA con todo el manual completo ni con toda la base de datos.

Eso se hace con RAG y consultas a MongoDB.

```txt
PDFs/reglas/documentación → RAG
Datos concretos de armas, armaduras, objetos, hechizos → MongoDB
Comportamiento conversacional → LoRA
```

### Aviso importante sobre velocidad

Entrenar el modelo en una RTX 5080 hará que el entrenamiento sea mucho más viable, pero el modelo entrenado no será automáticamente “súper veloz” en cualquier ordenador.

La velocidad de inferencia depende de:

```txt
- tamaño del modelo: 8B, 4B, 1.7B, etc.
- formato: Transformers, GGUF, cuantizado, etc.
- hardware de ejecución: GPU, CPU, VRAM, RAM.
- cuantización: Q4_K_M, Q5_K_M, Q8_0, FP16, etc.
```

LoRA mejora el comportamiento. La cuantización y el motor de inferencia mejoran la velocidad.

---

## 1. Resultado final esperado

Al final tendrás algo así:

```txt
entrenamiento_qwen_dnd/
│
├── data/
│   ├── train.jsonl
│   ├── eval.jsonl
│   └── manual.pdf
│
├── scripts/
│   ├── 01_check_gpu.py
│   ├── 02_download_model.py
│   ├── 03_validate_jsonl.py
│   ├── 04_train_lora.py
│   ├── 05_test_lora.py
│   ├── 06_merge_lora.py
│   ├── 07_export_gguf.py
│   ├── 08_rag_ingest_pdf.py
│   ├── 09_rag_search.py
│   ├── 10_mongo_search.py
│   └── 11_dnd_assistant_demo.py
│
├── models/
│   ├── Qwen3-8B/
│   ├── qwen3-dnd-lora/
│   ├── qwen3-dnd-merged/
│   └── qwen3-dnd-gguf/
│
├── chroma_db/
│
├── requirements.txt
└── README.md
```

---

## 2. Qué modelo usar

### Opción recomendada para entrenar en el PC potente

```txt
Qwen/Qwen3-8B
```

Es buen equilibrio para razonamiento, español, instrucciones y generación estructurada.

### Opción recomendada para ejecutar en PC mediocre

Para el PC con GTX 1070 o CPU, no uses el modelo completo en `transformers`.

Usa GGUF cuantizado:

```txt
Qwen3-8B-Q4_K_M.gguf
```

Si sigue lento:

```txt
Qwen3-4B-Q4_K_M.gguf
```

o incluso:

```txt
Qwen3-1.7B-Q4_K_M.gguf
```

---

## 3. Instalación base en el ordenador potente

### 3.1. Recomendación de sistema

Lo más estable para entrenar es Linux o WSL2 Ubuntu.

En Windows puro se puede, pero `bitsandbytes`, `unsloth` y CUDA pueden dar más problemas.

Recomendado:

```txt
Windows 11 + WSL2 Ubuntu 22.04/24.04
```

### 3.2. Crear carpeta del proyecto

```bash
mkdir entrenamiento_qwen_dnd
cd entrenamiento_qwen_dnd
mkdir data scripts models chroma_db
```

### 3.3. Crear `requirements.txt`

Crea el archivo:

```bash
nano requirements.txt
```

Contenido:

```txt
torch
transformers
accelerate
datasets
peft
trl
bitsandbytes
unsloth
sentence-transformers
chromadb
pypdf
pymongo
pydantic
jsonschema
huggingface_hub
llama-cpp-python
```

Instala:

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Si `unsloth` falla en Windows, haz esta parte en WSL2/Linux.

---

## 4. Comprobar GPU

Archivo:

```txt
scripts/01_check_gpu.py
```

Código:

```python
import torch

print("CUDA disponible:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("CUDA version:", torch.version.cuda)
    print("VRAM total GB:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2))
else:
    print("No se detecta GPU CUDA. El entrenamiento será inviable o muy lento.")
```

Ejecutar:

```bash
python scripts/01_check_gpu.py
```

### Para qué sirve

Este script confirma que PyTorch detecta la RTX 5080.

Si sale:

```txt
CUDA disponible: False
```

no sigas entrenando todavía. Primero arregla drivers/CUDA/PyTorch.

---

## 5. Descargar modelo base

Archivo:

```txt
scripts/02_download_model.py
```

Código:

```python
from huggingface_hub import snapshot_download

MODEL_ID = "Qwen/Qwen3-8B"
LOCAL_DIR = "models/Qwen3-8B"

snapshot_download(
    repo_id=MODEL_ID,
    local_dir=LOCAL_DIR,
    local_dir_use_symlinks=False
)

print(f"Modelo descargado en: {LOCAL_DIR}")
```

Ejecutar:

```bash
python scripts/02_download_model.py
```

También puedes usar terminal:

```bash
hf download Qwen/Qwen3-8B --local-dir models/Qwen3-8B
```

### Para qué sirve

Descarga el modelo base original. El LoRA no sustituye al modelo base, sino que se entrena encima.

Después tendrás:

```txt
models/Qwen3-8B/
├── config.json
├── tokenizer.json
├── model-00001-of-xxxxx.safetensors
└── ...
```

---

## 6. Crear dataset JSONL para LoRA

Archivo:

```txt
data/train.jsonl
```

Cada línea debe ser un JSON completo. No pongas saltos de línea dentro de una entrada.

### 6.1. Qué representa una línea

Una línea representa una conversación de entrenamiento.

Ejemplo:

```json
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. No generes JSON final hasta tener suficiente información."},{"role":"user","content":"Quiero crear un arma."},{"role":"assistant","content":"Perfecto. ¿Qué tipo de arma quieres crear: cuerpo a cuerpo, a distancia o mágica?"}]}
```

Esto enseña:

```txt
Usuario pide algo incompleto → IA pregunta, no inventa JSON.
```

### 6.2. Ejemplo completo de `train.jsonl`

Crea:

```bash
nano data/train.jsonl
```

Contenido de ejemplo:

```jsonl
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. No generes JSON final hasta tener suficiente información."},{"role":"user","content":"Quiero crear un arma."},{"role":"assistant","content":"Perfecto. ¿Qué tipo de arma quieres crear: cuerpo a cuerpo, a distancia, arrojadiza o mágica?"}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. No generes JSON final hasta tener suficiente información."},{"role":"user","content":"Quiero crear una espada de fuego."},{"role":"assistant","content":"Vale. Para crearla correctamente necesito algunos datos: nombre del arma, rareza, daño base, daño adicional de fuego y propiedades del arma."}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes preguntar solo por los campos que falten."},{"role":"user","content":"Es una espada larga rara llamada Colmillo Solar."},{"role":"assistant","content":"Perfecto. Me falta el daño base, el daño adicional si lo tiene, las propiedades del arma y una breve descripción visual o narrativa."}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Cuando tengas todos los datos obligatorios, responde solo con JSON válido."},{"role":"user","content":"Nombre: Colmillo Solar. Tipo: espada larga. Rareza: rara. Daño: 1d8 cortante. Daño adicional: 1d6 fuego. Propiedad: versátil. Descripción: una espada dorada con runas ardientes."},{"role":"assistant","content":"{\"type\":\"weapon\",\"name\":\"Colmillo Solar\",\"category\":\"martial melee weapon\",\"rarity\":\"rare\",\"damage\":{\"dice\":\"1d8\",\"type\":\"slashing\"},\"extra_damage\":{\"dice\":\"1d6\",\"type\":\"fire\"},\"properties\":[\"versatile\"],\"description\":[\"Una espada dorada cubierta de runas ardientes.\"]}"}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear armaduras JSON para una app de DnD. Si faltan datos, pregunta. Si tienes todos los campos obligatorios, responde solo con JSON válido."},{"role":"user","content":"Quiero crear una armadura de sombras."},{"role":"assistant","content":"Perfecto. ¿Qué tipo de armadura es: ligera, media o pesada? También necesito su nombre, clase de armadura base, rareza y si impone desventaja en sigilo."}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear armaduras JSON para una app de DnD. Cuando tengas todos los campos obligatorios, responde solo con JSON válido."},{"role":"user","content":"Nombre: Manto de la Noche. Tipo: armadura ligera. Rareza: rara. CA base: 12. Permite añadir DEX. No da desventaja en sigilo. Peso 5."},{"role":"assistant","content":"{\"type\":\"armor\",\"name\":\"Manto de la Noche\",\"armor_category\":\"light\",\"rarity\":\"rare\",\"armor_class\":{\"base\":12,\"dex_bonus\":true,\"max_bonus\":null},\"strength_minimum\":null,\"stealth_disadvantage\":false,\"weight\":5,\"description\":[\"Armadura ligera oscura diseñada para moverse entre sombras.\"]}"}]}
```

### 6.3. Reglas de calidad para tu JSONL

Tus ejemplos deben incluir:

```txt
- Casos incompletos donde la IA pregunta.
- Casos completos donde la IA devuelve JSON.
- Casos donde faltan 1-2 campos concretos.
- Casos con nombres inventados.
- Casos con objetos conocidos, pero sin copiar texto protegido.
- Casos con errores del usuario: “una espada que hace mucho daño”, “una armadura rota”, etc.
```

Cantidad recomendada:

```txt
Mínimo útil: 100 ejemplos
Bueno: 300-500 ejemplos
Muy bueno: 1000+ ejemplos
```

No necesitas miles para enseñar formato y flujo.

---

## 7. Crear dataset de evaluación

Archivo:

```txt
data/eval.jsonl
```

Sirve para probar si el modelo responde bien con ejemplos que no ha visto durante entrenamiento.

Ejemplo:

```jsonl
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Pregunta si faltan datos."},{"role":"user","content":"Quiero crear un arco eléctrico."},{"role":"assistant","content":"Perfecto. Necesito el nombre del arco, rareza, daño base, daño eléctrico adicional, propiedades y descripción."}]}
```

---

## 8. Validar que el JSONL esté bien formado

Archivo:

```txt
scripts/03_validate_jsonl.py
```

Código:

```python
import json
from pathlib import Path

FILES = [
    Path("data/train.jsonl"),
    Path("data/eval.jsonl"),
]

VALID_ROLES = {"system", "user", "assistant"}


def validate_file(path: Path):
    print(f"Validando {path}...")

    if not path.exists():
        print(f"ERROR: no existe {path}")
        return

    total = 0

    with path.open("r", encoding="utf-8") as f:
        for line_number, line in enumerate(f, start=1):
            line = line.strip()

            if not line:
                continue

            total += 1

            try:
                obj = json.loads(line)
            except json.JSONDecodeError as e:
                raise ValueError(f"JSON inválido en {path}, línea {line_number}: {e}")

            if "messages" not in obj:
                raise ValueError(f"Falta 'messages' en {path}, línea {line_number}")

            if not isinstance(obj["messages"], list):
                raise ValueError(f"'messages' debe ser lista en {path}, línea {line_number}")

            for msg in obj["messages"]:
                if "role" not in msg or "content" not in msg:
                    raise ValueError(f"Mensaje inválido en {path}, línea {line_number}: {msg}")

                if msg["role"] not in VALID_ROLES:
                    raise ValueError(f"Role inválido en {path}, línea {line_number}: {msg['role']}")

                if not isinstance(msg["content"], str):
                    raise ValueError(f"Content debe ser string en {path}, línea {line_number}")

    print(f"OK: {total} ejemplos válidos en {path}")


if __name__ == "__main__":
    for file in FILES:
        validate_file(file)
```

Ejecutar:

```bash
python scripts/03_validate_jsonl.py
```

### Para qué sirve

Evita perder tiempo entrenando con un dataset mal formado.

---

## 9. Entrenar LoRA

Archivo:

```txt
scripts/04_train_lora.py
```

Código completo:

```python
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig

BASE_MODEL_PATH = "models/Qwen3-8B"
TRAIN_DATA_PATH = "data/train.jsonl"
EVAL_DATA_PATH = "data/eval.jsonl"
OUTPUT_DIR = "models/qwen3-dnd-lora"

MAX_SEQ_LENGTH = 2048


print("Cargando modelo base con Unsloth...")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL_PATH,
    max_seq_length=MAX_SEQ_LENGTH,
    load_in_4bit=True,
)

print("Aplicando configuración LoRA...")

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=[
        "q_proj",
        "k_proj",
        "v_proj",
        "o_proj",
        "gate_proj",
        "up_proj",
        "down_proj",
    ],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

print("Cargando datasets...")

train_dataset = load_dataset(
    "json",
    data_files=TRAIN_DATA_PATH,
    split="train",
)

eval_dataset = load_dataset(
    "json",
    data_files=EVAL_DATA_PATH,
    split="train",
)


def format_example(example):
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
        enable_thinking=False,
    )

    return {"text": text}


print("Formateando dataset con chat template de Qwen...")

train_dataset = train_dataset.map(format_example)
eval_dataset = eval_dataset.map(format_example)

print("Iniciando entrenamiento...")

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
        eval_strategy="epoch",
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

print("Guardando LoRA...")

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"LoRA guardado en: {OUTPUT_DIR}")
```

Ejecutar:

```bash
python scripts/04_train_lora.py
```

### 9.1. Explicación del código

#### `BASE_MODEL_PATH`

```python
BASE_MODEL_PATH = "models/Qwen3-8B"
```

Es el modelo original descargado.

#### `OUTPUT_DIR`

```python
OUTPUT_DIR = "models/qwen3-dnd-lora"
```

Aquí se guarda el adaptador LoRA entrenado.

#### `load_in_4bit=True`

Carga el modelo en 4 bits para reducir VRAM durante entrenamiento.

#### `r=16`

Es el rango del LoRA. Más alto puede aprender más, pero usa más VRAM.

Valores típicos:

```txt
r=8   → ligero
r=16  → recomendado
r=32  → más pesado
```

#### `target_modules`

Indica qué capas del modelo se adaptan.

Para Qwen suele usarse:

```python
"q_proj", "k_proj", "v_proj", "o_proj",
"gate_proj", "up_proj", "down_proj"
```

#### `num_train_epochs=3`

Número de pasadas por el dataset.

Si tienes pocos ejemplos:

```txt
3-5 épocas
```

Si tienes muchos ejemplos:

```txt
1-3 épocas
```

#### `learning_rate=2e-4`

Tasa de aprendizaje típica para LoRA.

Si responde demasiado raro después:

```txt
bajar a 1e-4
```

---

## 10. Probar el LoRA entrenado

Archivo:

```txt
scripts/05_test_lora.py
```

Código:

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"

print("Cargando tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    trust_remote_code=True,
)

print("Cargando modelo base...")
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype="auto",
    device_map="auto",
    trust_remote_code=True,
)

print("Aplicando LoRA...")
model = PeftModel.from_pretrained(model, LORA_PATH)
model.eval()


def ask(messages, max_new_tokens=400):
    text = tokenizer.apply_chat_template(
        messages,
        tokenize=False,
        add_generation_prompt=True,
        enable_thinking=False,
    )

    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            temperature=0.3,
            top_p=0.9,
            do_sample=True,
        )

    response_ids = outputs[0][inputs.input_ids.shape[-1]:]
    response = tokenizer.decode(response_ids, skip_special_tokens=True)
    return response.strip()


messages = [
    {
        "role": "system",
        "content": "Eres un asistente experto en crear elementos JSON para una app de DnD. Pregunta si faltan datos. Si tienes todo, responde solo JSON válido.",
    },
    {
        "role": "user",
        "content": "Quiero crear una espada de hielo.",
    },
]

print("\nRespuesta IA:\n")
print(ask(messages))
```

Ejecutar:

```bash
python scripts/05_test_lora.py
```

### Para qué sirve

Verifica que el LoRA realmente aprendió a preguntar antes de generar JSON.

---

## 11. Fusionar LoRA con el modelo base

Tienes dos formas de desplegar:

### Forma A: modelo base + adaptador LoRA

Ventajas:

```txt
- Ocupa menos que modelo fusionado.
- Puedes cambiar adaptadores.
```

Desventajas:

```txt
- Necesitas cargar modelo base + LoRA.
```

### Forma B: modelo fusionado

Ventajas:

```txt
- Más cómodo para exportar.
- Más simple para mover a otro proyecto.
```

Desventajas:

```txt
- Ocupa más.
```

Archivo:

```txt
scripts/06_merge_lora.py
```

Código:

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"
MERGED_OUTPUT_PATH = "models/qwen3-dnd-merged"

print("Cargando tokenizer...")
tokenizer = AutoTokenizer.from_pretrained(
    BASE_MODEL_PATH,
    trust_remote_code=True,
)

print("Cargando modelo base en FP16/BF16...")
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL_PATH,
    torch_dtype=torch.float16,
    device_map="auto",
    trust_remote_code=True,
)

print("Cargando LoRA...")
model = PeftModel.from_pretrained(model, LORA_PATH)

print("Fusionando LoRA con modelo base...")
model = model.merge_and_unload()

print("Guardando modelo fusionado...")
model.save_pretrained(
    MERGED_OUTPUT_PATH,
    safe_serialization=True,
)

tokenizer.save_pretrained(MERGED_OUTPUT_PATH)

print(f"Modelo fusionado guardado en: {MERGED_OUTPUT_PATH}")
```

Ejecutar:

```bash
python scripts/06_merge_lora.py
```

Después tendrás:

```txt
models/qwen3-dnd-merged/
├── config.json
├── tokenizer.json
├── model-00001-of-xxxxx.safetensors
└── ...
```

---

## 12. Exportar a GGUF para llevarlo a un PC menos potente

Para correr en GTX 1070/CPU, lo más práctico suele ser GGUF con llama.cpp o llama-cpp-python.

Unsloth permite guardar GGUF con métodos como `q4_k_m`, `q8_0` o `f16`.

Archivo:

```txt
scripts/07_export_gguf.py
```

Código:

```python
from unsloth import FastLanguageModel

MERGED_MODEL_PATH = "models/qwen3-dnd-merged"
GGUF_OUTPUT_PATH = "models/qwen3-dnd-gguf"

print("Cargando modelo fusionado con Unsloth...")

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MERGED_MODEL_PATH,
    max_seq_length=4096,
    load_in_4bit=False,
)

print("Exportando a GGUF Q4_K_M...")

model.save_pretrained_gguf(
    GGUF_OUTPUT_PATH,
    tokenizer,
    quantization_method="q4_k_m",
)

print(f"Modelo GGUF guardado en: {GGUF_OUTPUT_PATH}")
```

Ejecutar:

```bash
python scripts/07_export_gguf.py
```

Resultado esperado:

```txt
models/qwen3-dnd-gguf/
└── unsloth.Q4_K_M.gguf
```

Puedes renombrarlo:

```bash
mv models/qwen3-dnd-gguf/unsloth.Q4_K_M.gguf models/qwen3-dnd-gguf/qwen3-dnd-q4_k_m.gguf
```

---

## 13. Convertir PDF a RAG

El RAG no entrena al modelo. Crea una base vectorial para buscar fragmentos relevantes del PDF.

Flujo:

```txt
PDF → texto → chunks → embeddings → ChromaDB
```

Archivo:

```txt
scripts/08_rag_ingest_pdf.py
```

Código:

```python
from pathlib import Path
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb

PDF_PATH = Path("data/manual.pdf")
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


def split_text(text: str, chunk_size: int = 1000, overlap: int = 150):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start += chunk_size - overlap

    return chunks


def extract_pdf_text(pdf_path: Path):
    reader = PdfReader(str(pdf_path))
    full_text = ""

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        full_text += f"\n\n[PÁGINA {page_number}]\n{text}"

    return full_text


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"No existe el PDF: {PDF_PATH}")

    print("Extrayendo texto del PDF...")
    full_text = extract_pdf_text(PDF_PATH)

    print("Dividiendo texto en chunks...")
    chunks = split_text(full_text)
    print(f"Chunks generados: {len(chunks)}")

    print("Cargando modelo de embeddings...")
    embedder = SentenceTransformer(EMBEDDING_MODEL)

    print("Abriendo ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Documentación DnD para RAG"},
    )

    print("Insertando chunks en ChromaDB...")

    for i, chunk in enumerate(chunks):
        embedding = embedder.encode(chunk).tolist()

        collection.upsert(
            ids=[f"manual_chunk_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[
                {
                    "source": str(PDF_PATH),
                    "chunk": i,
                }
            ],
        )

        if i % 50 == 0:
            print(f"Insertados {i}/{len(chunks)} chunks...")

    print("PDF convertido a RAG correctamente.")


if __name__ == "__main__":
    main()
```

Ejecutar:

```bash
python scripts/08_rag_ingest_pdf.py
```

### Explicación del código

#### `PdfReader`

Abre el PDF y permite extraer texto página a página.

#### `split_text`

Parte el texto en trozos para que la búsqueda sea precisa.

Ejemplo:

```txt
chunk_size=1000
```

significa que cada fragmento tendrá aproximadamente 1000 caracteres.

#### `overlap=150`

Hace que un chunk comparta 150 caracteres con el siguiente. Eso evita cortar frases importantes.

#### `SentenceTransformer`

Convierte texto en vectores numéricos.

#### `ChromaDB`

Guarda:

```txt
- texto original
- vector/embedding
- metadata del origen
```

---

## 14. Buscar en el RAG

Archivo:

```txt
scripts/09_rag_search.py
```

Código:

```python
from sentence_transformers import SentenceTransformer
import chromadb

CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class RagSearch:
    def __init__(self):
        self.embedder = SentenceTransformer(EMBEDDING_MODEL)
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(name=COLLECTION_NAME)

    def search(self, query: str, n_results: int = 4):
        query_embedding = self.embedder.encode(query).tolist()

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]

        output = []

        for doc, meta, distance in zip(documents, metadatas, distances):
            output.append(
                {
                    "text": doc,
                    "metadata": meta,
                    "distance": distance,
                }
            )

        return output

    def search_as_text(self, query: str, n_results: int = 4):
        results = self.search(query, n_results=n_results)

        blocks = []

        for i, result in enumerate(results, start=1):
            blocks.append(
                f"[RAG RESULT {i}]\n"
                f"Fuente: {result['metadata']}\n"
                f"Texto:\n{result['text']}"
            )

        return "\n\n".join(blocks)


if __name__ == "__main__":
    rag = RagSearch()
    query = "reglas para espada larga daño propiedades versátil"
    print(rag.search_as_text(query))
```

Ejecutar:

```bash
python scripts/09_rag_search.py
```

---

## 15. Consultar MongoDB

La BD sirve para datos estructurados exactos.

Ejemplo de documento en MongoDB:

```json
{
  "type": "weapon",
  "name": "Longsword",
  "category": "martial melee weapon",
  "damage": {
    "dice": "1d8",
    "type": "slashing"
  },
  "properties": ["versatile"],
  "weight": 3,
  "cost": {
    "quantity": 15,
    "unit": "gp"
  }
}
```

### 15.1. Crear índice de texto en MongoDB

En Mongo Shell o Compass:

```javascript
use dnd_database

db.items.createIndex({
  name: "text",
  desc: "text",
  type: "text",
  category: "text"
})
```

Archivo:

```txt
scripts/10_mongo_search.py
```

Código:

```python
from pymongo import MongoClient
import json

MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "dnd_database"
COLLECTION_NAME = "items"


class MongoSearch:
    def __init__(self):
        self.client = MongoClient(MONGO_URI)
        self.db = self.client[DB_NAME]
        self.collection = self.db[COLLECTION_NAME]

    def clean_item(self, item):
        if item is None:
            return None

        item["_id"] = str(item["_id"])
        return item

    def find_by_name(self, name: str):
        item = self.collection.find_one(
            {
                "name": {
                    "$regex": name,
                    "$options": "i",
                }
            }
        )

        return self.clean_item(item)

    def search_items(self, text: str, item_type: str | None = None, limit: int = 5):
        query = {
            "$text": {
                "$search": text,
            }
        }

        if item_type:
            query["type"] = item_type

        cursor = self.collection.find(query).limit(limit)

        return [self.clean_item(item) for item in cursor]

    def search_weapons(self, text: str, limit: int = 5):
        return self.search_items(text=text, item_type="weapon", limit=limit)


if __name__ == "__main__":
    mongo = MongoSearch()

    print("Buscando Longsword por nombre...")
    item = mongo.find_by_name("Longsword")
    print(json.dumps(item, indent=2, ensure_ascii=False))

    print("\nBuscando armas por texto...")
    items = mongo.search_weapons("longsword espada larga")
    print(json.dumps(items, indent=2, ensure_ascii=False))
```

Ejecutar:

```bash
python scripts/10_mongo_search.py
```

---

## 16. Juntar LoRA + RAG + BD en un asistente

Archivo:

```txt
scripts/11_dnd_assistant_demo.py
```

Código:

```python
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from scripts.rag_search import RagSearch


BASE_MODEL_PATH = "models/Qwen3-8B"
LORA_PATH = "models/qwen3-dnd-lora"


# ============================================================
# 1. SIMULACIÓN TEMPORAL DE TUS SERVICES DE LA API
# ============================================================
# En tu API real, esta clase NO haría falta exactamente así.
#
# La idea es que aquí pongas llamadas parecidas a tus services reales:
#
#   item_service.search_items(...)
#   weapon_service.find_by_name(...)
#   spell_service.search_spells(...)
#   monster_service.search_monsters(...)
#
# De momento lo dejamos en main.py para probar el flujo completo
# sin tocar todavía tu backend.
# ============================================================

class ApiServicesContext:
    def __init__(self):
        print("Inicializando services simulados de la API...")

        # Aquí podrías instanciar tus services reales si quisieras.
        #
        # Ejemplo futuro:
        #
        # self.item_service = ItemService(...)
        # self.weapon_service = WeaponService(...)
        # self.spell_service = SpellService(...)
        #
        # Ahora lo simulamos con datos fijos.

    def search_items_context(self, text: str, element_type: str | None = None, limit: int = 5):
        """
        Simula la llamada a tus services de la API.

        En una integración real, aquí NO harías consultas directas a MongoDB.
        Harías algo así:

            return self.item_service.search_items(
                text=text,
                item_type=element_type,
                limit=limit
            )

        Este método debe devolver datos estructurados que ayuden a la IA.
        """

        fake_database_results = [
            {
                "type": "weapon",
                "name": "Longsword",
                "category": "martial melee weapon",
                "damage": {
                    "dice": "1d8",
                    "type": "slashing"
                },
                "properties": ["versatile"],
                "versatile_damage": {
                    "dice": "1d10",
                    "type": "slashing"
                },
                "weight": 3,
                "cost": {
                    "quantity": 15,
                    "unit": "gp"
                }
            },
            {
                "type": "weapon",
                "name": "Flame Tongue",
                "category": "magic weapon",
                "rarity": "rare",
                "extra_damage": {
                    "dice": "2d6",
                    "type": "fire"
                },
                "description": [
                    "A magic sword that deals extra fire damage while ignited."
                ]
            }
        ]

        if element_type:
            fake_database_results = [
                item for item in fake_database_results
                if item.get("type") == element_type or element_type in item.get("category", "")
            ]

        return fake_database_results[:limit]

    def build_database_context(self, text: str, element_type: str | None = None):
        """
        Convierte los resultados de los services en texto JSON para meterlo
        dentro del prompt de la IA.

        La IA no necesita saber cómo se accede a MongoDB.
        Solo necesita recibir datos útiles.
        """

        results = self.search_items_context(
            text=text,
            element_type=element_type,
            limit=5
        )

        return json.dumps(
            results,
            indent=2,
            ensure_ascii=False
        )


# ============================================================
# 2. ASISTENTE DND
# ============================================================
# Esta clase junta:
#
# - Modelo base Qwen
# - Adaptador LoRA entrenado
# - RAG del PDF
# - Contexto obtenido desde services de la API
#
# De momento está en main.py.
# Más adelante se puede convertir en:
#
#   AIOrchestratorService
#   DndAssistantService
#   JsonGenerationService
# ============================================================

class DndAssistant:
    def __init__(self):
        print("Cargando tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            BASE_MODEL_PATH,
            trust_remote_code=True,
        )

        print("Cargando modelo base...")
        self.model = AutoModelForCausalLM.from_pretrained(
            BASE_MODEL_PATH,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True,
        )

        print("Cargando LoRA...")
        self.model = PeftModel.from_pretrained(
            self.model,
            LORA_PATH
        )

        self.model.eval()

        print("Cargando RAG...")
        self.rag = RagSearch()

        print("Cargando contexto de services...")
        self.api_services_context = ApiServicesContext()

        print("Asistente listo.")

    def generate(self, messages, max_new_tokens=700):
        """
        Envía mensajes al modelo y devuelve la respuesta generada.

        messages debe tener este formato:

        [
            {"role": "system", "content": "..."},
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."}
        ]
        """

        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False,
        )

        inputs = self.tokenizer(
            [text],
            return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.3,
                top_p=0.9,
                do_sample=True,
            )

        response_ids = outputs[0][inputs.input_ids.shape[-1]:]

        response = self.tokenizer.decode(
            response_ids,
            skip_special_tokens=True
        )

        return response.strip()

    def build_context(self, element_type: str, user_message: str):
        """
        Construye el contexto que recibirá la IA.

        Aquí se juntan dos fuentes:

        1. RAG:
           Información documental obtenida del PDF.

        2. Services de la API:
           Información estructurada obtenida mediante la lógica de tu backend.

        Importante:
        La IA no accede directamente a MongoDB.
        La IA recibe el resultado preparado por tus services.
        """

        rag_query = f"Reglas y datos útiles para crear {element_type}: {user_message}"

        rag_context = self.rag.search_as_text(
            rag_query,
            n_results=4
        )

        services_context = self.api_services_context.build_database_context(
            text=user_message,
            element_type=element_type
        )

        return rag_context, services_context

    def questionnaire_step(
        self,
        element_type: str,
        user_message: str,
        history=None
    ):
        """
        Ejecuta un paso del cuestionario.

        Puede devolver dos tipos de respuesta:

        1. Una pregunta:
           Si faltan datos para completar el JSON.

        2. Un JSON final:
           Si ya tiene toda la información necesaria.
        """

        if history is None:
            history = []

        rag_context, services_context = self.build_context(
            element_type=element_type,
            user_message=user_message
        )

        system_prompt = f"""
Eres un asistente experto en crear elementos JSON para una app de DnD.

REGLAS DE COMPORTAMIENTO:
1. Haz preguntas paso a paso si faltan datos.
2. No generes JSON final si faltan campos obligatorios.
3. Cuando tengas datos suficientes, responde SOLO con JSON válido.
4. No escribas explicación fuera del JSON final.
5. Usa el contexto de los services de la API para datos exactos ya existentes.
6. Usa RAG para reglas y contexto documental.
7. Si RAG o los services no contienen algo importante, pregunta al usuario.
8. No inventes reglas importantes.
9. Si el usuario pide algo homebrew, puedes crearlo, pero manteniendo estructura válida.

TIPO DE ELEMENTO ACTUAL:
{element_type}

CONTEXTO OBTENIDO DEL PDF / RAG:
{rag_context}

DATOS OBTENIDOS DESDE LOS SERVICES DE LA API:
{services_context}

ESQUEMA BASE PARA WEAPON:
{{
  "type": "weapon",
  "name": "",
  "category": "",
  "rarity": "",
  "damage": {{
    "dice": "",
    "type": ""
  }},
  "extra_damage": {{
    "dice": "",
    "type": ""
  }},
  "properties": [],
  "weight": null,
  "cost": {{
    "quantity": null,
    "unit": ""
  }},
  "description": []
}}

CRITERIO:
- Si falta nombre, rareza, daño, tipo de daño o propiedades importantes, pregunta.
- Si ya está todo, devuelve SOLO JSON válido.
"""

        messages = [
            {
                "role": "system",
                "content": system_prompt,
            }
        ]

        messages.extend(history)

        messages.append(
            {
                "role": "user",
                "content": user_message,
            }
        )

        return self.generate(messages)

    def try_parse_json(self, text: str):
        """
        Intenta convertir la respuesta de la IA en JSON.

        Si devuelve None, significa que la IA todavía está preguntando
        o que la salida no es JSON válido.
        """

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None


# ============================================================
# 3. DEMO MANUAL
# ============================================================
# Esto simula una conversación real.
#
# Más adelante, en tu API, esta lógica estaría en un endpoint o service.
# ============================================================

if __name__ == "__main__":
    assistant = DndAssistant()

    history = []

    user_1 = "Quiero crear una espada larga de fuego llamada Colmillo Solar"

    response_1 = assistant.questionnaire_step(
        element_type="weapon",
        user_message=user_1,
        history=history,
    )

    print("\nIA 1:")
    print(response_1)

    history.append(
        {
            "role": "user",
            "content": user_1,
        }
    )

    history.append(
        {
            "role": "assistant",
            "content": response_1,
        }
    )

    user_2 = "Es rara, hace 1d8 cortante y 1d6 fuego, tiene la propiedad versátil."

    response_2 = assistant.questionnaire_step(
        element_type="weapon",
        user_message=user_2,
        history=history,
    )

    print("\nIA 2:")
    print(response_2)

    parsed = assistant.try_parse_json(response_2)

    if parsed:
        print("\nJSON válido:")
        print(json.dumps(parsed, indent=2, ensure_ascii=False))
    else:
        print("\nLa respuesta todavía no es JSON final.")
```

Ejecutar:

```bash
python scripts/11_dnd_assistant_demo.py
```

---

## 17. Validar el JSON final con Pydantic

La IA no debería ser la única responsable de la validez del JSON.

Crea un validador.

Archivo opcional:

```txt
scripts/12_validate_generated_json.py
```

Código:

```python
from pydantic import BaseModel, Field, ValidationError
from typing import Optional, List


class Damage(BaseModel):
    dice: str
    type: str


class Cost(BaseModel):
    quantity: Optional[int] = None
    unit: str = ""


class Weapon(BaseModel):
    type: str = Field(pattern="^weapon$")
    name: str
    category: str
    rarity: str
    damage: Damage
    properties: List[str] = []
    weight: Optional[float] = None
    cost: Optional[Cost] = None
    description: List[str] = []


def validate_weapon(data: dict):
    try:
        weapon = Weapon(**data)
        return True, weapon
    except ValidationError as e:
        return False, e
```

### Para qué sirve

Si la IA devuelve:

```json
{"name":"Espada"}
```

el validador detecta que faltan campos.

Entonces tu app puede volver a preguntar:

```txt
Faltan category, rarity y damage. Pregunta al usuario por esos datos.
```

---

## 18. Qué copiar al proyecto final

Cuando ya tengas todo entrenado, no necesitas llevarte todo.

### Si vas a usar Transformers + LoRA

Copia:

```txt
models/Qwen3-8B/
models/qwen3-dnd-lora/
chroma_db/
tu código de inferencia
scripts/09_rag_search.py
scripts/10_mongo_search.py
```

No copies:

```txt
data/train.jsonl
data/eval.jsonl
scripts/04_train_lora.py
checkpoints temporales
logs
cache
```

### Si vas a usar modelo fusionado Transformers

Copia:

```txt
models/qwen3-dnd-merged/
chroma_db/
tu código de inferencia
```

No necesitas:

```txt
models/Qwen3-8B/
models/qwen3-dnd-lora/
```

porque el LoRA ya está fusionado.

### Si vas a usar GGUF

Copia solo:

```txt
models/qwen3-dnd-gguf/qwen3-dnd-q4_k_m.gguf
chroma_db/
tu código llama-cpp-python
```

No copies:

```txt
models/Qwen3-8B/
models/qwen3-dnd-lora/
models/qwen3-dnd-merged/
data/train.jsonl
data/eval.jsonl
scripts de entrenamiento
```

---

## 19. Código simple para usar el GGUF en tu proyecto

Archivo:

```txt
inference_gguf.py
```

Código:

```python
from llama_cpp import Llama

MODEL_PATH = "models/qwen3-dnd-gguf/qwen3-dnd-q4_k_m.gguf"

llm = Llama(
    model_path=MODEL_PATH,
    n_ctx=4096,
    n_gpu_layers=-1,
    verbose=False,
)


def ask_dnd_assistant(user_message: str, rag_context: str = "", mongo_context: str = ""):
    system_prompt = f"""
Eres un asistente experto en crear JSON para una app de DnD.

Reglas:
- Pregunta si faltan datos.
- Si tienes todos los datos, responde solo JSON válido.
- Usa el contexto RAG y MongoDB si están disponibles.

Contexto RAG:
{rag_context}

Contexto MongoDB:
{mongo_context}
"""

    result = llm.create_chat_completion(
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message + " /no_think"},
        ],
        max_tokens=700,
        temperature=0.3,
    )

    return result["choices"][0]["message"]["content"]


if __name__ == "__main__":
    print(ask_dnd_assistant("Quiero crear una espada de fuego."))
```

---

## 20. Cómo eliminar todo lo innecesario después de exportar

Cuando tengas el GGUF final y hayas comprobado que funciona:

### Mantener

```txt
models/qwen3-dnd-gguf/qwen3-dnd-q4_k_m.gguf
chroma_db/
inference_gguf.py
rag_search.py
mongo_search.py
```

### Eliminar

```bash
rm -rf models/Qwen3-8B
rm -rf models/qwen3-dnd-lora
rm -rf models/qwen3-dnd-merged
rm -rf data/train.jsonl
rm -rf data/eval.jsonl
rm -rf scripts/04_train_lora.py
rm -rf scripts/05_test_lora.py
rm -rf scripts/06_merge_lora.py
rm -rf scripts/07_export_gguf.py
rm -rf .cache
rm -rf wandb
rm -rf outputs
```

En PowerShell:

```powershell
Remove-Item -Recurse -Force models\Qwen3-8B
Remove-Item -Recurse -Force models\qwen3-dnd-lora
Remove-Item -Recurse -Force models\qwen3-dnd-merged
Remove-Item -Force data\train.jsonl
Remove-Item -Force data\eval.jsonl
Remove-Item -Recurse -Force wandb
Remove-Item -Recurse -Force outputs
```

No borres `chroma_db` si quieres seguir usando RAG.

---

## 21. Resumen final de comandos

Entrenar:

```bash
python scripts/01_check_gpu.py
python scripts/02_download_model.py
python scripts/03_validate_jsonl.py
python scripts/04_train_lora.py
python scripts/05_test_lora.py
```

Fusionar y exportar:

```bash
python scripts/06_merge_lora.py
python scripts/07_export_gguf.py
```

Crear RAG:

```bash
python scripts/08_rag_ingest_pdf.py
python scripts/09_rag_search.py
```

Probar asistente completo:

```bash
python scripts/11_dnd_assistant_demo.py
```

---

## 22. Qué debes recordar

```txt
1. El LoRA no contiene todo tu conocimiento.
2. El RAG no entrena el modelo.
3. MongoDB da datos exactos.
4. El prompt junta LoRA + RAG + MongoDB.
5. El JSON final siempre se valida con Python.
6. Para llevarlo a otro PC, lo más práctico es GGUF cuantizado.
7. Entrenar en RTX 5080 ayuda al entrenamiento, pero la velocidad final depende del formato y hardware donde lo ejecutes.
```

---

## 23. Fuentes útiles

- Qwen3-8B en Hugging Face: https://huggingface.co/Qwen/Qwen3-8B
- Qwen3-8B GGUF oficial: https://huggingface.co/Qwen/Qwen3-8B-GGUF
- Unsloth Qwen3 fine-tuning: https://unsloth.ai/docs/models/tutorials/qwen3-how-to-run-and-fine-tune
- Unsloth exportar a GGUF: https://unsloth.ai/docs/basics/inference-and-deployment/saving-to-gguf
- ChromaDB Query/Get: https://docs.trychroma.com/docs/querying-collections/query-and-get

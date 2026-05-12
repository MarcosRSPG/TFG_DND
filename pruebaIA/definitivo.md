Vale. La idea correcta es esta:

```txt
LoRA = aprende a preguntar y construir el JSON
RAG = consulta PDF / reglas / ejemplos / BD
BD = datos reales estructurados
```

**No metas el PDF ni la BD dentro del LoRA.** El LoRA es para enseñarle el comportamiento: “pregunta paso a paso y al final devuelve JSON”. El PDF y la BD se consultan en tiempo real con RAG.

Qwen recomienda fine-tuning con Unsloth para Qwen3 porque reduce VRAM y acelera el entrenamiento. ([qwen.readthedocs.io][1])

---

# 1. Estructura final

```txt
qwen_project/
│
├── train_lora.py
├── qwen_client.py
├── rag_ingest_pdf.py
├── rag_search.py
├── main.py
│
├── data/
│   ├── train.jsonl
│   └── manual.pdf
│
├── chroma_db/
│
├── Qwen3-8B/
│
└── qwen3-dnd-lora/
```

---

# 2. Instalar dependencias

En PowerShell:

```powershell
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
pip install transformers accelerate datasets peft trl bitsandbytes
pip install sentence-transformers chromadb pypdf pymongo
```

Para LoRA, lo más cómodo es **Unsloth**, pero en Windows puede dar problemas. Mejor en **WSL2 Ubuntu** o Linux.

```powershell
pip install unsloth
```

---

# 3. Descargar modelo base

```powershell
huggingface-cli download Qwen/Qwen3-8B --local-dir Qwen3-8B
```

---

# 4. Crear `data/train.jsonl`

Este archivo enseña a la IA a **hacer preguntas antes de crear JSON**.

```json
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. No generes JSON final hasta tener suficiente información."},{"role":"user","content":"Quiero crear un arma."},{"role":"assistant","content":"Perfecto. ¿Qué tipo de arma quieres crear: cuerpo a cuerpo, a distancia o mágica?"}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Debes hacer preguntas paso a paso hasta tener todos los datos necesarios. No generes JSON final hasta tener suficiente información."},{"role":"user","content":"Quiero crear una espada de fuego."},{"role":"assistant","content":"Vale. Para crearla bien necesito algunos datos: ¿cómo se llama el arma, qué rareza tiene y qué daño base hace?"}]}
{"messages":[{"role":"system","content":"Eres un asistente experto en crear elementos JSON para una app de DnD. Cuando tengas todos los datos obligatorios, responde solo con JSON válido."},{"role":"user","content":"Nombre: Colmillo Solar. Tipo: espada larga. Rareza: rara. Daño: 1d8 cortante y 1d6 fuego. Propiedad: versátil."},{"role":"assistant","content":"{\"type\":\"weapon\",\"name\":\"Colmillo Solar\",\"category\":\"martial melee weapon\",\"rarity\":\"rare\",\"damage\":{\"dice\":\"1d8\",\"type\":\"slashing\"},\"extra_damage\":{\"dice\":\"1d6\",\"type\":\"fire\"},\"properties\":[\"versatile\"],\"description\":[\"Una espada larga imbuida con fuego mágico.\"]}"}]}
```

---

# 5. Entrenar LoRA: `train_lora.py`

```python
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer, SFTConfig


MODEL_PATH = "Qwen3-8B"
DATA_PATH = "data/train.jsonl"
OUTPUT_DIR = "qwen3-dnd-lora"


model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_PATH,
    max_seq_length=2048,
    load_in_4bit=True,
)

model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj"
    ],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
)

dataset = load_dataset("json", data_files=DATA_PATH, split="train")


def format_example(example):
    text = tokenizer.apply_chat_template(
        example["messages"],
        tokenize=False,
        add_generation_prompt=False,
        enable_thinking=False
    )
    return {"text": text}


dataset = dataset.map(format_example)


trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    args=SFTConfig(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=4,
        num_train_epochs=3,
        learning_rate=2e-4,
        logging_steps=1,
        save_strategy="epoch",
        fp16=True,
        report_to="none",
        dataset_text_field="text",
    ),
)

trainer.train()

model.save_pretrained(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)

print("LoRA guardado en:", OUTPUT_DIR)
```

Ejecutar:

```powershell
python train_lora.py
```

---

# 6. Convertir PDF a RAG

Esto **no entrena** el modelo. Lo convierte en una base vectorial consultable. LangChain y FAISS/Chroma son opciones típicas para RAG; Qdrant también es una opción profesional para búsqueda vectorial. ([docs.langchain.com][2])

Crea `rag_ingest_pdf.py`:

```python
import chromadb
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


PDF_PATH = "data/manual.pdf"
DB_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"


def split_text(text, chunk_size=1000, overlap=150):
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def main():
    print("Leyendo PDF...")
    reader = PdfReader(PDF_PATH)

    full_text = ""

    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        full_text += f"\n\n[PAGE {i + 1}]\n{text}"

    chunks = split_text(full_text)

    print(f"Chunks generados: {len(chunks)}")

    print("Cargando modelo de embeddings...")
    embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

    client = chromadb.PersistentClient(path=DB_PATH)

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME
    )

    print("Generando embeddings e insertando en Chroma...")

    for i, chunk in enumerate(chunks):
        embedding = embedder.encode(chunk).tolist()

        collection.add(
            ids=[f"chunk_{i}"],
            embeddings=[embedding],
            documents=[chunk],
            metadatas=[{"source": PDF_PATH, "chunk": i}]
        )

    print("PDF convertido a RAG correctamente.")


if __name__ == "__main__":
    main()
```

Ejecutar:

```powershell
python rag_ingest_pdf.py
```

---

# 7. Buscar en el RAG

Crea `rag_search.py`:

```python
import chromadb
from sentence_transformers import SentenceTransformer


DB_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"


class RagSearch:
    def __init__(self):
        self.embedder = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        self.client = chromadb.PersistentClient(path=DB_PATH)
        self.collection = self.client.get_or_create_collection(
            name=COLLECTION_NAME
        )

    def search(self, query, n_results=4):
        query_embedding = self.embedder.encode(query).tolist()

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results
        )

        documents = results["documents"][0]

        return "\n\n".join(documents)
```

---

# 8. Conectar LoRA + RAG + método

Crea `qwen_client.py`:

```python
import json
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel
from rag_search import RagSearch


class QwenClient:
    def __init__(
        self,
        base_model_path="Qwen3-8B",
        lora_path="qwen3-dnd-lora"
    ):
        print("Cargando tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            base_model_path,
            trust_remote_code=True
        )

        print("Cargando modelo base...")
        self.model = AutoModelForCausalLM.from_pretrained(
            base_model_path,
            torch_dtype="auto",
            device_map="auto",
            trust_remote_code=True
        )

        print("Cargando LoRA...")
        self.model = PeftModel.from_pretrained(
            self.model,
            lora_path
        )

        self.rag = RagSearch()

        print("Qwen + LoRA + RAG listo.")

    def chat(self, messages, max_new_tokens=700):
        text = self.tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
            enable_thinking=False
        )

        inputs = self.tokenizer(
            [text],
            return_tensors="pt"
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=0.4,
                top_p=0.9,
                do_sample=True
            )

        generated_ids = outputs[0][inputs.input_ids.shape[-1]:]

        response = self.tokenizer.decode(
            generated_ids,
            skip_special_tokens=True
        )

        return response.strip()

    def questionnaire_step(
        self,
        element_type,
        user_message,
        conversation_history=None
    ):
        if conversation_history is None:
            conversation_history = []

        rag_context = self.rag.search(
            f"Reglas y estructura para crear {element_type}: {user_message}"
        )

        system_prompt = f"""
Eres un asistente experto en crear elementos JSON para una app de DnD.

Tu comportamiento:
1. Debes hacer preguntas paso a paso.
2. No generes el JSON final si faltan datos obligatorios.
3. Si ya tienes todos los datos, responde SOLO con JSON válido.
4. Usa el contexto RAG como apoyo.
5. Si el contexto no contiene algo, dilo o pregunta; no inventes reglas importantes.

Contexto RAG:
{rag_context}

Formato final esperado para weapon:
{{
  "type": "weapon",
  "name": "",
  "category": "",
  "rarity": "",
  "damage": {{
    "dice": "",
    "type": ""
  }},
  "properties": [],
  "description": []
}}
"""

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})

        return self.chat(messages)

    def try_parse_json(self, text):
        try:
            return json.loads(text)
        except Exception:
            return {
                "is_json": False,
                "raw_response": text
            }
```

---

# 9. Probar todo desde un método

Crea `main.py`:

```python
from qwen_client import QwenClient


def main():
    qwen = QwenClient()

    history = []

    user_1 = "Quiero crear una espada de fuego."
    response_1 = qwen.questionnaire_step(
        element_type="weapon",
        user_message=user_1,
        conversation_history=history
    )

    print("\nIA:")
    print(response_1)

    history.append({"role": "user", "content": user_1})
    history.append({"role": "assistant", "content": response_1})

    user_2 = "Se llama Colmillo Solar, es rara, hace 1d8 cortante y 1d6 fuego."
    response_2 = qwen.questionnaire_step(
        element_type="weapon",
        user_message=user_2,
        conversation_history=history
    )

    print("\nIA:")
    print(response_2)


if __name__ == "__main__":
    main()
```

Ejecutar:

```powershell
python main.py
```

---

# 10. Cómo meter la BD

Para MongoDB:

```powershell
pip install pymongo
```

Ejemplo `mongo_context.py`:

```python
from pymongo import MongoClient


class MongoContext:
    def __init__(self):
        self.client = MongoClient("mongodb://localhost:27017/")
        self.db = self.client["dnd_database"]

    def find_similar_weapons(self, text):
        collection = self.db["items"]

        results = collection.find(
            {
                "type": "weapon",
                "$text": {
                    "$search": text
                }
            }
        ).limit(5)

        return list(results)
```

Luego en `qwen_client.py`, puedes añadir ese contexto al prompt igual que el RAG.

---

# Resumen real

Primero haces esto:

```powershell
python rag_ingest_pdf.py
python train_lora.py
python main.py
```

Y el flujo queda:

```txt
Usuario dice lo que quiere
↓
Método questionnaire_step()
↓
Busca contexto en PDF RAG
↓
Consulta BD si hace falta
↓
Qwen + LoRA decide si pregunta más o devuelve JSON
```

Tu siguiente paso debería ser crear **50–100 ejemplos JSONL buenos** de conversaciones reales tipo: arma, armadura, objeto mágico, herramienta, montura, monstruo y personaje.

[1]: https://qwen.readthedocs.io/en/latest/training/unsloth.html?utm_source=chatgpt.com "Unsloth - Qwen - Read the Docs"
[2]: https://docs.langchain.com/oss/python/langchain/rag?utm_source=chatgpt.com "Build a RAG agent with LangChain"

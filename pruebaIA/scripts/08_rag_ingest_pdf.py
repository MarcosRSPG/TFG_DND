"""
08_rag_ingest_pdf.py — Convierte un PDF en una base vectorial (ChromaDB).

Flujo:
  PDF → texto → chunks → embeddings → ChromaDB

El PDF debe estar en data/manual.pdf (o ajustá PDF_PATH).
La base vectorial se guarda en chroma_db/ para uso posterior.

Uso:
  python scripts/08_rag_ingest_pdf.py
"""

from pathlib import Path
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import chromadb

# ============================================================
# CONFIGURACIÓN
# ============================================================
PDF_PATH = Path("data") / "manual.pdf"
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150


def split_text(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
    """Divide el texto en chunks con superposición."""
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks


def extract_pdf_text(pdf_path: Path) -> str:
    """Extrae todo el texto de un PDF página por página."""
    reader = PdfReader(str(pdf_path))
    full_text = ""

    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        full_text += f"\n\n[PÁGINA {page_number}]\n{text}"

    total_pages = len(reader.pages)
    print(f"  Páginas leídas: {total_pages}")

    return full_text


def main():
    print("=" * 50)
    print("RAG — INGESTAR PDF EN CHROMADB")
    print("=" * 50)

    # 1. Verificar PDF
    if not PDF_PATH.exists():
        raise FileNotFoundError(
            f"No existe el PDF: {PDF_PATH}\n"
            "Poné tu manual PDF en data/manual.pdf"
        )

    print(f"\nPDF: {PDF_PATH}")

    # 2. Extraer texto
    print("Extrayendo texto del PDF...")
    full_text = extract_pdf_text(PDF_PATH)
    print(f"  Total caracteres: {len(full_text):,}")

    # 3. Dividir en chunks
    print("Dividiendo texto en chunks...")
    chunks = split_text(full_text)
    print(f"  Chunks generados: {len(chunks)}")

    # 4. Cargar modelo de embeddings
    print(f"Cargando modelo de embeddings ({EMBEDDING_MODEL})...")
    embedder = SentenceTransformer(EMBEDDING_MODEL)

    # 5. Abrir ChromaDB
    print(f"Abriendo ChromaDB en {CHROMA_PATH}...")
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"description": "Documentación DnD para RAG"},
    )

    # 6. Insertar chunks
    print(f"Insertando {len(chunks)} chunks en ChromaDB...")

    BATCH_SIZE = 50

    for i in range(0, len(chunks), BATCH_SIZE):
        batch_chunks = chunks[i:i + BATCH_SIZE]
        batch_ids = [f"manual_chunk_{j}" for j in range(i, i + len(batch_chunks))]

        # Generar embeddings para el batch
        batch_embeddings = embedder.encode(batch_chunks).tolist()

        collection.upsert(
            ids=batch_ids,
            embeddings=batch_embeddings,
            documents=batch_chunks,
            metadatas=[
                {
                    "source": str(PDF_PATH),
                    "chunk": j,
                }
                for j in range(i, i + len(batch_chunks))
            ],
        )

        print(f"  Procesados {min(i + BATCH_SIZE, len(chunks))}/{len(chunks)} chunks...")

    # 7. Verificar
    count = collection.count()
    print(f"\n✅ PDF convertido a RAG correctamente.")
    print(f"   {count} chunks indexados en ChromaDB ({CHROMA_PATH})")
    print(f"\n   Próximo paso: python scripts/09_rag_search.py")


if __name__ == "__main__":
    main()

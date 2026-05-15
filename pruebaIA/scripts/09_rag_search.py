"""
09_rag_search.py — Busca en la base vectorial (RAG).

Usa ChromaDB con embeddings de sentence-transformers para buscar
fragmentos relevantes dentro del PDF indexado.

Se puede usar tanto como clase importable como script independiente.

Uso:
  # Como script:
  python scripts/09_rag_search.py

  # Como import:
  from scripts.rag_search import RagSearch
  rag = RagSearch()
  results = rag.search("reglas para armas cuerpo a cuerpo")
"""

from sentence_transformers import SentenceTransformer
import chromadb

# ============================================================
# CONFIGURACIÓN
# ============================================================
CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "dnd_docs"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


class RagSearch:
    """
    Buscador semántico en los documentos indexados (PDFs).

    Ejemplo:
        rag = RagSearch()
        resultados = rag.search("reglas para espada larga")
        print(rag.search_as_text("daño de armas cuerpo a cuerpo"))
    """

    def __init__(self):
        print("Inicializando RagSearch...")
        self.embedder = SentenceTransformer(EMBEDDING_MODEL)
        self.client = chromadb.PersistentClient(path=CHROMA_PATH)
        self.collection = self.client.get_or_create_collection(name=COLLECTION_NAME)
        print(f"  Colección: {COLLECTION_NAME}")
        print(f"  Documentos indexados: {self.collection.count()}")

    def search(self, query: str, n_results: int = 4) -> list[dict]:
        """
        Busca los fragmentos más relevantes para la consulta.

        Args:
            query: Texto de búsqueda (ej: "reglas para armadura pesada")
            n_results: Cantidad de resultados (default: 4)

        Returns:
            Lista de dicts con: text, metadata, distance
        """
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
            output.append({
                "text": doc,
                "metadata": meta,
                "distance": round(distance, 4),
            })

        return output

    def search_as_text(self, query: str, n_results: int = 4) -> str:
        """
        Busca y devuelve los resultados como texto formateado,
        listo para inyectar en un prompt.

        Args:
            query: Texto de búsqueda
            n_results: Cantidad de resultados

        Returns:
            String con los fragmentos formateados
        """
        results = self.search(query, n_results=n_results)

        blocks = []

        for i, result in enumerate(results, start=1):
            source_info = result["metadata"].get("source", "desconocido")
            chunk_num = result["metadata"].get("chunk", "?")

            blocks.append(
                f"[RAG RESULT {i} | chunk {chunk_num}]\n"
                f"Fuente: {source_info}\n"
                f"Relevancia: {result['distance']}\n"
                f"Texto:\n{result['text']}"
            )

        return "\n\n".join(blocks)


# ============================================================
# EJEMPLO DE USO COMO SCRIPT
# ============================================================

if __name__ == "__main__":
    print("=" * 50)
    print("RAG — BÚSQUEDA EN DOCUMENTACIÓN")
    print("=" * 50)

    rag = RagSearch()

    # Prueba 1: búsqueda simple
    query_1 = "reglas para espada larga daño propiedades versátil"
    print(f"\n\nConsulta: '{query_1}'")
    print("-" * 40)
    print(rag.search_as_text(query_1))

    # Prueba 2: armadura
    query_2 = "armadura pesada clase de armadura requisito fuerza"
    print(f"\n\nConsulta: '{query_2}'")
    print("-" * 40)
    print(rag.search_as_text(query_2))

import os
from typing import Optional
import fitz
import pytesseract
from pdf2image import convert_from_path
from autogen_core.memory import Memory, MemoryContent, MemoryMimeType
from autogen_ext.memory.chromadb import ChromaDBVectorMemory

async def _get_chroma_collection(mem: "ChromaDBVectorMemory"):
    """
    回傳底層 chromadb Collection。
    0.7.1 之後必須先呼叫 _ensure_initialized()，
    而且欄位名稱是 _collection（前面有底線）。
    """
    # 確保 collection 已經建立
    if getattr(mem, "_collection", None) is None:
        # 0.7.1 公用方法，會在第一次使用時真正去呼叫 chromadb.Client
        mem._ensure_initialized()                    # ← Private，但官方文件允許
    return mem._collection                           # type: chromadb.api.models.Collection

class PDFDocumentIndexer:
    def __init__(self, memory: Memory, chunk_size: int = 1500) -> None:
        self.memory = memory
        self.chunk_size = chunk_size

    def _read_pdf(self, file_path: str) -> str:
        reader = fitz.open(file_path)
        all_text = ""
        for page in reader:
            all_text += page.get_text()
        reader.close()

        if not all_text:
            images = convert_from_path(file_path, dpi=300)

            for i, img in enumerate(images):
                page_text = pytesseract.image_to_string(img, lang='chi_tra').strip()
                all_text += f"\n\n--- 第 {i + 1} 頁 ---\n\n" + page_text
        return all_text

    def _split_text(self, text: str) -> list[str]:
        return [text[i:i+self.chunk_size] for i in range(0, len(text), self.chunk_size)]

    def _read_pdf_by_page(self, file_path: str) -> list[str]:
        reader = fitz.open(file_path)
        page_texts = []

        for page in reader:
            text = page.get_text().strip()
            page_texts.append(text)
        reader.close()

        # 如果沒有任何文字，就使用 OCR
        if not any(page_texts):
            page_texts = []
            images = convert_from_path(file_path, dpi=300)

            for i, img in enumerate(images):
                page_text = pytesseract.image_to_string(img, lang='chi_tra').strip()
                page_texts.append(f"--- 第 {i + 1} 頁 ---\n\n" + page_text)

        return page_texts

    async def index_pdf(
        self,
        file_path: str,
        extra_metadata: Optional[dict] = None,
        deduplicate: bool = True,
    ) -> int:
        doc_id   = os.path.basename(file_path)
        mtime    = os.path.getmtime(file_path)
        meta_base = {"doc_id": doc_id, "mtime": mtime}

        full_text   = self._read_pdf(file_path)
        text_chunks = self._split_text(full_text)
        total_added = 0
        collection  = await _get_chroma_collection(self.memory)

        # 1️⃣ 先刪整份（保險起見；也可只刪哨兵）
        if deduplicate:
            collection.delete(where={"doc_id": doc_id})

        # 2️⃣ 寫入頁面分片
        for idx, chunk in enumerate(text_chunks):
            if not chunk.strip():
                continue
            uid = f"{doc_id}_c{idx+1}"
            metadata = {"chunk": idx+1, **meta_base}
            if extra_metadata:
                metadata.update(extra_metadata)
            await self.memory.add(MemoryContent(
                id       = uid,
                content  = chunk,
                mime_type= MemoryMimeType.TEXT,
                metadata = metadata,
            ))
            total_added += 1

        # 3️⃣ 寫入哨兵 chunk（用來記住 mtime）
        await self.memory.add(MemoryContent(
            id       = f"{doc_id}__meta",
            content  = "",  # 不佔用向量空間
            mime_type= MemoryMimeType.TEXT,
            metadata = {**meta_base, "type": "doc_meta"},
        ))
        return total_added

    # PDF 文件索引器
    async def index_all_pdfs_in_folder(self, folder_path: str) -> None:
        pdf_files = [
            os.path.join(folder_path, f) 
            for f in os.listdir(folder_path) 
            if f.endswith(".pdf")
        ]

        total_chunks = 0
        for pdf in pdf_files:
            chunks: int = await self.index_pdf(pdf)
            print(f"✅  {pdf} → {chunks} 片段")
            total_chunks += chunks

        print(f"🎉 共建立 {total_chunks} 片段，來源 PDF 數：{len(pdf_files)}")

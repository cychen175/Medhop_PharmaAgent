import os
import glob
from typing import Dict, Set

from autogen_ext.memory.chromadb import ChromaDBVectorMemory, PersistentChromaDBVectorMemoryConfig

from tool.retrieve import PDFDocumentIndexer, _get_chroma_collection


class RAGDatabase:
    def __init__(
        self,
        collection_name: str = "drug_memory",
        persistence_path: str = "./tmp/chroma_db/drug_db",
        k: int = 3,
        score_threshold: float = 0.6,
        data_glob: str = "data/drug_info/*.pdf",
    ) -> None:
        # 1) 建立向量記憶體
        self.memory = ChromaDBVectorMemory(
            config=PersistentChromaDBVectorMemoryConfig(
                collection_name=collection_name,
                persistence_path=persistence_path,
                k=k,
                score_threshold=score_threshold,
            )
        )
        # 2) PDF → 向量索引器
        self.indexer = PDFDocumentIndexer(memory=self.memory)
        # 3) 其它設定
        self._data_glob = data_glob
    
    def __getattr__(self, name: str):
        """
        當屬性或方法在 DrugDatabase 找不到時，
        自動去底層 self.memory 拿同名的。
        """
        return getattr(self.memory, name)
    
    def _scan_local_pdfs(self) -> Dict[str, str]:
        """掃描資料夾，回傳 {檔名: 完整路徑}"""
        return {os.path.basename(p): p for p in glob.glob(self._data_glob)}

    async def build_chroma(self):
        # --- 1. 取得目錄中的 PDF 檔案清單 -----------------------------
        pdf_files = self._scan_local_pdfs()

        # --- 2. 取得資料庫已有的 document id 清單 ---------------------
        coll = await _get_chroma_collection(self.memory)
        resp = coll.get(where={"type": "doc_meta"}, include=["metadatas"])
        vec_meta = {m["doc_id"]: m["mtime"] for m in resp["metadatas"]}
        vec_docs: Set[str] = set(vec_meta.keys())
        local_docs: Set[str] = set(pdf_files.keys())
        
        # --- 3. 比對差異 ---------------------------------------------
        new_docs     = local_docs  - vec_docs
        deleted_docs = vec_docs    - local_docs
        # 同名文件，同時檢查 mtime
        updated_docs = {
            d for d in local_docs & vec_docs
            if int(os.path.getmtime(pdf_files[d])) != int(vec_meta[d])
        }
        # 只要三者任一非空，就代表本次有異動
        changed = bool(new_docs or deleted_docs or updated_docs)

        # --- 4. 刪除舊向量 --------------------------------------------
        for doc in deleted_docs:
            print(f"刪除 {doc} → 從向量庫移除")
            coll.delete(where={"doc_id": doc})

        # --- 5. 新增／更新向量 ----------------------------------------
        for doc in new_docs | updated_docs:
            action = "新增" if doc in new_docs else "更新"
            print(f"{action} {doc} → 索引中...")
            await self.indexer.index_pdf(pdf_files[doc])

        # --- 6. 收尾訊息 ---------------------------------------------
        if changed:
            print("✅ 藥品仿單資料庫建置完成！")
        else:
            print("📂 已載入藥品仿單資料庫（無變動）")

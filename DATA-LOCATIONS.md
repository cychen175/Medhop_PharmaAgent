# 資料存放位置與交互作用檢查

目前系統資料位於本文件同一專案目錄。所有運算使用既有來源，不因版面變更新增醫學規則。

| 資料 | 相對於專案根目錄的位置 | 用途 |
| --- | --- | --- |
| 原藥事 Agent 仿單 | data/drug_info/ | 100 份原始 PDF |
| 仿單可搜尋文字 | data/pharma_pages.json | 187 頁擷取／OCR 文字，附檔名與頁碼 |
| 原專案藥單範例 | data/examples.json | 12 筆原文；不在首頁預先建立病人 |
| MedHop | data/medhop/ | entities、relationships、text_units、documents 等 Parquet；另含 communities、community_reports 與 lancedb |
| 政府藥品補充 | data/government/tfda-products.json | 既有快照的產品候選、成分、適應症、劑型與用法用量 |
| 藥師輸入的病歷與藥單 | runtime/records.sqlite3 | 本機工作資料，含病歷、用藥、報告及實際處置紀錄；不包入 ZIP |

目前可依有效藥單組合逐對檢索原始仿單，只有直接支持同一組藥品的引用才能列為已記載的併用影響；同段出現兩個藥名不直接判定交互作用。MedHop 可列出原文支持的研究連結或機轉路徑，與臨床併用警示分開。

已驗證原仿單的 Amlodipine × Tacrolimus 配對可顯示併用影響及原文引用；MedHop 的 DB00203 × DB00820 可列研究路徑，但不因此升級成已證實臨床交互作用。這些是軟體來源檢索驗證，不是病人處方建議或完整臨床準確率驗證。

來源不足、藥名未對應或找不到路徑時會保留待藥師核對，不能判定沒有交互作用。現有 100 份仿單未涵蓋所有藥品，也沒有連接完整 DrugBank 交互作用資料庫。

## 藥物說明的排列

依目前病人有效藥單的原始輸入順序提供編號切換，點任一藥物說明可使用上一項／下一項。最先呈現病人記錄用量、禁忌來源缺口與產品身分；候選產品及適應症、用法用量原文預設收合，不重複產品標題，不把候選劑量當成病人實際用量。


人口條件／單藥禁忌來源索引：`data/population_rules.json`。目前一條 Glibenclamide 孕婦禁用原仿單規則，保留來源頁碼、原句與檔案雜湊；不是完整族群用藥安全資料庫。


### BAKTAR 複方與低血糖警示（2026-10-25）

`label_interactions.py` 將明確的「BAKTAR，成分是 Sulfamethoxazole 與 Trimethoprim」辨識為一項複方藥，成分不另列處方；頻次依藥師原始輸入保留。`data/label_interaction_rules.json` 目前只索引 BAKTAR 與 Glibenclamide 這一項產品所屬交互作用表規則：原始 `data/drug_info/A0049191G0.pdf` 第 1 頁確認產品與成分，第 4 頁列降血糖效果增強及低血糖。啟動時驗證 PDF SHA256 與原文引用；模型不可用時仍立即顯示來源警示。此規則不套用於單獨使用 Trimethoprim 或 Sulfamethoxazole，也不代表其他配對已檢查完整。

明確同次輸入遭舊版拆開的成分列保留為 `component` 歷史狀態；原始輸入事件保留，病歷版本更新使舊報告失效。


### 藥名自動查成分（2026-10-27）

`ingredient_lookup.py` 直接查現有 `data/government/tfda-products.json` 的「主成分略述」，依完整中英文品名、明確品名詞幹或已核對許可證對應。BAKTAR／撲菌特錠無需另輸入成分。回傳原始成分、候選產品許可證、來源欄位與快照日期；成分集合不一致時不擇一套用，查無資料時不讓模型生成。自動查得產品成分不表示藥師已確認實際產品，也不會自動套入規格、服用劑量或新增成分處方。

讀取病歷時會依目前本機快照重新對應；藥物說明及藥品表顯示查得成分。這項查詢不代表已具備任意藥物配對的完整臨床交互作用規則。


### 逗號分隔的劑量／頻次（2026-10-27）

`workflow.medications` 將「Glibenclamide，一天一次，劑量75 毫克」的後續屬性接回前一藥物，不將「劑量／用量」當成藥名；僅保存藥師輸入，不由此認定劑量適當。`repair_medication_attributes` 只修復能同時核對同次輸入、時間、唯一目標藥品且無明確劑量衝突的舊列；原錯誤列軟移至 `attribute` 狀態，原文與修復稽核保留，病歷版本更新使舊報告失效。


### 實際藥單的仿單 RAG

檢索實作：`pharmacy_rag.py`。資料：`data/pharma_pages.json`（原始來源為 `data/drug_info/*.pdf`）。`server.Corpus.label_rag` 在啟動時建立 BM25 索引；`ReviewJob.run` 先檢索再核對，藥物說明端點也使用同一檢索器。每筆 R 引用含 file、page、chunk_offset、BM25 score、原文字串 SHA256；查詢與命中文件範圍存於評估的 `pharmacy_rag`。藥師報告保存引用編號，AutoGen 的 `retrieve_pharmacy_evidence` 接收實際命中原文。這是 BM25 RAG，非藥事仿單 GraphRAG；MedHop GraphRAG 仍為獨立研究模組。


### 藥品分類資料缺口核對（2026-10-27）

已逐欄比對原始 `work/government/tfda-unrevoked-37.zip!37_5.json` 與本機快照，許可證 052301、052530、055272 的「藥品類別」原始值均為 null，「用法用量」原始值只指向仿單；不是本次 PDF OCR 擷取失敗。現有 24839 筆快照中，藥品類別欄位皆無非空值；這只描述該快照，不代表其他官方來源無分類資料。詳見 `validation/catalog-source-audit.json`。

`Catalog.source_availability` 分別揭露欄位空值、用法僅指向仿單及同許可證本機 PDF 是否對應。只以 PDF 首頁抽取到的相同完整許可證建立連結；未對應時不宣稱所有來源不存在，也不以同成分他牌／複方仿單代替。原始 PDF 含 OCR 時保留提示。分類與用藥適當性仍須藥師確認。更新匯入器已保留適應症、劑型、許可證種類，避免未來更新丟失已收錄欄位。

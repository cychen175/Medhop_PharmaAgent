# 藥你安心｜本機藥師 Agent

依「附件1-1_系統概述文件_藥你安心_初賽初版.docx」調整的本機實作。版面延續使用者提供的 medhop-agent-demo.html；不沿用其固定病人、回答、候選分數或換藥建議。

本機網頁：http://127.0.0.1:8502 。先閱讀 SPECIFICATION-COMPLIANCE.md，了解已驗證項目與尚需實機驗收的項目；目前沒有宣稱完成 AMD 或正式臨床驗收。

## 開啟與安裝

這台電腦可直接執行 Start-MedLink.cmd。啟動器優先使用同資料夾 .venv，再使用這次建立的 work/api314 環境；MEDLINK_PYTHON 可指定其他 Python **3.14** 環境。

移至其他 Windows 電腦時，在此資料夾執行：

```powershell
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\Start-MedLink.cmd
```

主 API 使用 Python 3.14.7、Uvicorn、FastAPI、Pydantic、SQLite。原 server.py 保留為檢索引擎與相容程式；請以 asgi:app 啟動，才能使用新版覆核及隱私功能。

本機 Lemonade 模型 API 預設為 http://127.0.0.1:13305/api/v1，模型 qwen3-it-4b-FLM。環境變數 MODEL_URL／MODEL 可調整本機服務。介面固定使用藥師工作流程，不顯示工作模式、角色或本機 Agent 開關。首頁亦不顯示模型名稱、整體資料來源入口、輸入框下方的來源提示、歡迎標題或開始輸入按鈕。系統依本機模型連線狀態自動啟用 Agent；未連線時保留原文檢查，並標示未執行模型流程。

### 完整 MedHop GraphRAG

主 API 與 AutoGen 都在 Python 3.14 執行。既有 GraphRAG 依賴則隔離在 Python 3.11 worker；不是把主後端改回 3.11。MEDHOP_PYTHON 指定裝有 requirements-worker.txt 的 Python 3.11。此電腦啟動器可沿用原 Downloads/MedLink_PharmaAgent 的 .venv。

使用封裝中的 data/medhop-worker/settings.yaml、原 prompts、parquet 與 LanceDB，無須改寫或重新建立研究索引。MODEL_URL 傳給 worker；不需要外部金鑰。未設定 worker 或失敗時，明確顯示不可用，僅保留來源與路徑檢索，不冒稱完成 GraphRAG。

逐對整合使用方法與判讀界線，請見 `INTEGRATION-GUIDE.md`。現在每組藥物會並列仿單與 MedHop 原文；可記錄藥師核對的研究識別碼，變更後須重新檢查。

## 藥師操作

1. 首次使用沒有預建病歷，也沒有範例載入按鈕。輸入姓名或病歷號後才查找病歷，查無再新增；可一起提供病史、過敏史與用藥。身分不足先追問，同名或衝突先核對。
2. 持續補充目前用藥、今日新處方及自行購買藥品。過敏藥、詢問是否停藥及候選替代藥不自動當成目前服用；只有明確回報已停用才改變狀態。
3. 右側「核對分類／官方產品」分別記錄取得方式與處方／非處方法律分類。自己買不代表非處方藥；成分命中不代表病人實際產品。確認實際包裝、處方或許可證後由藥師填寫依據。
4. 至少兩項藥品會逐對核對原始仿單，並列出來源、資料缺口、重複用法與調劑提醒。逐項藥品比對會並列輸入用量／頻次與已核對產品的官方用法用量，供藥師判讀；不以其他產品的數字片段判定劑量正確。
5. 同步查看「藥師摘要」與「給長者與照顧者」草稿。規格不等於每次實際服用量；系統不補寫未提供的劑量、餐前後時間、替代藥或停藥指示。
6. 高風險、資料不足或無法判定時停止自動交付、轉交藥師。填寫實際處置、每項待確認事項的處理結果，修訂並儲存雙版本草稿；仍待聯繫開方醫師時不可交付。
7. 藥師填寫覆核代碼、勾選已核對，再確認交付。只有此時才能開啟／列印白話說明；直接呼叫交付 API 也受到相同限制。新增資料或分類變更會增加用藥版本，使舊報告不可交付。已交付版本不可原地修改。
8. 病歷、檢查、研究查詢、處置與覆核紀錄均保留在本機；可從右側查閱。下一位病人按「換下一位」。

MedHop 由藥師 Agent 的研究工具與後端研究 API 介接，使用完整 GraphRAG；原生 [Data: Table (id)] 引用與實際來源另外顯示。MedHop 是 PubMed 摘要研究資料，僅作機轉推理能力測試，不是病人臨床證據或臨床藥物交互作用的確診。

## 資料與來源

- MedHop：原本機既有索引，1,000 份文件、1,129 個文字單元、4,385 個實體、6,082 條關係；既有 communities、community_reports 與 LanceDB 一併保留。原 parquet 不重新抽取、不新增研究內容。
- 藥事 Agent：指定 moda-agent 版本的 100 份原始 PDF；122 頁直接抽取及 65 頁 OCR，共 187 頁可檢索，4 頁沒有足夠文字。OCR 候選仍需核對 PDF，不自動升級成已證實風險。
- 病歷範例：原藥事專案與 frontend 的 12 筆原文，來源見 data/examples.json；不新增臨床示範事實。
- 政府輔助資料：[未註銷藥品許可證資料集](https://data.gov.tw/dataset/9123)。2026-10-23 快照 25,956 筆，排除 1,117 筆逾期品項，納入 24,839 筆。匯入前另檢查註銷狀態及日期；該次來源沒有額外命中註銷項目。SHA-256、時間、授權、篩選數量見 data/government/provenance.json。此為快照，不是即時註銷狀態。
- 指定的三個 GitHub 儲存庫版本、PDF SHA-256、抽取紀錄見 data/provenance.json；快照在 upstream/，授權在 licenses/。

更新官方產品資料時，先停止 API、執行 `python refresh_catalog.py`，核對匯入數量後重新啟動。程式只下載固定官方公開資料，不傳送病人內容；保留上一版公開資料快照。

## AutoGen 相容層與判讀限制

重用 upstream/moda-agent/agent.py 的 Agent.build_agent，搭配 AutoGen 0.6.1 的藥師入口與藥事來源核對代理人。agent_service.py 自行實作唯讀工具與相容提示；工具紀錄顯示實際執行結果，不顯示或保存模型思考過程。原版本缺少 utils/prompts.py、utils/llm_client.py，因此**沒有宣稱完整還原原 28 項檢核**。原 Angular、Spring relay、ChromaDB 未在此版啟動；前端依附件使用原生 HTML/CSS/JavaScript，後端使用詞彙 RAG 與原文比對。與原始實作的差異都在此揭露。

兩個藥名出現在第三產品的清單，不直接當作兩藥之間的交互作用。模型核對必須回傳實際原文引句並通過字面藥名、來源與併用句式檢查；這些檢查仍不能取代藥師的語意、族群、適應症與完整處方核對。圖譜連線不等於臨床證據；模型原生引用也不代表每項敘述已經醫學驗證。

## 本機資料保護

工作病歷使用遮蔽姓名；完整姓名以 HMAC 索引查詢，原始身分輸入使用 Fernet 加密，金鑰在 runtime/privacy.key，資料在 runtime/records.sqlite3。工作資料庫不預先填入示範病歷；本次清除的兩筆展示紀錄已有本機備份保留於 runtime/backups/，不會包入 ZIP。金鑰與資料庫需妥善備份；金鑰不包入 ZIP。標準身分證、手機、email 與獨立地址欄位會遮蔽或不蒐集，並非任意自由文字的完整去識別化保證，請優先輸入個案代碼。

本機工作區的病歷共用，cookie 區分選取病人與即時工作，不是帳號登入或藥師資格驗證；覆核代碼是操作者填寫的稽核欄位。正式場域仍須驗收帳號權限、金鑰管理、備份與個資治理。本版只開放 127.0.0.1，不提供外部病歷連線，不向雲端模型送病歷。主機存取本機資料的人仍可能讀取工作資料與金鑰；不能宣稱全庫加密或不可竄改稽核。

## Docker、Ubuntu 與實機驗收

Dockerfile 的最終映像為 Ubuntu 22.04，主 Python 3.14.7；另外隔離建置 GraphRAG 相容 Python 3.11。compose 僅映射 127.0.0.1:8502，runtime 使用持久化 volume；病歷、金鑰與本機環境不會進入 build context。

```powershell
docker compose config --quiet
docker compose up --build -d
```

本次 compose 設定驗證通過；本機 Docker daemon 沒有執行，因此映像建置與容器啟動尚未驗證。容器透過 host.docker.internal 連線到主機既有 Lemonade；Ubuntu 主機須提供容器可連通的本機模型服務，並驗證主機防火牆與 GPU runtime。未假設容器自帶模型或 AMD 驅動。

`benchmark.py` 強制至少暖機一次、量測 30 次；提供 P50/P95、來源契約正確率及程序樹 RSS，只有提供實測電表 CSV 才計算功耗。來源正確率不是臨床正確率，RSS 不含獨立模型服務。

```powershell
python benchmark.py --mode source-check --warmup 2 --runs 30 --output runtime/benchmark-source.json
python benchmark.py --mode medhop-e2e --warmup 2 --runs 30 --label amd-integrated-gpu --output runtime/benchmark-medhop.json
```

第一項已實測，結果在 validation/benchmark-source-check.json。第二項是供實機驗收的命令範例；label 不會證明 GPU 使用狀態。AMD AI Box 395、CPU／整合 GPU／NPU 分工、模型端到端 30 次、正確率標註集、整機記憶體／功耗、CPU-only 與雲端對照皆尚待實測。雲端比較僅能使用經授權的公開研究題，不能直接轉送個案資料。

## 主要檔案

asgi.py 為新版 API；workflow.py 負責病歷與來源核對；governance.py 負責隱私、官方產品、草稿與覆核；agent_service.py 介接 AutoGen／GraphRAG；static/ 為前端；validation/ 保存實測證據；SPECIFICATION-COMPLIANCE.md 對照附件要求。


## 系統名稱與姓名顯示（目前設定）

系統名稱為「藥你安心：藥事安全Agent」。首頁不預先建立測試病人，也不自動載入上一位病人；重新開啟頁面會清除目前選取，既有正式紀錄仍可查找。已核對的王小明測試紀錄已移出工作資料庫並保留於 runtime/backups/ 的資料庫與金鑰備份中，封裝不含備份或病人紀錄。

依使用者要求，病歷及選單顯示完整姓名。原始姓名仍從本機加密身分索引還原；工作資料庫的姓名遮蔽設定不再代表介面會遮蔽姓名。不得由遮蔽字串猜測姓名。


## 藥事仿單 RAG（2026-10-27 更新）

實際藥單 `/api/review` 與 `/api/medications/{id}/details` 已接入 `pharmacy_rag.py` 的 BM25 RAG 檢索。使用原始藥事 Agent PDF 擷取快照 `data/pharma_pages.json`，以 1600 字片段、1200 字步進建立記憶體 BM25 索引；藥名、資料庫成分與病人已知條件形成查詢，先核對產品／成分所屬文件，再排序原文。中文以固定雙字詞切分，不經模型翻譯或生成別名。

只將實際檢索頁面交給藥物配對核對；原文片段另以 R1、R2 等引用傳給來源核對模型與 AutoGen 工具、存入報告並顯示在畫面。模型可用且需要核對時才執行逐字引句分類；模型未執行時明確保留 `not_run`，仍可顯示來源摘錄與已核驗的獨立安全規則。成分查詢仍是官方原始欄位精確查詢，未偽稱為模型生成。

MedHop 沿用配對圖譜與原文路徑檢索；完整原生 GraphRAG worker 的執行條件與狀態另行揭露，未將仿單 BM25 宣稱為 GraphRAG。RAG 搜尋未命中與 MedHop 無路徑均不等於沒有交互作用。孕婦禁忌與已核驗仿單表格規則仍獨立檢查，不因 RAG 排名而漏掉。


## 簡化後的核對操作（2026-10-28）

查看藥單檢查結果不要求填寫處置或報告。預設只顯示「後續處理（選用）」：處置／衛教備註與已確認處方變更各自收起，用藥說明僅在開啟時讀取。說明先以文字預覽；藥師摘要、雙版本編輯器、交付確認各自按需展開。只有正式交付／列印時仍需儲存核對後草稿、記錄實際處置、填寫一份涵蓋待確認事項的整體核對紀錄、覆核藥師代碼與確認勾選。收起欄位不代表風險已排除，後端交付限制不變。


## MedHop 涵蓋範圍及整體核對（2026-10-28）

本機研究資料有1000份文件、1129個文本單元、4385個實體及6082條關係。589個實體原標記為DRUG；搜尋器另接受DB格式識別碼，共658個搜尋名稱，其中537個有至少一條兩端名稱均出現在引用原文的直接關係。名稱可能是同物異名、類別、縮寫或抽取雜訊，不能視為658種不重複臨床藥品。可由畫面「查看 MedHop 可檢索內容」及唯讀 `/api/medhop/coverage` 查詢。例示路徑只代表研究連結，顯示節點順序不代表作用方向，完整方向以每條關係原始 source/target 為準。

交付前的提醒改為唯讀清單，不需逐項填16個欄位。藥師可填一份至少20字的整體紀錄，明確確認涵蓋當前清單。後端保存紀錄及完整事項範圍，不將同一段文字假裝成每項個別結果；範圍不符、缺少確認、草稿未修訂、仍待醫師回覆或版本變更仍拒絕交付。舊版逐項API仍相容。


## 選取既有病歷與檢索結果（2026-10-28）

選取既有病歷時，左右兩側同步切換。優先顯示該病人目前用藥版本已保存的評估、仿單與 MedHop 原文；僅選取病歷不建立新的檢查、不新增病史或用藥事件。沒有目前版本時仍可回顧歷史結果，但會標示舊版本並提供重新檢索，舊版不能記錄處置或交付。完全沒有保存結果且已有藥單時，自動執行首次檢索。研究查詢依病人歸屬顯示，亦標示其版本。切換前的畫面與輸入只在本次瀏覽器記憶體暫存，不自動寫成醫療紀錄。


### Sildenafil × Tadalafil 併用警示
兩項有效用藥同時存在時，立即提示可能進一步降低血壓、不建議合用，並要求藥師確認使用時間、血壓及開方醫師處置。警示由可核對的原廠仿單規則產生，不依賴模型與 MedHop 共同標靶推論。補充來源：Pfizer VIAGRA 第 5.7 節（原頁修訂 12/2017，2026-10-28 核對）；來源與短引文保存在 data/supplemental_label_warning.json，明確區別原 moda-agent 仿單庫。此版本僅對明確 Sildenafil 與 Tadalafil 成分名稱配對套用，不猜測品牌別名。


### Docker 名稱
Compose 專案名稱固定為 `medhop-pharmaagent`，映像為 `medhop-pharmaagent:latest`。從舊名稱遷移時先執行 `docker compose -p medlink-integrated -f compose.yaml -f compose.local-data.yaml down`，再執行 `docker compose -f compose.yaml -f compose.local-data.yaml up --build -d`。不要加 `down -v`。本機資料覆寫仍使用 `./runtime`；未套用覆寫的部署保留舊命名資料卷 `medlink-integrated_pharmacy-records`，避免改名後建立空白資料庫。

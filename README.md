# 藥你安心：藥事安全Agent

整合藥事 Agent 仿單與 MedHop 研究資料，提供病歷管理、藥物資料檢索及用藥風險提醒。

## 主要功能

- 藥師 Agent：每則對話訊息交給模型，由模型呼叫工具建立或查詢病歷、更新病史與用藥、試算併用、執行完整檢查、查仿單與暫存藥品資料；不再用關鍵字規則判斷輸入。
- 查詢或新增病歷，持續更新用藥紀錄。
- 檢索藥品成分、仿單與交互作用相關證據。
- 顯示禁忌與併用風險提醒、MedHop 研究路徑。
- 保存檢查結果、藥師處置與用藥說明。
- 在右側病歷直接編輯基本資料、病史、過敏史與用藥，並以 JSON 匯出或匯入個案。
- 藥物說明連到食藥署仿單、UpToDate、Micromedex 與 OpenEvidence。
- 藥師帳號登入（含「Demo 體驗」一鍵進入）與模擬訂閱方案；異動紀錄記錄登入的藥師。
- 藥品資料也在對話中處理：依藥師提供的許可證字號取得食藥署電子仿單、列出候選產品讓藥師選擇，或暫存藥師貼上的內容；藥師確認後才寫入藥品資料庫並加入檢索。

## 主要檔案

| 檔案/資料夾 | 用途 |
|---|---|
| `static/` | 網頁介面 |
| `asgi.py` | 後端 API |
| `pharmacist_agent.py` | 藥師 Agent：工具定義、執行迴圈與工具端防護 |
| `workflow.py` | 病歷與用藥處理 |
| `record_tools.py` | 病歷 JSON 匯入匯出與藥師編輯 |
| `account.py` | 藥師登入與模擬訂閱 |
| `drug_knowledge.py` | 食藥署電子仿單、藥師貼上的藥品資料與確認寫入 |
| `pharmacy_rag.py` | 仿單 RAG 檢索 |
| `label_interactions.py` | 已核驗的併用警示 |
| `population_checks.py` | 病人條件與禁忌檢查 |
| `pair_integration.py` | 藥物配對與 MedHop 路徑整合 |
| `data/` | 藥品及研究資料 |
| `validation/` | 測試程式與驗證紀錄 |

## 本機網頁

http://127.0.0.1:8502

## 本機模型

預設模型：`qwen3-it-4b-FLM`  
主機 API：`http://127.0.0.1:13305/api/v1`  
改用其他 OpenAI 相容端點時設定環境變數 `MODEL_URL`、`MODEL`，需要金鑰時另設 `MODEL_API_KEY`（不要寫進檔案或提交到 repo）。

開發時可設定 `MEDHOP_DEV=1`，Agent 每則訊息的完整往返會記錄在 `runtime/agent-log.jsonl`，並可在 `/api/dev/agent-log` 查看（含未遮蔽的原始訊息，只供本機開發）。

對話由藥師 Agent 處理，模型必須支援 OpenAI 相容的 tool calling（`tools`、`tool_choice`）。模型無法連線時，對話會顯示錯誤，不會改用規則猜測；右側病歷編輯與完整檢查本身不依賴模型。工具與防護說明見 `INTEGRATION-GUIDE.md` 的「藥師 Agent：對話輸入」。


## 資料來源

- **MedHop**：包含 1,000 份文件、1,129 個文字單元、4,385 個實體及 6,082 條關係，用於研究資料與圖譜路徑檢索。
- **藥事 Agent**：使用 moda-agent 的 100 份原始藥品 PDF，共 187 頁可檢索，其中 65 頁透過 OCR 辨識；另有 4 頁文字不足，無法完整檢索。
- **食藥署電子仿單**：藥師確認後由 `mcp.fda.gov.tw` 的 GetDrugDoc 取得，保留版本與核准日。許可證代碼對照與解析方式參考 [shin13/opentaimed](https://github.com/shin13/opentaimed)（MIT，授權文字見 `licenses/opentaimed-LICENSE`）。

## 遠端部署操作手冊

以下以 Linux x86_64 主機、Docker Engine 與 Docker Compose v2 為例。Agent 的 Compose 映像包含網站、API、Python 3.14 主程式和 Python 3.11 GraphRAG worker；模型伺服器要另外提供。整合版直接讀取本 repo 的索引，不必啟動獨立的 GraphRAG Streamlit 網頁，也不用先重跑索引。

### 1. 準備伺服器與程式

1. 依 [Docker 官方安裝指引](https://docs.docker.com/engine/install/) 安裝 Docker Engine 與 Compose plugin。確認操作帳號能執行 `docker info` 和 `docker compose version`。
2. 使用有讀取權限的部署帳號或 deploy key 取得此 repo，切到要部署的 commit。下方路徑與指令皆以 Agent repo 根目錄為起點。
3. 確認伺服器建置時可下載 Ubuntu 套件、Python 原始碼與 Python 套件。Dockerfile 首次建置會編譯兩套 Python；若部署網路不能下載依賴，可在同架構的建置主機先建映像，再從內部 registry 搬過去。
4. 確認索引與 worker 設定完整，避免只搬 Python 原始碼：

```bash
for file in entities relationships communities community_reports text_units documents; do
  test -s "data/medhop/$file.parquet" || printf 'Missing: %s\n' "$file.parquet"
done
test -d data/medhop/lancedb && ls data/medhop/lancedb
test -f data/medhop-worker/settings.yaml && ls data/medhop-worker/prompts
```

### 2. 選模型伺服器

| 方案 | Agent API 基底網址 | 要設定的模型 |
|---|---|---|
| 沿用 Lemonade，最快復用現有索引 | 同一台 Docker 宿主機：`http://host.docker.internal:13305/api/v1`；另一台模型主機：使用它的內網 DNS 或 IP | Agent 與 GraphRAG 生成：`qwen3-it-4b-FLM`；GraphRAG embedding：`embed-gemma-300m-FLM` |
| Ollama 或其他自架 OpenAI 相容服務 | Ollama 同宿主機範例：`http://host.docker.internal:11434/v1` | Agent 可先試支援工具呼叫的模型，例如 `qwen3:8b`。完整 GraphRAG 仍需提供與索引相容的 embedding，或先重建索引。 |
| 需要 API key 的代管或內部服務 | 供應商的 OpenAI 相容 API 基底，例如 `https://model.example.org/v1` | Agent 選支援工具呼叫的模型並注入 key；完整 GraphRAG 另需調整 worker 的金鑰傳遞與 embedding。 |

- **Lemonade**：依[官方安裝與 CLI 說明](https://lemonade-server.ai/docs/guide/cli/)在支援的模型主機安裝並啟動服務；若要沿用現有 NPU 環境，也可以只搬 Agent，讓它走受限內網連回模型主機。先用 `lemonade pull qwen3-it-4b-FLM` 和 `lemonade pull embed-gemma-300m-FLM` 準備兩個模型，或使用已安裝的同名模型。確認伺服器硬體及模型目錄支援這兩個 ID；一般 VM 不一定有可用的 NPU。
- **Ollama**：依[官方安裝說明](https://docs.ollama.com/linux)啟動服務，例：`ollama pull qwen3:8b`。使用 [OpenAI 相容介面](https://docs.ollama.com/api/openai-compatibility)的 `/v1`。先驗收 Agent 工具呼叫；能回傳文字不代表能穩定呼叫工具。
- **網路**：容器內的 `127.0.0.1` 指向容器自己。若模型和 Agent 同宿主機，模型必須監聽 Docker bridge 可達的位址；若模型另有 Compose 服務，使用同網路上的服務名稱。只允許需要的主機或網段連線，模型連接埠不要公開到網際網路。[Docker Compose 網路說明](https://docs.docker.com/compose/how-tos/networking/)

### 3. 設定 Agent 與 GraphRAG

預設 Lemonade 配置可以直接用 `compose.yaml`。更換端點或 Agent 模型時，在同目錄建立 `compose.override.yaml`（或由部署系統提供等效覆寫）：

```yaml
services:
  pharmacy:
    environment:
      MODEL_URL: "http://host.docker.internal:11434/v1"
      MODEL: "qwen3:8b"
      MODEL_API_KEY: "${MODEL_API_KEY:-local-only}"
```

上面是 Ollama 的 **Agent 對話**範例。需要驗證的 API 請從部署平台的秘密設定或執行 Compose 的 shell 注入 `MODEL_API_KEY`，不要把實際金鑰寫進 repo。API 基底網址只填到 `/v1` 或 `/api/v1`，不要接 `/chat/completions`。

完整 GraphRAG 另外讀取 [worker 設定](data/medhop-worker/settings.yaml)：

| 設定 | 用途 |
|---|---|
| `completion_models.default_completion_model.model` | GraphRAG 的生成模型；改 Compose 的 `MODEL` 不會改這一項。 |
| `embedding_models.default_embedding_model.model` | 查詢向量模型；現成索引使用 `embed-gemma-300m-FLM`，設定維度為 768。不同模型即使維度相同也不能直接沿用。更換時，用對應模型與原始語料重建索引，再成套替換 Parquet 和 LanceDB。 |
| 兩個模型區塊的 `api_base` | 預設都讀 `MODEL_URL`。若希望 Agent 用新端點、worker 留在原 Lemonade，可將 worker 兩個 `api_base` 改成容器可達的 Lemonade 內網網址，並保留原本模型 ID。 |
| `MEDHOP_PYTHON`、`MEDHOP_ROOT` | Dockerfile 已設定 worker 的 Python 路徑；根目錄預設 `/app/data/medhop-worker`，通常無須設定。 |

**需驗證的 worker 端點**：目前 [agent_service.py](agent_service.py) 啟動 worker 時會把 `GRAPHRAG_API_KEY` 寫成 `local-only`，設定 Compose 的 `MODEL_API_KEY` 或 `GRAPHRAG_API_KEY` 都不會改變這點。最快可讓 worker 繼續用受限內網上的原 Lemonade，只有 Agent 走有金鑰的端點。若兩者都要走有驗證的端點，需先修改 worker 啟動程式，讓它從環境讀取 `GRAPHRAG_API_KEY`，再透過部署平台注入；金鑰本身不應寫進 YAML 或 Python。更動 worker YAML 或 Python 後須重建映像。

### 4. 啟動與驗收

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 pharmacy
curl -fsS http://127.0.0.1:8502/ -o /dev/null
```

在容器裡檢查模型清單，才能驗證到 Agent 實際走的網路路徑：

```bash
docker compose exec -T pharmacy /opt/python314/bin/python3.14 - <<'PY'
import json, os, urllib.request
url = os.environ["MODEL_URL"].rstrip("/")
key = os.environ.get("MODEL_API_KEY", "local-only")
req = urllib.request.Request(url + "/models", headers={"Authorization": "Bearer " + key})
with urllib.request.urlopen(req, timeout=15) as res:
    print([m.get("id") for m in json.load(res).get("data", [])])
PY
```

預設網站只綁定伺服器的 `127.0.0.1:8502`。從操作電腦建立 SSH tunnel：

```bash
ssh -N -L 8502:127.0.0.1:8502 deploy@SERVER
```

開啟 `http://127.0.0.1:8502`，用合成資料驗收：

1. 登入測試環境，用對話查詢一筆測試病歷，確認有實際工具執行與結果。也用右側介面跑一次用藥檢查，核對有仿單引用。
2. 用 MedHop 研究模式提交一筆可命中資料的查詢，確認顯示「完整 GraphRAG 已執行」並返回來源。只有原文或「MedHop 圖譜路徑」表示檢索可用，尚未證明 worker 推理成功。
3. 用測試病歷驗證 `docker compose restart pharmacy` 後資料仍可讀取，再記錄部署 commit 與實際模型 ID。

### 5. 資料保存、更新與排錯

- 病歷等執行期資料位於容器的 `/app/runtime`，預設存在 `medlink-integrated_pharmacy-records` volume；`docker compose down -v` 會刪除該 volume。部署前應備份整個 runtime。若用 [compose.local-data.yaml](compose.local-data.yaml) 綁定主機目錄，需先備份並確認容器 UID 10001 可讀寫，切換儲存方式不會自動搬資料。
- 可在維護時段用 `docker compose stop pharmacy` 停止寫入，再用 `docker compose cp pharmacy:/app/runtime ./runtime-backup` 複製到新的受限目錄，完成後用 `docker compose start pharmacy` 恢復。備份含病歷時須使用受控存放位置。
- 更新前先備份 runtime、記錄上一版 commit 或保留映像。切到新版後執行 `docker compose up -d --build` 並重跑驗收。回退時用上一版程式與模型設定重建；若有資料格式變動，先確認相容性，再決定是否還原配對的備份。
- **網站能開但模型報錯**：先在容器內測 `/models`，確認 URL 前綴、連接埠、監聽位址和模型 ID；HTTP 401/403 檢查金鑰。模型存在但無工具結果，檢查模型和 API 是否支援 `tools`、`tool_choice`。
- **Agent 可對話但 GraphRAG 失敗**：查看研究查詢的錯誤與 `docker compose logs pharmacy`；核對 worker 模型 ID、驗證方式、索引檔及 embedding 相容性。若查詢逾時，先確認模型資源與單次請求耗時，worker 目前最長等待約 150 秒。
- **正式接入前**：保留內網或 SSH tunnel，使用合成資料完成驗收。多人使用時，以 HTTPS 和受控登入提供入口，先處理一鍵 Demo 與測試帳號，保持 `MEDHOP_DEV` 關閉；送到外部模型前須確認資料流向可接受。MedHop 研究結果仍須由藥師複核。


# 藥你安心：藥事安全Agent

整合藥事 Agent 仿單與 MedHop 研究資料，提供病歷管理、藥物資料檢索及用藥風險提醒。

## 主要功能

- 對話輸入病人資料、病史與用藥。
- 查詢或新增病歷，持續更新用藥紀錄。
- 檢索藥品成分、仿單與交互作用相關證據。
- 顯示禁忌與併用風險提醒、MedHop 研究路徑。
- 保存檢查結果、藥師處置與用藥說明。

## 啟動方式

先安裝並啟動 Docker Desktop，在專案資料夾開啟 Terminal：

首次啟動或更新程式：
    
    docker compose -f compose.yaml -f compose.local-data.yaml up --build -d

開啟網頁：

http://127.0.0.1:8502

停止服務：

    docker compose -f compose.yaml -f compose.local-data.yaml down


## 本機模型

預設連接主機上的模型服務：

- API：http://127.0.0.1:13305/api/v1
- 模型：`qwen3-it-4b-FLM`

Docker 內透過 `host.docker.internal` 連接主機。
需要更換模型時，修改 `compose.yaml` 的 `MODEL_URL` 與 `MODEL`。

未連接模型時，部分模型功能無法執行，仍可使用來源檢索與已建立的規則警示。

## 主要檔案

| 檔案／資料夾 | 用途 |
|---|---|
| `static/` | 網頁介面 |
| `asgi.py` | 後端 API |
| `workflow.py` | 病歷與用藥處理 |
| `pharmacy_rag.py` | 仿單 RAG 檢索 |
| `label_interactions.py` | 已核驗的併用警示 |
| `population_checks.py` | 病人條件與禁忌檢查 |
| `pair_integration.py` | 藥物配對與 MedHop 路徑整合 |
| `data/` | 藥品及研究資料 |
| `validation/` | 測試程式與驗證紀錄 |

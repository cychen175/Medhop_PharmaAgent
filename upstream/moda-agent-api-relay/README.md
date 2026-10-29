# moda-agent-api-relay

做為"AI 藥事 Agent"的 Web application 後端，moda-agent-api-relay 連接前端專案 moda-agent-frontend 及實際查詢仿單的 moda-agent 專案。

## 📁 目錄結構要求

在執行 Docker Compose 之前，請確保你的目錄結構符合以下配置。特別注意 `drug_info` 資料夾必須位於 `moda_agent` 的**上一層目錄**（即 `ai-agent` 底下）：
```text
📂 ai-agent/                     # 專案上層目錄（可自行命名）
 ├── 📂 drug_info/               # 存放藥品相關資料的地方 (對應 ../drug_info)
 └── 📂 moda_agent/              # 執行 docker compose 的所在位置 (Context)
      ├── 📄 docker-compose.yaml # 服務設定檔
      ├── 📂 moda-agent-api-relay/    # web app後端＋編譯環境與啟動腳本的目錄
      │    ├── 📄 Dockerfile     # 負責打包 Agent 的設定檔
      │    ├── 📄 entrypoint.sh  # 容器啟動腳本
      │    └── 📂 src/main/resources
      │        └──static #(建立一個靜態檔案放置的資料夾)
      └── 📂 moda-agent/       # Agent 專案目錄

```

## ⚙️ 環境變數與 Compose 設定（可不修改直接使用）

你可以直接透過 `docker-compose.yaml` 中的 `environment` 區塊來修改模型參數與網路設定。

### docker-compose.yaml 範例配置：

```yaml
services:
  afs-vrcare-agent:
    build:
      context: .
      dockerfile: moda-agent-api-relay/Dockerfile
    image: afs-vrcare-agent:v1.1.0
    container_name: afs-vrcare-agent
    ports:
      - "8080:8080"
    volumes:
        # 仿單路徑
      - ../drug_info:/app/moda_agent/data/drug_info 
    environment:
      # --- Agent 基礎設定 ---
      DRUG_PATH: /app/moda_agent/data/drug_info
      OCR_URL: http://host.docker.internal:5000/ocr?use_vlm=true
      HOST: localhost
      PORT: 8080
      # --- OCR 伺服器與 VLM 模型動態參數 ---
      OCR_BIND_HOST: 0.0.0.0
      OCR_BIND_PORT: 5000
      VLM_API_URL: http://model-gemma-3-4b-it:8000/v1
      VLM_API_KEY: sk-test
      VLM_MODEL_NAME: /model/gemma-3-4b-it
    networks:
      - agent-net
networks:
  agent-net:
    name: agent-net
    driver: bridge

```
### 📝 如何修改 OCR 服務與 VLM 模型設定

`entrypoint.sh` 的動態變數，未來當你需要切換 OCR 所搭配的語言模型（例如更換為其他版本的 Gemma），或是需要調整 API 對外連線的 IP 限制時，**不需要重新打包 (Rebuild) Docker Image**。

**修改步驟如下：**

1. 打開 `docker-compose.yaml`，找到 `environment` 區塊。
2. 直接修改對應的參數值：
* 若要換模型：修改 `VLM_MODEL_NAME` 與 `VLM_API_URL` 的路徑。
* 若要改密鑰：修改 `VLM_API_KEY`。
* 若要限制僅本機存取 OCR API：將 `OCR_BIND_HOST` 從 `0.0.0.0` 改為 `127.0.0.1`。

3. 存檔後，在終端機執行 `docker compose up -d`，Docker 即會自動套用新設定並重啟該服務。

### 📜 Entrypoint 腳本設定 (`moda-agent-api-relay/entrypoint.sh`)

為確保上述的環境變數能順利生效，請確認你的啟動腳本具備讀取變數的能力。內容應包含如下設計（使用 `${變數名稱:-預設值}` 語法）：

```bash
#!/bin/bash
set -e

source "${CONDA_DIR}/etc/profile.d/conda.sh"
conda activate ocr_env

echo "Starting OCR Server in ocr_env..."
export PYTHONPATH=$PYTHONPATH:/app/moda_agent

python3 /app/moda_agent/poc_easyocr/ocr_api_server.py \
    --host ${OCR_BIND_HOST:-0.0.0.0} \
    --port ${OCR_BIND_PORT:-5000} \
    --vlm-api-url ${VLM_API_URL:-http://model-gemma-3-4b-it:8000/v1} \
    --vlm-api-key ${VLM_API_KEY:-sk-test} \
    --vlm-model-name ${VLM_MODEL_NAME:-/model/gemma-3-4b-it} &
	
exec java -jar /app/app.jar

```
> **⚠️ 注意：** 只有當你修改了 `entrypoint.sh` 或 `Dockerfile` 的「檔案內容」時，才必須執行 `docker compose up -d --build` 強制重新打包。若只修改 `docker-compose.yaml` 則不需加 `--build`。


## 🚀 部署與操作指令

1. 將moda-agent-frontend編譯完成的靜態檔案，複製到(如圖)`moda-agent/api-relay/src/main/resources/static`
<img width="258" height="287" alt="image" src="https://github.com/user-attachments/assets/d917ee82-5ba7-438c-984a-eb009aca3d6d" />


2. 切換到`docker-compose.yaml` 所在的目錄下，執行以下指令：
```bash
#啟動服務並自動打包 (初次啟動或修改 Dockerfile/腳本 時使用)
docker compose up -d --build
```

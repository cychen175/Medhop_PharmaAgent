# moda_agent

## **💡 部署說明：**
> 請參閱 `moda-agent-api-relay`文件中的 **🚀 部署與操作指令**，使用 Docker Compose 啟動服務。

## 安裝
- 建立 python = 3.12.8 的虛擬環境
- 進入環境後，使用 ``` pip install --no-cache-dir -r requirements.txt ```

## 使用
### 醫師 Agent
- 情境：針對處方藥品，分析用藥安全性與建議
- 在虛擬環境下，使用 ``` python doctor_main.py ```

### 藥師 Agent
- 情境：針對處方藥品+替換藥品清單，分析用藥安全性與建議
- 在虛擬環境下，使用 ``` python pharmacist_main.py ```

## System Prompt 設置
- 欲調整 Agent System Prompt 請開啟 ```utils/prompts.py``` 並修改 ```get_prompt()```

## 藥品仿單
- 欲新增、刪除仿單，請在 ```data/drug_info``` 資料夾中做更動

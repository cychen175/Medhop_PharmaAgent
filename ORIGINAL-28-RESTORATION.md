# 原版 28 項藥事檢核還原查核

查核日期：2026-10-25。結論：目前公開來源不足以完整還原，尚未完成原版 28 項功能。

## 已完成查核

已重新讀取三個指定官方儲存庫，補齊完整 Git 歷史。後端 2 筆提交、前端 2 筆、轉接層 3 筆均已檢查。後端官方 API 顯示 1 個分支、0 個 tag、0 個 release、0 個 fork；`utils/prompts.py` 與 `utils/llm_client.py` 的路徑提交紀錄均為 0。

`pharmacist_main.py` 第 5、6 行引用上述兩個模組，第 32 行呼叫 `AgentSystemPrompt(role="pharmacist").get_prompt()`，但這些模組未出現在已查核的公開版本中。原 `agent.py` 僅建立 AutoGen AssistantAgent，無逐項檢核定義。三個公開專案的文字程式與文件也未提供可還原的 28 項逐項規範。

儲存庫 About 說明提及「28 項分析」，這不足以確認每個項目的名稱、判定準則與輸出契約。不能據此自行湊出 28 個常見藥事項目，並稱作還原原版。

## 要繼續還原所需材料

- 原作者完整原始碼套件，尤其 `utils/prompts.py` 與 `utils/llm_client.py`。
- 原版 28 項分析的逐項定義、判定依據、輸出格式與驗證案例；若完整原始碼已包含，提供該套件即可先核對。
- 若原版依賴額外知識庫或受限資源，需有對應資料與合法使用方式；不需要提供外部服務密鑰給查核報告。

取得材料後，應先驗證版本／雜湊與授權，對照原項目，再修復必要依賴、逐項驗證、接回本機工作流程，並維持原文來源、資料不足轉交藥師及交付前人工確認。程式可以執行，不等於 28 項均有臨床判斷依據。

## 本次變更界線

本次僅進行官方來源查核並保存證據，沒有新增未經原版定義的醫學規則，沒有把現有部分整合標記為 28 項已完成，沒有更動介面、病歷與現行風險提醒。現有 `original_28_checks` 維持 `false`。

## 可重核證據

- `validation/original-28-source-audit.json`：各儲存庫完整提交與樹狀檔案查核。
- `validation/official-github-metadata.json`：此次讀取的官方 GitHub 公開中繼資料。
- [官方藥師入口](https://github.com/adi-gov-tw/moda-agent/blob/463818a0f85010e435eecc879bb570b3c001dc26/pharmacist_main.py)
- [官方提示詞設定說明](https://github.com/adi-gov-tw/moda-agent/blob/463818a0f85010e435eecc879bb570b3c001dc26/README.md#system-prompt-設置)

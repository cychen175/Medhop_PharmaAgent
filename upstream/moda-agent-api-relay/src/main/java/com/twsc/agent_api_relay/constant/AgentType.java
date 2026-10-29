package com.twsc.agent_api_relay.constant;

import java.util.Arrays;

/**
 * 定義支援的 Agent 類型及其對應的 Python 腳本名稱。
 * 這種作法可以避免在程式碼中使用「魔法字串」(magic strings)。
 */
public enum AgentType {
    // 定義醫生 Agent，並關聯其 Python 腳本
    DOCTOR("doctor", "doctor_main.py"),

    // 定義藥師 Agent，並關聯其 Python 腳本
    PHARMACIST("pharmacist", "pharmacist_main.py");

    private final String typeName;
    private final String scriptName;

    AgentType(String typeName, String scriptName) {
        this.typeName = typeName;
        this.scriptName = scriptName;
    }

    /**
     * @return Agent 的 Python 腳本檔名 (例如 "doctor_main.py")
     */
    public String getScriptName() {
        return scriptName;
    }

    /**
     * @return Agent 的類型名稱 (例如 "doctor")
     */
    public String getTypeName() {
        return typeName;
    }

    /**
     * 一個靜態方法，可以安全地從一個字串轉換為 AgentType Enum。
     *
     * @param text 從 API 請求中傳入的字串 (例如 "doctor")
     * @return 對應的 AgentType Enum，如果找不到則返回 null。
     */
    public static AgentType fromString(String text) {
        return Arrays.stream(values())
                .filter(type -> type.typeName.equalsIgnoreCase(text))
                .findFirst()
                .orElse(null);
    }
}

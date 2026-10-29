package com.twsc.agent_api_relay.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

public class SseMessageUtil {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static String wrapData(Object obj) {
        try {
            return "data: " + mapper.writeValueAsString(obj) + "\n\n";
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize SSE data", e);
        }
    }

    public static String wrapError(String errorMsg) {
        return wrapData("[ERROR] " + errorMsg);
    }

    public static String wrapDone() {
        return "data: [DONE]\n\n";
    }
}

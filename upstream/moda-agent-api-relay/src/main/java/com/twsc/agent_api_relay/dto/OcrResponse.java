package com.twsc.agent_api_relay.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class OcrResponse {
    // Jackson 會自動把 JSON 的 true 轉為 Java boolean
    private boolean success;

    private String text;

    @JsonProperty("easyocr_text")
    private String easyocrText;

    @JsonProperty("vlm_text")
    private String vlmText;

    private String filename;
    private String error;

}

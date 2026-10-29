package com.twsc.agent_api_relay.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;

@Validated
@Data
@Configuration
@ConfigurationProperties(prefix = "agent")
public class AgentConfig {
//    @NotBlank(message = "Mode name 不可空白")
    private String model;
//    @NotBlank(message = "Base URL 不可空白")
    private String baseUrl;
//    @NotBlank(message = "Api key 不可空白")
    private String apikey;
    @NotBlank(message = "ocr URL 不可空白")
    private String ocrURL;
}

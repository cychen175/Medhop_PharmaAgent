package com.twsc.agent_api_relay.config;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@ConfigurationProperties(prefix = "vm")
@Slf4j
@Data
@Configuration
@Validated
public class WebConfig implements WebMvcConfigurer {

    private String host;
    private String port;
    private String drugPath;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String drugInfoPath = Paths.get(this.drugPath).toUri().toString();
        log.info("Static path : {}", drugInfoPath);
        log.debug("Static Resource Map: /docs/** -> {}", drugInfoPath);
        registry.addResourceHandler("/docs/**")
                .addResourceLocations(drugInfoPath);
    }
}
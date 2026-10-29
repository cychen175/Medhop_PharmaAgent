package com.twsc.agent_api_relay.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChangeModelReqDTO {

    @NotBlank
    private String model;

    @NotBlank
    private String baseUrl;

    @NotBlank
    private String apiKey;


}

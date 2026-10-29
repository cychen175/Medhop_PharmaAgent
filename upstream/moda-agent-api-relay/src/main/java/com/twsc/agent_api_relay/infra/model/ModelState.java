package com.twsc.agent_api_relay.infra.model;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
@ToString(callSuper = true)
public class ModelState {

    private String model;
    private String baseUrl;
    private String apiKey;
}

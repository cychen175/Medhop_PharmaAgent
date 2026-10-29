package com.twsc.agent_api_relay.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
public class PrescriptionOCRRespDTO {
    private boolean success;
    private String vlmText;
    private String text;
}

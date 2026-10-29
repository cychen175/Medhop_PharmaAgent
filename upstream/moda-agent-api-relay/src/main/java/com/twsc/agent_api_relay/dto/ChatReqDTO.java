package com.twsc.agent_api_relay.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChatReqDTO {
    @NotBlank
    String userInput;
    @NotBlank
    String userName;
    @NotBlank
    String agent;
}

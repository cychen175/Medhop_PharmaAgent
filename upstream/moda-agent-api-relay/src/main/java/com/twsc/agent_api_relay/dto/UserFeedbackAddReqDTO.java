package com.twsc.agent_api_relay.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UserFeedbackAddReqDTO {

    @NotBlank
    private String conversationId;

    @NotBlank
    private String name;

    @NotNull
    private int rating;

    @NotBlank
    private String suggestion;

}

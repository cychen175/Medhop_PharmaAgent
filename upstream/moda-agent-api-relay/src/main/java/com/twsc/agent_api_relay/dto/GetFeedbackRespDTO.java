package com.twsc.agent_api_relay.dto;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
public class GetFeedbackRespDTO {

    private String name;

    private int rating;

    private String suggestion;


}

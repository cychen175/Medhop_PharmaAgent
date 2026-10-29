package com.twsc.agent_api_relay.dto;


import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

@Data
@SuperBuilder
@NoArgsConstructor
public class AddConversationReqDTO {

    private String question;

    private String userName;

    private String agent;

}

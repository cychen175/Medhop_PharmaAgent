package com.twsc.agent_api_relay.service;

import com.twsc.agent_api_relay.dto.AddConversationReqDTO;
import com.twsc.agent_api_relay.dto.ConversationHistoriesRespDTO;
import com.twsc.agent_api_relay.entity.Conversation;
import com.twsc.agent_api_relay.repository.ConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConversationService {

    private final ConversationRepository conversationRepository;

    public String addConversation(AddConversationReqDTO addConversationReqDTO) {
        log.debug("addConversationReqDTO:{}", addConversationReqDTO);
        Conversation conversation = Conversation.builder()
                .agent(addConversationReqDTO.getAgent())
                .question(addConversationReqDTO.getQuestion())
                .userId(addConversationReqDTO.getUserName())
                .build();
        Conversation saved = conversationRepository.save(conversation);
        log.debug("created conversation successful");
        return saved.getId();
    }

    public void updateConversation(String id, String content) {
        log.info("Updated conversation with id {}", id);
        conversationRepository.findById(id).ifPresent(conversation -> {
            conversation.setContent(content);
            conversationRepository.save(conversation);
        });
        log.info("conversation updated successful");
    }

    public List<ConversationHistoriesRespDTO> getConversationHistories(String userName) {
        log.info("getConversationHistories by userName {}", userName);
        List<Conversation> conversations = conversationRepository.findByUserIdOrderByCreatedDttmDesc(userName);
        List<ConversationHistoriesRespDTO> result = new ArrayList<>();
        conversations.stream().forEach(c -> {
                    ConversationHistoriesRespDTO conversation = ConversationHistoriesRespDTO.builder()
                            .id(c.getId())
                            .agent(c.getAgent())
                            .question(c.getQuestion())
                            .userName(c.getUserId())
                            .content(c.getContent())
                            .build();
                    result.add(conversation);
                }
        );
        log.info("conversations list successful : {}", result);
        return result;
    }
}

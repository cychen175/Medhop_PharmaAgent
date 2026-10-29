package com.twsc.agent_api_relay.service;

import com.twsc.agent_api_relay.dto.GetFeedbackRespDTO;
import com.twsc.agent_api_relay.dto.UserFeedbackAddReqDTO;
import com.twsc.agent_api_relay.entity.Feedback;
import com.twsc.agent_api_relay.repository.FeedbackRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserFeedbackService {


    private final FeedbackRepository feedbackRepository;

    public void addFeedback(UserFeedbackAddReqDTO userFeedbackAddReqDTO) {
        Feedback feedback = Feedback.builder()
                .conversationId(userFeedbackAddReqDTO.getConversationId())
                .name(userFeedbackAddReqDTO.getName())
                .rating(userFeedbackAddReqDTO.getRating())
                .suggestion(userFeedbackAddReqDTO.getSuggestion())
                .build();
        feedbackRepository.save(feedback);
        log.info("Feedback added successfully");
    }

    public List<GetFeedbackRespDTO> getUserFeedbackAddReqDTO() {
        List<GetFeedbackRespDTO> respDTOList = new ArrayList<>();
        feedbackRepository.findAll().forEach(feedback -> {
            GetFeedbackRespDTO resp = GetFeedbackRespDTO.builder()
                    .name(feedback.getName())
                    .rating(feedback.getRating())
                    .suggestion(feedback.getSuggestion()).build();
            respDTOList.add(resp);
        });
        return respDTOList;
    }
}

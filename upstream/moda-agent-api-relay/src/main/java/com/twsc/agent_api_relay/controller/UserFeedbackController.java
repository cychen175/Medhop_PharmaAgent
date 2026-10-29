package com.twsc.agent_api_relay.controller;

import com.twsc.agent_api_relay.dto.UserFeedbackAddReqDTO;
import com.twsc.agent_api_relay.service.UserFeedbackService;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
@RequiredArgsConstructor
@RequestMapping("/v1/feedback")
public class UserFeedbackController {

    private final UserFeedbackService userFeedbackService;

    @PostMapping
    public ResponseEntity<?> userFeedbackAdd(@RequestBody UserFeedbackAddReqDTO userFeedbackAddReqDTO) {
        log.info("Add user Feedback : {}", userFeedbackAddReqDTO);
        userFeedbackService.addFeedback(userFeedbackAddReqDTO);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<?> getAllFeedback() {
        return ResponseEntity.ok().body(userFeedbackService.getUserFeedbackAddReqDTO());
    }
}

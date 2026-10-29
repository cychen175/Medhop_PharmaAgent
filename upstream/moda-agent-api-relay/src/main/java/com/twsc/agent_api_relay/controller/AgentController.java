package com.twsc.agent_api_relay.controller;

import com.twsc.agent_api_relay.dto.ChangeModelReqDTO;
import com.twsc.agent_api_relay.dto.ChatReqDTO;
import com.twsc.agent_api_relay.service.AgentProcessManager;
import com.twsc.agent_api_relay.service.AgentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@Slf4j
@CrossOrigin(origins = "*", allowedHeaders = "*")
@RestController
public class AgentController {

    @Autowired
    private AgentProcessManager processManager;

    @Autowired
    private AgentService agentService;

    @PostMapping("/chat")
    public ResponseEntity<StreamingResponseBody> chatWithAgent(@RequestBody ChatReqDTO userInput) {
        try {
            log.info("Post API : /chat START - request content: {}", userInput);
            return ResponseEntity.ok().contentType(MediaType.TEXT_EVENT_STREAM).body(processManager.chatWithAgent(userInput));
        } catch (InterruptedException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(outputStream -> outputStream.write("Error: Could not start the Python agent.".getBytes()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(outputStream -> outputStream.write(e.getMessage().getBytes()));
        }
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistories(@RequestParam String username) {
        log.info("Get API : /history START - user : {}", username);
        return ResponseEntity.ok().body(processManager.getConversationHistories(username));
    }

    @PostMapping("/agent/changeModel")
    public ResponseEntity<?> changeModel(@RequestBody ChangeModelReqDTO modelInfo) {
        try {
            log.info("POST API : /agent/changeModel - START , model info : {}", modelInfo);
            agentService.createModel(modelInfo);
            return ResponseEntity.status(HttpStatus.CREATED).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/agent/getModel")
    public ResponseEntity<?> getAgentUsageModel() {
        log.info("Get API : /agent START - user : {}");
        return ResponseEntity.status(HttpStatus.OK).body(agentService.getAgentUsageModel());
    }

    @GetMapping("/health")
    public ResponseEntity<?> checkServiceStatus() {
        log.info("GET API : /health START - Checking Service Status : true");
        return ResponseEntity.status(HttpStatus.OK).body(true);
    }
}

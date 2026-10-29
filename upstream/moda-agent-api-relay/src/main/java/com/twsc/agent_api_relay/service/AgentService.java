package com.twsc.agent_api_relay.service;

import com.twsc.agent_api_relay.Exception.ApiRelayException;
import com.twsc.agent_api_relay.config.AgentConfig;
import com.twsc.agent_api_relay.dto.ChangeModelReqDTO;
import com.twsc.agent_api_relay.dto.GetAgentUsageModelRespDTO;
import com.twsc.agent_api_relay.entity.ModelInfo;
import com.twsc.agent_api_relay.infra.model.ModelState;
import com.twsc.agent_api_relay.infra.state.ModelStateHolder;
import com.twsc.agent_api_relay.repository.ModelRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PostMapping;

import java.sql.SQLException;
import java.sql.Timestamp;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgentService {

    private final ModelRepository modelRepository;
    private final ModelStateHolder modelStateHolder;
    @Autowired
    private AgentConfig agentConfig;

    @PostConstruct
    private void init() throws Exception {
        ModelInfo modelInfo = modelRepository.findTopByOrderByUpdatedDttmDesc();
        String apikey = "";
        String baseUrl = "";
        String model = "";
        if (modelInfo != null) {
            model = modelInfo.getModel();
            baseUrl = modelInfo.getBaseUrl();
            apikey = modelInfo.getApiKey();
        }
        updateModelState(model, baseUrl, apikey);
    }

    public void createModel(ChangeModelReqDTO newModelInfo) throws Exception {
        String apikey = newModelInfo.getApiKey();
        String baseUrl = newModelInfo.getBaseUrl();
        String model = newModelInfo.getModel();
        try {

            Timestamp currentTimestamp = new Timestamp(System.currentTimeMillis());
            ModelInfo modelEntity = modelRepository.findByModelAndBaseUrlAndApiKey(model, baseUrl, apikey);
            if (modelEntity == null) {
                ModelInfo newModelEntity = ModelInfo.builder()
                        .model(model)
                        .apiKey(apikey)
                        .baseUrl(baseUrl)
                        .updatedDttm(currentTimestamp).build();
                modelRepository.save(newModelEntity);
            } else {
                modelEntity.setUpdatedDttm(currentTimestamp);
                modelRepository.save(modelEntity);
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            updateModelState(model, baseUrl, apikey);
        }
    }

    private void updateModelState(String model, String baseUrl, String apikey) throws ApiRelayException, Exception {
        ModelState modelState = ModelState.builder()
                .model(model)
                .apiKey(apikey)
                .baseUrl(baseUrl).build();
        modelStateHolder.setModelState(modelState);
    }

    public GetAgentUsageModelRespDTO getAgentUsageModel() {
        ModelState modelState = modelStateHolder.getModelState();
        return GetAgentUsageModelRespDTO.builder()
                .modelName(modelState.getModel()).build();
    }

}

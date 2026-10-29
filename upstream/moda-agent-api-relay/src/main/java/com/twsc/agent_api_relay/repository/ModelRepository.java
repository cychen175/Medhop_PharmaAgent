package com.twsc.agent_api_relay.repository;

import com.twsc.agent_api_relay.entity.ModelInfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModelRepository extends JpaRepository<ModelInfo, Integer> {

    ModelInfo findTopByOrderByUpdatedDttmDesc();

    ModelInfo findByModelAndBaseUrlAndApiKey(String model, String baseUrl, String apiKey);
}

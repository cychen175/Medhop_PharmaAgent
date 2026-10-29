package com.twsc.agent_api_relay.repository;

import com.twsc.agent_api_relay.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConversationRepository extends JpaRepository<Conversation, String> {
    List<Conversation> findByUserIdOrderByCreatedDttmDesc(String userId);
}

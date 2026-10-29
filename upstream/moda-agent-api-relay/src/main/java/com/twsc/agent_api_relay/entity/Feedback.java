package com.twsc.agent_api_relay.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;
import java.time.LocalDateTime;


@Entity
@SuperBuilder
@NoArgsConstructor
@Data
public class Feedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String conversationId;

    private String name;

    private int rating;

    @Column(name = "text", columnDefinition = "TEXT")
    private String suggestion;

    @CreationTimestamp
    @Column(name = "created_dttm", nullable = false, updatable = false)
    private LocalDateTime createdDttm;
}

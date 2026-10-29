package com.twsc.agent_api_relay.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.time.LocalDateTime;

@Entity
@Table(
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"model", "baseUrl", "apiKey"})
        }
)
@SuperBuilder
@NoArgsConstructor
@Getter
@Setter
@ToString
public class ModelInfo {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String model;

    private String baseUrl;

    private String apiKey;

    @CreationTimestamp
    @Column(name = "created_dttm", nullable = false)
    private Timestamp createdDttm;

    @CreationTimestamp
    @Column(name = "updated_dttm", nullable = false)
    private Timestamp updatedDttm;
}

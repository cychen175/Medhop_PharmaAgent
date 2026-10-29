package com.twsc.agent_api_relay.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;
import java.util.List;

@Entity
@SuperBuilder
@NoArgsConstructor
@Table(
        name = "conversation"
)
@Data
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(columnDefinition = "TEXT", name = "question")
    private String question;

    @Column(columnDefinition = "TEXT", name = "content")
    private String content;

    @Column(name = "agent", nullable = false)
    private String agent;

    @Column(name = "created_dttm", nullable = false)
    @CreationTimestamp
    private Timestamp createdDttm;

    @Column(name = "last_modify_dttm")
    @UpdateTimestamp
    private Timestamp lastModifyDttm;


    public void setCreatedDttm(Long createdDttm) {
        if (null == createdDttm) {
            this.createdDttm = null;
        } else {
            this.createdDttm = new Timestamp(createdDttm);
        }
    }

    public Long getCreatedDttm() {
        return createdDttm == null ? null : createdDttm.getTime();
    }
}

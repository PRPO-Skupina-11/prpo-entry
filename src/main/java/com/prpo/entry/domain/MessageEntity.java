package com.prpo.entry.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "messages",
    schema = "entry",
    indexes = {
      @Index(name = "idx_messages_chat_created_at", columnList = "chat_id, created_at")
    }
)

public class MessageEntity {

  public enum Role {
    user,
    assistant,
    system
  }

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private String id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "chat_id", nullable = false)
  private ChatEntity chat;

  @Enumerated(EnumType.STRING)
  @Column(name = "role", nullable = false)
  private Role role;

  @Column(name = "content", nullable = false, columnDefinition = "text")
  private String content;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(name = "provider_id")
  private String providerId;

  @Column(name = "model_id")
  private String modelId;

  @Column(name = "request_id")
  private String requestId;

  @PrePersist
  void prePersist() {
    if (id == null) id = "msg_" + UUID.randomUUID();
    if (createdAt == null) createdAt = OffsetDateTime.now();
  }

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public ChatEntity getChat() {
    return chat;
  }

  public void setChat(ChatEntity chat) {
    this.chat = chat;
  }

  public Role getRole() {
    return role;
  }

  public void setRole(Role role) {
    this.role = role;
  }

  public String getContent() {
    return content;
  }

  public void setContent(String content) {
    this.content = content;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public String getProviderId() {
    return providerId;
  }

  public void setProviderId(String providerId) {
    this.providerId = providerId;
  }

  public String getModelId() {
    return modelId;
  }

  public void setModelId(String modelId) {
    this.modelId = modelId;
  }

  public String getRequestId() {
    return requestId;
  }

  public void setRequestId(String requestId) {
    this.requestId = requestId;
  }
}

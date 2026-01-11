package com.prpo.entry.logic;

import com.prpo.entry.domain.ChatEntity;
import com.prpo.entry.domain.MessageEntity;
import com.prpo.entry.helpers.RouterClient;
import com.prpo.entry.model.ChatDetail;
import com.prpo.entry.model.ChatSummary;
import com.prpo.entry.model.CreateChatRequest;
import com.prpo.entry.model.CreateChatResponse;
import com.prpo.entry.model.ListChatsResponse;
import com.prpo.entry.model.Message;
import com.prpo.entry.model.MessageRole;
import com.prpo.entry.model.SendMessageRequest;
import com.prpo.entry.model.SendMessageResponse;
import com.prpo.entry.model.SendMessageResponseRouting;
import com.prpo.entry.repository.ChatRepository;
import com.prpo.entry.repository.MessageRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

  private final ChatRepository chatRepository;
  private final MessageRepository messageRepository;
  private final RouterClient routerClient;

  public ChatService(ChatRepository chatRepository, MessageRepository messageRepository, RouterClient routerClient) {
    this.chatRepository = chatRepository;
    this.messageRepository = messageRepository;
    this.routerClient = routerClient;
  }

  @Transactional
  public CreateChatResponse createChat(String userId, CreateChatRequest req) {
    ChatEntity chat = new ChatEntity();
    chat.setUserId(userId);
    chat.setTitle(req != null ? req.getTitle() : null);

    ChatEntity saved = chatRepository.save(chat);

    return new CreateChatResponse()
        .id(saved.getId())
        .title(saved.getTitle())
        .createdAt(saved.getCreatedAt());
  }

  @Transactional
  public ChatDetail getChat(String userId, String chatId) {
    ChatEntity chat = requireChat(userId, chatId);

    List<MessageEntity> entities = messageRepository.findByChatIdOrderByCreatedAtAsc(chat.getId());
    List<Message> msgs = new ArrayList<>(entities.size());
    for (MessageEntity e : entities) msgs.add(toApiMessage(e));

    return new ChatDetail()
        .id(chat.getId())
        .title(chat.getTitle())
        .messages(msgs);
  }
  
  @Transactional
  public void deleteChat(String userId, String chatId) {
    ChatEntity chat = requireChat(userId, chatId);
    messageRepository.deleteByChatId(chat.getId());
    chatRepository.delete(chat);
  }

  @Transactional
  public ListChatsResponse listChats(String userId, Integer limit, String cursor) {
    int lim = (limit == null || limit < 1) ? 50 : Math.min(limit, 200);
    int limitPlusOne = lim + 1;

    List<ChatEntity> rows;
    if (cursor == null || cursor.isBlank()) {
      rows = chatRepository.pageFirst(userId, limitPlusOne);
    } else {
      CursorParts parts = decodeCursor(cursor);
      rows = chatRepository.pageAfter(userId, parts.updatedAt, parts.id, limitPlusOne);
    }

    boolean hasMore = rows.size() > lim;
    if (hasMore) rows = rows.subList(0, lim);

    List<ChatSummary> items = new ArrayList<>(rows.size());
    for (ChatEntity c : rows) {
      items.add(new ChatSummary()
          .id(c.getId())
          .title(Optional.ofNullable(c.getTitle()).orElse("New chat"))
          .createdAt(c.getCreatedAt())
          .updatedAt(c.getUpdatedAt())
          .lastProviderId(c.getLastProviderId())
          .lastModelId(c.getLastModelId())
      );
    }

    String nextCursor = null;
    if (hasMore && !rows.isEmpty()) {
      ChatEntity last = rows.get(rows.size() - 1);
      nextCursor = encodeCursor(last.getUpdatedAt(), last.getId());
    }

    return new ListChatsResponse()
        .items(items)
        .total(null)
        .nextCursor(nextCursor);
  }

  private record CursorParts(OffsetDateTime updatedAt, String id) {}

  private String encodeCursor(OffsetDateTime updatedAt, String id) {
    long ms = updatedAt.toInstant().toEpochMilli();
    return ms + ":" + id;
  }

  private CursorParts decodeCursor(String cursor) {
    int idx = cursor.lastIndexOf(':');
    if (idx <= 0 || idx == cursor.length() - 1) {
      throw new IllegalArgumentException("invalid cursor");
    }

    long ms = Long.parseLong(cursor.substring(0, idx));
    String id = cursor.substring(idx + 1);

    return new CursorParts(
        OffsetDateTime.ofInstant(java.time.Instant.ofEpochMilli(ms), java.time.ZoneOffset.UTC),
        id
    );
  }

  @Transactional
  public SendMessageResponse sendMessage(String userId, String chatId, SendMessageRequest req) {
    ChatEntity chat = requireChat(userId, chatId);

    String content = req.getContent();
    if (content == null || content.isBlank()) {
      throw new IllegalArgumentException("content is required");
    }

    MessageEntity userMsg = new MessageEntity();
    userMsg.setChat(chat);
    userMsg.setRole(MessageEntity.Role.user);
    userMsg.setContent(content);
    userMsg = messageRepository.save(userMsg);

    List<MessageEntity> historyEntities = messageRepository.findByChatIdOrderByCreatedAtAsc(chat.getId());
    List<RouterClient.ContextMessage> context = new ArrayList<>();
    for (MessageEntity m : historyEntities) {
      context.add(new RouterClient.ContextMessage(m.getRole().name(), m.getContent()));
    }

    String requestId = "req_" + UUID.randomUUID();

    RouterClient.RouteResult routed = routerClient.route(
        requestId,
        userId,
        chat.getId(),
        content,
        context,
        req.getModelOverrides() != null ? req.getModelOverrides().getForceProviderId() : null,
        req.getModelOverrides() != null ? req.getModelOverrides().getForceModelId() : null
    );

    MessageEntity assistantMsg = new MessageEntity();
    assistantMsg.setChat(chat);
    assistantMsg.setRole(MessageEntity.Role.assistant);
    assistantMsg.setContent(routed.assistantContent());
    assistantMsg.setProviderId(routed.providerId());
    assistantMsg.setModelId(routed.modelId());
    assistantMsg.setRequestId(requestId);
    assistantMsg = messageRepository.save(assistantMsg);

    if (isDefaultTitle(chat)) {
      String titlePrompt =
          "Generate a short chat title (max 6 words). " +
          "Output ONLY the title. No quotes. No trailing punctuation.";

      List<RouterClient.ContextMessage> titleContext = new ArrayList<>();
      titleContext.add(new RouterClient.ContextMessage("user", content));
      titleContext.add(new RouterClient.ContextMessage("assistant", routed.assistantContent()));

      String titleRequestId = "req_" + UUID.randomUUID();

      RouterClient.RouteResult titleRouted = routerClient.route(
          titleRequestId,
          userId,
          chat.getId(),
          titlePrompt,
          titleContext,
          null,
          null
      );

      String newTitle = sanitizeTitle(titleRouted.assistantContent());
      if (newTitle != null) {
        chat.setTitle(newTitle);
      }
    }

    chat.setLastProviderId(routed.providerId());
    chat.setLastModelId(routed.modelId());
    chat.setUpdatedAt(OffsetDateTime.now());
    chatRepository.save(chat);

    SendMessageResponseRouting routing = new SendMessageResponseRouting()
        .requestId(requestId)
        .providerId(routed.providerId())
        .modelId(routed.modelId())
        .latencyMs(routed.latencyMs())
        .promptTokens(routed.promptTokens())
        .completionTokens(routed.completionTokens())
        .totalTokens(routed.totalTokens())
        .cost(routed.cost())
        .currency(routed.currency());

    return new SendMessageResponse()
        .conversationId(chat.getId())
        .userMessage(toApiMessage(userMsg))
        .assistantMessage(toApiMessage(assistantMsg))
        .routing(routing);
  }

  private ChatEntity requireChat(String userId, String chatId) {
    return chatRepository.findByIdAndUserId(chatId, userId)
        .orElseThrow(() -> new IllegalArgumentException("chat not found"));
  }

  private Message toApiMessage(MessageEntity e) {
    MessageRole role = switch (e.getRole()) {
      case user -> MessageRole.USER;
      case assistant -> MessageRole.ASSISTANT;
      case system -> MessageRole.SYSTEM;
    };

    return new Message()
        .id(e.getId())
        .role(role)
        .content(e.getContent())
        .createdAt(e.getCreatedAt())
        .providerId(e.getProviderId())
        .modelId(e.getModelId())
        .requestId(e.getRequestId());
  }

  private boolean isDefaultTitle(ChatEntity chat) {
    String t = chat.getTitle();
    if (t == null) return true;
    t = t.trim();
    return t.isEmpty() || t.equalsIgnoreCase("New chat");
  }

  private String sanitizeTitle(String s) {
    if (s == null) return null;
    String t = s.trim();
    if (t.startsWith("\"") && t.endsWith("\"") && t.length() >= 2) {
      t = t.substring(1, t.length() - 1).trim();
    }
    t = t.replaceAll("\\s+", " ");
    while (!t.isEmpty()) {
      char c = t.charAt(t.length() - 1);
      if (c == '.' || c == '!' || c == '?' || c == ':' || c == ';') {
        t = t.substring(0, t.length() - 1).trim();
      } else {
        break;
      }
    }
    if (t.length() > 60) t = t.substring(0, 60).trim();
    return t.isBlank() ? null : t;
  }
}

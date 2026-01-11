package com.prpo.entry.controller;

import com.prpo.entry.api.ChatsApi;
import com.prpo.entry.helpers.Auth0UserResolver;
import com.prpo.entry.logic.ChatService;
import com.prpo.entry.logic.UserService;
import com.prpo.entry.model.ChatDetail;
import com.prpo.entry.model.CreateChatRequest;
import com.prpo.entry.model.CreateChatResponse;
import com.prpo.entry.model.ListChatsResponse;
import com.prpo.entry.model.SendMessageRequest;
import com.prpo.entry.model.SendMessageResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatsController implements ChatsApi {

  private final ChatService chatService;
  private final UserService userService;
  private final Auth0UserResolver userResolver;

  public ChatsController(
      ChatService chatService,
      UserService userService,
      Auth0UserResolver userResolver
  ) {
    this.chatService = chatService;
    this.userService = userService;
    this.userResolver = userResolver;
  }

  @Override
  public ResponseEntity<ListChatsResponse> listChats(Integer limit, String cursor) {
    String userId = userResolver.currentUserId();
    return ResponseEntity.ok(chatService.listChats(userId, limit, cursor));
  }

  @Override
  public ResponseEntity<CreateChatResponse> createChat(CreateChatRequest req) {
    String userId = userResolver.currentUserId();

    userService.ensureUserExists(
        userId,
        userResolver.currentEmail(),
        userResolver.currentDisplayName()
    );

    return ResponseEntity
        .status(201)
        .body(chatService.createChat(userId, req));
  }

  @Override
  public ResponseEntity<ChatDetail> getChat(String id) {
    String userId = userResolver.currentUserId();
    return ResponseEntity.ok(chatService.getChat(userId, id));
  }

  @Override
  public ResponseEntity<SendMessageResponse> sendMessage(String id, SendMessageRequest sendMessageRequest) {
    String userId = userResolver.currentUserId();

    userService.ensureUserExists(
        userId,
        userResolver.currentEmail(),
        userResolver.currentDisplayName()
    );

    return ResponseEntity.ok(chatService.sendMessage(userId, id, sendMessageRequest));
  }

  @Override
  public ResponseEntity<Void> deleteChat(String id) {
    String userId = userResolver.currentUserId();
    chatService.deleteChat(userId, id);
    return ResponseEntity.noContent().build();
  }
}

package com.prpo.entry.controller;

import com.prpo.entry.api.ChatsApi;
import com.prpo.entry.logic.ChatService;
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

  private static final String DEV_USER_ID = "dev-user";

  private final ChatService chatService;

  public ChatsController(ChatService chatService) {
    this.chatService = chatService;
  }

  @Override
  public ResponseEntity<ListChatsResponse> listChats(Integer limit, String cursor) {
    return ResponseEntity.ok(chatService.listChats(DEV_USER_ID, limit, cursor));
  }

  @Override
  public ResponseEntity<CreateChatResponse> createChat(CreateChatRequest createChatRequest) {
    return ResponseEntity.status(201).body(chatService.createChat(DEV_USER_ID, createChatRequest));
  }

  @Override
  public ResponseEntity<ChatDetail> getChat(String id) {
    return ResponseEntity.ok(chatService.getChat(DEV_USER_ID, id));
  }

  @Override
  public ResponseEntity<SendMessageResponse> sendMessage(String id, SendMessageRequest sendMessageRequest) {
    return ResponseEntity.ok(chatService.sendMessage(DEV_USER_ID, id, sendMessageRequest));
  }

  @Override
  public ResponseEntity<Void> deleteChat(String id) {
    chatService.deleteChat(DEV_USER_ID, id);
    return ResponseEntity.noContent().build();
  }
}

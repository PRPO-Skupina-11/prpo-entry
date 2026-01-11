package com.prpo.entry.controller;

import com.prpo.entry.api.UserApi;
import com.prpo.entry.helpers.Auth0UserResolver;
import com.prpo.entry.model.User;
import java.time.OffsetDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController implements UserApi {

  private final Auth0UserResolver userResolver;

  public UserController(Auth0UserResolver userResolver) {
    this.userResolver = userResolver;
  }

  @Override
  public ResponseEntity<User> getCurrentUser() {
    User user = new User()
        .id(userResolver.currentUserId())
        .email(userResolver.currentEmail())
        .displayName(userResolver.currentDisplayName())
        .createdAt(OffsetDateTime.now());

    return ResponseEntity.ok(user);
  }
}

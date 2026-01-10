package com.prpo.entry.controller;

import com.prpo.entry.api.UserApi;
import com.prpo.entry.model.User;
import java.time.OffsetDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UserController implements UserApi {

  @Override
  public ResponseEntity<User> getCurrentUser() {
    User user = new User()
        .id("dev-user")
        .email("dev@local")
        .displayName("Dev")
        .createdAt(OffsetDateTime.now());

    return ResponseEntity.ok(user);
  }
}

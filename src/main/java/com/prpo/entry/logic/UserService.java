package com.prpo.entry.logic;

import com.prpo.entry.domain.UserEntity;
import com.prpo.entry.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.time.OffsetDateTime;
import org.springframework.stereotype.Service;

@Service
public class UserService {

  private final UserRepository userRepository;

  public UserService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  @Transactional
  public void ensureUserExists(String userId, String email, String displayName) {
    if (userRepository.existsById(userId)) {
      return;
    }

    UserEntity user = new UserEntity();
    user.setId(userId);
    user.setEmail(email);
    user.setDisplayName(displayName);
    user.setCreatedAt(OffsetDateTime.now());

    userRepository.save(user);
  }
}

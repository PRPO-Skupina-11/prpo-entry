package com.prpo.entry.repository;

import com.prpo.entry.domain.ChatEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatRepository extends JpaRepository<ChatEntity, String> {

  Optional<ChatEntity> findByIdAndUserId(String id, String userId);

  List<ChatEntity> findByUserIdOrderByUpdatedAtDesc(String userId);
}

package com.prpo.entry.repository;

import com.prpo.entry.domain.MessageEntity;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MessageRepository extends JpaRepository<MessageEntity, String> {

  List<MessageEntity> findByChatIdOrderByCreatedAtAsc(String chatId);
}

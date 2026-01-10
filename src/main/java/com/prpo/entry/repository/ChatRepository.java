package com.prpo.entry.repository;

import com.prpo.entry.domain.ChatEntity;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChatRepository extends JpaRepository<ChatEntity, String> {

  Optional<ChatEntity> findByIdAndUserId(String id, String userId);
  List<ChatEntity> findByUserIdOrderByUpdatedAtDesc(String userId);
  
  @Query(
      value = """
          SELECT *
          FROM entry.chats
          WHERE user_id = :userId
          ORDER BY updated_at DESC, id DESC
          LIMIT :limitPlusOne
          """,
      nativeQuery = true
  )
  List<ChatEntity> pageFirst(
      @Param("userId") String userId,
      @Param("limitPlusOne") int limitPlusOne
  );

  @Query(
      value = """
          SELECT *
          FROM entry.chats
          WHERE user_id = :userId
            AND (updated_at, id) < (:cursorUpdatedAt, :cursorId)
          ORDER BY updated_at DESC, id DESC
          LIMIT :limitPlusOne
          """,
      nativeQuery = true
  )
  List<ChatEntity> pageAfter(
      @Param("userId") String userId,
      @Param("cursorUpdatedAt") OffsetDateTime cursorUpdatedAt,
      @Param("cursorId") String cursorId,
      @Param("limitPlusOne") int limitPlusOne
  );
}

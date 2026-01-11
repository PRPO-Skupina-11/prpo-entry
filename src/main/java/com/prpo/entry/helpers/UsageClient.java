package com.prpo.entry.helpers;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

@Component
public class UsageClient {

  public record RecordEventResult(
      boolean accepted,
      String eventId,
      Boolean deduplicated
  ) {}

  public record UsageEventSummaryItem(
      String eventId,
      String userId,
      String providerId,
      String modelId,
      Integer tokens,
      Double cost,
      Integer latencyMs,
      OffsetDateTime timestamp
  ) {}

  public record ListEventsResponse(
      List<UsageEventSummaryItem> items,
      Integer total,
      String nextCursor
  ) {}

  public record UsageEvent(
      String eventId,
      String requestId,
      String userId,
      String conversationId,
      String providerId,
      String modelId,
      Integer promptTokens,
      Integer completionTokens,
      Integer totalTokens,
      Double cost,
      String currency,
      Integer latencyMs,
      OffsetDateTime timestamp
  ) {}

  private record RecordEventResponse(
      Boolean accepted,
      String eventId,
      Boolean deduplicated
  ) {}

  private final WebClient client;
  private final String internalServiceToken;

  public UsageClient(
      WebClient.Builder webClientBuilder,
      @Value("${USAGE_BASE_URL}") String usageBaseUrl,
      @Value("${INTERNAL_SERVICE_TOKEN}") String internalServiceToken
  ) {
    this.client = webClientBuilder
        .baseUrl(usageBaseUrl)
        .build();
    this.internalServiceToken = internalServiceToken;
  }

  public RecordEventResult recordEvent(UsageEvent event) {
    RecordEventResponse resp = client
        .post()
        .uri("/internal/usage/events")
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + internalServiceToken)
        .bodyValue(event)
        .retrieve()
        .bodyToMono(RecordEventResponse.class)
        .block();

    if (resp == null) {
      throw new IllegalStateException("Usage returned empty response");
    }

    boolean accepted = resp.accepted() != null ? resp.accepted() : true;

    return new RecordEventResult(
        accepted,
        resp.eventId(),
        resp.deduplicated()
    );
  }

  public ListEventsResponse listEvents(OffsetDateTime from, OffsetDateTime to, Integer limit) {
    Integer safeLimit = (limit == null) ? null : Math.min(limit, 500);

    Mono<ListEventsResponse> mono = client
        .get()
        .uri(uriBuilder -> {
          var b = uriBuilder.path("/internal/usage/events");
          if (from != null) b.queryParam("from", from);
          if (to != null) b.queryParam("to", to);
          if (safeLimit != null) b.queryParam("limit", safeLimit);
          return b.build();
        })
        .accept(MediaType.APPLICATION_JSON)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + internalServiceToken)
        .retrieve()
        .bodyToMono(ListEventsResponse.class);

    ListEventsResponse resp = mono.block();
    if (resp == null) {
      return new ListEventsResponse(List.of(), null, null);
    }
    if (resp.items() == null) {
      return new ListEventsResponse(List.of(), resp.total(), resp.nextCursor());
    }
    return resp;
  }
}

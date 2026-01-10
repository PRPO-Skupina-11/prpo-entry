package com.prpo.entry.helpers;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RouterClient {

  public record ContextMessage(String role, String content) {}

  public record RouteResult(
      String assistantContent,
      String providerId,
      String modelId,
      Integer latencyMs,
      Integer promptTokens,
      Integer completionTokens,
      Integer totalTokens,
      Double cost,
      String currency
  ) {}

  private record ModelOverrides(String forceProviderId, String forceModelId) {}

  private record RouteRequest(
      String requestId,
      String userId,
      String conversationId,
      String message,
      List<ContextMessage> context,
      ModelOverrides modelOverrides
  ) {}

  private record Usage(Integer promptTokens, Integer completionTokens, Integer totalTokens) {}

  private record RouteResponse(
      String requestId,
      String providerId,
      String modelId,
      String assistantContent,
      Integer latencyMs,
      Usage usage,
      Double estimatedCost,
      String currency
  ) {}

  private final RestClient client;
  private final String internalServiceToken;

  public RouterClient(
      RestClient.Builder restClientBuilder,
      @Value("${ROUTER_BASE_URL}") String routerBaseUrl,
      @Value("${INTERNAL_SERVICE_TOKEN}") String internalServiceToken
  ) {
    this.client = restClientBuilder
        .baseUrl(routerBaseUrl)
        .build();
    this.internalServiceToken = internalServiceToken;
  }

  public RouteResult route(
      String requestId,
      String userId,
      String conversationId,
      String message,
      List<ContextMessage> context,
      String forceProviderId,
      String forceModelId
  ) {
    RouteRequest body = new RouteRequest(
        requestId,
        userId,
        conversationId,
        message,
        context,
        new ModelOverrides(forceProviderId, forceModelId)
    );

    RouteResponse resp = client
        .post()
        .uri("/internal/router/route")
        .contentType(MediaType.APPLICATION_JSON)
        .accept(MediaType.APPLICATION_JSON)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + internalServiceToken)
        .body(body)
        .retrieve()
        .body(RouteResponse.class);

    if (resp == null) {
      throw new IllegalStateException("Router returned empty response");
    }

    Integer promptTokens = resp.usage() != null ? resp.usage().promptTokens() : null;
    Integer completionTokens = resp.usage() != null ? resp.usage().completionTokens() : null;
    Integer totalTokens = resp.usage() != null ? resp.usage().totalTokens() : null;

    return new RouteResult(
        resp.assistantContent(),
        resp.providerId(),
        resp.modelId(),
        resp.latencyMs(),
        promptTokens,
        completionTokens,
        totalTokens,
        resp.estimatedCost(),
        resp.currency()
    );
  }
}

package com.prpo.entry.controller;

import com.prpo.entry.helpers.UsageClient;
import com.prpo.entry.model.UsageCredits;
import com.prpo.entry.model.UsageProviderBreakdown;
import com.prpo.entry.model.UsageSummary;
import com.prpo.entry.api.UsageApi;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UsageController implements UsageApi {

  private final UsageClient usageClient;

  public UsageController(UsageClient usageClient) {
    this.usageClient = usageClient;
  }

  @Override
  public ResponseEntity<UsageSummary> getUsageSummary(LocalDate from, LocalDate to) {
    String userId = currentUserId();

    OffsetDateTime fromDt = from != null
        ? from.atStartOfDay().atOffset(ZoneOffset.UTC)
        : null;

    OffsetDateTime toDt = to != null
        ? to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC).minusNanos(1)
        : null;

    UsageClient.ListEventsResponse list = usageClient.listEvents(fromDt, toDt, 500);
    List<UsageClient.UsageEventSummaryItem> items = list.items() != null ? list.items() : List.of();

    long totalRequests = 0;
    long totalTokens = 0;
    double totalCost = 0.0;

    Map<String, ProviderAgg> byProvider = new HashMap<>();
    String currency = null;

    for (UsageClient.UsageEventSummaryItem e : items) {
      if (e == null) continue;
      if (e.userId() == null || !e.userId().equals(userId)) continue;

      totalRequests += 1;

      if (e.tokens() != null) totalTokens += e.tokens();
      if (e.cost() != null) totalCost += e.cost();

      String providerId = e.providerId() != null ? e.providerId() : "unknown";
      ProviderAgg agg = byProvider.computeIfAbsent(providerId, k -> new ProviderAgg());

      agg.requests += 1;
      if (e.tokens() != null) agg.tokens += e.tokens();
      if (e.cost() != null) agg.cost += e.cost();

      if (e.latencyMs() != null && e.latencyMs() > 0) {
        agg.latencySumMs += e.latencyMs();
        agg.latencyCount += 1;
      }
    }

    List<UsageProviderBreakdown> byProviderList = new ArrayList<>();
    for (var entry : byProvider.entrySet()) {
      ProviderAgg agg = entry.getValue();

      Integer avgLatencyMs = null;
      if (agg.latencyCount > 0) {
        avgLatencyMs = (int) Math.round((double) agg.latencySumMs / (double) agg.latencyCount);
      }

      UsageProviderBreakdown b = new UsageProviderBreakdown();
      b.setProviderId(entry.getKey());
      b.setRequests((int) agg.requests);
      b.setTokens((int) agg.tokens);
      b.setCost(agg.cost);
      b.setAvgLatencyMs(avgLatencyMs);
      byProviderList.add(b);
    }

    byProviderList.sort(Comparator.comparing(UsageProviderBreakdown::getProviderId));

    UsageSummary summary = new UsageSummary();
    summary.setFrom(from);
    summary.setTo(to);
    summary.setTotalCost(totalCost);
    summary.setCurrency(currency != null ? currency : "EUR");
    summary.setTotalRequests((int) totalRequests);
    summary.setTotalTokens((int) totalTokens);
    summary.setByProvider(byProviderList);
    summary.setCredits(new ArrayList<UsageCredits>());

    return ResponseEntity.ok(summary);
  }

  private String currentUserId() {
    var auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth instanceof JwtAuthenticationToken jwt) {
      return jwt.getToken().getSubject();
    }
    return auth != null ? auth.getName() : null;
  }

  private static class ProviderAgg {
    long requests = 0;
    long tokens = 0;
    double cost = 0.0;

    long latencySumMs = 0;
    long latencyCount = 0;
  }
}

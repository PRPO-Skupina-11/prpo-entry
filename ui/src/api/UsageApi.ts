export type UsageProviderBreakdown = {
  providerId: string;
  requests: number;
  tokens: number;
  cost: number;
  avgLatencyMs?: number | null;
};

export type UsageCredits = {
  providerId: string;
  totalCredits: number;
  usedCredits: number;
};

export type UsageSummary = {
  from?: string | null;
  to?: string | null;
  totalCost: number;
  currency: string;
  totalRequests: number;
  totalTokens: number;
  byProvider: UsageProviderBreakdown[];
  credits: UsageCredits[];
};

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function getUsage(token: string, from?: string | null, to?: string | null): Promise<UsageSummary> {
  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  const url = qs.toString() ? `/api/v1/usage?${qs.toString()}` : `/api/v1/usage`;

  const r = await fetch(url, {
    headers: {
      ...authHeaders(token),
    },
  });

  if (!r.ok) throw new Error(`getUsage failed: ${r.status}`);
  return r.json();
}

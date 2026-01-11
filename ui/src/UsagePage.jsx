import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  CircularProgress,
} from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { getUsage } from './api/UsageApi'
import { useNavigate } from "react-router-dom"

function toNum(v) {
  return typeof v === 'number' ? v : 0
}

function weightedAvgLatency(byProvider) {
  if (!Array.isArray(byProvider) || byProvider.length === 0) return null

  let sumLatency = 0
  let sumRequests = 0

  for (const p of byProvider) {
    const req = toNum(p?.requests)
    const lat = typeof p?.avgLatencyMs === 'number' ? p.avgLatencyMs : null
    if (req > 0 && lat != null) {
      sumLatency += lat * req
      sumRequests += req
    }
  }

  if (sumRequests === 0) return null
  return Math.round(sumLatency / sumRequests)
}

export default function UsagePage() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0()

  const [usage, setUsage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const navigate = useNavigate()

  async function loadUsage() {
    if (!isAuthenticated) return
    setBusy(true)
    setError(null)
    try {
      const token = await getAccessTokenSilently()
      const data = await getUsage(token)
      setUsage(data)
    } catch (e) {
      setError(e?.message ?? 'Failed to load usage')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!isLoading && isAuthenticated) loadUsage()
  }, [isLoading, isAuthenticated])

  const byProvider = useMemo(() => {
    const arr = Array.isArray(usage?.byProvider) ? usage.byProvider : []
    return [...arr].sort((a, b) => toNum(b?.cost) - toNum(a?.cost))
  }, [usage])

  const avgLatencyMs = useMemo(() => weightedAvgLatency(byProvider), [byProvider])

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>

          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                Usage summary
              </Typography>

              <Button variant="outlined" onClick={() => navigate("/")}>
                Chats
              </Button>

              <Button variant="outlined" onClick={loadUsage} disabled={busy}>
                Refresh
              </Button>
            </Stack>

            {busy ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Typography color="error">{error}</Typography>
            ) : usage ? (
              <Stack spacing={1} sx={{ mt: 2 }}>
                <Typography>Total requests: {toNum(usage.totalRequests)}</Typography>
                <Typography>Total tokens: {toNum(usage.totalTokens)}</Typography>
                <Typography>
                  Estimated cost: {toNum(usage.totalCost).toFixed(4)} {usage.currency ?? 'EUR'}
                </Typography>
                <Typography>
                  Avg latency: {avgLatencyMs != null ? `${avgLatencyMs} ms` : '—'}
                </Typography>
              </Stack>
            ) : null}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              By provider
            </Typography>

            {byProvider.length ? (
              <Stack spacing={1.5}>
                {byProvider.map(p => (
                  <Stack sx={{ width: '100%' }} spacing={0.5}>
                    <Stack direction="row" spacing={2} alignItems="baseline">
                      <Typography fontWeight={700} sx={{ textTransform: 'capitalize' }}>
                        {p.providerId ?? 'unknown'}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {toNum(p.requests)} requests
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {toNum(p.tokens)} tokens
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        {typeof p.avgLatencyMs === 'number' ? `${Math.round(p.avgLatencyMs)} ms avg` : '— avg'}
                      </Typography>

                      <Box sx={{ flex: 1 }} />

                      <Typography fontWeight={700}>
                        {toNum(p.cost).toFixed(4)} {usage?.currency ?? 'EUR'}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                No usage data yet.
              </Typography>
            )}
          </Paper>
        </Stack>
      </Container>
    </Box>
  )
}

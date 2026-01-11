import { useEffect, useState } from 'react'
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

  return (
    <Box sx={{ flex: 1, overflow: 'auto' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Paper sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6" sx={{ flex: 1 }}>
                Usage summary
              </Typography>
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
                <Typography>Total requests: {usage.totalRequests}</Typography>
                <Typography>Total tokens: {usage.totalTokens}</Typography>
                <Typography>
                  Estimated cost: {usage.totalCost.toFixed(4)} {usage.currency}
                </Typography>
              </Stack>
            ) : null}
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              By provider
            </Typography>

            {usage?.byProvider?.length ? (
              <Stack spacing={1}>
                {usage.byProvider.map(p => (
                  <Box
                    key={p.providerId}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      pb: 1,
                    }}
                  >
                    <Box>
                      <Typography fontWeight={600}>{p.providerId}</Typography>
                      <Typography variant="caption">
                        Requests: {p.requests} · Tokens: {p.tokens}
                      </Typography>
                    </Box>
                    <Typography>
                      {p.cost.toFixed(4)} {usage.currency}
                    </Typography>
                  </Box>
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

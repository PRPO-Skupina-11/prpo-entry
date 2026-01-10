import { useState, useRef, useEffect } from 'react'
import {
  AppBar,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Toolbar,
  Typography,
  Container,
} from '@mui/material'
import { createChat, getChat, sendMessage as sendMessageApi } from './api/ChatApi'

export default function App() {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  async function send() {
    const text = draft.trim()
    if (!text || !conversationId || busy) return

    setDraft('')
    setError(null)
    setBusy(true)

    const optimistic = { id: `tmp_${Date.now()}`, role: 'user', content: text }
    setMessages(m => [...m, optimistic])

    try {
      const resp = await sendMessageApi(conversationId, text)

      setMessages(m => {
        const withoutOptimistic = m.filter(x => x.id !== optimistic.id)
        return [...withoutOptimistic, resp.userMessage, resp.assistantMessage]
      })
    } catch (e) {
      setMessages(m => m.filter(x => x.id !== optimistic.id))
      setError(e?.message ?? 'Send failed')
    } finally {
      setBusy(false)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }


  useEffect(() => {
    let cancelled = false

    async function boot() {
      try {
        setBusy(true)
        setError(null)

        const chat = await createChat()
        if (cancelled) return

        setConversationId(chat.id)

        const full = await getChat(chat.id)
        if (cancelled) return

        setMessages(full.messages ?? [])
      } catch (e) {
        if (!cancelled) setError(e?.message ?? 'Failed to start chat')
      } finally {
        if (!cancelled) setBusy(false)
      }
    }

    boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (conversationId && !busy) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [conversationId, busy])

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Typography variant="h6">PRPO Chat</Typography>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflow: 'auto', bgcolor: 'background.default' }}>
        <Container maxWidth="md" sx={{ py: 3 }}>
          <Stack spacing={2}>
            {messages.map(m => (
              <Box
                key={m.id}
                sx={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    px: 2,
                    py: 1.5,
                    maxWidth: '75%',
                    bgcolor: m.role === 'user' ? 'grey.50' : 'white',
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.5 }}
                  >
                    {m.role}
                  </Typography>
                  <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                    {m.content}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={bottomRef} />
          </Stack>
        </Container>
      </Box>

      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'divider',
          py: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Container maxWidth="md">
          {error ? (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
          ) : null}
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              inputRef={inputRef}
              placeholder={conversationId ? 'Type a message…' : 'Starting chat…'}
              value={draft}
              disabled={!conversationId || busy}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <Button
              variant="contained"
              onClick={send}
              disabled={!conversationId || busy || !draft.trim()}
            >
              Send
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}

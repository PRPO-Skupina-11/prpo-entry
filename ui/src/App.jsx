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

export default function App() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: 'Hi.' },
  ])
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  function send() {
    const text = draft.trim()
    if (!text) return

    setMessages(m => [
      ...m,
      { id: Date.now(), role: 'user', content: text },
      {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Fake assistant response',
      },
    ])
    setDraft('')
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              placeholder="Type a message…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') send()
              }}
            />
            <Button
              variant="contained"
              onClick={send}
              disabled={!draft.trim()}
            >
              Send
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  )
}

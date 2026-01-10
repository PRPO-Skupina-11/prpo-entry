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
  List,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material'
import {
  createChat,
  getChat,
  sendMessage as sendMessageApi,
  listChats,
} from './api/ChatApi'

export default function App() {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatItems, setChatItems] = useState([])
  const [chatCursor, setChatCursor] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  

  async function loadChatById(chatId) {
    setBusy(true)
    setError(null)
    try {
      setConversationId(chatId)
      const full = await getChat(chatId)
      setMessages(full.messages ?? [])
      requestAnimationFrame(() => inputRef.current?.focus())
    } catch (e) {
      setError(e?.message ?? 'Failed to load chat')
    } finally {
      setBusy(false)
    }
  }

  async function startNewChat() {
    setBusy(true)
    setError(null)
    try {
      const chat = await createChat()
      setChatItems(prev => {
        if (prev.length === 0) return prev // list not loaded yet
        const exists = prev.some(c => c.id === chat.id)
        if (exists) return prev
        return [{ id: chat.id, title: chat.title ?? 'New chat', createdAt: chat.createdAt, updatedAt: chat.createdAt }, ...prev]
      })
      setConversationId(chat.id)
      const full = await getChat(chat.id)
      setMessages(full.messages ?? [])
      requestAnimationFrame(() => inputRef.current?.focus())
    } catch (e) {
      setError(e?.message ?? 'Failed to start chat')
    } finally {
      setBusy(false)
    }
  }

  async function loadMoreChats() {
    if (!chatCursor || chatLoading) return
    setChatLoading(true)
    setError(null)
    try {
      const res = await listChats(50, chatCursor)
      setChatItems(prev => [...prev, ...(res.items ?? [])])
      setChatCursor(res.nextCursor ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load more chats')
    } finally {
      setChatLoading(false)
    }
  }

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

  async function refreshChats() {
    setChatLoading(true)
    setError(null)
    try {
      const res = await listChats(50, null)
      setChatItems(res.items ?? [])
      setChatCursor(res.nextCursor ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load chats')
    } finally {
      setChatLoading(false)
    }
  }

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
    <Box sx={{ height: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: sidebarCollapsed ? 72 : 320,
          borderRight: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 160ms ease',
        }}
      >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            bgcolor: 'grey.100',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 700,
          }}
        >
          P
        </Box>

        {!sidebarCollapsed ? (
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            PRPO
          </Typography>
        ) : (
          <Box sx={{ flex: 1 }} />
        )}

        <Button size="small" onClick={() => setSidebarCollapsed(v => !v)}>
          {sidebarCollapsed ? '›' : '‹'}
        </Button>
      </Box>

      <Box sx={{ px: 2, pb: 1 }}>
        <Button
          variant="contained"
          fullWidth={!sidebarCollapsed}
          onClick={startNewChat}
          sx={{
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            minWidth: 0,
            px: sidebarCollapsed ? 0 : 2,
          }}
        >
          {sidebarCollapsed ? '+' : 'New chat'}
        </Button>
      </Box>

      <Divider />

      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        {!sidebarCollapsed ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ px: 2, py: 1, display: 'block' }}
          >
            Previous chats
          </Typography>
        ) : null}

        <List dense disablePadding>
          {chatItems.length === 0 ? (
            <ListItemButton
              onClick={refreshChats}
              disabled={chatLoading}
              sx={{ px: sidebarCollapsed ? 1 : 2, mx: 1, borderRadius: 2 }}
            >
              <ListItemText
                primary={chatLoading ? 'Loading…' : sidebarCollapsed ? 'Load' : 'Load chats'}
                primaryTypographyProps={{ noWrap: true }}
              />
            </ListItemButton>
          ) : null}

          {chatItems.map(c => (
            <ListItemButton
              key={c.id}
              selected={c.id === conversationId}
              onClick={() => loadChatById(c.id)}
              sx={{
                px: sidebarCollapsed ? 1 : 2,
                mx: 1,
                borderRadius: 2,
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
              }}
            >
              {sidebarCollapsed ? (
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    bgcolor: c.id === conversationId ? 'text.primary' : 'grey.400',
                  }}
                />
              ) : (
                <ListItemText
                  primary={c.title ?? 'New chat'}
                  secondary={c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : null}
                  primaryTypographyProps={{ noWrap: true }}
                  secondaryTypographyProps={{ noWrap: true }}
                />
              )}
            </ListItemButton>
          ))}

          {!sidebarCollapsed && chatItems.length > 0 ? (
            <ListItemButton disabled={!chatCursor || chatLoading} onClick={loadMoreChats}>
              <ListItemText primary={chatLoading ? 'Loading…' : chatCursor ? 'Load more' : 'No more'} />
            </ListItemButton>
          ) : null}
        </List>
      </Box>
    </Box>

    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            PRPO Chat
          </Typography>
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
  </Box>
  )
}
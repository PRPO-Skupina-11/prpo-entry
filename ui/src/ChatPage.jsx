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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  MenuItem,
} from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useAuth0 } from '@auth0/auth0-react'
import {
  createChat,
  getChat,
  sendMessage as sendMessageApi,
  listChats,
  deleteChat as deleteChatApi
} from './api/ChatApi'
import { useParams, useNavigate, useLocation } from "react-router-dom";


const GOOGLE_CONNECTION = 'google-oauth2'

export default function App() {
  const { isAuthenticated, isLoading, loginWithRedirect, logout, getAccessTokenSilently } = useAuth0()

  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState('')

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [chatItems, setChatItems] = useState([])
  const [chatCursor, setChatCursor] = useState(null)
  const [chatLoading, setChatLoading] = useState(false)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)

  const [modelChoice, setModelChoice] = useState('auto')
  
  const { chatId: routeChatId } = useParams()

  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const location = useLocation();
  const navigate = useNavigate()

  const isWaitingForAssistant =
    busy && messages.length > 0 && messages[messages.length - 1]?.role === 'user'

  async function loginGoogle() {
    await loginWithRedirect({
      authorizationParams: {
        connection: GOOGLE_CONNECTION,
      },
      appState: { returnTo: location.pathname + location.search },
    });
  }


  async function token() {
    return await getAccessTokenSilently()
  }

  async function loadChatById(chatId) {
    if (!isAuthenticated) return

    setBusy(true)
    setError(null)
    try {
      setConversationId(chatId)
      const full = await getChat(await token(), chatId)
      setMessages(full.messages ?? [])
      requestAnimationFrame(() => inputRef.current?.focus())
    } catch (e) {
      setError(e?.message ?? 'Failed to load chat')
    } finally {
      setBusy(false)
    }
  }

  function startNewChat() {
    setError(null)
    setConversationId(null)
    setMessages([])
    navigate('/')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function loadMoreChats() {
    if (!isAuthenticated) return
    if (!chatCursor || chatLoading) return

    setChatLoading(true)
    setError(null)
    try {
      const res = await listChats(await token(), 50, chatCursor)
      setChatItems(prev => [...prev, ...(res.items ?? [])])
      setChatCursor(res.nextCursor ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load more chats')
    } finally {
      setChatLoading(false)
    }
  }

  async function refreshChats() {
    if (!isAuthenticated) return

    setChatLoading(true)
    setError(null)
    try {
      const res = await listChats(await token(), 50, null)
      setChatItems(res.items ?? [])
      setChatCursor(res.nextCursor ?? null)
    } catch (e) {
      setError(e?.message ?? 'Failed to load chats')
    } finally {
      setChatLoading(false)
    }
  }

  async function send() {
    if (!isAuthenticated) {
      await loginGoogle()
      return
    }

    const text = draft.trim()
    if (!text || busy) return

    setDraft('')
    setError(null)
    setBusy(true)

    const optimistic = { id: `tmp_${Date.now()}`, role: 'user', content: text }
    setMessages(m => [...m, optimistic])

    try {
      let chatId = conversationId
      const t = await token()

      if (!chatId) {
        const chat = await createChat(t)
        chatId = chat.id
        setConversationId(chatId)
        navigate(`/chat/${encodeURIComponent(chatId)}`, { replace: true })

        setChatItems(prev => {
          const exists = prev.some(c => c.id === chatId)
          if (exists) return prev
          return [
            {
              id: chatId,
              title: chat.title ?? 'New chat',
              createdAt: chat.createdAt,
              updatedAt: chat.createdAt,
            },
            ...prev,
          ]
        })
      }

      let forceProviderId = null
      let forceModelId = null

      if (modelChoice !== 'auto') {
        forceModelId = modelChoice
        if (modelChoice.startsWith('gpt-')) forceProviderId = 'openai'
        else forceProviderId = 'anthropic'
      }

      const resp = await sendMessageApi(t, chatId, text, forceProviderId, forceModelId)

      setMessages(m => {
        const withoutOptimistic = m.filter(x => x.id !== optimistic.id)
        return [...withoutOptimistic, resp.userMessage, resp.assistantMessage]
      })

      await refreshChats()
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

  function openDeleteDialog(chat) {
    setDeleteTarget({ id: chat.id, title: chat.title ?? 'New chat' })
    setDeleteDialogOpen(true)
  }

  function closeDeleteDialog() {
    if (deleteBusy) return
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  async function confirmDelete() {
    if (!isAuthenticated) return
    if (!deleteTarget || deleteBusy) return

    setDeleteBusy(true)
    setError(null)

    try {
      await deleteChatApi(await token(), deleteTarget.id)

      setChatItems(items => items.filter(x => x.id !== deleteTarget.id))

      if (conversationId === deleteTarget.id) {
        setConversationId(null)
        setMessages([])
        navigate('/')
      }

      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (err) {
      setError(err?.message ?? 'Failed to delete chat')
    } finally {
      setDeleteBusy(false)
    }
  }

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return
    refreshChats()
  }, [isLoading, isAuthenticated])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!busy) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [conversationId, busy])

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) return

    if (routeChatId && routeChatId !== conversationId) {
      loadChatById(routeChatId)
      return
    }

    if (!routeChatId && conversationId) {
      setConversationId(null)
      setMessages([])
      navigate('/')
    }
  }, [routeChatId, isLoading, isAuthenticated])

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
              px: 2,
            }}
            disabled={!isAuthenticated}
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

          {!isLoading && !isAuthenticated ? (
            <Box sx={{ px: 2, py: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Log in with Google to see your chats.
              </Typography>
              <Button variant="contained" onClick={loginGoogle} fullWidth>
                Continue with Google
              </Button>
            </Box>
          ) : (
            <List dense disablePadding>
              {chatItems.length === 0 ? (
                <ListItemButton
                  onClick={refreshChats}
                  disabled={chatLoading || !isAuthenticated}
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
                  onClick={() => navigate(`/chat/${encodeURIComponent(c.id)}`)}
                  sx={{
                    px: sidebarCollapsed ? 1 : 2,
                    mx: 1,
                    borderRadius: 2,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}
                  disabled={!isAuthenticated}
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
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        gap: 1,
                        '& .delete-btn': {
                          opacity: 0,
                          transition: 'opacity 120ms ease',
                        },
                        '&:hover .delete-btn': {
                          opacity: 1,
                        },
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ListItemText
                          primary={c.title ?? 'New chat'}
                          secondary={c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : null}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </Box>

                      <IconButton
                        className="delete-btn"
                        size="small"
                        edge="end"
                        aria-label="Delete chat"
                        onClick={(e) => {
                          e.stopPropagation()
                          openDeleteDialog(c)
                        }}
                        disabled={!isAuthenticated}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                </ListItemButton>
              ))}

              {!sidebarCollapsed && chatItems.length > 0 ? (
                <ListItemButton disabled={!chatCursor || chatLoading || !isAuthenticated} onClick={loadMoreChats}>
                  <ListItemText primary={chatLoading ? 'Loading…' : chatCursor ? 'Load more' : 'No more'} />
                </ListItemButton>
              ) : null}
            </List>
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar position="sticky" elevation={0}>
          <Toolbar sx={{ gap: 2 }}>
            <Typography variant="h6" sx={{ flex: 1 }}>
              PRPO Chat
            </Typography>
            
            <Button color="inherit" onClick={() => navigate("/usage")} disabled={!isAuthenticated}>
            Usage
            </Button>
            {isLoading ? null : !isAuthenticated ? (
              <Button color="inherit" onClick={loginGoogle}>
                Continue with Google
              </Button>
            ) : (
              <Button
                color="inherit"
                onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              >
                Log out
              </Button>
            )}
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
                      {m.role === 'assistant'
                        ? `assistant${m.modelId ? ` (${m.modelId})` : ''}`
                        : m.role}
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </Typography>
                  </Paper>
                </Box>
              ))}

              {isWaitingForAssistant ? (
                <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <Paper
                    variant="outlined"
                    sx={{
                      px: 2,
                      py: 1.5,
                      maxWidth: '75%',
                      bgcolor: 'white',
                      opacity: 0.8,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 0.5 }}
                    >
                      assistant
                    </Typography>
                    <Typography sx={{ whiteSpace: 'pre-wrap', fontStyle: 'italic', color: 'text.secondary' }}>
                      Typing…
                    </Typography>
                  </Paper>
                </Box>
              ) : null}

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

            {!isLoading && !isAuthenticated ? (
              <Button variant="contained" fullWidth onClick={loginGoogle}>
                Continue with Google
              </Button>
            ) : (
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  fullWidth
                  inputRef={inputRef}
                  placeholder={conversationId ? 'Type a message…' : 'Type a message to start a chat…'}
                  value={draft}
                  disabled={busy || !isAuthenticated}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      send()
                    }
                  }}
                />

                <TextField
                  select
                  size="small"
                  value={modelChoice}
                  disabled={busy || !isAuthenticated}
                  onChange={(e) => setModelChoice(e.target.value)}
                  sx={{ width: 210 }}
                >
                  <MenuItem value="auto">Auto</MenuItem>
                  <Divider />
                  <MenuItem value="gpt-5-mini">OpenAI · gpt-5-mini</MenuItem>
                  <MenuItem value="gpt-5.2">OpenAI · gpt-5.2</MenuItem>
                  <MenuItem value="claude-sonnet-4-5">Anthropic · claude-sonnet-4-5</MenuItem>
                </TextField>

                <Button
                  variant="contained"
                  onClick={send}
                  disabled={busy || !draft.trim() || !isAuthenticated}
                >
                  Send
                </Button>
              </Stack>
            )}
          </Container>
        </Box>
      </Box>

      <Dialog open={deleteDialogOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete chat?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete "{deleteTarget?.title ?? 'New chat'}" and all its messages.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDeleteDialog} disabled={deleteBusy}>
            Cancel
          </Button>
          <Button color="error" onClick={confirmDelete} disabled={deleteBusy}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

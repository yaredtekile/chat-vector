import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000'

type ChatMessage = {
  id?: number
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

type ConversationSummary = {
  id: number
  title: string | null
}

function App() {
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userInput, setUserInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [isLoadingConversations, setIsLoadingConversations] = useState(false)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true)
      const res = await fetch(`${backendUrl}/chat/conversations`)
      if (!res.ok) {
        throw new Error('Failed to load conversations')
      }
      const data = await res.json()
      setConversations(data)
    } catch (err) {
      console.error('Failed to fetch conversations', err)
    } finally {
      setIsLoadingConversations(false)
    }
  }, [])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  useEffect(() => {
    if (conversationId === null) {
      setMessages([])
      setIsMessagesLoading(false)
      return
    }

    let isCancelled = false
    const fetchMessages = async () => {
      try {
        setIsMessagesLoading(true)
        const res = await fetch(`${backendUrl}/chat/conversations/${conversationId}/messages`)
        if (res.ok) {
          const data = await res.json()
          if (!isCancelled) {
            setMessages(data)
          }
        }
      } catch (err) {
        console.error('Failed to fetch messages', err)
      } finally {
        if (!isCancelled) {
          setIsMessagesLoading(false)
        }
      }
    }

    fetchMessages()
    return () => {
      isCancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleUpload = async () => {
    if (!selectedFile) return
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (conversationId !== null) {
        formData.append('conversation_id', String(conversationId))
      }

      const res = await fetch(`${backendUrl}/documents/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        console.error('Upload failed', await res.text())
        return
      }

      const data = await res.json()
      setConversationId(data.conversation_id)
      fetchConversations()
    } catch (err) {
      console.error('Upload error', err)
    } finally {
      setIsUploading(false)
      setSelectedFile(null)
    }
  }

  const handleSend = async () => {
    if (!userInput.trim()) return
    setIsSending(true)
    const newMessage: ChatMessage = { role: 'user', content: userInput }
    setMessages((prev) => [...prev, newMessage])
    setUserInput('')

    try {
      const res = await fetch(`${backendUrl}/chat/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_id: conversationId, message: newMessage.content }),
      })

      if (!res.ok) {
        console.error('Send failed', await res.text())
        return
      }

      const data = await res.json()
      const activeConversationId = conversationId ?? data.conversation_id
      setConversationId(activeConversationId)
      fetchConversations()

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.answer },
      ])
    } catch (err) {
      console.error('Send error', err)
    } finally {
      setIsSending(false)
    }
  }

  const handleSelectConversation = (id: number) => {
    if (conversationId === id) return
    setConversationId(id)
  }

  const handleNewConversation = () => {
    setConversationId(null)
    setMessages([])
    setUserInput('')
  }

  const getConversationTitle = (title: string | null, id: number) => {
    if (title && title.trim().length > 0) return title
    return `Conversation #${id}`
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-white via-gray-50 to-emerald-50 text-gray-900">
      <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-white/80 backdrop-blur md:flex">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-500">History</p>
            <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
          </div>
          <Button size="sm" onClick={handleNewConversation}>
            New
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {isLoadingConversations ? (
            Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded-2xl bg-gray-100" />
            ))
          ) : conversations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-4 text-center text-sm text-gray-500">
              No conversations yet. Start by uploading a document or sending a message.
            </div>
          ) : (
            conversations.map((convo) => {
              const isActive = convo.id === conversationId
              return (
                <button
                  key={convo.id}
                  onClick={() => handleSelectConversation(convo.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-50/80 shadow-sm'
                      : 'border-transparent bg-white hover:border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {getConversationTitle(convo.title, convo.id)}
                  </p>
                  <p className={`text-xs ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>ID: {convo.id}</p>
                </button>
              )
            })
          )}
        </div>
      </aside>

      <section className="flex flex-1 flex-col overflow-hidden">
        <header className="border-b border-gray-200 bg-white/70 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">RAG Workspace</p>
              <h1 className="text-2xl font-semibold text-gray-900">Document Chat</h1>
              <p className="text-sm text-gray-500">Upload PDFs, ask questions, and browse past conversations.</p>
            </div>
            <div className="flex items-center gap-3">
              {conversationId && (
                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Active ID: {conversationId}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleNewConversation}>
                Start Fresh
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden px-4 py-4 md:px-8">
          <div className="flex h-full flex-col gap-4">
            <Card className="md:hidden">
              <CardHeader className="flex flex-col gap-1 pb-2">
                <CardTitle className="text-base">Conversations</CardTitle>
                <p className="text-xs text-gray-500">Tap to switch between threads.</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 max-h-60 overflow-y-auto">
                {isLoadingConversations ? (
                  Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="h-12 animate-pulse rounded-xl bg-gray-100" />
                  ))
                ) : conversations.length === 0 ? (
                  <p className="text-sm text-gray-500">No conversations yet.</p>
                ) : (
                  conversations.map((convo) => {
                    const isActive = convo.id === conversationId
                    return (
                      <button
                        key={convo.id}
                        onClick={() => handleSelectConversation(convo.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                          isActive
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {getConversationTitle(convo.title, convo.id)}
                      </button>
                    )
                  })
                )}
                <Button size="sm" variant="outline" onClick={handleNewConversation} className="w-full">
                  New Conversation
                </Button>
              </CardContent>
            </Card>

            <Card className="shrink-0">
              <CardHeader className="flex flex-col gap-2 pb-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="text-lg">Upload a document</CardTitle>
                  <p className="text-sm text-gray-500">Supported format: PDF up to 10MB.</p>
                </div>
                {conversationId && (
                  <span className="text-xs font-medium text-gray-500">Conversation #{conversationId}</span>
                )}
              </CardHeader>
              <CardContent className="space-y-3 pt-2">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    className="flex-1"
                  />
                  <Button onClick={handleUpload} disabled={!selectedFile || isUploading} className="md:w-44">
                    {isUploading ? 'Uploading...' : 'Upload PDF'}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Uploading a new file will attach it to the current conversation.</p>
              </CardContent>
            </Card>

            <Card className="flex flex-1 flex-col overflow-hidden border-gray-100 bg-white/90 shadow-lg shadow-emerald-100">
              <CardHeader className="flex flex-col gap-1 border-b border-gray-100 bg-white/70">
                <CardTitle className="text-xl">Chat</CardTitle>
                <p className="text-sm text-gray-500">
                  {conversationId ? 'Send a question and get answers grounded in your documents.' : 'Start a new conversation to enable chat.'}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-0">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ScrollArea ref={scrollRef} className="h-full rounded-3xl border border-gray-100 bg-white/90 shadow-inner">
                    <div className="space-y-4 p-6">
                      {isMessagesLoading ? (
                        <div className="flex items-center justify-center py-10 text-sm text-gray-500">
                          Loading messages...
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 bg-white/70 p-6 text-center text-sm text-gray-500">
                          No messages yet. Upload a file or type a question to get started.
                        </div>
                      ) : (
                        messages.map((msg, idx) => (
                          <div
                            key={msg.id ?? idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[85%] rounded-3xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                                msg.role === 'user'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-gray-50 text-gray-900 border border-gray-100'
                              }`}
                            >
                              <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                            </div>
                          </div>
                        ))
                      )}
                      {isSending && (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 rounded-3xl border border-gray-100 bg-gray-50 px-5 py-3 text-sm text-gray-500">
                            <span className="flex gap-1">
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '0ms' }} />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '150ms' }} />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-emerald-400" style={{ animationDelay: '300ms' }} />
                            </span>
                            Thinking...
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="shrink-0 border-t border-gray-100 bg-white/80 p-4">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <Textarea
                      placeholder="Ask something about your document..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      rows={2}
                      className="flex-1 resize-none bg-white"
                    />
                    <div className="flex items-end justify-end">
                      <Button onClick={handleSend} disabled={isSending || !userInput.trim()} size="lg" className="w-full md:w-auto">
                        {isSending ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Press Enter to send, Shift+Enter for a new line</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </section>
    </div>
  )
}

export default App

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, X } from "lucide-react"
import { ScrollArea } from "@radix-ui/react-scroll-area"

interface ChatMessage {
  id: string
  sender: string
  message: string
  timestamp: string
  isUser: boolean
}

export function ChatPanel() {
  const [selectedChat, setSelectedChat] = useState<string | null>("ayush")
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "Ayush Srivastava",
      message: "How are your vitals today?",
      timestamp: "10:30 AM",
      isUser: false,
    },
    {
      id: "2",
      sender: "You",
      message: "All good! Heart rate is stable.",
      timestamp: "10:32 AM",
      isUser: true,
    },
  ])
  const [inputValue, setInputValue] = useState("")

  const chatList = [
    { id: "ayush", name: "Ayush Srivastava", status: "online" },
    { id: "lakshya", name: "Lakshya Singh", status: "offline" },
    { id: "harsh", name: "Harsh Draveriya", status: "online" },
    { id: "aastha", name: "Aastha Rastogi", status: "offline" },
  ]

  const handleSendMessage = () => {
    if (inputValue.trim()) {
      const newMessage: ChatMessage = {
        id: String(messages.length + 1),
        sender: "You",
        message: inputValue,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isUser: true,
      }
      setMessages([...messages, newMessage])
      setInputValue("")
    }
  }

  return (
    <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col hidden lg:flex">
      {/* Chat Header */}
      <div className="border-b border-border p-4">
        <h3 className="font-semibold text-sm sm:text-base">Chats</h3>
      </div>

      {/* Chat List and Messages */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat List */}
        <div className="w-full border-r border-border">
          {!selectedChat ? (
            <ScrollArea className="h-full">
              <div className="p-2 space-y-2">
                {chatList.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    <p className="font-medium">{chat.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {chat.status === "online" ? (
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full" />
                          Online
                        </span>
                      ) : (
                        <span>Offline</span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col h-full">
              {/* Selected Chat Header */}
              <div className="border-b border-border p-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-xs sm:text-sm">{chatList.find((c) => c.id === selectedChat)?.name}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedChat(null)} className="h-6 w-6 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.isUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg text-xs sm:text-sm ${
                          msg.isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                        }`}
                      >
                        <p>{msg.message}</p>
                        <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="border-t border-border p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSendMessage()
                      }
                    }}
                    className="text-xs sm:text-sm"
                  />
                  <Button size="sm" onClick={handleSendMessage} className="px-3">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

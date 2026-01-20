"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Send } from "lucide-react";
import { Card } from "@/components/ui/card";

type ChatUser = {
  id: number;
  name: string;
  initials: string;
  unread: number;
};

type ChatMessage = {
  id: number;
  text: string;
  sender: "doctor" | "patient";
};

const users: ChatUser[] = [
  { id: 1, name: "Ayush Srivastava", initials: "AS", unread: 1 },
  { id: 2, name: "Lakshya Singh", initials: "LS", unread: 1 },
  { id: 3, name: "Harsh Draveriya", initials: "HD", unread: 0 },
  { id: 4, name: "Aastha Rastogi", initials: "AR", unread: 0 },
];

const initialMessages: ChatMessage[] = [
  { id: 1, text: "How are your vitals today?", sender: "patient" },
  { id: 2, text: "All good! Heart rate is stable.", sender: "doctor" },
  { id: 3, text: "Great. Monitor it regularly.", sender: "patient" },
];

export default function ChatPanel() {
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { id: messages.length + 1, text: input, sender: "doctor" }]);
    setInput("");
  };

  return (
    <Card className="w-full lg:w-80 h-full bg-white border-l flex flex-col shadow-sm">
      <div className="border-b px-4 py-3 flex items-center">
        {selectedUser && (
          <Button variant="ghost" size="icon" onClick={() => setSelectedUser(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h2 className="text-base font-semibold">Chats</h2>

      </div>

      {!selectedUser && (
        <ScrollArea className="flex-1 px-2 py-3">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition"
            >
              <Avatar>
                <AvatarFallback>{u.initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{u.name}</p>
              </div>
              {u.unread > 0 && (
                <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                  {u.unread}
                </span>
              )}
            </button>
          ))}
        </ScrollArea>
      )}

      {selectedUser && (
        <div className="flex flex-col flex-1">
          <div className="border-b flex items-center gap-3 px-4 py-3">
            <Avatar>
              <AvatarFallback>{selectedUser.initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{selectedUser.name}</p>
              <p className="text-xs text-muted-foreground">Active now</p>
            </div>
          </div>

          <ScrollArea className="flex-1 px-4 py-4 space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "doctor" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-3 py-2 rounded-lg max-w-xs text-sm ${
                    m.sender === "doctor"
                      ? "bg-indigo-500 text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </ScrollArea>

          <div className="border-t p-3 flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
  
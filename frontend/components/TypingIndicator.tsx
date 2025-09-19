import React from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export function TypingIndicator({ 
  isVisible, 
  message = "Eva is thinking...", 
  className 
}: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 backdrop-blur border border-zinc-200/60 dark:border-zinc-700/60",
      className
    )}>
      <div className="flex gap-1">
        <div 
          className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <div 
          className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <div 
          className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
      <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
        {message}
      </span>
    </div>
  );
}

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: Date;
  isTyping?: boolean;
}

export function ChatBubble({ message, isUser, timestamp, isTyping = false }: ChatBubbleProps) {
  return (
    <div className={cn(
      "flex w-full",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "max-w-[80%] px-4 py-2 rounded-2xl shadow-sm",
        isUser 
          ? "bg-indigo-600 text-white rounded-br-md" 
          : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-md border border-zinc-200 dark:border-zinc-700"
      )}>
        {isTyping ? (
          <TypingIndicator isVisible={true} message="Eva is responding..." />
        ) : (
          <>
            <p className="text-sm leading-relaxed">{message}</p>
            {timestamp && (
              <p className={cn(
                "text-xs mt-1 opacity-70",
                isUser ? "text-indigo-100" : "text-zinc-500 dark:text-zinc-400"
              )}>
                {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Enhanced chat interface component
interface EnhancedChatInterfaceProps {
  messages: Array<{
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
  }>;
  isTyping: boolean;
}

export function EnhancedChatInterface({ messages, isTyping }: EnhancedChatInterfaceProps) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto p-4">
      {messages.map((message) => (
        <ChatBubble
          key={message.id}
          message={message.content}
          isUser={message.isUser}
          timestamp={message.timestamp}
        />
      ))}
      {isTyping && (
        <ChatBubble
          message=""
          isUser={false}
          isTyping={true}
        />
      )}
    </div>
  );
}
'use client';

import { marked } from 'marked';
import { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles, User, Bot } from 'lucide-react';

// --- CONFIGURATION ---
const BASE_URL = "http://127.0.0.1:8001";

// --- TYPES ---
interface Message {
  role: 'user' | 'model';
  content: string;
}

// --- MAIN COMPONENT ---
export default function GeminiAskQuestionPage() {
  const [tenantId, setTenantId] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatContainerRef.current?.scrollTo({ 
      top: chatContainerRef.current.scrollHeight, 
      behavior: 'smooth' 
    });
  }, [messages]);

  const parseMarkdownText = (text: string): string => {
    const sanitizedText = text.replace(/<$/, '');
    return marked.parse(sanitizedText, { gfm: true, breaks: true }) as string;
  };
  
  const createErrorHtml = (title: string, message: string): string => {
    return `<div class="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div class="font-bold text-red-700">${title}</div>
              <p class="text-red-600 text-sm mt-1">${message}</p>
            </div>`;
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) cancelRequest();
    if (!tenantId.trim()) {
      setMessages(prev => [...prev, { role: 'model', content: createErrorHtml("Configuration Error", "Please provide a Tenant ID.") }]);
      return;
    }
    if (!question.trim()) return;

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    const userMessage: Message = { role: 'user', content: question };
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '<div class="thinking"></div>' }]);
    setQuestion('');

    try {
      const response = await fetch(`${BASE_URL}/ask-stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage.content, tenantId }),
        signal: abortControllerRef.current.signal,
      });
      if (!response.ok || !response.body) {
        throw new Error(await response.text() || `Server error: ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullResponse += decoder.decode(value, { stream: true });
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = `${parseMarkdownText(fullResponse)} <span class="cursor"></span>`;
          return newMessages;
        });
      }
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = parseMarkdownText(fullResponse);
        return newMessages;
      });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessages(prev => prev.slice(0, -1));
        return;
      }
      const message = error.name === 'TypeError'
        ? `Cannot connect to the backend at ${BASE_URL}.`
        : error.message;
      const title = error.name === 'TypeError' ? "Network Error" : "An Error Occurred";
      setMessages(prev => [...prev.slice(0, -1), { role: 'model', content: createErrorHtml(title, message) }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    // Outer div constrains height to the viewport
    <div className="h-screen  flex justify-center font-sans">
      
      {/* Main chat window takes up full height of its container */}
      <div className="flex flex-col w-full max-w-4xl h-160 bg-white rounded-2xl shadow-2xl shadow-gray-300/40 border border-gray-200/80 overflow-hidden">
        
        {/* Header: Fixed Height */}
        <header className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50/75 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-800">talk2docs</h1>
          </div>
          <div>
            <input
              type="text"
              id="tenantId"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 w-48"
              placeholder="Enter Tenant ID"
            />
          </div>
        </header>

        {/* Main Chat Area: Takes up remaining space and scrolls */}
        <main ref={chatContainerRef} className="flex-1 overflow-y-auto py-8 px-6">
          <div className="space-y-8">
            {messages.length === 0 ? (
              <WelcomeScreen />
            ) : (
              messages.map((msg, index) => (
                <ChatMessage key={index} role={msg.role} content={msg.content} />
              ))
            )}
          </div>
        </main>

        {/* Footer: Fixed Height */}
        <footer className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="relative">
            <textarea
              id="question"
              rows={1}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="w-full px-4 py-3 pr-20 bg-gray-100 border border-transparent rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
              placeholder="Enter a prompt here"
            />
            <div className="absolute bottom-2.5 right-3 flex items-center space-x-2">
              {isLoading && (
                <button
                  type="button"
                  onClick={cancelRequest}
                  className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300"
                  aria-label="Stop generating"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!question.trim() || !tenantId.trim()}
                className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-500 mt-3">
            talk2docs may display inaccurate info. Please verify important responses.
          </p>
        </footer>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---
const WelcomeScreen = () => (
  <div className="text-center pt-16">
    <div className="inline-block p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
      <Sparkles className="w-10 h-10 text-white" />
    </div>
    <h2 className="text-4xl font-bold text-gray-800">How can I help you today?</h2>
  </div>
);

const ChatMessage = ({ role, content }: Message) => {
  const isUser = role === 'user';
  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}
      <div 
        className={`prose prose-gray max-w-xl px-5 py-3 rounded-2xl shadow-sm ${
          isUser 
            ? 'bg-blue-500 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isUser && (
        <div className="w-8 h-8 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <User className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChatMessage, TicketAuditReport } from '../types';
import { Send, User, Trash2, RefreshCw, Sparkles, AlertTriangle, HelpCircle } from 'lucide-react';

interface AIChatInspectorProps {
  reports: TicketAuditReport[];
  selectedTicketNumber: string | null;
  onSelectTicketNumber: (incNumber: string) => void;
  triggerPopup: (msg: string, type: 'success' | 'info' | 'warning') => void;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// Custom animated gradient Gemini-inspired SVG star icon
function GeminiIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C12 2 12.5 7.5 16 11C19.5 14.5 22 12 22 12C22 12 16.5 12.5 13 16C9.5 19.5 12 22 12 22C12 22 11.5 16.5 8 13C4.5 9.5 2 12 2 12C2 12 7.5 11.5 11 8C14.5 4.5 12 2 12 2Z" fill="url(#geminiGrad)" />
      <defs>
        <linearGradient id="geminiGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Function to compile a flat, lightweight dashboard schema representation for optimal token payloads
export function getDashboardContext(reports: TicketAuditReport[]) {
  if (!reports || reports.length === 0) {
    return {
      status: "No active audited tickets or metrics loaded on client dashboard."
    };
  }

  const total = reports.length;
  const avgSla = Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / total);
  
  const greenCount = reports.filter(r => r.statusColor === 'Green').length;
  const amberCount = reports.filter(r => r.statusColor === 'Amber').length;
  const redCount = reports.filter(r => r.statusColor === 'Red').length;

  const categoriesList = [
    { key: 'affectedCi', name: 'Affected CI Mapping' },
    { key: 'shortDescription', name: 'Short Description Clarity' },
    { key: 'technicalDescription', name: 'Technical Depth' },
    { key: 'activityLogs', name: 'Activity Transitions' },
    { key: 'resolutionDescription', name: 'Resolution Description RAG' }
  ];

  const hotspots = categoriesList.map(item => {
    const passes = reports.filter(r => {
      const val = r.scores[item.key as keyof typeof r.scores];
      return val && val.score === 2;
    }).length;
    return { name: item.name, passRate: Math.round((passes / total) * 100) };
  }).sort((a, b) => a.passRate - b.passRate).slice(0, 3);

  const assigneeMap: Record<string, { sum: number; count: number }> = {};
  reports.forEach(r => {
    const name = r.ticket.assignee || 'Unassigned';
    if (!assigneeMap[name]) assigneeMap[name] = { sum: 0, count: 0 };
    assigneeMap[name].sum += r.percentage;
    assigneeMap[name].count += 1;
  });

  const coachingList = Object.entries(assigneeMap).map(([name, s]) => ({
    name,
    avgScore: Math.round(s.sum / s.count)
  })).sort((a, b) => a.avgScore - b.avgScore).slice(0, 3);

  return {
    totalTickets: total,
    averageAuditSlaPercentage: avgSla,
    complianceDistribution: { greenCount, amberCount, redCount },
    topFailingGaps: hotspots,
    coachingTopTargets: coachingList
  };
}

export function compileDynamicPortalContext(reports: TicketAuditReport[]): string {
  const ctx = getDashboardContext(reports);
  return JSON.stringify(ctx, null, 2);
}

export default function AIChatInspector({ 
  reports, 
  selectedTicketNumber, 
  onSelectTicketNumber,
  triggerPopup,
  messages,
  setMessages
}: AIChatInspectorProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find the last model message ID to render active suggestion chips
  const lastModelMessageId = useMemo(() => {
    const modelMessages = messages.filter(m => m.role === 'model');
    if (modelMessages.length === 0) return null;
    return modelMessages[modelMessages.length - 1].id;
  }, [messages]);

  // Quick action starter chips powered by Gemini 3.8 Flash for IT Support
  const starterChips = [
    "🔍 Status of INC0000004",
    "⚡ How to troubleshoot VPN authentication failure",
    "📖 Lookup KB article for password reset",
    "📋 List active ITIL audit rules",
    "🚨 Which tickets have critical violations?"
  ];

  // Initialize welcoming chat message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          content: 'I am your Enterprise IT Support & Knowledge Assistant. Ask me to check live ServiceNow ticket status, find runbooks/procedures in the knowledge base, or review compliance rules.\n\nAll answers are direct, verified against live data, and formatted for immediate use.',
          timestamp: new Date().toLocaleTimeString(),
          contract: {
            answered: true,
            sources_used: ['ServiceNow Table API', 'Corporate Knowledge Base'],
            tools_called: ['servicenow_lookup', 'confluence_search'],
            needs_followup: false,
            followup_reason: null
          },
          suggestions: [
            "Check status of INC0000004",
            "How to troubleshoot VPN authentication failure",
            "List active ITIL audit rules"
          ]
        }
      ]);
    }
  }, [messages.length, setMessages]);

  // Ensure conversational auto scroll to bottom is applied on message updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (customQuery?: string, isRetry = false) => {
    const textToSend = customQuery || inputValue;
    if (!textToSend.trim() && !isRetry) return;

    const finalQuery = isRetry && customQuery ? customQuery : textToSend;

    if (!isRetry) {
      const userMsg: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content: finalQuery,
        timestamp: new Date().toLocaleTimeString(),
        rawQuery: finalQuery
      };
      setMessages(prev => [...prev, userMsg]);
      setInputValue('');
    }

    setIsSending(true);
    triggerPopup('Consulting Gemini 3.8 Flash Model for real-time audit context...', 'info');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

    try {
      const dashboardContext = getDashboardContext(reports);
      const dynamicAppContextText = JSON.stringify(dashboardContext);

      // Slicing history: ONLY send the last 10 messages of dialogue context trace
      const validHistory = messages.filter(m => !m.isError).slice(-10);
      const payloadMessages = [...validHistory];
      if (!isRetry) {
        payloadMessages.push({
          id: `temp_${Date.now()}`,
          role: 'user',
          content: finalQuery,
          timestamp: new Date().toLocaleTimeString()
        });
      }

      const res = await fetch('/api/chat-bot', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         signal: controller.signal,
         body: JSON.stringify({
           messages: payloadMessages,
           reportsContext: reports,
           appContext: dynamicAppContextText
         })
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorText = await res.text();
        let errorData: any = null;
        try { errorData = JSON.parse(errorText); } catch { }
        const errMsg = errorData?.error || errorData?.reply || `Server responded with status ${res.status}`;
        throw new Error(errMsg);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server returned an unexpected response (non-JSON format).');
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.reply) {
        let conversationalReply = data.reply;
        let chips: string[] = data.suggestions || [];

        let contractData = data.contract || null;

        // If data.reply is a JSON string, try parsing it here as a fallback
        try {
          const parsed = JSON.parse(data.reply);
          if (parsed && typeof parsed === 'object') {
            conversationalReply = parsed.reply || conversationalReply;
            if (Array.isArray(parsed.suggestions)) {
              chips = parsed.suggestions;
            }
            if (parsed.contract) {
              contractData = parsed.contract;
            }
          }
        } catch (e) {
          // If parsing fails, just show raw reply text with no chips
        }

        setMessages(prev => [...prev, {
          id: `bot_${Date.now()}`,
          role: 'model',
          content: conversationalReply,
          suggestions: chips,
          contract: contractData,
          timestamp: new Date().toLocaleTimeString()
        }]);
        triggerPopup('Received intelligence report from Agentic AI!', 'success');
      } else {
        throw new Error('No valid conversational reply received.');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.info('[Chat Client Notice]:', err?.message || err);

      let friendlyError = err?.message || 'Failed to dispatch chat request.';
      if (err.name === 'AbortError') {
        friendlyError = 'Request timed out after 20 seconds. Please try again.';
      }

      setMessages(prev => [...prev, {
        id: `bot_err_${Date.now()}`,
        role: 'model',
        content: `Something went wrong: ${friendlyError}`,
        timestamp: new Date().toLocaleTimeString(),
        isError: true,
        rawQuery: finalQuery
      }]);
      triggerPopup(`Conversation Error: ${friendlyError}`, 'warning');
    } finally {
      setIsSending(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'model',
        content: 'Thread cleared. Ask me any questions regarding active compliance gaps, audit rules, or low scores!',
        timestamp: new Date().toLocaleTimeString()
      }
    ]);
    triggerPopup('Wiped conversational thread context.', 'info');
  };

  return (
    <div className="w-full animate-fadeIn font-sans" id="ai-chat-inspector">
      <div className="bg-[#15171C] border border-[#2A2D35] rounded-xl p-5 flex flex-col min-h-[580px] shadow-lg">
        
        {/* Chat Header Container with 'Clear Chat' button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#2A2D35] mb-4 gap-3 bg-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg text-blue-400 border border-blue-500/20 flex items-center justify-center shadow-inner">
              <GeminiIcon />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-gray-200">AI Governance Assistant</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Gemini 3.8 Flash
                </span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-0.5 font-mono">Real-time ITIL Quality Auditing & RAG Diagnostic Reasoning</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="px-3 py-1.5 bg-[#0A0C0F] border border-[#2A2D35] text-gray-400 hover:text-red-400 rounded-lg flex items-center justify-center space-x-1.5 transition-all text-xs cursor-pointer hover:bg-red-950/25 border-dashed"
              title="Clear Chat Thread"
              id="clear-chat-btn"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="font-mono text-[11px] font-bold">Clear Chat</span>
            </button>
          </div>
        </div>

        {/* Message Bubble Feed Container */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1 max-h-[380px] min-h-[300px] selection:bg-blue-500/30 scrollbar-thin">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* User vs Gemini Icon Representation */}
              <div className={`p-2 rounded-lg shrink-0 flex items-center justify-center border ${
                msg.role === 'user' 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/15' 
                  : 'bg-[#0A0C0F] border-[#2A2D35] text-blue-400'
              }`}>
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <GeminiIcon />}
              </div>

              {/* Message content bubble with blue vs gray background pairing */}
              <div className="flex flex-col space-y-1.5 max-w-full">
                <div className={`p-3.5 rounded-2xl text-[12px] leading-relaxed select-text font-sans selection:bg-blue-500/20 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : msg.isError
                    ? 'bg-red-950/40 border border-red-500/30 text-red-200 rounded-tl-none'
                    : 'bg-[#1C1F26] text-gray-200 border border-[#2A2D35] rounded-tl-none markdown-body'
                }`}>
                  {msg.content}
                </div>

                {/* Dynamic Suggestion chips rendered directly below the bubble */}
                {msg.role === 'model' && msg.id === lastModelMessageId && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className={`mt-1.5 flex flex-wrap gap-1.5 transition-all duration-300 ease-out origin-top ${
                    !isSending 
                      ? 'opacity-100 scale-100 max-h-40 transform-none pointer-events-auto' 
                      : 'opacity-0 scale-95 max-h-0 overflow-hidden pointer-events-none'
                  }`}>
                    {msg.suggestions.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSendMessage(chip)}
                        className="bg-blue-600/10 hover:bg-blue-600/25 active:bg-blue-600/30 border border-blue-500/20 hover:border-blue-500/40 text-[10.5px] text-blue-400 font-medium px-2.5 py-1 rounded-full cursor-pointer hover:scale-[1.02] transform transition-all active:scale-[0.98] outline-none"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {msg.isError && msg.rawQuery && (
                  <button
                    type="button"
                    onClick={() => handleSendMessage(msg.rawQuery, true)}
                    className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-mono font-bold bg-[#1A1D24] hover:bg-[#252A35] text-amber-500 hover:text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded-md w-fit cursor-pointer transition-colors"
                  >
                    <RefreshCw className="h-3 w-3 shrink-0" />
                    <span>Retry Last Message</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator with Gemini icon and animated dots */}
          {isSending && (
            <div className="flex items-start space-x-3 max-w-[85%] animate-pulse">
              <div className="p-2 rounded-lg shrink-0 bg-[#0A0C0F] border border-[#2A2D35] text-blue-400 flex items-center justify-center">
                <GeminiIcon />
              </div>
              <div className="p-3.5 rounded-2xl text-[12px] bg-[#1C1F26] text-gray-400 border border-[#2A2D35] rounded-tl-none flex items-center space-x-2.5 shadow-sm">
                <span className="text-[11px] text-gray-400 font-mono select-none">Agent retrieving dashboard context...</span>
                <div className="flex space-x-1 items-center justify-center h-2 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Dynamic Chat Input Container with Quick-Prompt Strip and Send Button */}
        <div className="border-t border-[#2A2D35] pt-3 mt-auto space-y-2.5">
          {/* Quick Prompt Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1 pl-0.5">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Quick:
            </span>
            {starterChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(chip)}
                disabled={isSending}
                className="shrink-0 bg-[#0A0C0F] hover:bg-blue-600/15 text-gray-300 hover:text-blue-300 border border-[#2A2D35] hover:border-blue-500/30 rounded-lg px-2.5 py-1 text-[11px] font-sans transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {chip}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2.5"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isSending}
              placeholder="Ask me anything regarding current dashboard scores or coaching..."
              className="flex-1 bg-[#101216] border border-[#2A2D35] focus:border-blue-500 rounded-lg px-4 py-3 text-xs text-white outline-none disabled:opacity-50 placeholder-gray-600 font-sans transition-all"
              id="ai-chatbot-input"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:opacity-40 text-white font-bold text-xs px-4 py-3 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-blue-500/20 shadow-md shadow-blue-900/10"
              id="send-chat-btn"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

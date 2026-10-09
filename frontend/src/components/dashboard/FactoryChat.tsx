import { useState, useCallback } from 'react';
import { Bot, Send, Sparkles, Database, Terminal, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../../types/index';
import { queryApi } from '../../lib/api';

const promptChips = [
  'Which line has the most rejections today?',
  'Show critical faults today',
  'Compare Line 1 vs Line 2',
  'Attendance status for current shift',
];

export const FactoryChat = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'assistant',
      text: 'Industrial Gemini AI ready. Ask questions regarding floor output, machine telemetry, shift OEE, or line stoppages.',
      timestamp: '10:00 AM',
    },
  ]);

  const handleSend = useCallback(async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const res = await queryApi.ask(trimmed);
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.data.answer || 'Query executed against SCADA database.',
        sqlQuery: res.data.queryUsed,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiResponse]);
    } catch (err: any) {
      const serverError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Unable to query factory metrics database. Please verify backend connection.';
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'assistant',
          text: serverError,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 shadow-sm flex flex-col h-[520px] justify-between">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                  Factory Operations Assistant
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">Natural language telemetry query</p>
            </div>
          </div>
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>

        {/* Prompt Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {promptChips.map((chip) => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="text-xs bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded transition-colors text-left"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 my-2 text-xs">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-lg p-3 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <p className="leading-relaxed text-xs">{msg.text}</p>

              {msg.sqlQuery && (
                <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1 font-semibold">
                    <Terminal className="w-3 h-3" />
                    <span>Generated SQL:</span>
                  </div>
                  <pre className="bg-slate-900 p-2.5 rounded border border-slate-800 text-emerald-400 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed">
                    {msg.sqlQuery}
                  </pre>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1 font-mono">
                    <Database className="w-2.5 h-2.5 text-slate-500" />
                    <span>Executed on SCADA telemetry warehouse</span>
                  </div>
                </div>
              )}
            </div>
            {msg.timestamp && (
              <span className="text-[10px] font-mono text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-500 text-xs w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-xs">Querying SCADA telemetry database...</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(query);
        }}
        className="mt-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask a question in plain English..."
          disabled={loading}
          className="flex-1 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center"
          aria-label="Send Query"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};

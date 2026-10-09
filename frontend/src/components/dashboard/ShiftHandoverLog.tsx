import { useState } from 'react';
import { MessageSquare, Send, AlertCircle, Clock } from 'lucide-react';
import { useHandoverNotes, useAddHandoverNoteMutation } from '../../hooks/useFactoryData';
import { useAuthStore } from '../../store/auth.store';

export const ShiftHandoverLog = () => {
  const { user, activeFactory } = useAuthStore();
  const { data: notes, isLoading } = useHandoverNotes();
  const addNoteMutation = useAddHandoverNoteMutation();

  const [noteText, setNoteText] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent'>('Normal');

  const noteList = notes || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || addNoteMutation.isPending) return;

    addNoteMutation.mutate(
      {
        factoryId: activeFactory?.factoryId || 'f-1',
        authorName: user?.name || 'Operator',
        authorRole: activeFactory?.role || 'OPERATOR',
        shift: 'Current Shift → Incoming Shift',
        note: noteText.trim(),
        priority,
      },
      {
        onSuccess: () => {
          setNoteText('');
          setPriority('Normal');
        },
      }
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4 transition-colors">
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-bold font-display tracking-wider uppercase text-xs text-slate-900 dark:text-white">
              Shift Handover Log
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {noteList.length} notes recorded
          </span>
        </div>

        {/* Notes Feed */}
        <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="p-4 text-center text-xs text-slate-400 font-mono">
              Loading handover notes...
            </div>
          ) : noteList.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 font-mono">
              No shift handover notes logged for this facility.
            </div>
          ) : (
            noteList.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                  item.priority === 'Urgent'
                    ? 'bg-amber-50/60 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/60'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-100 dark:border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white font-sans">
                      {item.authorName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ({item.authorRole})
                    </span>
                    {item.priority === 'Urgent' && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                        URGENT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {item.timestamp}
                  </span>
                </div>

                <p className="text-slate-700 dark:text-slate-300 font-sans leading-relaxed">
                  {item.note}
                </p>

                <div className="text-[10px] text-slate-400 font-mono">
                  {item.shift}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Leave a note for incoming shift lead (e.g. coolant top-up required)..."
          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
          required
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPriority(priority === 'Normal' ? 'Urgent' : 'Normal')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition-colors flex items-center gap-1.5 ${
                priority === 'Urgent'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <AlertCircle className="w-3 h-3" />
              <span>Priority: {priority}</span>
            </button>
          </div>

          <button
            type="submit"
            disabled={addNoteMutation.isPending || !noteText.trim()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Send className="w-3 h-3" />
            <span>{addNoteMutation.isPending ? 'Posting...' : 'Post Handover Note'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { approveKnowledgeRequest, rejectKnowledgeRequest, fetchConversationMessages } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/design/status-badge';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { KnowledgeRequest } from '@/types';
import { Loader } from '@/components/ui/loader';

interface Props {
  request: KnowledgeRequest;
  onClose: () => void;
  onAction: () => void;
}

const SENDER_LABELS: Record<string, string> = {
  customer: 'Customer',
  agent: 'AI Agent',
  human_owner: 'Staff',
  system: 'System',
};

export function LearningInboxDetail({ request, onClose, onAction }: Props) {
  const [answer, setAnswer] = useState(request.suggestedAnswer || '');
  const [actionState, setActionState] = useState<'idle' | 'approving' | 'rejecting'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    setAnswer(request.suggestedAnswer || '');
    setActionState('idle');
    setError('');
  }, [request.id]);

  const { data: msgData, isLoading: msgsLoading } = useSWR(
    request.conversationId ? `msgs-${request.conversationId}` : null,
    () => fetchConversationMessages(request.conversationId),
    { revalidateOnFocus: false }
  );

  const messages = msgData?.success ? (msgData.data ?? []) : [];

  const handleApprove = async () => {
    if (!answer.trim()) return;
    setActionState('approving');
    setError('');
    try {
      const res = await approveKnowledgeRequest(request.id, answer.trim());
      if (res.success) {
        onAction();
      } else {
        setError(res.error || 'Failed to approve.');
        setActionState('idle');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve.');
      setActionState('idle');
    }
  };

  const handleReject = async () => {
    if (!window.confirm('Are you sure you want to reject this knowledge request? This cannot be undone.')) {
      return;
    }
    setActionState('rejecting');
    setError('');
    try {
      const res = await rejectKnowledgeRequest(request.id);
      if (res.success) {
        onAction();
      } else {
        setError(res.error || 'Failed to reject.');
        setActionState('idle');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reject.');
      setActionState('idle');
    }
  };

  return (
    <div className="border-l border-zinc-800 bg-zinc-950 w-full lg:w-[480px] shrink-0 overflow-y-auto">
      <div className="sticky top-0 bg-zinc-950 px-4 py-3 flex items-center justify-between z-10 border-b border-zinc-800">
        <h3 className="font-semibold text-sm text-white">Request Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Question */}
        <div>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Unanswered Question</label>
          <p className="mt-1 text-sm bg-zinc-800/30 rounded-lg p-3 text-zinc-300">{request.unansweredQuestion}</p>
        </div>

        {/* Suggested Answer */}
        <div>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            placeholder="Enter the answer to this question..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleApprove}
            disabled={actionState !== 'idle' || !answer.trim()}
            className="flex-1"
          >
{actionState === 'approving' ? (
  <Loader size={16} color="currentColor" />
) : (
  <>
    <CheckCircle className="h-4 w-4 mr-1" />
    Approve
  </>
)}
          </Button>
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={actionState !== 'idle'}
            className="flex-1"
          >
{actionState === 'rejecting' ? (
  <Loader size={16} color="currentColor" />
) : (
  <>
    <XCircle className="h-4 w-4 mr-1" />
    Reject
  </>
)}
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Conversation Context */}
        <div>
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Conversation Context
          </label>
          {msgsLoading ? (
            <div className="flex items-center justify-center py-12"><Loader size={32} color="#a3a3a3" /></div>
          ) : messages.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-400">No messages found.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {messages.map((msg: any) => {
                const senderLevel = msg.sender === 'customer' ? 'info' : msg.sender === 'agent' ? 'success' : msg.sender === 'human_owner' ? 'purple' : 'neutral';
                return (
                <div key={msg.id} className="rounded-lg bg-zinc-800/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge level={senderLevel}>
                      {SENDER_LABELS[msg.sender] || msg.sender}
                    </StatusBadge>
                    <span className="text-xs text-zinc-500">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-300">{msg.content}</p>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

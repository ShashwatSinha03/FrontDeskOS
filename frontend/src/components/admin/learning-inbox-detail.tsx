'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { approveKnowledgeRequest, rejectKnowledgeRequest, fetchConversationMessages } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/design/status-badge';
import { X, CheckCircle, XCircle } from 'lucide-react';
import { KnowledgeRequest } from '@/types';

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
    <div className="border-l bg-card w-full lg:w-[480px] shrink-0 overflow-y-auto">
      <div className="sticky top-0 bg-card border-b px-4 py-3 flex items-center justify-between z-10">
        <h3 className="font-semibold text-sm">Request Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Question */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Unanswered Question</label>
          <p className="mt-1 text-sm bg-muted/30 rounded-lg p-3">{request.unansweredQuestion}</p>
        </div>

        {/* Suggested Answer */}
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Answer</label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              'Approving...'
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
              'Rejecting...'
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
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Conversation Context
          </label>
          {msgsLoading ? (
            <div className="mt-2 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : messages.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No messages found.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {messages.map((msg: any) => {
                const senderLevel = msg.sender === 'customer' ? 'info' : msg.sender === 'agent' ? 'success' : msg.sender === 'human_owner' ? 'purple' : 'neutral';
                return (
                <div key={msg.id} className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge level={senderLevel}>
                      {SENDER_LABELS[msg.sender] || msg.sender}
                    </StatusBadge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
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

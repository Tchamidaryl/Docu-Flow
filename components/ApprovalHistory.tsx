'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  User,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ApprovalHistoryItem {
  id: string;
  action: 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED' | 'DELEGATED' | 'SUBMITTED';
  actor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  timestamp: Date;
  comment?: string;
  status?: 'APPROVED' | 'REJECTED' | 'PENDING';
  nextActor?: {
    name: string;
    role: string;
  };
}

interface ApprovalHistoryProps {
  items: ApprovalHistoryItem[];
  isLoading?: boolean;
}

const ACTION_CONFIG = {
  APPROVED: {
    icon: CheckCircle2,
    label: 'Approved',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  REJECTED: {
    icon: XCircle,
    label: 'Rejected',
    color: 'text-destructive',
    bg: 'bg-destructive/5',
    border: 'border-destructive/20',
  },
  REVISION_REQUESTED: {
    icon: MessageSquare,
    label: 'Revision Requested',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  DELEGATED: {
    icon: ArrowRight,
    label: 'Delegated',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  SUBMITTED: {
    icon: Clock,
    label: 'Submitted',
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    border: 'border-border/50',
  },
};

export function ApprovalHistory({ items, isLoading }: ApprovalHistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-muted/30 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No approval history yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const config = ACTION_CONFIG[item.action];
        const Icon = config.icon;
        const date = new Date(item.timestamp);
        const dateStr = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const timeStr = date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={item.id}
            className={cn(
              'rounded-xl border p-4 transition-colors',
              config.bg,
              config.border
            )}
          >
            <div className="flex items-start gap-3">
              {/* Timeline icon */}
              <div className="pt-1">
                <Icon className={cn('w-5 h-5', config.color)} />
              </div>

              <div className="flex-1 min-w-0">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className={cn('text-sm font-semibold', config.color)}>
                      {config.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateStr} at {timeStr}
                    </p>
                  </div>
                  {item.status && (
                    <span
                      className={cn(
                        'text-[10px] font-semibold px-2 py-1 rounded-full shrink-0',
                        item.status === 'APPROVED'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                          : item.status === 'REJECTED'
                          ? 'bg-destructive/20 text-destructive'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      )}
                    >
                      {item.status}
                    </span>
                  )}
                </div>

                {/* Actor info */}
                <div className="flex items-center gap-2 mb-3">
                  {item.actor.avatar ? (
                    <img
                      src={item.actor.avatar}
                      alt={item.actor.name}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {item.actor.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {item.actor.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {item.actor.email}
                    </p>
                  </div>
                </div>

                {/* Comment */}
                {item.comment && (
                  <div className="bg-background/50 rounded-lg p-3 mb-3 border border-border/50">
                    <p className="text-xs text-foreground italic">
                      "{item.comment}"
                    </p>
                  </div>
                )}

                {/* Next actor */}
                {item.nextActor && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="w-3 h-3" />
                    <span>
                      Next: <strong>{item.nextActor.name}</strong> ({item.nextActor.role})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline connector */}
            {index < items.length - 1 && (
              <div className="ml-2.5 mt-3 h-3 border-l-2 border-border/30"></div>
            )}
          </div>
        );
      })}
    </div>
  );
}

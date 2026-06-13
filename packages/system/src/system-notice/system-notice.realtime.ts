import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SystemNoticeInboxRecord } from './system-notice.repository';

export type SystemNoticeRealtimeEventType =
  | 'notice.published'
  | 'notice.read'
  | 'snapshot';

export type SystemNoticeRealtimeEvent = {
  id: string;
  type: SystemNoticeRealtimeEventType;
  userId: string;
  unreadCount: number;
  noticeIds: readonly string[];
  notices: readonly SystemNoticeInboxRecord[];
  generatedAt: string;
};

export type SystemNoticeRealtimeListener = (
  event: SystemNoticeRealtimeEvent,
) => void;

@Injectable()
export class SystemNoticeRealtimeService {
  private readonly subscribers = new Map<
    string,
    Set<SystemNoticeRealtimeListener>
  >();

  subscribe(
    userId: string,
    listener: SystemNoticeRealtimeListener,
  ): () => void {
    const listeners = this.subscribers.get(userId) ?? new Set();
    listeners.add(listener);
    this.subscribers.set(userId, listeners);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.subscribers.delete(userId);
      }
    };
  }

  getSubscribedUserIds(): readonly string[] {
    return [...this.subscribers.entries()]
      .filter(([, listeners]) => listeners.size > 0)
      .map(([userId]) => userId);
  }

  publish(userId: string, event: SystemNoticeRealtimeEvent): void {
    for (const listener of this.subscribers.get(userId) ?? []) {
      listener(event);
    }
  }
}

export function createSystemNoticeRealtimeEvent(input: {
  type: SystemNoticeRealtimeEventType;
  userId: string;
  unreadCount: number;
  noticeIds?: readonly string[];
  notices?: readonly SystemNoticeInboxRecord[];
}): SystemNoticeRealtimeEvent {
  return {
    id: randomUUID(),
    type: input.type,
    userId: input.userId,
    unreadCount: input.unreadCount,
    noticeIds: input.noticeIds ?? [],
    notices: input.notices ?? [],
    generatedAt: new Date().toISOString(),
  };
}

import type { SdkRequest } from './rbac-client';
import { createCollaborationClient } from './collaboration-client';

describe('createCollaborationClient', () => {
  it('uses stable S10 collaboration API paths', async () => {
    const calls: Array<{ path: string; method?: string }> = [];
    const request: SdkRequest = async (path, options) => {
      calls.push({ path, method: options?.method });
      return {} as never;
    };
    const client = createCollaborationClient(request);

    await client.listMessages('token', {
      page: 2,
      pageSize: 20,
      recipient: 'admin',
      status: 'unread',
    });
    await client.getSummary('token');
    await client.getMessage('token', 'msg_1');
    await client.markMessageRead('token', 'msg_1');
    await client.archiveMessage('token', 'msg_1');
    await client.deleteMessage('token', 'msg_1');
    await client.getNotice('token', 'notice_1');
    await client.publishNotice('token', 'notice_1');
    await client.archiveNotice('token', 'notice_1');
    await client.getTodo('token', 'todo_1');
    await client.createTodo('token', {
      title: 'Review',
      sourceType: 'manual',
      assignee: 'admin',
      actor: 'system',
    });
    await client.assignTodo('token', 'todo_1', {
      assignee: 'reviewer',
      actor: 'admin',
    });
    await client.completeTodo('token', 'todo_1', { actor: 'reviewer' });
    await client.cancelTodo('token', 'todo_1', { actor: 'reviewer' });
    await client.getApprovalLiteRequest('token', 'approval_1');
    await client.approveApprovalLiteRequest('token', 'approval_1', {
      actor: 'admin',
    });
    await client.rejectApprovalLiteRequest('token', 'approval_1', {
      actor: 'admin',
    });

    expect(calls).toEqual([
      {
        path: '/collaboration/messages?page=2&pageSize=20&recipient=admin&status=unread',
      },
      { path: '/collaboration/summary' },
      { path: '/collaboration/messages/msg_1' },
      { path: '/collaboration/messages/msg_1/read', method: 'PATCH' },
      { path: '/collaboration/messages/msg_1/archive', method: 'PATCH' },
      { path: '/collaboration/messages/msg_1', method: 'DELETE' },
      { path: '/collaboration/notices/notice_1' },
      { path: '/collaboration/notices/notice_1/publish', method: 'PATCH' },
      { path: '/collaboration/notices/notice_1/archive', method: 'PATCH' },
      { path: '/collaboration/todos/todo_1' },
      { path: '/collaboration/todos', method: 'POST' },
      { path: '/collaboration/todos/todo_1/assign', method: 'PATCH' },
      { path: '/collaboration/todos/todo_1/complete', method: 'PATCH' },
      { path: '/collaboration/todos/todo_1/cancel', method: 'PATCH' },
      { path: '/collaboration/approvals/approval_1' },
      { path: '/collaboration/approvals/approval_1/approve', method: 'PATCH' },
      { path: '/collaboration/approvals/approval_1/reject', method: 'PATCH' },
    ]);
  });
});

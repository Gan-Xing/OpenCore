import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SeedCollaborationRepository } from './seed-collaboration.repository';

describe('CollaborationRepository', () => {
  it('builds a bounded collaboration center summary', async () => {
    const repository = new SeedCollaborationRepository();

    expect(await repository.getSummary()).toMatchObject({
      messages: { total: 1, unread: 1 },
      notices: { total: 1, draft: 1 },
      todos: { total: 1, pending: 1 },
      approvals: { total: 1, pending: 1 },
    });
  });

  it('filters collaboration lists by bounded query fields', async () => {
    const repository = new SeedCollaborationRepository();

    await expect(
      repository.listMessages({ status: 'unread', recipient: 'admin' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listTodos({ status: 'pending', sourceType: 'manual' }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listApprovalLiteRequests({
        status: 'pending',
        approver: 'admin',
      }),
    ).resolves.toMatchObject({ total: 1 });
    await expect(
      repository.listNotices({ status: 'published' }),
    ).resolves.toMatchObject({ total: 0 });
  });

  it('supports message read, archive, and delete policies', async () => {
    const repository = new SeedCollaborationRepository();
    const message = await repository.createMessage({
      title: 'Policy update',
      body: 'Please read the policy update.',
      sender: 'admin',
      recipient: 'operator',
    });

    await expect(repository.markMessageRead(message.id)).resolves.toMatchObject(
      {
        status: 'read',
        readAt: expect.any(String),
      },
    );
    await expect(repository.getMessage(message.id)).resolves.toMatchObject({
      id: message.id,
      status: 'read',
    });
    await expect(repository.archiveMessage(message.id)).resolves.toMatchObject({
      status: 'archived',
      archivedAt: expect.any(String),
    });
    await expect(repository.deleteMessage(message.id)).resolves.toEqual({
      deleted: true,
    });
    await expect(repository.getMessage(message.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(repository.markMessageRead(message.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(repository.archiveMessage(message.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(repository.deleteMessage(message.id)).rejects.toThrow(
      BadRequestException,
    );
    expect(
      (await repository.listMessages()).items.some(
        (item) => item.id === message.id,
      ),
    ).toBe(false);
  });

  it('supports notice draft, publish, archive lifecycle', async () => {
    const repository = new SeedCollaborationRepository();
    const notice = await repository.createNotice({
      title: 'Maintenance',
      body: 'Maintenance starts tonight.',
      targetAudience: ['admin', 'ops'],
      createdBy: 'admin',
    });

    expect(notice.status).toBe('draft');
    await expect(repository.getNotice(notice.id)).resolves.toMatchObject({
      id: notice.id,
      status: 'draft',
    });
    await expect(repository.publishNotice(notice.id)).resolves.toMatchObject({
      status: 'published',
      publishedAt: expect.any(String),
    });
    await expect(repository.archiveNotice(notice.id)).resolves.toMatchObject({
      status: 'archived',
      archivedAt: expect.any(String),
    });
    await expect(repository.publishNotice(notice.id)).rejects.toThrow(
      BadRequestException,
    );
    await expect(repository.archiveNotice(notice.id)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('tracks todo assignment and terminal status timeline', async () => {
    const repository = new SeedCollaborationRepository();
    const todo = await repository.createTodo({
      title: 'Review request',
      sourceType: 'approval-lite',
      businessType: 'collaboration.approval-lite',
      businessId: 'approval_1',
      assignee: 'admin',
      actor: 'system',
    });

    const assigned = await repository.assignTodo(todo.id, {
      assignee: 'reviewer',
      actor: 'admin',
    });
    const completed = await repository.completeTodo(todo.id, {
      actor: 'reviewer',
    });

    await expect(repository.getTodo(todo.id)).resolves.toMatchObject({
      id: todo.id,
      status: 'completed',
    });
    expect(assigned.status).toBe('assigned');
    expect(completed.status).toBe('completed');
    expect(completed.timeline.map((entry) => entry.action)).toEqual([
      'created',
      'assigned',
      'completed',
    ]);
    await expect(
      repository.cancelTodo(todo.id, { actor: 'reviewer' }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      repository.assignTodo(todo.id, {
        assignee: 'admin',
        actor: 'reviewer',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('implements single-step approval-lite approve and reject decisions', async () => {
    const repository = new SeedCollaborationRepository();
    const approval = await repository.createApprovalLiteRequest({
      title: 'Release approval',
      requester: 'developer',
      approver: 'admin',
      businessType: 'release',
      businessId: '2026-06-10',
    });

    await expect(
      repository.approveApprovalLiteRequest(approval.id, {
        actor: 'admin',
        comment: 'Approved',
      }),
    ).resolves.toMatchObject({
      status: 'approved',
      decidedAt: expect.any(String),
      comment: 'Approved',
    });
    await expect(
      repository.getApprovalLiteRequest(approval.id),
    ).resolves.toMatchObject({
      id: approval.id,
      status: 'approved',
    });
    await expect(
      repository.rejectApprovalLiteRequest(approval.id, {
        actor: 'admin',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

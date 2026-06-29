import { runWithRequestContext } from '@opencore/core';
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

  it('scopes messages by the active tenant context', async () => {
    const repository = new SeedCollaborationRepository();
    const foreignMessage = await runInTenant('tenant_foreign', () =>
      repository.createMessage({
        title: 'Foreign message',
        body: 'Foreign body',
        sender: 'foreign',
        recipient: 'admin',
      }),
    );

    await expect(
      repository.listMessages({ recipient: 'admin' }),
    ).resolves.toMatchObject({
      items: expect.not.arrayContaining([
        expect.objectContaining({ id: foreignMessage.id }),
      ]),
    });
    await expectHttpExceptionCode(
      repository.getMessage(foreignMessage.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      repository.markMessageRead(foreignMessage.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expect(
      runInTenant('tenant_foreign', () =>
        repository.getMessage(foreignMessage.id),
      ),
    ).resolves.toMatchObject({
      id: foreignMessage.id,
      tenantId: 'tenant_foreign',
    });
  });

  it('scopes notices by the active tenant context', async () => {
    const repository = new SeedCollaborationRepository();
    const foreignNotice = await runInTenant('tenant_foreign', () =>
      repository.createNotice({
        title: 'Foreign notice',
        body: 'Foreign notice body',
        targetAudience: ['admin'],
        createdBy: 'foreign',
      }),
    );

    await expect(
      repository.listNotices({ status: 'draft' }),
    ).resolves.toMatchObject({
      items: expect.not.arrayContaining([
        expect.objectContaining({ id: foreignNotice.id }),
      ]),
    });
    await expectHttpExceptionCode(
      repository.getNotice(foreignNotice.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      repository.publishNotice(foreignNotice.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expect(
      runInTenant('tenant_foreign', () =>
        repository.getNotice(foreignNotice.id),
      ),
    ).resolves.toMatchObject({
      id: foreignNotice.id,
      tenantId: 'tenant_foreign',
    });
  });

  it('scopes todos by the active tenant context', async () => {
    const repository = new SeedCollaborationRepository();
    const foreignTodo = await runInTenant('tenant_foreign', () =>
      repository.createTodo({
        title: 'Foreign todo',
        sourceType: 'manual',
        businessType: 'foreign',
        businessId: 'todo',
        assignee: 'foreign-admin',
        actor: 'foreign-admin',
      }),
    );

    await expect(
      repository.listTodos({ status: 'pending' }),
    ).resolves.toMatchObject({
      items: expect.not.arrayContaining([
        expect.objectContaining({ id: foreignTodo.id }),
      ]),
    });
    await expectHttpExceptionCode(
      repository.getTodo(foreignTodo.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      repository.assignTodo(foreignTodo.id, {
        assignee: 'admin',
        actor: 'admin',
      }),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expect(
      runInTenant('tenant_foreign', () => repository.getTodo(foreignTodo.id)),
    ).resolves.toMatchObject({
      id: foreignTodo.id,
      tenantId: 'tenant_foreign',
    });
  });

  it('scopes approval-lite requests by the active tenant context', async () => {
    const repository = new SeedCollaborationRepository();
    const foreignApproval = await runInTenant('tenant_foreign', () =>
      repository.createApprovalLiteRequest({
        title: 'Foreign approval',
        requester: 'foreign-developer',
        approver: 'foreign-admin',
        businessType: 'foreign',
        businessId: 'approval',
      }),
    );

    await expect(
      repository.listApprovalLiteRequests({ status: 'pending' }),
    ).resolves.toMatchObject({
      items: expect.not.arrayContaining([
        expect.objectContaining({ id: foreignApproval.id }),
      ]),
    });
    await expectHttpExceptionCode(
      repository.getApprovalLiteRequest(foreignApproval.id),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      repository.approveApprovalLiteRequest(foreignApproval.id, {
        actor: 'admin',
      }),
      'COLLABORATION_RESOURCE_NOT_FOUND',
    );
    await expect(
      runInTenant('tenant_foreign', () =>
        repository.getApprovalLiteRequest(foreignApproval.id),
      ),
    ).resolves.toMatchObject({
      id: foreignApproval.id,
      tenantId: 'tenant_foreign',
    });
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
    await expectHttpExceptionCode(
      repository.getMessage(message.id),
      'COLLABORATION_MESSAGE_NOT_FOUND',
    );
    await expectHttpExceptionCode(
      repository.markMessageRead(message.id),
      'COLLABORATION_MESSAGE_READ_STATUS_INVALID',
    );
    await expectHttpExceptionCode(
      repository.archiveMessage(message.id),
      'COLLABORATION_MESSAGE_DELETED',
    );
    await expectHttpExceptionCode(
      repository.deleteMessage(message.id),
      'COLLABORATION_MESSAGE_DELETED',
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
    await expectHttpExceptionCode(
      repository.publishNotice(notice.id),
      'COLLABORATION_NOTICE_PUBLISH_STATUS_INVALID',
    );
    await expectHttpExceptionCode(
      repository.archiveNotice(notice.id),
      'COLLABORATION_NOTICE_ARCHIVED',
    );
    await expectHttpExceptionCode(
      repository.getNotice('missing_notice'),
      'COLLABORATION_RESOURCE_NOT_FOUND',
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
    await expectHttpExceptionCode(
      repository.cancelTodo(todo.id, { actor: 'reviewer' }),
      'COLLABORATION_TODO_STATUS_TERMINAL',
    );
    await expectHttpExceptionCode(
      repository.assignTodo(todo.id, {
        assignee: 'admin',
        actor: 'reviewer',
      }),
      'COLLABORATION_TODO_STATUS_TERMINAL',
    );
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
    await expectHttpExceptionCode(
      repository.rejectApprovalLiteRequest(approval.id, {
        actor: 'admin',
      }),
      'COLLABORATION_RESOURCE_NOT_PENDING',
    );
  });
});

async function expectHttpExceptionCode(
  promise: Promise<unknown>,
  code: string,
): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(getHttpExceptionResponse(error)).toMatchObject({ code });
    return;
  }

  throw new Error(`Expected HTTP exception code ${code}`);
}

function getHttpExceptionResponse(error: unknown): unknown {
  if (
    error &&
    typeof error === 'object' &&
    'getResponse' in error &&
    typeof error.getResponse === 'function'
  ) {
    return error.getResponse();
  }

  return undefined;
}

function runInTenant<T>(tenantId: string, callback: () => T): T {
  return runWithRequestContext(
    {
      requestId: `test-${tenantId}`,
      traceId: `test-${tenantId}`,
      tenantId,
    },
    callback,
  );
}

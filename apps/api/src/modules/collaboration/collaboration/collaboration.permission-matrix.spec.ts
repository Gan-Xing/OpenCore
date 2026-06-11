import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { CollaborationController } from './collaboration.controller';

describe('CollaborationController permission matrix', () => {
  it('guards message, notice, todo, and approval-lite routes', () => {
    const expected: Array<[keyof CollaborationController, string[]]> = [
      ['listMessages', ['collaboration:message:read']],
      ['getMessage', ['collaboration:message:read']],
      ['createMessage', ['collaboration:message:create']],
      ['markMessageRead', ['collaboration:message:update']],
      ['archiveMessage', ['collaboration:message:update']],
      ['deleteMessage', ['collaboration:message:delete']],
      ['listNotices', ['collaboration:notice:read']],
      ['getNotice', ['collaboration:notice:read']],
      ['createNotice', ['collaboration:notice:create']],
      ['publishNotice', ['collaboration:notice:update']],
      ['archiveNotice', ['collaboration:notice:update']],
      ['listTodos', ['collaboration:todo:read']],
      ['getTodo', ['collaboration:todo:read']],
      ['createTodo', ['collaboration:todo:create']],
      ['assignTodo', ['collaboration:todo:update']],
      ['completeTodo', ['collaboration:todo:update']],
      ['cancelTodo', ['collaboration:todo:update']],
      ['listApprovalLiteRequests', ['collaboration:approval-lite:read']],
      ['getApprovalLiteRequest', ['collaboration:approval-lite:read']],
      ['createApprovalLiteRequest', ['collaboration:approval-lite:create']],
      ['approveApprovalLiteRequest', ['collaboration:approval-lite:update']],
      ['rejectApprovalLiteRequest', ['collaboration:approval-lite:update']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          CollaborationController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

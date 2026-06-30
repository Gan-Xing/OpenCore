import 'reflect-metadata';
import { REQUIRED_PERMISSIONS_KEY } from '../../core/rbac/permissions.decorator';
import { TicketController } from './ticket.controller';

describe('TicketController permission matrix', () => {
  it('guards ticket category and ticket routes', () => {
    const expected: Array<[keyof TicketController, string[]]> = [
      ['listCategories', ['collaboration:ticket:read']],
      ['createCategory', ['collaboration:ticket:create']],
      ['updateCategory', ['collaboration:ticket:update']],
      ['listTickets', ['collaboration:ticket:read']],
      ['getDashboardSummary', ['collaboration:ticket:read']],
      ['exportTickets', ['collaboration:ticket:read']],
      ['exportTicketTransitions', ['collaboration:ticket:read']],
      ['sendSlaReminders', ['collaboration:ticket:update']],
      ['batchAssignTickets', ['collaboration:ticket:assign']],
      ['batchCloseTickets', ['collaboration:ticket:close']],
      ['batchArchiveTickets', ['collaboration:ticket:delete']],
      ['getTicket', ['collaboration:ticket:read']],
      ['createTicket', ['collaboration:ticket:create']],
      ['updateTicket', ['collaboration:ticket:update']],
      ['assignTicket', ['collaboration:ticket:assign']],
      ['changeTicketStatus', ['collaboration:ticket:update']],
      ['closeTicket', ['collaboration:ticket:close']],
      ['reopenTicket', ['collaboration:ticket:update']],
      ['addComment', ['collaboration:ticket:comment']],
      ['addAttachment', ['collaboration:ticket:update']],
      ['archiveTicket', ['collaboration:ticket:delete']],
    ];

    for (const [method, permissions] of expected) {
      expect(
        Reflect.getMetadata(
          REQUIRED_PERMISSIONS_KEY,
          TicketController.prototype[method],
        ),
      ).toEqual(permissions);
    }
  });
});

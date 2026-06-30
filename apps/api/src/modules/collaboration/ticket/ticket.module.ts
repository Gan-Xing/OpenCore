import { Module } from '@nestjs/common';
import { DatabaseModule } from '@opencore/database';
import { PrismaTicketRepository } from './prisma-ticket.repository';
import { TicketController } from './ticket.controller';
import { TicketRepository } from './ticket.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [TicketController],
  providers: [
    {
      provide: TicketRepository,
      useClass: PrismaTicketRepository,
    },
  ],
  exports: [TicketRepository],
})
export class TicketModule {}

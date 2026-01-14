import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { SyncProcessor } from './sync.processor';
import { LeadsModule } from '../leads/leads.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'lead-sync',
    }),
    LeadsModule,
  ],
  controllers: [SyncController],
  providers: [SyncService, SyncProcessor],
})
export class SyncModule {}

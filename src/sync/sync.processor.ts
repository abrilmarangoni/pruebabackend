import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SyncService } from './sync.service';

@Processor('lead-sync')
export class SyncProcessor {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(private readonly syncService: SyncService) {}

  @Process('sync-leads')
  async handleSyncLeads(job: Job<{ count: number }>): Promise<void> {
    this.logger.log(`Processing sync job ${job.id} for ${job.data.count} leads`);

    try {
      const result = await this.syncService.syncLeadsFromApi(job.data.count);
      this.logger.log(
        `Job ${job.id} completed: ${result.imported} imported, ${result.skipped} skipped`,
      );
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}

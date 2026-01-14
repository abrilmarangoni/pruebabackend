import { Controller, Post, UseGuards, Logger, Query } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';

@Controller('sync')
@UseGuards(ApiKeyGuard)
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(private readonly syncService: SyncService) {}

  @Post('trigger')
  async triggerSync(
    @Query('count') count?: string,
  ): Promise<{ message: string }> {
    const syncCount = count ? parseInt(count, 10) : 10;
    this.logger.log(`POST /sync/trigger - Triggering manual sync for ${syncCount} leads`);
    return this.syncService.triggerSync(syncCount);
  }
}

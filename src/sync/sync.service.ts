import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LeadsService } from '../leads/leads.service';

interface RandomUserResponse {
  results: RandomUser[];
}

interface RandomUser {
  login: {
    uuid: string;
  };
  name: {
    first: string;
    last: string;
  };
  email: string;
  phone: string;
  location: {
    city: string;
    country: string;
  };
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly leadsService: LeadsService,
    @InjectQueue('lead-sync') private readonly syncQueue: Queue,
  ) {}

  // Run every hour
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledSync(): Promise<void> {
    this.logger.log('Scheduled sync triggered - adding job to queue');
    await this.syncQueue.add('sync-leads', { count: 10 });
  }

  // Manual trigger endpoint
  async triggerSync(count: number = 10): Promise<{ message: string }> {
    this.logger.log(`Manual sync triggered for ${count} leads`);
    await this.syncQueue.add('sync-leads', { count });
    return { message: `Sync job queued for ${count} leads` };
  }

  async syncLeadsFromApi(count: number = 10): Promise<{
    imported: number;
    skipped: number;
  }> {
    this.logger.log(`Starting sync of ${count} leads from RandomUser API`);

    try {
      const response = await fetch(
        `https://randomuser.me/api/?results=${count}&nat=us,gb,au`,
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data: RandomUserResponse = await response.json();
      const users = data.results;

      let imported = 0;
      let skipped = 0;

      for (const user of users) {
        const leadData = {
          firstName: user.name.first,
          lastName: user.name.last,
          email: user.email,
          phone: user.phone,
          city: user.location.city,
          country: user.location.country,
          source: 'randomuser',
          externalId: user.login.uuid,
        };

        const result = await this.leadsService.createFromExternal(leadData);

        if (result) {
          imported++;
          this.logger.log(`Imported lead: ${user.email}`);
        } else {
          skipped++;
          this.logger.log(`Skipped duplicate lead: ${user.email}`);
        }
      }

      this.logger.log(
        `Sync completed: ${imported} imported, ${skipped} skipped`,
      );

      return { imported, skipped };
    } catch (error) {
      this.logger.error(`Sync failed: ${error.message}`);
      throw error;
    }
  }
}

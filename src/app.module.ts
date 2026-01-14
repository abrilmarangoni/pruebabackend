import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { redisStore } from 'cache-manager-ioredis-yet';
import Redis from 'ioredis';

import { LeadsModule } from './leads/leads.module';
import { AuthModule } from './auth/auth.module';
import { AiModule } from './ai/ai.module';
import { SyncModule } from './sync/sync.module';
import { Lead } from './leads/entities/lead.entity';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database - TypeORM with PostgreSQL (Supabase)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Lead],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: {
          rejectUnauthorized: false,
        },
      }),
    }),

    // Cache - Redis (Upstash with TLS)
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        return {
          store: await redisStore({
            url: redisUrl,
            tls: {},
            ttl: 300000,
          }),
        };
      },
    }),

    // Queue - Bull with Redis (Upstash with TLS)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL') || '';
        return {
          createClient: (type) => {
            return new Redis(redisUrl, {
              maxRetriesPerRequest: type === 'client' ? 20 : null,
              enableReadyCheck: false,
              tls: {},
            });
          },
        };
      },
    }),

    // Scheduler for CRON jobs
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    AiModule,
    LeadsModule,
    SyncModule,
  ],
})
export class AppModule {}

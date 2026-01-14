import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    const validApiKey = this.configService.get<string>('API_KEY');

    if (!apiKey) {
      this.logger.warn('API Key not provided in request');
      throw new UnauthorizedException('API Key is required');
    }

    if (apiKey !== validApiKey) {
      this.logger.warn('Invalid API Key provided');
      throw new UnauthorizedException('Invalid API Key');
    }

    this.logger.log('API Key validated successfully');
    return true;
  }

  private extractApiKey(request: Request): string | undefined {
    // Check header first (preferred method)
    const headerKey = request.headers['x-api-key'] as string;
    if (headerKey) {
      return headerKey;
    }

    // Check query parameter as fallback
    const queryKey = request.query['api_key'] as string;
    if (queryKey) {
      return queryKey;
    }

    return undefined;
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { AiService } from '../ai/ai.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ApiKeyGuard } from '../auth/guards/api-key.guard';
import { Lead } from './entities/lead.entity';

@Controller()
@UseGuards(ApiKeyGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(
    private readonly leadsService: LeadsService,
    private readonly aiService: AiService,
  ) {}

  @Post('create-lead')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createLeadDto: CreateLeadDto): Promise<Lead> {
    this.logger.log('POST /create-lead - Creating new lead');
    return this.leadsService.create(createLeadDto);
  }

  @Get('leads')
  async findAll(): Promise<Lead[]> {
    this.logger.log('GET /leads - Fetching all leads');
    return this.leadsService.findAll();
  }

  @Get('leads/:id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Lead> {
    this.logger.log(`GET /leads/${id} - Fetching lead by ID`);
    return this.leadsService.findOne(id);
  }

  @Post('leads/:id/summarize')
  @HttpCode(HttpStatus.OK)
  async summarize(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ summary: string; next_action: string }> {
    this.logger.log(`POST /leads/${id}/summarize - Generating AI summary`);

    // Get the lead first
    const lead = await this.leadsService.findOne(id);

    // Generate summary with AI
    const { summary, next_action } = await this.aiService.generateLeadSummary(lead);

    // Update the lead with the summary
    await this.leadsService.updateSummary(id, summary, next_action);

    this.logger.log(`Summary generated and saved for lead ${id}`);

    return { summary, next_action };
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Lead } from './entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);
  private readonly CACHE_TTL = 300; // 5 minutes in seconds

  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async create(createLeadDto: CreateLeadDto): Promise<Lead> {
    this.logger.log(`Creating lead with email: ${createLeadDto.email}`);

    // Check if lead with email already exists
    const existingLead = await this.leadRepository.findOne({
      where: { email: createLeadDto.email },
    });

    if (existingLead) {
      throw new ConflictException(
        `Lead with email ${createLeadDto.email} already exists`,
      );
    }

    const lead = this.leadRepository.create({
      ...createLeadDto,
      source: 'manual',
    });

    const savedLead = await this.leadRepository.save(lead);
    this.logger.log(`Lead created successfully with ID: ${savedLead.id}`);

    return savedLead;
  }

  async findAll(): Promise<Lead[]> {
    this.logger.log('Fetching all leads');
    return this.leadRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Lead> {
    const cacheKey = `lead:${id}`;

    // Try to get from cache first
    const cachedLead = await this.cacheManager.get<Lead>(cacheKey);
    if (cachedLead) {
      this.logger.log(`Lead ${id} found in cache`);
      return cachedLead;
    }

    // If not in cache, get from database
    this.logger.log(`Lead ${id} not in cache, fetching from database`);
    const lead = await this.leadRepository.findOne({ where: { id } });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    // Store in cache
    await this.cacheManager.set(cacheKey, lead, this.CACHE_TTL);
    this.logger.log(`Lead ${id} cached successfully`);

    return lead;
  }

  async updateSummary(
    id: string,
    summary: string,
    nextAction: string,
  ): Promise<Lead> {
    const lead = await this.findOne(id);

    lead.summary = summary;
    lead.nextAction = nextAction;

    const updatedLead = await this.leadRepository.save(lead);

    // Invalidate cache
    const cacheKey = `lead:${id}`;
    await this.cacheManager.del(cacheKey);
    this.logger.log(`Cache invalidated for lead ${id}`);

    return updatedLead;
  }

  async createFromExternal(leadData: Partial<Lead>): Promise<Lead | null> {
    // Check for duplicates by email or externalId
    const existingByEmail = await this.leadRepository.findOne({
      where: { email: leadData.email },
    });

    if (existingByEmail) {
      this.logger.log(
        `Lead with email ${leadData.email} already exists, skipping`,
      );
      return null;
    }

    if (leadData.externalId) {
      const existingByExternalId = await this.leadRepository.findOne({
        where: { externalId: leadData.externalId },
      });

      if (existingByExternalId) {
        this.logger.log(
          `Lead with externalId ${leadData.externalId} already exists, skipping`,
        );
        return null;
      }
    }

    const lead = this.leadRepository.create(leadData);
    return this.leadRepository.save(lead);
  }
}

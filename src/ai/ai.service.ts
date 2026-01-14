import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Lead } from '../leads/entities/lead.entity';

interface LeadSummaryResponse {
  summary: string;
  next_action: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  async generateLeadSummary(lead: Lead): Promise<LeadSummaryResponse> {
    this.logger.log(`Generating AI summary for lead: ${lead.id}`);

    const prompt = `Analyze the following lead information and provide a brief summary and a recommended next action.

Lead Information:
- Name: ${lead.firstName} ${lead.lastName}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Company: ${lead.company || 'Not provided'}
- City: ${lead.city || 'Not provided'}
- Country: ${lead.country || 'Not provided'}
- Source: ${lead.source}
- Created: ${lead.createdAt}

Respond ONLY with a valid JSON object in this exact format:
{
  "summary": "A brief 2-3 sentence summary of this lead",
  "next_action": "A specific recommended next action to take with this lead"
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a sales assistant that analyzes leads and provides actionable insights. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const responseText = completion.choices[0]?.message?.content?.trim();

      if (!responseText) {
        throw new Error('Empty response from OpenAI');
      }

      this.logger.log(`AI response received for lead ${lead.id}`);

      // Parse the JSON response
      const parsed = JSON.parse(responseText) as LeadSummaryResponse;

      // Validate required fields
      if (!parsed.summary || !parsed.next_action) {
        throw new Error('Invalid response structure from AI');
      }

      return {
        summary: parsed.summary,
        next_action: parsed.next_action,
      };
    } catch (error) {
      this.logger.error(`Error generating AI summary: ${error.message}`);

      // Return a fallback response
      return {
        summary: `Lead ${lead.firstName} ${lead.lastName} from ${lead.source} source. Contact: ${lead.email}.`,
        next_action:
          'Review lead information and schedule an initial contact via email.',
      };
    }
  }
}

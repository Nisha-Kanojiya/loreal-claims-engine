import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Claim } from '@prisma/client';
import OpenAI from 'openai';
import { z } from 'zod';
import { ClinicalEvidenceDto } from './dto/assess-claim.dto';

// Server-side contract for the LLM verdict — never trust raw model output.
const VerdictSchema = z.object({
  justified: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
});
export type AssessmentVerdict = z.infer<typeof VerdictSchema>;

// Strict JSON-Schema response format: the model is constrained to exactly this shape.
const CLAIM_VERDICT_JSON_SCHEMA = {
  name: 'claim_verdict',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      justified: {
        type: 'boolean',
        description: 'True only if the clinical study substantiates the specific claim (magnitude AND time frame).',
      },
      confidence: {
        type: 'number',
        description: 'Confidence in the verdict between 0 and 1.',
      },
      reasoning: {
        type: 'string',
        description: '2-4 sentence scientific justification referencing study design, statistics and claim fit.',
      },
    },
    required: ['justified', 'confidence', 'reasoning'],
  },
} as const;

const SYSTEM_PROMPT = `You are a senior cosmetic claims-substantiation assessor for a global beauty R&I organisation.
Evaluate whether the provided clinical study scientifically justifies the proposed product claim,
applying the EU Cosmetics Regulation 1223/2009 common criteria (legal compliance, truthfulness,
evidential support, honesty, fairness, informed decision-making).

Assess rigorously:
1. Study design quality (randomisation, blinding, control group, sample size).
2. Measurement objectivity (instrumental vs self-assessment) and statistical significance.
3. Fit to the claim: magnitude of effect AND claimed time frame must both be supported.
4. Relevance of the tested formulation to the claim's active ingredients.

Be conservative: marketing language in the study does not substitute for evidence.
If the study does not fully support the magnitude or duration of the claim, set justified=false.`;

@Injectable()
export class OpenAiAssessorService {
  private readonly logger = new Logger(OpenAiAssessorService.name);
  private readonly client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined, // defaults to https://api.openai.com/v1
  });
  readonly model = process.env.OPENAI_MODEL ?? 'gpt-5.4';

  /** Evaluate an existing claim (from the DB) against freshly submitted clinical evidence. */
  async assessClaim(claim: Claim, evidence: ClinicalEvidenceDto): Promise<AssessmentVerdict> {
    const userPrompt = JSON.stringify(
      {
        product: claim.productName,
        claim: claim.claimText,
        claimType: claim.claimType,
        formula_INCI: claim.formula ?? null,
        clinical_study: evidence,
      },
      null,
      2,
    );

    let raw: string;
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_schema', json_schema: CLAIM_VERDICT_JSON_SCHEMA },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      });
      raw = completion.choices[0]?.message?.content ?? '';
    } catch (err) {
      this.logger.error(`OpenAI call failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('LLM assessment service unavailable');
    }

    try {
      return VerdictSchema.parse(JSON.parse(raw));
    } catch {
      this.logger.error(`Unparseable LLM verdict: ${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException('LLM returned an invalid verdict payload');
    }
  }
}

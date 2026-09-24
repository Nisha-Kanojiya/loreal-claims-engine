import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalEvidenceDto, CreateClaimDto } from './dto/assess-claim.dto';
import { AssessmentVerdict, OpenAiAssessorService } from './openai-assessor.service';

@Injectable()
export class ClaimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessor: OpenAiAssessorService,
  ) {}

  /**
   * Scientist step: create the claim only.
   * Status FORMULATION_TESTING — it now awaits the evaluator's clinical study.
   * No LLM call happens here.
   */
  create(dto: CreateClaimDto) {
    return this.prisma.claim.create({
      data: {
        productName: dto.productName,
        claimText: dto.claimText,
        claimType: dto.claimType as never,
        formula: dto.formula,
        submittedBy: dto.submittedBy ?? 'R&I Scientist',
        status: 'FORMULATION_TESTING',
      },
    });
  }

  /**
   * Evaluator step: attach clinical evidence to an existing claim and run the LLM assessment.
   * 1. Load claim + eligibility check (must be FORMULATION_TESTING).
   * 2. Flip status to UNDER_EVALUATION.
   * 3. LLM verdict (strict JSON schema + zod) — on failure, roll back to FORMULATION_TESTING
   *    and persist nothing.
   * 4. Persist verdict + flip to ASSESSED in one transaction.
   */
  async assess(id: string, evidence: ClinicalEvidenceDto) {
    const claim = await this.prisma.claim.findUnique({ where: { id } });
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);
    if (claim.status !== 'FORMULATION_TESTING') {
      throw new ConflictException(`Claim is not awaiting evaluation (current status: ${claim.status})`);
    }

    await this.prisma.claim.update({ where: { id }, data: { status: 'UNDER_EVALUATION' } });

    let verdict: AssessmentVerdict;
    try {
      verdict = await this.assessor.assessClaim(claim, evidence);
    } catch (err) {
      await this.prisma.claim.update({ where: { id }, data: { status: 'FORMULATION_TESTING' } });
      throw err;
    }

    const [assessment, updatedClaim] = await this.prisma.$transaction([
      this.prisma.assessment.create({
        data: {
          claimId: id,
          studyTitle: evidence.studyTitle,
          methodology: evidence.methodology,
          resultsSummary: evidence.resultsSummary,
          sampleSize: evidence.sampleSize,
          durationWeeks: evidence.durationWeeks,
          justified: verdict.justified,
          confidence: verdict.confidence,
          reasoning: verdict.reasoning,
          model: this.assessor.model,
        },
      }),
      this.prisma.claim.update({ where: { id }, data: { status: 'ASSESSED' } }),
    ]);

    return { claim: updatedClaim, assessment };
  }

  findAll() {
    return this.prisma.claim.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assessments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  findOne(id: string) {
    return this.prisma.claim.findUnique({
      where: { id },
      include: { assessments: { orderBy: { createdAt: 'desc' } } },
    });
  }
}

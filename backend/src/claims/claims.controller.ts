import { Body, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { ClinicalEvidenceDto, CreateClaimDto } from './dto/assess-claim.dto';

@Controller('api/claims')
export class ClaimsController {
  constructor(private readonly claims: ClaimsService) {}

  /** Scientist: create a claim (status FORMULATION_TESTING). No LLM call. */
  @Post()
  create(@Body() dto: CreateClaimDto) {
    return this.claims.create(dto);
  }

  /** Evaluator: attach clinical evidence to an existing claim and run the AI assessment. */
  @Post(':id/assess')
  assess(@Param('id', ParseUUIDPipe) id: string, @Body() evidence: ClinicalEvidenceDto) {
    return this.claims.assess(id, evidence);
  }

  /** Pipeline overview for the UI (each claim with its latest assessment). */
  @Get()
  findAll() {
    return this.claims.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const claim = await this.claims.findOne(id);
    if (!claim) throw new NotFoundException(`Claim ${id} not found`);
    return claim;
  }
}

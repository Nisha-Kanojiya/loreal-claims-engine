import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CLAIM_TYPES = [
  'ANTI_AGING',
  'HYDRATION',
  'BRIGHTENING',
  'UV_PROTECTION',
  'HAIR_REPAIR',
  'SENSITIVE_SKIN',
] as const;

/** Scientist payload: claim + formula only. No clinical evidence here. */
export class CreateClaimDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  productName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  claimText: string;

  @IsIn(CLAIM_TYPES)
  claimType: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  formula?: string; // INCI list from the scientist's formulation test

  @IsOptional()
  @IsString()
  @MaxLength(120)
  submittedBy?: string;
}

/** Evaluator payload: clinical evidence for an existing claim. */
export class ClinicalEvidenceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  studyTitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  methodology: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  resultsSummary: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  durationWeeks?: number;
}

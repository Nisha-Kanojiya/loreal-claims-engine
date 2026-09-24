import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { OpenAiAssessorService } from './openai-assessor.service';

@Module({
  controllers: [ClaimsController],
  providers: [ClaimsService, OpenAiAssessorService, PrismaService],
})
export class ClaimsModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClaimsModule } from './claims/claims.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ClaimsModule],
})
export class AppModule {}

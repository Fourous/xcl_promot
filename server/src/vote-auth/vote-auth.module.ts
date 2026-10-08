import { Module } from '@nestjs/common';
import { VoteAuthController } from './vote-auth.controller';
import { VoteAuthService } from './vote-auth.service';

@Module({
  controllers: [VoteAuthController],
  providers: [VoteAuthService],
})
export class VoteAuthModule {}

import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CommonModule } from '@/common/common.module';
import { CandidatesModule } from '@/candidates/candidates.module';
import { ConfigModule } from '@/config/config.module';
import { VoteAuthModule } from '@/vote-auth/vote-auth.module';
import { VotesModule } from '@/votes/votes.module';
import { ResultsModule } from '@/results/results.module';
import { AdminModule } from '@/admin/admin.module';
import { ImportModule } from '@/import/import.module';
import { StatsModule } from '@/stats/stats.module';
import { SystemModule } from '@/system/system.module';

@Module({
  imports: [
    CommonModule,
    CandidatesModule,
    ConfigModule,
    VoteAuthModule,
    VotesModule,
    ResultsModule,
    AdminModule,
    ImportModule,
    StatsModule,
    SystemModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

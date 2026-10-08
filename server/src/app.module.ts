import { Module } from '@nestjs/common';
import { AppController } from '@/app.controller';
import { AppService } from '@/app.service';
import { CandidatesModule } from '@/candidates/candidates.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [CandidatesModule, ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

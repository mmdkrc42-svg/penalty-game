import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AntiFraudService } from './anti-fraud.service';
import { GameRound } from '../games/entities/game-round.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([GameRound])],
  providers: [AntiFraudService],
  exports: [AntiFraudService],
})
export class AntiFraudModule {}

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';
import { UserAchievement } from './achievement.entity';
import { User } from '../users/entities/user.entity';
import { EconomyModule } from '../economy/economy.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserAchievement, User]), EconomyModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
  exports: [AchievementsService],
})
export class AchievementsModule {}

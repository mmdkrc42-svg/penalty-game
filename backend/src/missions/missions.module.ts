import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { UserMission } from './mission.entity';
import { User } from '../users/entities/user.entity';
import { EconomyModule } from '../economy/economy.module';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserMission, User]), EconomyModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}

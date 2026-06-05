import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestigeController } from './prestige.controller';
import { PrestigeService } from './prestige.service';
import { PrestigeRecord } from './prestige.entity';
import { User } from '../users/entities/user.entity';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [TypeOrmModule.forFeature([PrestigeRecord, User]), EconomyModule],
  controllers: [PrestigeController],
  providers: [PrestigeService],
  exports: [PrestigeService],
})
export class PrestigeModule {}

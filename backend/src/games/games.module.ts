import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrashController } from './crash/crash.controller';
import { CrashService } from './crash/crash.service';
import { CoinflipController } from './coinflip/coinflip.controller';
import { CoinflipService } from './coinflip/coinflip.service';
import { UpgradeController } from './upgrade/upgrade.controller';
import { UpgradeService } from './upgrade/upgrade.service';
import { GameRound } from './entities/game-round.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { EconomyModule } from '../economy/economy.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameRound, InventoryItem]),
    EconomyModule,
    UsersModule,
    // AchievementsModule, MissionsModule, VipModule, WebsocketModule are @Global
  ],
  controllers: [CrashController, CoinflipController, UpgradeController],
  providers: [CrashService, CoinflipService, UpgradeService],
})
export class GamesModule {}

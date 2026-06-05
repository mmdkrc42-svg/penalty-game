import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { Case } from './entities/case.entity';
import { CaseItem } from './entities/case-item.entity';
import { InventoryItem } from '../inventory/entities/inventory-item.entity';
import { EconomyModule } from '../economy/economy.module';
import { UsersModule } from '../users/users.module';
// AchievementsModule, MissionsModule, VipModule, WebsocketModule are @Global

@Module({
  imports: [
    TypeOrmModule.forFeature([Case, CaseItem, InventoryItem]),
    EconomyModule,
    UsersModule,
  ],
  controllers: [CasesController],
  providers: [CasesService],
  exports: [CasesService],
})
export class CasesModule {}

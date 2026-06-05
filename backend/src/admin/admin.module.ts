import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { Case } from '../cases/entities/case.entity';
import { CaseItem } from '../cases/entities/case-item.entity';
import { Transaction } from '../economy/entities/transaction.entity';
import { EconomyModule } from '../economy/economy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Wallet, Case, CaseItem, Transaction]),
    EconomyModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}

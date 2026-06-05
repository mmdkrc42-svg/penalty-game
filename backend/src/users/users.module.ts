import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Wallet } from '../economy/entities/wallet.entity';
import { Transaction } from '../economy/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Wallet, Transaction])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

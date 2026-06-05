import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { EconomyService } from './economy.service';

@ApiTags('economy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('wallet')
  @ApiOperation({ summary: 'Get user wallet' })
  getWallet(@CurrentUser() user: User) {
    return this.economyService.getWallet(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history' })
  getTransactions(
    @CurrentUser() user: User,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.economyService.getTransactionHistory(user.id, +limit, +offset);
  }
}

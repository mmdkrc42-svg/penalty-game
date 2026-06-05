import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsOptional } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CrashService } from './crash.service';

class PlaceBetDto {
  @IsNumber()
  @Min(10)
  @Max(100000)
  betAmount: number;

  @IsOptional()
  @IsNumber()
  @Min(1.01)
  autoCashOut?: number;
}

class CashOutDto {
  @IsNumber()
  @Min(1.0)
  multiplier: number;
}

@ApiTags('games/crash')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/crash')
export class CrashController {
  constructor(private readonly crashService: CrashService) {}

  @Post('bet')
  @Throttle({ default: { limit: 5, ttl: 10000 } })
  @ApiOperation({ summary: 'Place a crash game bet' })
  placeBet(@CurrentUser() user: User, @Body() dto: PlaceBetDto) {
    return this.crashService.placeBet(user.id, dto.betAmount, dto.autoCashOut);
  }

  @Post(':roundId/cashout')
  @ApiOperation({ summary: 'Cash out of a crash round' })
  cashOut(@CurrentUser() user: User, @Param('roundId') roundId: string, @Body() dto: CashOutDto) {
    return this.crashService.cashOut(user.id, roundId, dto.multiplier);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get crash game history' })
  getHistory(@CurrentUser() user: User) {
    return this.crashService.getHistory(user.id);
  }
}

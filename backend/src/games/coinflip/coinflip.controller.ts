import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNumber, Min, Max, IsIn } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { CoinflipService, CoinSide } from './coinflip.service';

class FlipDto {
  @IsNumber()
  @Min(10)
  @Max(50000)
  betAmount: number;

  @IsIn(['heads', 'tails'])
  choice: CoinSide;
}

@ApiTags('games/coinflip')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/coinflip')
export class CoinflipController {
  constructor(private readonly coinflipService: CoinflipService) {}

  @Post('flip')
  @Throttle({ default: { limit: 10, ttl: 10000 } })
  @ApiOperation({ summary: 'Play coinflip game' })
  flip(@CurrentUser() user: User, @Body() dto: FlipDto) {
    return this.coinflipService.flip(user.id, dto.betAmount, dto.choice);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get coinflip history' })
  getHistory(@CurrentUser() user: User) {
    return this.coinflipService.getHistory(user.id);
  }
}

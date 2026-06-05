import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LeaderboardService } from './leaderboard.service';

@ApiTags('leaderboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('top-earners')
  @ApiOperation({ summary: 'Top earners leaderboard' })
  getTopEarners() {
    return this.leaderboardService.getTopPlayers(50);
  }

  @Get('top-cases')
  @ApiOperation({ summary: 'Top case openers leaderboard' })
  getTopCases() {
    return this.leaderboardService.getTopCaseOpeners(50);
  }

  @Get('richest')
  @ApiOperation({ summary: 'Richest players leaderboard' })
  getRichest() {
    return this.leaderboardService.getRichestPlayers(50);
  }

  @Get('my-rank')
  @ApiOperation({ summary: 'Get current user rank' })
  getMyRank(@CurrentUser() user: User) {
    return this.leaderboardService.getUserRank(user.id);
  }
}

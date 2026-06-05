import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get referral statistics' })
  getStats(@CurrentUser() user: User) {
    return this.referralsService.getReferralStats(user.id);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get referral leaderboard' })
  getLeaderboard() {
    return this.referralsService.getLeaderboard();
  }
}

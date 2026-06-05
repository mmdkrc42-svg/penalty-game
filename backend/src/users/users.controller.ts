import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/profile')
  @ApiOperation({ summary: 'Get user profile with XP and level' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get user statistics' })
  getStats(@CurrentUser() user: User) {
    return this.usersService.getStats(user.id);
  }

  @Post('me/daily')
  @ApiOperation({ summary: 'Claim daily reward' })
  claimDaily(@CurrentUser() user: User) {
    return this.usersService.claimDailyReward(user.id);
  }
}

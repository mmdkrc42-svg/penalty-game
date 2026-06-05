import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { MissionsService } from './missions.service';

@ApiTags('missions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('missions')
export class MissionsController {
  constructor(private readonly service: MissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get active daily and weekly missions' })
  getMissions(@CurrentUser() user: User) {
    return this.service.getUserMissions(user.id);
  }

  @Post(':id/claim')
  @ApiOperation({ summary: 'Claim completed mission reward' })
  claimMission(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.claimMission(user.id, id);
  }
}

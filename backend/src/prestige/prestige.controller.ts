import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { PrestigeService } from './prestige.service';

@ApiTags('prestige')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prestige')
export class PrestigeController {
  constructor(private readonly prestigeService: PrestigeService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get prestige status and benefits' })
  getStatus(@CurrentUser() user: User) {
    return this.prestigeService.getStatus(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Prestige (requires level 50+)' })
  prestige(@CurrentUser() user: User) {
    return this.prestigeService.prestige(user.id);
  }
}

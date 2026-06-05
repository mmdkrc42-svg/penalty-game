import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { UpgradeService } from './upgrade.service';

class UpgradeDto {
  @IsString()
  targetItemId: string;
}

@ApiTags('games/upgrade')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('games/upgrade')
export class UpgradeController {
  constructor(private readonly upgradeService: UpgradeService) {}

  @Get(':itemId/targets')
  @ApiOperation({ summary: 'Get possible upgrade targets for an item' })
  getTargets(@CurrentUser() user: User, @Param('itemId') itemId: string) {
    return this.upgradeService.getUpgradeTargets(user.id, itemId);
  }

  @Post(':itemId/upgrade')
  @ApiOperation({ summary: 'Attempt to upgrade an item' })
  upgrade(@CurrentUser() user: User, @Param('itemId') itemId: string, @Body() dto: UpgradeDto) {
    return this.upgradeService.upgradeItem(user.id, itemId, dto.targetItemId);
  }
}

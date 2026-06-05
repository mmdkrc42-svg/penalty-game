import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { VipService } from './vip.service';

@ApiTags('vip')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('vip')
export class VipController {
  constructor(private readonly vipService: VipService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get VIP status and benefits' })
  getStatus(@CurrentUser() user: User) {
    return this.vipService.getStatus(user.id);
  }
}

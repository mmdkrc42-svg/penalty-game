import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { CasesService } from './cases.service';

@ApiTags('cases')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available cases' })
  findAll(@Query('category') category?: string) {
    return this.casesService.findAll(category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get case details' })
  findOne(@Param('id') id: string) {
    return this.casesService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get case statistics and drop rates' })
  getStats(@Param('id') id: string) {
    return this.casesService.getCaseStats(id);
  }

  @Post(':id/open')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Open a case' })
  openCase(@CurrentUser() user: User, @Param('id') id: string) {
    return this.casesService.openCase(user.id, id);
  }
}

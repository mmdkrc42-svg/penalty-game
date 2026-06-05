import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { AdminService } from './admin.service';

class BanUserDto {
  @IsString()
  reason: string;
}

class AdjustBalanceDto {
  @IsNumber()
  amount: number;

  @IsString()
  reason: string;
}

class CreateCaseDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() price: number;
  @IsString() category: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
}

class CreateCaseItemDto {
  @IsString() name: string;
  @IsNumber() value: number;
  @IsNumber() probability: number;
  @IsString() rarity: string;
  @IsOptional() @IsString() imageUrl?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Admin dashboard stats' })
  getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Post('users/:id/ban')
  @ApiOperation({ summary: 'Ban a user' })
  banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto.reason);
  }

  @Post('users/:id/unban')
  @ApiOperation({ summary: 'Unban a user' })
  unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Post('users/:id/balance')
  @ApiOperation({ summary: 'Adjust user balance' })
  adjustBalance(@Param('id') id: string, @Body() dto: AdjustBalanceDto) {
    return this.adminService.adjustBalance(id, dto.amount, dto.reason);
  }

  @Post('cases')
  @ApiOperation({ summary: 'Create a new case' })
  createCase(@Body() dto: CreateCaseDto) {
    return this.adminService.createCase(dto as any);
  }

  @Put('cases/:id')
  @ApiOperation({ summary: 'Update a case' })
  updateCase(@Param('id') id: string, @Body() dto: Partial<CreateCaseDto>) {
    return this.adminService.updateCase(id, dto as any);
  }

  @Delete('cases/:id')
  @ApiOperation({ summary: 'Delete (deactivate) a case' })
  deleteCase(@Param('id') id: string) {
    return this.adminService.deleteCase(id);
  }

  @Post('cases/:caseId/items')
  @ApiOperation({ summary: 'Add item to a case' })
  addCaseItem(@Param('caseId') caseId: string, @Body() dto: CreateCaseItemDto) {
    return this.adminService.addCaseItem(caseId, dto as any);
  }

  @Put('cases/items/:itemId')
  @ApiOperation({ summary: 'Update a case item' })
  updateCaseItem(@Param('itemId') itemId: string, @Body() dto: Partial<CreateCaseItemDto>) {
    return this.adminService.updateCaseItem(itemId, dto as any);
  }

  @Delete('cases/items/:itemId')
  @ApiOperation({ summary: 'Delete a case item' })
  deleteCaseItem(@Param('itemId') itemId: string) {
    return this.adminService.deleteCaseItem(itemId);
  }
}

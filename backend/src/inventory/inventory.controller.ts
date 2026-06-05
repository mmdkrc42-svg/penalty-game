import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { InventoryService } from './inventory.service';
import { ItemStatus } from './entities/inventory-item.entity';

class SellMultipleDto {
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get user inventory' })
  getInventory(@CurrentUser() user: User, @Query('status') status?: ItemStatus) {
    return this.inventoryService.getUserInventory(user.id, status);
  }

  @Post(':id/sell')
  @ApiOperation({ summary: 'Sell an inventory item' })
  sellItem(@CurrentUser() user: User, @Param('id') id: string) {
    return this.inventoryService.sellItem(user.id, id);
  }

  @Post('sell-multiple')
  @ApiOperation({ summary: 'Sell multiple items at once' })
  sellMultiple(@CurrentUser() user: User, @Body() dto: SellMultipleDto) {
    return this.inventoryService.sellMultiple(user.id, dto.itemIds);
  }
}

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MissionsService } from '../missions/missions.service';
import { AppLogger } from '../common/logger/app-logger.service';

@Injectable()
export class JobsService {
  constructor(
    private readonly missionsService: MissionsService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('JobsService');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async expireStaleMissions() {
    try {
      const count = await this.missionsService.expireMissions();
      if (count > 0) {
        this.logger.log(`Expired ${count} stale missions`);
      }
    } catch (err) {
      this.logger.error('Failed to expire stale missions', err);
    }
  }
}

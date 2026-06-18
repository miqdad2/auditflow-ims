import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getFullHealth();
  }

  @Get('health/database')
  getDatabaseHealth() {
    return this.appService.getDatabaseHealth();
  }

  @Get('health/storage')
  getStorageHealth() {
    return this.appService.getStorageHealth();
  }
}

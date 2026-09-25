import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './common/decorators/public.decorator.js';

@ApiTags('System & Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @ApiOperation({
    summary: 'Liveness probe health check (uptime, memory, service status)',
  })
  @Get('health')
  getHealth() {
    return this.appService.getLiveHealth();
  }

  @Public()
  @ApiOperation({
    summary:
      'Readiness probe health check (validates PostgreSQL, Redis, and AI microservice)',
  })
  @Get('health/ready')
  async getReadiness() {
    return this.appService.getReadyHealth();
  }

  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}

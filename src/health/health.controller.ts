import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOkResponse({ description: 'Server and database health check.' })
  check() {
    return this.healthService.check();
  }

  @Get('live')
  @ApiOkResponse({ description: 'Liveness probe: process is alive.' })
  live() {
    return this.healthService.live();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'Readiness probe: process can reach DB and Redis when configured.' })
  ready() {
    return this.healthService.ready();
  }
}

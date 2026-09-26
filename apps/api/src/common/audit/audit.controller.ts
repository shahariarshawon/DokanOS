import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Prisma, UserRole } from '@prisma/client';
import { Roles } from '../decorators/roles.decorator.js';
import { AuditService } from './audit.service.js';
import { QueryAuditLogDto } from './dto/query-audit-log.dto.js';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @ApiOperation({
    summary:
      'List platform audit logs with pagination and filters (Admin only)',
  })
  @Get()
  async getAuditLogs(@Query() query: QueryAuditLogDto) {
    return this.auditService.findAll(query);
  }
}

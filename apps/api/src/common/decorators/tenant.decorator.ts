import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../guards/tenant.guard.js';

export const Tenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant: TenantContext | undefined = request.tenant;

    if (!tenant) {
      return null;
    }

    return data ? tenant[data] : tenant;
  },
);

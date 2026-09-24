import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  id: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

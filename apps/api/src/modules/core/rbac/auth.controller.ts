import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getRequestContext } from '@opencore/core';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './rbac.dto';
import { RequirePermission } from './permissions.decorator';

type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: AuthenticatedUser;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  login(
    @Body() body: LoginRequestDto,
    @Req() request: RequestWithUser,
  ): Promise<LoginResponseDto> {
    return this.authService.login(body.username, body.password, {
      ip: request.ip,
      userAgent: getHeaderValue(request.headers, 'user-agent'),
      requestId: getRequestContext()?.requestId,
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @RequirePermission('core:dashboard:read')
  @ApiOkResponse({ type: LoginResponseDto })
  me(@Req() request: RequestWithUser): Promise<LoginResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.authService.createSessionForUser(request.user.id, {
      ip: request.ip,
      userAgent: getHeaderValue(request.headers, 'user-agent'),
      requestId: getRequestContext()?.requestId,
    });
  }
}

function getHeaderValue(
  headers: RequestWithUser['headers'],
  name: string,
): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

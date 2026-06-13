import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { getRequestContext } from '@opencore/core';
import { AuthService, type AuthenticatedUser } from './auth.service';
import {
  LoginRequestDto,
  LoginResponseDto,
  LogoutResponseDto,
} from './rbac.dto';
import { RequireAuthenticated } from './permissions.decorator';

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
  @RequireAuthenticated()
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

  @Post('logout')
  @HttpCode(200)
  @ApiBearerAuth()
  @RequireAuthenticated()
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Req() request: RequestWithUser): Promise<LogoutResponseDto> {
    return this.authService.logout(
      getHeaderValue(request.headers, 'authorization'),
      {
        ip: request.ip,
        userAgent: getHeaderValue(request.headers, 'user-agent'),
        requestId: getRequestContext()?.requestId,
      },
    );
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

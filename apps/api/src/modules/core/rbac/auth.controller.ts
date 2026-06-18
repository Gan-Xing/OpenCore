import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { createApiErrorBody } from '@opencore/common';
import { getRequestContext } from '@opencore/core';
import { AuthService, type AuthenticatedUser } from './auth.service';
import {
  BindSocialAuthLoginDto,
  CompleteSocialAuthDto,
  LoginRequestDto,
  LoginResponseDto,
  LogoutResponseDto,
  SocialAuthFlowDto,
  SocialAuthProviderDto,
  SocialAuthResultDto,
  StartSocialAuthFlowDto,
} from './rbac.dto';
import { RequireAuthenticated } from './permissions.decorator';
import { SocialAuthService } from './social-auth.service';
import type { OAuthProviderCallbackDto } from '../../integration/integration/integration.dto';

type RequestWithUser = {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  user?: AuthenticatedUser;
};

type RedirectResponse = {
  redirect(status: number, url: string): void;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly socialAuth: SocialAuthService,
  ) {}

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
      throw authUnauthorized('AUTH_USER_MISSING', 'Missing authenticated user');
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

  @Get('social/providers')
  @ApiOkResponse({ type: [SocialAuthProviderDto] })
  listSocialProviders(): Promise<readonly SocialAuthProviderDto[]> {
    return this.socialAuth.listProviders();
  }

  @Post('social/flows')
  @ApiOkResponse({ type: SocialAuthFlowDto })
  startSocialFlow(
    @Body() body: StartSocialAuthFlowDto,
  ): Promise<SocialAuthFlowDto> {
    return this.socialAuth.startFlow(body);
  }

  @Get('social/callback/:providerCode')
  callbackSocialProvider(
    @Param('providerCode') providerCode: string,
    @Query() query: OAuthProviderCallbackDto,
    @Res() response: RedirectResponse,
  ): Promise<void> {
    return this.socialAuth
      .handleCallback(providerCode, query)
      .then((url) => response.redirect(302, url));
  }

  @Post('social/complete')
  @ApiOkResponse({ type: SocialAuthResultDto })
  completeSocialLogin(
    @Body() body: CompleteSocialAuthDto,
    @Req() request: RequestWithUser,
  ): Promise<SocialAuthResultDto> {
    return this.socialAuth.complete(body, {
      ip: request.ip,
      userAgent: getHeaderValue(request.headers, 'user-agent'),
      requestId: getRequestContext()?.requestId,
    });
  }

  @Post('social/bind-login')
  @ApiOkResponse({ type: SocialAuthResultDto })
  bindSocialLogin(
    @Body() body: BindSocialAuthLoginDto,
    @Req() request: RequestWithUser,
  ): Promise<SocialAuthResultDto> {
    return this.socialAuth.bindLogin(body, {
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

function authUnauthorized(
  code: string,
  message: string,
): UnauthorizedException {
  return new UnauthorizedException(createApiErrorBody({ code, message }));
}

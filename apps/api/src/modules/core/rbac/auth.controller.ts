import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService, type AuthenticatedUser } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './rbac.dto';
import { RequirePermission } from './permissions.decorator';

type RequestWithUser = {
  user?: AuthenticatedUser;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() body: LoginRequestDto): Promise<LoginResponseDto> {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @RequirePermission('core:dashboard:read')
  @ApiOkResponse({ type: LoginResponseDto })
  me(@Req() request: RequestWithUser): Promise<LoginResponseDto> {
    if (!request.user) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    return this.authService.createSessionForUser(request.user.id);
  }
}

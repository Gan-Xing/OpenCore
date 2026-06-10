import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginRequestDto, LoginResponseDto } from './rbac.dto';
import { RequirePermission } from './permissions.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() body: LoginRequestDto): LoginResponseDto {
    return this.authService.login(body.username, body.password);
  }

  @Get('me')
  @ApiBearerAuth()
  @RequirePermission('core:dashboard:read')
  @ApiOkResponse({ type: LoginResponseDto })
  me(): LoginResponseDto {
    return this.authService.login('admin', 'admin123');
  }
}

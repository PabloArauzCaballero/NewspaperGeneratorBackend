import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthenticatedUser } from '../common/types/authenticated-user';
import { AuthService } from './auth.service';
import {
  LoginDto,
  loginSchema,
  LogoutDto,
  logoutSchema,
  RefreshTokenDto,
  refreshTokenSchema,
  RegisterDto,
  registerSchema,
  RequestPasswordResetDto,
  requestPasswordResetSchema,
  ResetPasswordDto,
  resetPasswordSchema
} from './auth.schemas';

type RequestWithUser = Request & { user: AuthenticatedUser };

function metadataFromRequest(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  const ip = typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : request.ip;
  return { ip, userAgent: request.headers['user-agent'] };
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fullName', 'email', 'password'],
      properties: {
        fullName: { type: 'string', example: 'Lector Demo Nuevo' },
        email: { type: 'string', example: 'nuevo.lector@periodico.test' },
        password: { type: 'string', example: 'DemoPassword2026!' }
      }
    }
  })
  @ApiOkResponse({ description: 'Registers a reader user and returns access/refresh tokens.' })
  register(@Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto, @Req() request: Request) {
    return this.authService.register(dto, metadataFromRequest(request));
  }

  @Post('login')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'premium.demo@periodico.test' },
        password: { type: 'string', example: 'DemoPassword2026!' }
      }
    }
  })
  @ApiOkResponse({ description: 'Returns access/refresh tokens for an active user.' })
  login(@Body(new ZodValidationPipe(loginSchema)) dto: LoginDto, @Req() request: Request) {
    return this.authService.login(dto, metadataFromRequest(request));
  }

  @Post('refresh')
  @ApiBody({ schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Rotates refresh token and returns a fresh access token.' })
  refresh(@Body(new ZodValidationPipe(refreshTokenSchema)) dto: RefreshTokenDto, @Req() request: Request) {
    return this.authService.refresh(dto.refreshToken, metadataFromRequest(request));
  }

  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiBody({ schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Revokes the provided refresh token for the authenticated user.' })
  logout(@Req() request: RequestWithUser, @Body(new ZodValidationPipe(logoutSchema)) dto: LogoutDto) {
    return this.authService.logout(request.user.id, dto.refreshToken);
  }

  @Post('request-password-reset')
  @ApiBody({ schema: { type: 'object', required: ['email'], properties: { email: { type: 'string', example: 'lector.demo@periodico.test' } } } })
  @ApiOkResponse({ description: 'Creates a reset token. In non-production only, returns debugResetToken for manual testing.' })
  requestPasswordReset(@Body(new ZodValidationPipe(requestPasswordResetSchema)) dto: RequestPasswordResetDto, @Req() request: Request) {
    return this.authService.requestPasswordReset(dto, metadataFromRequest(request));
  }

  @Post('reset-password')
  @ApiBody({ schema: { type: 'object', required: ['resetToken', 'newPassword'], properties: { resetToken: { type: 'string' }, newPassword: { type: 'string' } } } })
  @ApiOkResponse({ description: 'Resets password and revokes active refresh tokens.' })
  resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Returns the authenticated user profile and premium state.' })
  me(@Req() request: RequestWithUser) {
    return this.authService.me(request.user.id);
  }
}

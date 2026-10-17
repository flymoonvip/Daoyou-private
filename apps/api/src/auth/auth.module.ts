import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './access.guard.js';
import { CaptchaController } from './captcha.controller.js';
import { CaptchaService } from './captcha.service.js';
import { SessionController } from './session.controller.js';
import { SessionService } from './session.service.js';
import { SsoService } from './sso.service.js';

@Module({
  controllers: [CaptchaController, SessionController],
  providers: [
    CaptchaService,
    SessionService,
    SsoService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [SessionService],
})
export class AuthModule {}

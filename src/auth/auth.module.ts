import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { OutlookStrategy } from './outlook.strategy';
import { AuthService } from './auth.service';

@Module({
  imports: [PassportModule],
  providers: [GoogleStrategy, AuthService, OutlookStrategy],
  exports: [AuthService]
})
export class AuthModule {}

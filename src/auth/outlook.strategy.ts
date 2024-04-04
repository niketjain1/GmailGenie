import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service'; // Adjust the path as necessary

@Injectable()
export class OutlookStrategy extends PassportStrategy(Strategy, 'outlook') {
  constructor(private authService: AuthService) {
    super({
      authorizationURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenURL: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientID: process.env.OUTLOOK_CLIENT_ID,
      clientSecret: process.env.OUTLOOK_CLIENT_SECRET,
      callbackURL: process.env.OUTLOOK_REDIRECT_URI,
      scope: ['openid', 'profile', 'email', 'https://outlook.office.com/Mail.Read'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails } = profile;
    const user = {
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      accessToken,
      refreshToken
    };

    done(null, user);
  }
}

import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QueueService } from './queue/queue.service';

@Controller()
export class AppController {
  constructor(private readonly queueService: QueueService) {}

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req) {
    this.queueService.addProcessEmailsJob(req.user.accessToken);
  }
}

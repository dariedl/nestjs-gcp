import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { UserService } from './user.service';

@Controller()
export class AppController {
  constructor(
    private readonly userService: UserService,
    private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users')
  async getAllUsers(): Promise<string> {
    const users = await this.userService.users({});
    return JSON.stringify(users, null, 2);
  }

}

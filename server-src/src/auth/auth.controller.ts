import { Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post("/signup")
    async login(): Promise<any> {
        const patches = await this.authService.login();
        return patches;
    }
}

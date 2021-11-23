import { Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { PatchService } from 'src/patch/patch.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@Controller('api/auth')
export class AuthController {
    constructor(private patchService: PatchService, private readonly authService: AuthService) { }

    @UseGuards(LocalAuthGuard)
    @Post('/login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('/profile')
    getProfile(@Request() req) {
        return req.user;
    }

    @UseGuards(JwtAuthGuard)
    @Get('/total')
    getTotal(@Request() req) {
        console.log(req.user);
        return this.patchService.getUserPatchTotal(req.user.id);
    }
}

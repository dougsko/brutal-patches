import { Body, Controller, Get, HttpStatus, Param, Post, Res } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user-dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private userService: UsersService) {}

    @Post('/create')
    async createUser(@Body() createUserDto: CreateUserDto, @Res() res: any) {
        try {
            const newUser: any = await this.userService.createUser(createUserDto);
            if (newUser.ok) {
                return res.status(HttpStatus.CREATED).json({
                    ok: true,
                    data: newUser.data,
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    ok: false,
                    message: 'Error Trying to Create User',
                });
            }
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                ok: false,
                message: 'Error Trying to reach DB',
                errors: error,
            });
        }
    }

    @Get('/getUserById/:id')
    async getUserById(@Param('id') id: string, @Res() res: any) {
        try {
            const user: any = await this.userService.getUserById(id);
            if (user.ok) {
                return res.status(HttpStatus.OK).json({
                    ok: true,
                    user: user.data,
                });
            } else {
                return res.status(HttpStatus.BAD_REQUEST).json({
                    ok: false,
                    message: 'Error Trying to Get User',
                });
            }
        } catch (error) {
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                ok: false,
                message: 'Error Trying to reach DB',
                errors: error,
            });
        }
    }
}
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { CreateUserDto } from 'src/users/dto/createUser.dto';
import { v4 as uuid } from 'uuid';

export class UserRepository {
    constructor() { }

    async createUser(createUserDto: CreateUserDto) {
        const newUser = {
            id: uuid(),
            username: createUserDto.username,
            email: createUserDto.email
        };

        try {
            await new AWS.DynamoDB.DocumentClient()
                .put({
                    TableName: process.env.USERS_TABLE_NAME,
                    Item: newUser,
                })
                .promise();
        } catch (error) {
            throw new InternalServerErrorException(error);
        }

        return { ok: true, data: newUser };
    }

    async getUserById(id: string) {
        let user;
        try {
            const result = await new AWS.DynamoDB.DocumentClient()
                .get({
                    TableName: process.env.USERS_TABLE_NAME,
                    Key: { id },
                })
                .promise();

            user = result.Item;
        } catch (error) {
            throw new InternalServerErrorException(error);
        }

        if (!user) {
            throw new NotFoundException(`User with ID "${id}" not found`);
        }

        return { ok: true, data: user };
    }
}
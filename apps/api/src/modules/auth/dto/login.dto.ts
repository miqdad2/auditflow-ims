import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  login: string; // accepts email OR username

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

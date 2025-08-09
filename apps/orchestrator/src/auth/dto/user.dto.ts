import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Username (3-30 characters, alphanumeric, underscore, hyphen)',
    example: 'john_doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'john@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'Display name',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  displayName?: string;

  @ApiProperty({
    description: 'Profile picture URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  profilePicture?: string;

  @ApiProperty({
    description: 'Bio (max 500 characters)',
    example: 'Software developer interested in DeFi and blockchain technology',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

export class UpdateNotificationPreferencesDto {
  @ApiProperty({
    description: 'Email notifications enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({
    description: 'Telegram notifications enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  telegram?: boolean;
}

export class UpdateSocialLinksDto {
  @ApiProperty({
    description: 'Twitter profile URL',
    example: 'https://twitter.com/johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiProperty({
    description: 'Discord username',
    example: 'johndoe#1234',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  discord?: string;

  @ApiProperty({
    description: 'Telegram username',
    example: '@johndoe',
    required: false,
  })
  @IsOptional()
  @IsString()
  telegram?: string;

  @ApiProperty({
    description: 'Website URL',
    example: 'https://johndoe.com',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  website?: string;
}

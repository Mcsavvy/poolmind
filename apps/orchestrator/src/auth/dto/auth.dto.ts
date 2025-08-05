import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class GenerateNonceDto {
  @ApiProperty({
    description: 'Wallet address for generating authentication message',
    example: 'SP1234567890ABCDEF',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;
}

export class WalletLoginDto {
  @ApiProperty({
    description: 'Stacks wallet address',
    example: 'SP1234567890ABCDEF',
  })
  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Public key from wallet',
    example: '0x1234567890abcdef...',
  })
  @IsString()
  @IsNotEmpty()
  publicKey: string;

  @ApiProperty({
    description: 'Signature of the authentication message',
    example: '0xabcdef1234567890...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Authentication message that was signed',
    example: 'Sign this message to authenticate with PoolMind...',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'Type of wallet used',
    example: 'xverse',
    required: false,
  })
  @IsString()
  @IsOptional()
  walletType?: string;

  @ApiProperty({
    description: 'Stacks network',
    enum: ['mainnet', 'testnet', 'devnet'],
    example: 'testnet',
    required: false,
  })
  @IsEnum(['mainnet', 'testnet', 'devnet'])
  @IsOptional()
  network?: 'mainnet' | 'testnet' | 'devnet';
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Current JWT token to refresh',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}

import { NextRequest, NextResponse } from 'next/server';
import { generateAuthMessage } from '@/lib/auth';

// Generate a nonce for wallet authentication
export async function POST(req: NextRequest) {
  try {
    const { walletAddress } = await req.json();
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    // Generate authentication message with nonce
    const message = generateAuthMessage(walletAddress);
    
    return NextResponse.json({ 
      message,
      success: true 
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return NextResponse.json(
      { error: 'Failed to generate authentication message' },
      { status: 500 }
    );
  }
}
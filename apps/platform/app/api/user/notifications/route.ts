import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import User from '@/lib/models/user';
import { INotificationPreferences } from '@/lib/models/user';
import { withValidation, createSuccessResponse, commonSchemas } from '@/lib/api-validation';
import { allSchemas } from '@/lib/api-schemas';
import { z } from 'zod';

// Update notification preferences with validation
export const PATCH = withValidation({
  body: allSchemas.notificationPreferences,
})(async (req: NextRequest, _context, validatedData) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const preferences = validatedData!.body!;
    
    await connectDB();
    const user = await User.findOne({ walletAddress: session.user.walletAddress.toUpperCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update notification preferences with validated data
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...preferences
    };
    await user.save();
    
    return createSuccessResponse({
      notificationPreferences: user.notificationPreferences,
    }, 'Notification preferences updated successfully');
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
});

// Get notification preferences with optional query parameters
export const GET = withValidation({
  query: z.object({
    includeDefaults: commonSchemas.boolean.default(false),
    format: z.enum(['full', 'compact']).default('full').optional(),
  }).optional(),
})(async (req: NextRequest, _context, validatedData) => {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.walletAddress) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const query = validatedData?.query;
    
    await connectDB();
    const user = await User.findOne({ walletAddress: session.user.walletAddress.toUpperCase() });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    let preferences: any = user.notificationPreferences;
    
    // Apply query parameters
    if (query?.includeDefaults) {
      // Include default values for any missing preferences
      const defaultPreferences = {
        email: true,
        push: true,
        sms: false,
        marketing: false,
        security: true,
      };
      preferences = { ...defaultPreferences, ...preferences };
    }
    
    if (query?.format === 'compact') {
      // Return only enabled preferences
      preferences = Object.fromEntries(
        Object.entries(preferences).filter(([_, value]) => value === true)
      );
    }
    
    return createSuccessResponse({
      notificationPreferences: preferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
});
import { NextRequest, NextResponse } from 'next/server';
import { getUserReferralData } from '@/app/lib/referralStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdNum = parseInt(userId, 10);

    if (isNaN(userIdNum)) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    const referralData = await getUserReferralData(userIdNum);

    return NextResponse.json({
      userId: referralData.userId,
      totalReferrals: referralData.totalReferrals,
      unclaimedReferrals: referralData.unclaimedReferrals,
      referredBy: referralData.referredBy,
      lastUpdated: referralData.lastUpdated,
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

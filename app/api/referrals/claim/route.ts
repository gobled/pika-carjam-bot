import { NextRequest, NextResponse } from 'next/server';
import { claimReferralRewards } from '@/app/lib/referralStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'number') {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    const result = await claimReferralRewards(userId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'No unclaimed referrals', rewardsClaimed: 0 },
        { status: 400 }
      );
    }

    // Calculate plays to award (3 plays per referral)
    const playsToAward = result.rewardsClaimed * 3;

    return NextResponse.json({
      success: true,
      rewardsClaimed: result.rewardsClaimed,
      playsAwarded: playsToAward,
    });
  } catch (error) {
    console.error('Error claiming referral rewards:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

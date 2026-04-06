import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateRobotIdentitySuggestion } from '@/lib/ai';
import { WeightClass } from '@/lib/types';

const VALID_WEIGHT_CLASSES: WeightClass[] = ['Featherweight', 'Lightweight', 'Middleweight', 'Heavyweight'];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json() as Partial<{
    weightClass: WeightClass;
    weaponType: string;
    armourType: string;
    movementType: string;
    description: string;
  }>;

  const weightClass = body.weightClass;
  if (!weightClass || !VALID_WEIGHT_CLASSES.includes(weightClass)) {
    return NextResponse.json({ error: 'Invalid weight class' }, { status: 400 });
  }

  const suggestion = await generateRobotIdentitySuggestion({
    weightClass,
    weaponType: body.weaponType,
    armourType: body.armourType,
    movementType: body.movementType,
    description: body.description,
  });

  return NextResponse.json(suggestion);
}
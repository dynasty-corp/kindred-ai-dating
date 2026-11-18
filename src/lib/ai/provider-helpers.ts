import {
  runDeterministicAgentMatch,
  runDeterministicOnboardingTurn,
} from '@/lib/ai/deterministic-engine';
import type { ShareableAgentPacket } from '@/lib/ai/prompts';
import type { UserProfile } from '@/lib/types/schemas';

export function buildDeterministicOnboardingFallback(params: {
  user: UserProfile;
  wingmanName: string;
  message: string;
  isPrivateTurn?: boolean;
}) {
  return runDeterministicOnboardingTurn(params);
}

export function buildDeterministicAgentMatchFallback(params: {
  packetA: ShareableAgentPacket;
  packetB: ShareableAgentPacket;
}) {
  return runDeterministicAgentMatch(params);
}

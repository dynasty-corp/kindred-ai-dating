import {
  buildAntiParasocialDeflection,
  detectParasocialAdvance,
  isExplicitConfidentialTurn,
  type ShareableAgentPacket,
} from '@/lib/ai/prompts';
import type {
  AgentDialogueTurn,
  BlindTripPick,
  BlindTripState,
  BlueprintDimension,
  BlueprintInsight,
  CoopGameMode,
  FutureSimulation,
  MatchDossier,
  MysteryEscapeState,
  UserProfile,
  WavelengthState,
} from '@/lib/types/schemas';
import { clampScore } from '@/lib/utils';

export interface DeterministicOnboardingResult {
  wingmanReply: string;
  extractedInsights: Array<Omit<BlueprintInsight, 'id' | 'updatedAt' | 'source'>>;
  followUpQuestion: string;
  progressDelta: number;
  guardrailTriggered: boolean;
  guardrailNote?: string;
}

const DIMENSION_PROBES: Array<{
  dimension: BlueprintDimension;
  keywords: RegExp;
  defaultTitle: string;
  question: string;
}> = [
  {
    dimension: 'coreValues',
    keywords: /\b(honest|honesty|integrity|kind|kindness|curiosity|warmth|family|community|trust|steady|values?)\b/i,
    defaultTitle: 'Grounded Warmth & Integrity',
    question: 'When a tough week hits, what everyday values or gestures help you feel genuinely supported?',
  },
  {
    dimension: 'conflictResolution',
    keywords: /\b(conflict|repair|fight|argue|argument|disagree|same-night|space|talk|listen|calm|stonewall)\b/i,
    defaultTitle: 'Direct & Respectful Repair',
    question: 'When small tension pops up with someone close, do you prefer talking it through the same night or sleeping on it?',
  },
  {
    dimension: 'attachmentStyle',
    keywords: /\b(secure|reassur|autonomy|independent|check-in|consistent|close|space|trust|attach)\b/i,
    defaultTitle: 'Balanced Autonomy & Closeness',
    question: 'How much togetherness versus solo recharge time feels healthiest to you in a relationship?',
  },
  {
    dimension: 'lifestyleRhythm',
    keywords: /\b(morning|sunday|weekend|routine|spontaneous|plan|planner|travel|cook|market|rhythm|schedule)\b/i,
    defaultTitle: 'Unhurried Weekends & Shared Rituals',
    question: 'Paint a picture of an ideal Sunday with a partner — slow and unscripted or mapped out in advance?',
  },
  {
    dimension: 'humorStyle',
    keywords: /\b(humor|laugh|funny|banter|teasing|sarcas|witty|playful|joke|pun|comedy)\b/i,
    defaultTitle: 'Warm Observational Humor',
    question: 'What kind of humor instantly lowers your guard and makes everyday errands fun?',
  },
  {
    dimension: 'relationshipGoals',
    keywords: /\b(long-term|partner|marriage|marry|kids|family|child|future|commit|settled|build|casual)\b/i,
    defaultTitle: 'Intentional Long-Term Partnership',
    question: 'Looking two or three years ahead, what kind of shared life or family chapter feels exciting to you?',
  },
  {
    dimension: 'dealbreakers',
    keywords: /\b(dealbreaker|never|cannot|can't stand|silent treatment|stonewall|cynic|flak|dishonest|boundary)\b/i,
    defaultTitle: 'Clear Respect Boundaries',
    question: 'What is one relational habit you have learned is an unmistakable dealbreaker for you?',
  },
  {
    dimension: 'unspokenPreferences',
    keywords: /\b(quiet|transition|subtle|small|gesture|listen|detail|tea|coffee|walk|note)\b/i,
    defaultTitle: 'Thoughtful Everyday Attunement',
    question: 'What small, unspoken gesture from a partner means far more to you than grand romantic speeches?',
  },
];

function summarizeUserClause(message: string, fallback: string): string {
  const clean = message.replace(/\s+/g, ' ').trim();
  if (clean.length <= 16) return fallback;
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] || clean;
  return firstSentence.length > 210 ? `${firstSentence.slice(0, 207)}...` : firstSentence;
}

export function runDeterministicOnboardingTurn(params: {
  user: UserProfile;
  wingmanName: string;
  message: string;
  isPrivateTurn?: boolean;
}): DeterministicOnboardingResult {
  const { user, wingmanName, message, isPrivateTurn } = params;

  if (detectParasocialAdvance(message)) {
    return {
      wingmanReply: buildAntiParasocialDeflection(wingmanName),
      extractedInsights: [],
      followUpQuestion: 'What qualities in a real human partner make you feel both safe and energized?',
      progressDelta: 0,
      guardrailTriggered: true,
      guardrailNote: 'Anti-parasocial fiduciary boundary enforced: deflected back to human connection.',
    };
  }

  const confidential = isExplicitConfidentialTurn(message, isPrivateTurn);
  const visibility: 'shareable' | 'private' = confidential ? 'private' : 'shareable';

  const existingDims = new Set(user.blueprint.map((b) => b.dimension));
  const matched = DIMENSION_PROBES.filter((probe) => probe.keywords.test(message));

  const chosenProbes: typeof DIMENSION_PROBES = [];
  for (const probe of matched) {
    if (chosenProbes.length < 3) chosenProbes.push(probe);
  }
  if (chosenProbes.length < 2) {
    for (const probe of DIMENSION_PROBES) {
      if (!existingDims.has(probe.dimension) && !chosenProbes.some((p) => p.dimension === probe.dimension)) {
        chosenProbes.push(probe);
        if (chosenProbes.length >= 2) break;
      }
    }
  }
  if (chosenProbes.length === 0) {
    chosenProbes.push(DIMENSION_PROBES[0], DIMENSION_PROBES[1]);
  }

  const extractedInsights = chosenProbes.map((probe, idx) => {
    const snippet = summarizeUserClause(message, `${probe.defaultTitle} shared during onboarding.`);
    return {
      dimension: probe.dimension,
      title: confidential
        ? `Private Reflection (${probe.defaultTitle})`
        : probe.defaultTitle,
      summary:
        idx === 0
          ? snippet
          : `Reflected through conversation: ${snippet}`,
      visibility,
      confidence: 88,
    };
  });

  const nextMissing =
    DIMENSION_PROBES.find(
      (p) =>
        !existingDims.has(p.dimension) &&
        !extractedInsights.some((ins) => ins.dimension === p.dimension),
    ) ?? DIMENSION_PROBES[3];

  const userTurnCount = user.onboardingMessages.filter((m) => m.role === 'user').length + 1;
  const progressDelta =
    user.onboardingProgress >= 70
      ? 100 - user.onboardingProgress
      : userTurnCount === 1
        ? 35
        : userTurnCount === 2
          ? 35
          : 30;

  const projectedProgress = Math.min(100, user.onboardingProgress + progressDelta);
  const privacyAck = confidential
    ? ' I marked those takeaways as Private so they stay strictly in your coaching memory and are never sent to other agents.'
    : ' I added those signals to your Relationship Blueprint — you can edit, toggle Shareable/Private, or redact any item anytime.';

  const wingmanReply =
    projectedProgress >= 100
      ? `Thank you for sharing that so clearly.${privacyAck} Your Relationship Blueprint is now complete at 100%, so I have everything needed to represent you faithfully in the Agent Lounge.`
      : `That gives me a much sharper picture of how you show up in a relationship.${privacyAck} ${nextMissing.question}`;

  return {
    wingmanReply,
    extractedInsights,
    followUpQuestion: nextMissing.question,
    progressDelta: Math.max(10, progressDelta),
    guardrailTriggered: false,
  };
}

function buildPacketCorpus(packet: ShareableAgentPacket): string {
  return [
    packet.bioTagline,
    ...packet.interests,
    ...packet.shareableSummaries.map((s) => `${s.dimension} ${s.title} ${s.summary}`),
    ...packet.dealbreakerSignals,
    ...packet.complementaryStrengths,
  ]
    .join(' ')
    .toLowerCase();
}

function hasFamilyConflict(corpusA: string, corpusB: string): boolean {
  const childFreeA = /\b(child-free|childfree|no kids|without anchors|casual companion)\b/.test(corpusA);
  const childFreeB = /\b(child-free|childfree|no kids|without anchors|casual companion)\b/.test(corpusB);
  const familyA = /\b(future family|family rituals|family chapter|open to family|kids|parent)\b/.test(corpusA);
  const familyB = /\b(future family|family rituals|family chapter|open to family|kids|parent)\b/.test(corpusB);
  return (childFreeA && familyB) || (childFreeB && familyA);
}

function hasRepairStyleConflict(corpusA: string, corpusB: string): boolean {
  const immediateA = /\b(same-night|same evening|same-day|before bed|calm repair|direct)\b/.test(corpusA);
  const immediateB = /\b(same-night|same evening|same-day|before bed|calm repair|direct)\b/.test(corpusB);
  const avoidantA = /\b(cool-off until next week|several days|waiting days|stonewall|compartmentalized|shelving)\b/.test(corpusA);
  const avoidantB = /\b(cool-off until next week|several days|waiting days|stonewall|compartmentalized|shelving)\b/.test(corpusB);
  return (immediateA && avoidantB) || (immediateB && avoidantA);
}

function hasRhythmClash(corpusA: string, corpusB: string): boolean {
  const slowWarmA = /\b(unhurried|slow sunday|homebody|cozy|spontaneous|creative)\b/.test(corpusA);
  const slowWarmB = /\b(unhurried|slow sunday|homebody|cozy|spontaneous|creative)\b/.test(corpusB);
  const rigidOrNonstopA = /\b(nonstop|antsy|zero tolerance|strict 5am|red-eye|separate residences)\b/.test(corpusA);
  const rigidOrNonstopB = /\b(nonstop|antsy|zero tolerance|strict 5am|red-eye|separate residences)\b/.test(corpusB);
  return (slowWarmA && rigidOrNonstopB) || (slowWarmB && rigidOrNonstopA);
}

export interface DeterministicMatchOutput {
  turns: AgentDialogueTurn[];
  subScores: MatchDossier['subScores'];
  overallScore: number;
  headline: string;
  whyYoudClick: string[];
  potentialFrictionPoints: string[];
  sharedInterests: string[];
  complementaryPairingNote: string;
}

export function runDeterministicAgentMatch(params: {
  packetA: ShareableAgentPacket;
  packetB: ShareableAgentPacket;
}): DeterministicMatchOutput {
  const { packetA, packetB } = params;
  const corpusA = buildPacketCorpus(packetA);
  const corpusB = buildPacketCorpus(packetB);

  const familyClash = hasFamilyConflict(corpusA, corpusB);
  const repairClash = hasRepairStyleConflict(corpusA, corpusB);
  const rhythmClash = hasRhythmClash(corpusA, corpusB);

  const sharedInterests = packetA.interests.filter((interest) =>
    packetB.interests.some((other) => other.toLowerCase() === interest.toLowerCase()),
  );

  // Complementary balance: structured + spontaneous adds bonus rather than penalty!
  const structDiff = Math.abs(
    packetA.compatibilityVector.structureVsSpontaneity -
      packetB.compatibilityVector.structureVsSpontaneity,
  );
  const complementaryBalanceBonus = structDiff >= 18 && structDiff <= 50 ? 6 : 2;

  const directnessDiff = Math.abs(
    packetA.compatibilityVector.emotionalDirectness -
      packetB.compatibilityVector.emotionalDirectness,
  );

  let values = 89;
  let emotionalRhythm = 90 - Math.round(directnessDiff * 0.25);
  let lifestyle = 84 + complementaryBalanceBonus;
  let playfulness = 84 + Math.min(8, sharedInterests.length * 2 + 2);

  if (familyClash) {
    values -= 38;
    lifestyle -= 18;
  }
  if (repairClash) {
    emotionalRhythm -= 36;
    values -= 20;
  }
  if (rhythmClash) {
    lifestyle -= 32;
    playfulness -= 22;
  }

  // Slight deterministic variance based on summary richness
  const richnessBonus =
    packetA.shareableSummaries.length >= 4 && packetB.shareableSummaries.length >= 4 ? 3 : 0;
  values = clampScore(values + richnessBonus, 25, 98);
  emotionalRhythm = clampScore(emotionalRhythm + richnessBonus, 22, 98);
  lifestyle = clampScore(lifestyle, 25, 97);
  playfulness = clampScore(playfulness, 28, 97);

  const overallScore = clampScore(
    values * 0.35 + emotionalRhythm * 0.3 + lifestyle * 0.2 + playfulness * 0.15,
    25,
    98,
  );

  const summaryA1 = packetA.shareableSummaries[0]?.title ?? 'grounded values';
  const summaryB1 = packetB.shareableSummaries[0]?.title ?? 'steady curiosity';
  const summaryA2 = packetA.shareableSummaries[1]?.summary ?? 'calm, honest communication';
  const summaryB2 = packetB.shareableSummaries[1]?.summary ?? 'consistent warmth and follow-through';

  const now = Date.now();
  const ts = (offsetSec: number) => new Date(now + offsetSec * 1000).toISOString();

  const turns: AgentDialogueTurn[] = [
    {
      turnNumber: 1,
      speakerAgentId: packetA.agentId,
      speakerLabel: `${packetA.wingmanName} (${packetA.displayName}'s Wingman)`,
      phase: 'opening_resonance',
      message: `Hi ${packetB.wingmanName} — I'm representing ${packetA.displayName} based strictly on their shareable Blueprint. Their core anchors are ${summaryA1}. What anchors ${packetB.displayName} in day-to-day partnership?`,
      signalExtracted: `Anchored on ${summaryA1}`,
      timestamp: ts(1),
    },
    {
      turnNumber: 2,
      speakerAgentId: packetB.agentId,
      speakerLabel: `${packetB.wingmanName} (${packetB.displayName}'s Wingman)`,
      phase: 'values_and_goals',
      message: `${packetB.displayName} leads with ${summaryB1}. Looking ahead, ${packetB.shareableSummaries.find((s) => s.dimension === 'relationshipGoals')?.summary ?? 'they value intentional long-term alignment.'}`,
      signalExtracted: familyClash ? 'Long-term goal divergence detected' : 'Aligned long-term horizon',
      timestamp: ts(2),
    },
    {
      turnNumber: 3,
      speakerAgentId: packetA.agentId,
      speakerLabel: `${packetA.wingmanName} (${packetA.displayName}'s Wingman)`,
      phase: 'conflict_and_rhythm',
      scenarioPrompt: 'Scenario Probe: After a tense miscommunication on a busy Wednesday night, how does your person prefer to repair?',
      message: `In friction, ${packetA.displayName} leans toward: "${summaryA2}". How does ${packetB.displayName} handle repair when a week is stressful?`,
      signalExtracted: 'Testing emotional repair timing',
      timestamp: ts(3),
    },
    {
      turnNumber: 4,
      speakerAgentId: packetB.agentId,
      speakerLabel: `${packetB.wingmanName} (${packetB.displayName}'s Wingman)`,
      phase: 'conflict_and_rhythm',
      message: `${packetB.displayName}'s pattern is: "${summaryB2}". ${repairClash ? 'They tend to wait several days before revisiting emotional friction.' : 'They prioritize gentle same-evening clarity without blame.'}`,
      signalExtracted: repairClash ? 'Repair timing friction flagged' : 'High repair compatibility',
      timestamp: ts(4),
    },
    {
      turnNumber: 5,
      speakerAgentId: packetA.agentId,
      speakerLabel: `${packetA.wingmanName} (${packetA.displayName}'s Wingman)`,
      phase: 'scenario_probe',
      scenarioPrompt: 'Scenario Probe: Unscripted Sunday morning vs. structured travel weekend — how do they balance each other?',
      message: `${packetA.displayName} brings "${packetA.complementaryStrengths[0] ?? 'warm presence'}"${sharedInterests.length ? ` and enjoys ${sharedInterests.slice(0, 2).join(' & ')}` : ''}. Even where habits differ, complementary strengths matter most.`,
      signalExtracted: 'Complementary rhythm evaluated',
      timestamp: ts(5),
    },
    {
      turnNumber: 6,
      speakerAgentId: packetB.agentId,
      speakerLabel: `${packetB.wingmanName} (${packetB.displayName}'s Wingman)`,
      phase: 'synthesis_check',
      message: `${packetB.displayName} brings "${packetB.complementaryStrengths[0] ?? 'thoughtful steadiness'}". ${overallScore >= 80 ? 'There is strong complementary energy here — worth handing off to the two humans directly.' : 'Several core rhythm and goal assumptions diverge enough that transparency in the dossier is essential.'}`,
      signalExtracted: `Overall synthesis score ${overallScore}%`,
      timestamp: ts(6),
    },
  ];

  const whyYoudClick: string[] = [];
  if (!repairClash) {
    whyYoudClick.push(
      `Both ${packetA.displayName} and ${packetB.displayName} value emotionally direct repair rather than multi-day silent distance.`,
    );
  }
  if (!familyClash) {
    whyYoudClick.push(
      `Shared long-term orientation around ${summaryA1.toLowerCase()} and ${summaryB1.toLowerCase()}.`,
    );
  }
  if (sharedInterests.length > 0) {
    whyYoudClick.push(
      `Natural conversational ease around ${sharedInterests.slice(0, 3).join(', ')}.`,
    );
  } else {
    whyYoudClick.push(
      `Different weekend hobbies create healthy curiosity without trapping either partner in a rigid filter bubble.`,
    );
  }
  if (whyYoudClick.length < 2) {
    whyYoudClick.push(
      `Distinct personal strengths: ${packetA.complementaryStrengths[0]} alongside ${packetB.complementaryStrengths[0]}.`,
    );
  }

  const potentialFrictionPoints: string[] = [];
  if (familyClash) {
    potentialFrictionPoints.push(
      `Long-term family & life-anchor expectations diverge sharply between ${packetA.displayName} and ${packetB.displayName}.`,
    );
  }
  if (repairClash) {
    potentialFrictionPoints.push(
      `Conflict timing mismatch: same-evening repair preference clashes with multi-day cool-off or compartmentalization.`,
    );
  }
  if (rhythmClash) {
    potentialFrictionPoints.push(
      `Daily pacing tension between unhurried, tactile rituals and rigid or nonstop schedules.`,
    );
  }
  if (potentialFrictionPoints.length === 0) {
    potentialFrictionPoints.push(
      `Different planning tempos (${packetA.complementaryStrengths[0]} vs. ${packetB.complementaryStrengths[0]}) — easily bridged by agreeing which weekends stay unscripted.`,
    );
  }

  const headline =
    overallScore >= 80
      ? `${packetA.displayName} & ${packetB.displayName}: Complementary Warmth & Aligned Repair`
      : `${packetA.displayName} & ${packetB.displayName}: Notable Life-Rhythm & Goal Friction`;

  const complementaryPairingNote =
    overallScore >= 80
      ? `High complementary synergy (${overallScore}%): ${packetA.displayName} (${packetA.complementaryStrengths[0]}) pairs naturally with ${packetB.displayName} (${packetB.complementaryStrengths[0]}), rather than cloning identical hobbies.`
      : `Alignment check (${overallScore}%): core repair or long-term lifestyle pillars diverge below the 80% co-op threshold.`;

  return {
    turns,
    subScores: {
      values,
      emotionalRhythm,
      lifestyle,
      playfulness,
    },
    overallScore,
    headline,
    whyYoudClick,
    potentialFrictionPoints,
    sharedInterests,
    complementaryPairingNote,
  };
}

export function buildDeterministicCoopSession(params: {
  mode: CoopGameMode;
  userA: UserProfile;
  userB: UserProfile;
  sharedInterests: string[];
}): {
  tailoredInterestsUsed: string[];
  blindTripState?: BlindTripState;
  mysteryEscapeState?: MysteryEscapeState;
  wavelengthState?: WavelengthState;
} {
  const { mode, userA, userB, sharedInterests } = params;
  const interests =
    sharedInterests.length > 0
      ? sharedInterests.slice(0, 4)
      : Array.from(new Set([...userA.interests.slice(0, 2), ...userB.interests.slice(0, 2)]));

  const primaryInterest = interests[0] ?? 'neighborhood food & architecture';

  if (mode === 'blind_trip_draft') {
    return {
      tailoredInterestsUsed: interests,
      blindTripState: {
        revealed: false,
      },
    };
  }

  if (mode === 'coop_mystery_escape') {
    return {
      tailoredInterestsUsed: interests,
      mysteryEscapeState: {
        hobbyTheme: primaryInterest,
        storyTitle: `The Midnight Atelier Clue (${primaryInterest})`,
        currentTurn: 1,
        escaped: false,
        turns: [
          {
            turnNumber: 1,
            prompt: `You and your partner find a locked brass portfolio tucked inside a ${primaryInterest} studio after closing. A note reads: "Only two observers who agree on the first step unlock the archive."`,
            options: [
              {
                id: 'turn-1-opt-1',
                label: 'Inspect the ceramic glaze & handwritten ledger first',
                rationale: 'Methodical observation reveals the hidden date stamp.',
              },
              {
                id: 'turn-1-opt-2',
                label: 'Follow the warm vinyl soundtrack clue by the courtyard door',
                rationale: 'Sensory pattern-matching leads toward the back gallery.',
              },
            ],
            consensusReached: false,
          },
          {
            turnNumber: 2,
            prompt: 'The ledger reveals two coordinates in town: an early-morning market stall or a hidden rooftop conservatory. Both keys must turn together.',
            options: [
              {
                id: 'turn-2-opt-1',
                label: 'Head to the dawn farmer market stall for the spice cipher',
                rationale: 'Connects sensory clues with local neighborhood craft.',
              },
              {
                id: 'turn-2-opt-2',
                label: 'Climb to the rooftop conservatory to align the brass compass',
                rationale: 'Uses architectural lines to decode the next waypoint.',
              },
            ],
            consensusReached: false,
          },
          {
            turnNumber: 3,
            prompt: 'Inside the cipher box sits a riddle about how partners handle unexpected detours when rain threatens a carefully planned evening.',
            options: [
              {
                id: 'turn-3-opt-1',
                label: 'Pivot together into a cozy corner café and improvise',
                rationale: 'Shared adaptability keeps the mood warm and collaborative.',
              },
              {
                id: 'turn-3-opt-2',
                label: 'Pull out the pocket backup map and protect the core ritual',
                rationale: 'Thoughtful preparation keeps the shared goal intact.',
              },
            ],
            consensusReached: false,
          },
          {
            turnNumber: 4,
            prompt: 'Final vault lock: choose the keepsake artifact that seals your shared story to open the exit terrace.',
            options: [
              {
                id: 'turn-4-opt-1',
                label: 'A hand-thrown stoneware espresso cup with two initials',
                rationale: 'Honors tactile craft and unhurried morning rituals.',
              },
              {
                id: 'turn-4-opt-2',
                label: 'A custom vinyl pressing of your collaborative field notes',
                rationale: 'Celebrates shared curiosity and playful storytelling.',
              },
            ],
            consensusReached: false,
          },
        ],
      },
    };
  }

  // vibe_values_wavelength
  return {
    tailoredInterestsUsed: interests,
    wavelengthState: {
      currentRound: 1,
      completed: false,
      rounds: [
        {
          roundNumber: 1,
          prompt: `On a rainy Sunday morning, where does ${userB.displayName} sit between quiet solo recharge and spontaneous market wandering?`,
          leftAnchor: 'Quiet Solo Recharge (0)',
          rightAnchor: 'Spontaneous Market Wandering (100)',
          partnerActualPosition: 68,
          insightRevealed: `${userB.displayName} loves slow, warm mornings that leave room for a spontaneous neighborhood stroll.`,
        },
        {
          roundNumber: 2,
          prompt: `When subtle tension surfaces after a stressful day, where does ${userB.displayName} land on waiting vs. same-night repair?`,
          leftAnchor: 'Sleep On It First (0)',
          rightAnchor: 'Calm Same-Night Repair (100)',
          partnerActualPosition: 84,
          insightRevealed: `${userB.displayName} values direct, kind same-evening clarity so misunderstandings don't linger.`,
        },
        {
          roundNumber: 3,
          prompt: `For a three-day getaway around ${primaryInterest}, how tightly does ${userB.displayName} schedule the itinerary?`,
          leftAnchor: 'Pure Improvisation (0)',
          rightAnchor: 'Anchored Must-Dos + Breathing Room (100)',
          partnerActualPosition: 62,
          insightRevealed: `${userB.displayName} likes a couple of thoughtful anchors paired with generous unscripted space.`,
        },
      ],
    },
  };
}

export function evaluateBlindTripItinerary(params: {
  userA: UserProfile;
  userB: UserProfile;
  pickA: BlindTripPick;
  pickB: BlindTripPick;
  sharedInterests: string[];
}): NonNullable<BlindTripState['dreamItinerary']> {
  const { userA, userB, pickA, pickB, sharedInterests } = params;
  const vibeMap: Record<BlindTripPick['vibe'], string> = {
    culinary_markets: 'Lisbon & Porto Culinary Markets',
    coastal_architecture: 'Kyoto & Naoshima Coastal Architecture',
    mountain_atelier: 'Oaxaca & Cloud-Forest Artisan Studios',
    night_jazz_museums: 'Montreal & Quebec City Jazz & Galleries',
  };

  const destination =
    pickA.vibe === pickB.vibe
      ? vibeMap[pickA.vibe]
      : `${vibeMap[pickA.vibe].split(' & ')[0]} × ${vibeMap[pickB.vibe].split(' & ')[0]} Dual-Vibe Escape`;

  const interestTag = sharedInterests[0] ?? 'local craft & neighborhood espresso';

  return {
    title: `${userA.displayName} & ${userB.displayName}'s Blind-Drafted Getaway`,
    destination,
    synthesisNote: `Blended ${userA.displayName}'s "${pickA.wildcard}" with ${userB.displayName}'s "${pickB.wildcard}" — balancing ${pickA.pace.replace(/_/g, ' ')} and ${pickB.pace.replace(/_/g, ' ')} around ${interestTag}.`,
    stops: [
      {
        dayLabel: 'Day 1 — Arrival & First Ritual',
        title: `Slow Coffee & ${pickA.vibe.replace(/_/g, ' ')} Walk`,
        description: `Drop bags at a sunlit boutique stay, share ${interestTag}, and kick off ${userA.displayName}'s wildcard: "${pickA.wildcard}".`,
        blendReason: `Honors ${pickA.budget.replace(/_/g, ' ')} comfort while leaving breathing room.`,
      },
      {
        dayLabel: 'Day 2 — Collaborative Deep Dive',
        title: `Hands-On Studio & ${pickB.vibe.replace(/_/g, ' ')} Evening`,
        description: `Spend the afternoon exploring local makers and close the night with ${userB.displayName}'s wildcard: "${pickB.wildcard}".`,
        blendReason: `Bridges both partners' travel tempos without rushing.`,
      },
      {
        dayLabel: 'Day 3 — Unscripted Keepsake',
        title: 'Sunrise Market & Reflections',
        description: 'Pick one shared keepsake at the morning market and trade favorite micro-moments before heading home.',
        blendReason: 'Leaves room for spontaneous detours and shared storytelling.',
      },
    ],
  };
}

export function buildSimulatedDemoChatReply(params: {
  partner: UserProfile;
  userMessage: string;
}): string {
  const { partner, userMessage } = params;
  const lower = userMessage.toLowerCase();
  if (lower.includes('trip') || lower.includes('travel') || lower.includes('itinerary')) {
    return `Haha, I love how our picks collided there — honestly the "${partner.interests[0] ?? 'coffee'}" detour sounds like the exact highlight I'd actually plan. When do you usually like doing slow Sunday mornings?`;
  }
  if (lower.includes('escape') || lower.includes('clue') || lower.includes('game')) {
    return `That consensus lock-in was surprisingly smooth! I appreciate that you didn't just rush the puzzle — what made you pick that option?`;
  }
  return `Really glad we unlocked this directly — hearing it in your actual voice beats any AI summary. I'm big on ${partner.interests[0] ?? 'good food'} and unhurried conversation; what's been the best part of your week so far?`;
}

export function buildDeterministicFutureSimulation(params: {
  matchId: string;
  userA: UserProfile;
  userB: UserProfile;
  sharedInterests: string[];
  includeDateNights: boolean;
  includeWorldAdventure: boolean;
  includeFutureFamily: boolean;
}): Omit<FutureSimulation, 'id' | 'verifiedDualConsentAt' | 'executionMode' | 'createdAt' | 'updatedAt'> {
  const {
    matchId,
    userA,
    userB,
    sharedInterests,
    includeDateNights,
    includeWorldAdventure,
    includeFutureFamily,
  } = params;

  const interest1 = sharedInterests[0] ?? userA.interests[0] ?? 'artisan coffee';
  const interest2 = sharedInterests[1] ?? userB.interests[0] ?? 'neighborhood walks';

  const result: Omit<
    FutureSimulation,
    'id' | 'verifiedDualConsentAt' | 'executionMode' | 'createdAt' | 'updatedAt'
  > = {
    matchId,
  };

  if (includeDateNights) {
    result.dateNightBlueprints = [
      {
        stageLabel: 'First Date',
        title: `Morning ${interest1} & Bookstore Detour`,
        venueVibe: 'Sunlit corner café with warm timber tables and zero loud bass',
        activity: `Meet for a 75-minute ${interest1} tasting flight, then wander three blocks to pick out a weird paperback for each other.`,
        conversationStarter: 'What ordinary Sunday ritual from childhood still makes you feel instantly at home?',
        estimatedBudget: '$35–$55 total',
        whyItFitsBoth: `Low-pressure, daylight warmth that invites real curiosity between ${userA.displayName} and ${userB.displayName}.`,
      },
      {
        stageLabel: 'Second Date',
        title: `Hands-On Studio & ${interest2} Supper`,
        venueVibe: 'Tactile neighborhood workshop followed by candlelit tapas',
        activity: `Try a 90-minute collaborative maker session around ${interest2}, then debrief over shared small plates.`,
        conversationStarter: 'When a creative plan goes completely sideways, what makes you laugh instead of tense up?',
        estimatedBudget: '$85–$120 total',
        whyItFitsBoth: `Pairs shared curiosity with natural teamwork so conversation stays grounded and playful.`,
      },
      {
        stageLabel: 'Third Date',
        title: 'Twilight Market Cook-Off & Vinyl Hour',
        venueVibe: 'Cozy home kitchen with open windows and warm acoustic records',
        activity: 'Shop a twilight market with a $30 mystery ingredient rule and co-create dinner with zero recipes.',
        conversationStarter: 'What does genuine same-evening repair look like when two people care deeply?',
        estimatedBudget: '$60–$90 total',
        whyItFitsBoth: `Tests everyday home rhythm and collaborative banter in a relaxed, authentic setting.`,
      },
    ];
  }

  if (includeWorldAdventure) {
    result.worldAdventure = {
      tripTitle: `${userA.displayName} & ${userB.displayName}: Kyoto, Lisbon & Coastal Slow-Craft Odyssey`,
      routeSummary: '9-day balanced loop combining morning architectural walks, tactile markets, and unscripted coastal evenings.',
      dayByDayHighlights: [
        {
          dayRange: 'Days 1–3',
          city: 'Kyoto, Japan',
          highlight: `Dawn cedar-temple walk, ${interest1} studio visit, and lantern-lit alley ramen.`,
          partnerBalanceNote: `${userA.displayName}'s spontaneous eye meets ${userB.displayName}'s calm logistics.`,
        },
        {
          dayRange: 'Days 4–6',
          city: 'Naoshima & Seto Inland Sea',
          highlight: 'Biking coastal art pavilions, sea-salt gelato, and sunset ferry journaling.',
          partnerBalanceNote: 'Built-in afternoon recharge protects introverted social battery.',
        },
        {
          dayRange: 'Days 7–9',
          city: 'Lisbon, Portugal',
          highlight: `Tile-workshop detour, ${interest2} market lunch, and late acoustic music in Alfama.`,
          partnerBalanceNote: 'Alternates one anchored reservation with one open wandering block daily.',
        },
      ],
      packingAndVibeMatch: 'Carry-on linen, analog camera, one shared notebook, and comfortable walking shoes.',
      travelStyleBalance: 'Balances early-morning curiosity with unhurried evening debriefs so neither partner feels over-scheduled.',
    };
  }

  if (includeFutureFamily) {
    result.futureFamily = {
      optedIn: true,
      mashupHeadline: 'The Curious Atelier Household: Warm Rituals, Messy Pancakes & Gentle Humor',
      kidPersonalityBlend: `Imagine a bright-eyed 7-year-old who insists on building miniature ${interest1} contraptions at the breakfast table while negotiating bedtime stories with dry, affectionate wit.`,
      inheritedFromUserA: [
        `${userA.displayName}'s tactile curiosity and spontaneous wonder`,
        'Warmth in naming feelings honestly at the end of the day',
      ],
      inheritedFromUserB: [
        `${userB.displayName}'s steady planning and protective calm`,
        'Playful storytelling during ordinary errands',
      ],
      futureKidHobbies: [
        `Backyard ${interest1} experiments`,
        'Cardboard city architecture',
        'Sunday farmer-market taste-testing',
        'Collecting funny neighborhood field notes',
      ],
      sundayFamilyRitual: 'Cardamom pancakes on vinyl morning, followed by one unhurried market walk with zero phones.',
      dinnerTableDebateTopic: 'Whether hot sauce belongs on roasted strawberries or if that violates kitchen treaties.',
      portraitConcept: {
        renderMode: 'svg_canvas_composer',
        promptUsed: `Editorial warm gouache portrait of ${userA.displayName} and ${userB.displayName} with a joyful creative child in a sunlit studio kitchen`,
        palette: ['#FAF7F2', '#D96B4F', '#6E8F78', '#C89B54', '#15181C'],
        caption: `A playful, opt-in creative sketch blending ${userA.displayName} and ${userB.displayName}'s shared warmth.`,
        traitsIllustrated: [
          'Terracotta ceramic mug ritual',
          'Botanical sunlit window',
          'Collaborative sketchbook on table',
        ],
      },
    };
  }

  return result;
}

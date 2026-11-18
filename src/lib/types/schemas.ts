import { z } from 'zod';

export const BLUEPRINT_DIMENSIONS = [
  'coreValues',
  'attachmentStyle',
  'conflictResolution',
  'humorStyle',
  'lifestyleRhythm',
  'relationshipGoals',
  'dealbreakers',
  'unspokenPreferences',
] as const;

export const BlueprintDimensionSchema = z.enum(BLUEPRINT_DIMENSIONS);
export type BlueprintDimension = z.infer<typeof BlueprintDimensionSchema>;

export const BlueprintVisibilitySchema = z.enum(['shareable', 'private', 'redacted']);
export type BlueprintVisibility = z.infer<typeof BlueprintVisibilitySchema>;

export const ExecutionModeSchema = z.enum(['live_llm', 'deterministic_simulation']);
export type ExecutionMode = z.infer<typeof ExecutionModeSchema>;

export const CoachingToneSchema = z.enum(['warm_grounded', 'witty_direct', 'reflective_calm']);
export type CoachingTone = z.infer<typeof CoachingToneSchema>;

export const AvatarConfigSchema = z.object({
  skinTone: z.string().min(1).max(32),
  hairStyle: z.string().min(1).max(40),
  hairColor: z.string().min(1).max(32),
  accentColor: z.string().min(1).max(32),
  expression: z.enum(['warm_smile', 'curious_grin', 'calm_gaze', 'playful_wink']),
  accessory: z.enum(['none', 'glasses', 'earrings', 'scarf', 'headband']).default('none'),
});
export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const OnboardingMessageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(['user', 'wingman']),
  content: z.string().min(1).max(8000),
  timestamp: z.string().min(1),
  isPrivateTurn: z.boolean().default(false),
  guardrailNote: z.string().optional(),
});
export type OnboardingMessage = z.infer<typeof OnboardingMessageSchema>;

export const BlueprintInsightSchema = z.object({
  id: z.string().min(1),
  dimension: BlueprintDimensionSchema,
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(600),
  visibility: BlueprintVisibilitySchema,
  confidence: z.number().min(0).max(100),
  source: z.enum(['wingman_extracted', 'user_added', 'user_edited', 'seeded']),
  updatedAt: z.string().min(1),
});
export type BlueprintInsight = z.infer<typeof BlueprintInsightSchema>;

export const UserProfileSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  displayName: z.string().trim().min(1).max(80),
  age: z.number().int().min(18).max(120),
  pronouns: z.string().trim().min(1).max(40),
  city: z.string().trim().min(1).max(80),
  occupation: z.string().trim().min(1).max(100),
  bioTagline: z.string().trim().min(1).max(280),
  interests: z.array(z.string().trim().min(1).max(60)).max(24),
  isSeededDemo: z.boolean(),
  avatarConfig: AvatarConfigSchema,
  onboardingMessages: z.array(OnboardingMessageSchema),
  blueprint: z.array(BlueprintInsightSchema),
  onboardingProgress: z.number().min(0).max(100),
  onboardingCompleted: z.boolean(),
  activeMatchIds: z.array(z.string().min(1)).max(3),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type UserProfile = z.infer<typeof UserProfileSchema>;

export const SanitizedCandidateSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  age: z.number().int().min(18),
  pronouns: z.string().min(1),
  city: z.string().min(1),
  occupation: z.string().min(1),
  bioTagline: z.string().min(1),
  interests: z.array(z.string()),
  isSeededDemo: z.boolean(),
  avatarConfig: AvatarConfigSchema,
  onboardingProgress: z.number().min(0).max(100),
  onboardingCompleted: z.boolean(),
  wingmanName: z.string().min(1),
  coachingTone: CoachingToneSchema,
  shareableInsightCount: z.number().int().min(0),
  privateContextCount: z.number().int().min(0),
  shareableHighlights: z.array(
    z.object({
      dimension: BlueprintDimensionSchema,
      title: z.string(),
      summary: z.string(),
    }),
  ),
  complementaryStrengths: z.array(z.string()),
});
export type SanitizedCandidate = z.infer<typeof SanitizedCandidateSchema>;

export const AgentPersonaSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  wingmanName: z.string().min(1).max(80),
  coachingTone: CoachingToneSchema,
  systemGuardrailVersion: z.string().min(1),
  shareableSummaries: z.array(
    z.object({
      insightId: z.string().min(1),
      dimension: BlueprintDimensionSchema,
      title: z.string().min(1),
      summary: z.string().min(1),
    }),
  ),
  dealbreakerSignals: z.array(z.string()),
  compatibilityVector: z.object({
    structureVsSpontaneity: z.number().min(0).max(100),
    socialBattery: z.number().min(0).max(100),
    emotionalDirectness: z.number().min(0).max(100),
    noveltyAppetite: z.number().min(0).max(100),
    familyOrientation: z.number().min(0).max(100),
  }),
  complementaryStrengths: z.array(z.string()),
  privateContextCount: z.number().int().min(0),
  lastSyncedFromBlueprintAt: z.string().min(1),
});
export type AgentPersona = z.infer<typeof AgentPersonaSchema>;

export const AgentDialogueTurnSchema = z.object({
  turnNumber: z.number().int().min(1),
  speakerAgentId: z.string().min(1),
  speakerLabel: z.string().min(1),
  phase: z.enum([
    'opening_resonance',
    'values_and_goals',
    'conflict_and_rhythm',
    'scenario_probe',
    'synthesis_check',
  ]),
  scenarioPrompt: z.string().optional(),
  message: z.string().min(1),
  signalExtracted: z.string().min(1),
  timestamp: z.string().min(1),
});
export type AgentDialogueTurn = z.infer<typeof AgentDialogueTurnSchema>;

export const AgentConversationSchema = z.object({
  id: z.string().min(1),
  initiatorUserId: z.string().min(1),
  candidateUserId: z.string().min(1),
  initiatorAgentId: z.string().min(1),
  candidateAgentId: z.string().min(1),
  isAiSimulationLabeled: z.literal(true),
  privacyAuditPassed: z.boolean(),
  executionMode: ExecutionModeSchema,
  status: z.enum(['running', 'completed', 'failed']),
  turns: z.array(AgentDialogueTurnSchema),
  startedAt: z.string().min(1),
  completedAt: z.string().optional(),
});
export type AgentConversation = z.infer<typeof AgentConversationSchema>;

export const HumanChatMessageSchema = z.object({
  id: z.string().min(1),
  senderUserId: z.string().min(1),
  senderName: z.string().min(1),
  content: z.string().min(1).max(2000),
  timestamp: z.string().min(1),
  authenticity: z.enum(['authentic_human', 'simulated_demo_partner']),
});
export type HumanChatMessage = z.infer<typeof HumanChatMessageSchema>;

export const MatchDecisionSchema = z.enum(['pending', 'accepted', 'passed']);
export type MatchDecision = z.infer<typeof MatchDecisionSchema>;

export const MatchStatusSchema = z.enum([
  'dossier_ready',
  'awaiting_partner',
  'active_cohort',
  'passed',
  'archived',
]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const SandboxConsentSchema = z.object({
  aiSufficiencyMet: z.boolean(),
  sufficiencyReason: z.string(),
  userAConsented: z.boolean(),
  userBConsented: z.boolean(),
  mutuallyUnlocked: z.boolean(),
  familyVisualizerOptIn: z.boolean(),
  unlockedAt: z.string().optional(),
});
export type SandboxConsent = z.infer<typeof SandboxConsentSchema>;

export const MatchDossierSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  userAId: z.string().min(1),
  userBId: z.string().min(1),
  overallScore: z.number().min(0).max(100),
  meetsGamingThreshold: z.boolean(),
  subScores: z.object({
    values: z.number().min(0).max(100),
    emotionalRhythm: z.number().min(0).max(100),
    lifestyle: z.number().min(0).max(100),
    playfulness: z.number().min(0).max(100),
  }),
  headline: z.string().min(1),
  whyYoudClick: z.array(z.string()).min(1),
  potentialFrictionPoints: z.array(z.string()),
  sharedInterests: z.array(z.string()),
  complementaryPairingNote: z.string().min(1),
  userADecision: MatchDecisionSchema,
  userBDecision: MatchDecisionSchema,
  status: MatchStatusSchema,
  humanChatMessages: z.array(HumanChatMessageSchema),
  sandboxConsent: SandboxConsentSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type MatchDossier = z.infer<typeof MatchDossierSchema>;

export const BlindTripPickSchema = z.object({
  budget: z.enum(['boutique_splurge', 'balanced_local', 'backpacker_hidden_gems']),
  pace: z.enum(['slow_mornings', 'balanced_flow', 'dawn_to_dusk']),
  vibe: z.enum(['culinary_markets', 'coastal_architecture', 'mountain_atelier', 'night_jazz_museums']),
  wildcard: z.string().min(1).max(160),
});
export type BlindTripPick = z.infer<typeof BlindTripPickSchema>;

export const BlindTripStateSchema = z.object({
  userAPick: BlindTripPickSchema.optional(),
  userBPick: BlindTripPickSchema.optional(),
  revealed: z.boolean(),
  dreamItinerary: z
    .object({
      title: z.string(),
      destination: z.string(),
      synthesisNote: z.string(),
      stops: z.array(
        z.object({
          dayLabel: z.string(),
          title: z.string(),
          description: z.string(),
          blendReason: z.string(),
        }),
      ),
    })
    .optional(),
});
export type BlindTripState = z.infer<typeof BlindTripStateSchema>;

export const MysteryEscapeTurnSchema = z.object({
  turnNumber: z.number().int().min(1).max(4),
  prompt: z.string(),
  options: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      rationale: z.string(),
    }),
  ),
  userAChoiceId: z.string().optional(),
  userBChoiceId: z.string().optional(),
  consensusReached: z.boolean(),
  outcomeNote: z.string().optional(),
});
export type MysteryEscapeTurn = z.infer<typeof MysteryEscapeTurnSchema>;

export const MysteryEscapeStateSchema = z.object({
  hobbyTheme: z.string(),
  storyTitle: z.string(),
  currentTurn: z.number().int().min(1).max(4),
  turns: z.array(MysteryEscapeTurnSchema).length(4),
  escaped: z.boolean(),
  teamworkDebrief: z.string().optional(),
});
export type MysteryEscapeState = z.infer<typeof MysteryEscapeStateSchema>;

export const WavelengthRoundSchema = z.object({
  roundNumber: z.number().int().min(1).max(3),
  prompt: z.string(),
  leftAnchor: z.string(),
  rightAnchor: z.string(),
  partnerActualPosition: z.number().min(0).max(100),
  userAGuess: z.number().min(0).max(100).optional(),
  userBGuess: z.number().min(0).max(100).optional(),
  roundScore: z.number().min(0).max(100).optional(),
  insightRevealed: z.string(),
});
export type WavelengthRound = z.infer<typeof WavelengthRoundSchema>;

export const WavelengthStateSchema = z.object({
  currentRound: z.number().int().min(1).max(3),
  rounds: z.array(WavelengthRoundSchema).length(3),
  completed: z.boolean(),
  overallWavelengthScore: z.number().min(0).max(100).optional(),
  debriefNote: z.string().optional(),
});
export type WavelengthState = z.infer<typeof WavelengthStateSchema>;

export const CoopGameModeSchema = z.enum([
  'blind_trip_draft',
  'coop_mystery_escape',
  'vibe_values_wavelength',
]);
export type CoopGameMode = z.infer<typeof CoopGameModeSchema>;

export const CoopGameSessionSchema = z.object({
  id: z.string().min(1),
  matchId: z.string().min(1),
  mode: CoopGameModeSchema,
  status: z.enum(['in_progress', 'completed']),
  tailoredInterestsUsed: z.array(z.string()),
  executionMode: ExecutionModeSchema,
  blindTripState: BlindTripStateSchema.optional(),
  mysteryEscapeState: MysteryEscapeStateSchema.optional(),
  wavelengthState: WavelengthStateSchema.optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type CoopGameSession = z.infer<typeof CoopGameSessionSchema>;

export const DateNightConceptSchema = z.object({
  stageLabel: z.enum(['First Date', 'Second Date', 'Third Date']),
  title: z.string(),
  venueVibe: z.string(),
  activity: z.string(),
  conversationStarter: z.string(),
  estimatedBudget: z.string(),
  whyItFitsBoth: z.string(),
});

export const WorldAdventureSchema = z.object({
  tripTitle: z.string(),
  routeSummary: z.string(),
  dayByDayHighlights: z.array(
    z.object({
      dayRange: z.string(),
      city: z.string(),
      highlight: z.string(),
      partnerBalanceNote: z.string(),
    }),
  ),
  packingAndVibeMatch: z.string(),
  travelStyleBalance: z.string(),
});

export const FutureFamilySchema = z.object({
  optedIn: z.boolean(),
  mashupHeadline: z.string(),
  kidPersonalityBlend: z.string(),
  inheritedFromUserA: z.array(z.string()),
  inheritedFromUserB: z.array(z.string()),
  futureKidHobbies: z.array(z.string()),
  sundayFamilyRitual: z.string(),
  dinnerTableDebateTopic: z.string(),
  portraitConcept: z.object({
    renderMode: z.enum(['ai_image_api', 'svg_canvas_composer']),
    promptUsed: z.string(),
    imageUrl: z.string().optional(),
    palette: z.array(z.string()).min(3),
    caption: z.string(),
    traitsIllustrated: z.array(z.string()),
  }),
});

export const FutureSimulationSchema = z.object({
  id: z.string().min(1),
  matchId: z.string().min(1),
  verifiedDualConsentAt: z.string().min(1),
  executionMode: ExecutionModeSchema,
  dateNightBlueprints: z.array(DateNightConceptSchema).length(3).optional(),
  worldAdventure: WorldAdventureSchema.optional(),
  futureFamily: FutureFamilySchema.optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export type FutureSimulation = z.infer<typeof FutureSimulationSchema>;

export const KindredStoreSnapshotSchema = z.object({
  version: z.number().int().min(1),
  activeUserId: z.string().min(1),
  users: z.record(z.string(), UserProfileSchema),
  personas: z.record(z.string(), AgentPersonaSchema),
  conversations: z.record(z.string(), AgentConversationSchema),
  matches: z.record(z.string(), MatchDossierSchema),
  gameSessions: z.record(z.string(), CoopGameSessionSchema),
  futureSimulations: z.record(z.string(), FutureSimulationSchema),
});
export type KindredStoreSnapshot = z.infer<typeof KindredStoreSnapshotSchema>;

// Strict LLM Output Schemas (100% required fields for z.toJSONSchema compatibility)
export const LlmOnboardingTurnOutputSchema = z.object({
  wingmanReply: z.string().min(1).max(1600),
  extractedInsights: z.array(
    z.object({
      dimension: BlueprintDimensionSchema,
      title: z.string().min(1).max(100),
      summary: z.string().min(1).max(320),
      visibility: z.enum(['shareable', 'private']),
      confidence: z.number().min(40).max(100),
    }),
  ),
  followUpQuestion: z.string().min(1).max(400),
  progressDelta: z.number().min(10).max(45),
});

export const LlmAgentMatchOutputSchema = z.object({
  turns: z
    .array(
      z.object({
        speaker: z.enum(['initiator', 'candidate']),
        phase: z.enum([
          'opening_resonance',
          'values_and_goals',
          'conflict_and_rhythm',
          'scenario_probe',
          'synthesis_check',
        ]),
        scenarioPrompt: z.string(),
        message: z.string().min(1).max(600),
        signalExtracted: z.string().min(1).max(200),
      }),
    )
    .min(6)
    .max(8),
  subScores: z.object({
    values: z.number().min(0).max(100),
    emotionalRhythm: z.number().min(0).max(100),
    lifestyle: z.number().min(0).max(100),
    playfulness: z.number().min(0).max(100),
  }),
  headline: z.string().min(1).max(160),
  whyYoudClick: z.array(z.string().min(1)).min(2).max(4),
  potentialFrictionPoints: z.array(z.string().min(1)).min(1).max(3),
  complementaryPairingNote: z.string().min(1).max(320),
});

export const LlmDateNightsOutputSchema = z.object({
  concepts: z.array(DateNightConceptSchema).length(3),
});

export const LlmWorldAdventureOutputSchema = WorldAdventureSchema;

export const LlmFutureFamilyOutputSchema = z.object({
  mashupHeadline: z.string().min(1),
  kidPersonalityBlend: z.string().min(1),
  inheritedFromUserA: z.array(z.string().min(1)).min(2).max(4),
  inheritedFromUserB: z.array(z.string().min(1)).min(2).max(4),
  futureKidHobbies: z.array(z.string().min(1)).min(3).max(5),
  sundayFamilyRitual: z.string().min(1),
  dinnerTableDebateTopic: z.string().min(1),
  portraitCaption: z.string().min(1),
  portraitPrompt: z.string().min(1),
});

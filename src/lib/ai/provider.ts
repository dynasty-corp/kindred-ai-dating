import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateImage, generateText, Output, type ImageModel, type LanguageModel } from 'ai';
import {
  buildDeterministicAgentMatchFallback,
  buildDeterministicOnboardingFallback,
} from '@/lib/ai/provider-helpers';
import {
  AGENT_NEGOTIATION_SYSTEM_PROMPT,
  buildAntiParasocialDeflection,
  detectParasocialAdvance,
  hasSycophanticReciprocation,
  isExplicitConfidentialTurn,
  sanitizeTextAgainstPrivateInsights,
  verifyZeroPrivacyLeak,
  WINGMAN_SYSTEM_PROMPT,
  type ShareableAgentPacket,
} from '@/lib/ai/prompts';
import {
  buildDeterministicFutureSimulation,
  runDeterministicOnboardingTurn,
} from '@/lib/ai/deterministic-engine';
import {
  LlmAgentMatchOutputSchema,
  LlmDateNightsOutputSchema,
  LlmFutureFamilyOutputSchema,
  LlmOnboardingTurnOutputSchema,
  LlmWorldAdventureOutputSchema,
  type AgentDialogueTurn,
  type ExecutionMode,
  type FutureSimulation,
  type MatchDossier,
  type UserProfile,
} from '@/lib/types/schemas';
import { clampScore } from '@/lib/utils';

export type AiProviderKind = 'openai' | 'gemini' | 'deterministic_simulation';

export interface ResolvedAiConfig {
  mode: AiProviderKind;
  modelName: string;
}

export function resolveAiConfiguration(
  env: Record<string, string | undefined> = process.env,
): ResolvedAiConfig {
  const openaiKey = env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    return {
      mode: 'openai',
      modelName: env.KINDRED_OPENAI_MODEL?.trim() || 'gpt-4o-mini',
    };
  }
  const geminiKey =
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (geminiKey) {
    return {
      mode: 'gemini',
      modelName: env.KINDRED_GEMINI_MODEL?.trim() || 'gemini-2.5-flash',
    };
  }
  return {
    mode: 'deterministic_simulation',
    modelName: 'kindred-deterministic-v2',
  };
}

function getLiveLanguageModel(env: NodeJS.ProcessEnv = process.env): {
  model: LanguageModel | null;
  kind: AiProviderKind;
} {
  const cfg = resolveAiConfiguration(env);
  if (cfg.mode === 'openai') {
    const provider = createOpenAI({ apiKey: env.OPENAI_API_KEY!.trim() });
    return { model: provider(cfg.modelName), kind: 'openai' };
  }
  if (cfg.mode === 'gemini') {
    const key = (env.GEMINI_API_KEY || env.GOOGLE_GENERATIVE_AI_API_KEY)!.trim();
    const provider = createGoogleGenerativeAI({ apiKey: key });
    return { model: provider(cfg.modelName), kind: 'gemini' };
  }
  return { model: null, kind: 'deterministic_simulation' };
}

function getLiveImageModel(env: NodeJS.ProcessEnv = process.env): {
  model: ImageModel | null;
  kind: 'openai' | 'gemini' | 'none';
} {
  if (env.OPENAI_API_KEY?.trim()) {
    const provider = createOpenAI({ apiKey: env.OPENAI_API_KEY.trim() });
    return { model: provider.image('dall-e-3'), kind: 'openai' };
  }
  const geminiKey =
    env.GEMINI_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (geminiKey) {
    const provider = createGoogleGenerativeAI({ apiKey: geminiKey });
    return { model: provider.image('imagen-3.0-generate-002'), kind: 'gemini' };
  }
  return { model: null, kind: 'none' };
}

export async function generateOnboardingTurnWithAi(params: {
  user: UserProfile;
  wingmanName: string;
  message: string;
  isPrivateTurn?: boolean;
  overrideModel?: LanguageModel;
}): Promise<{
  executionMode: ExecutionMode;
  wingmanReply: string;
  extractedInsights: ReturnType<typeof runDeterministicOnboardingTurn>['extractedInsights'];
  followUpQuestion: string;
  progressDelta: number;
  guardrailTriggered: boolean;
  guardrailNote?: string;
}> {
  const { user, wingmanName, message, isPrivateTurn, overrideModel } = params;

  // Always enforce F-07 anti-parasocial boundary up front before calling any LLM
  if (detectParasocialAdvance(message)) {
    return {
      executionMode: 'deterministic_simulation',
      wingmanReply: buildAntiParasocialDeflection(wingmanName),
      extractedInsights: [],
      followUpQuestion: 'What qualities in a real human partner make you feel both safe and energized?',
      progressDelta: 0,
      guardrailTriggered: true,
      guardrailNote: 'Anti-parasocial fiduciary boundary enforced.',
    };
  }

  const confidential = isExplicitConfidentialTurn(message, isPrivateTurn);
  const resolved = overrideModel
    ? { model: overrideModel, kind: 'openai' as const }
    : getLiveLanguageModel();

  if (resolved.model) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const { output } = await generateText({
        model: resolved.model,
        system: WINGMAN_SYSTEM_PROMPT,
        prompt: JSON.stringify({
          wingmanName,
          userDisplayName: user.displayName,
          currentProgress: user.onboardingProgress,
          existingDimensions: user.blueprint.map((b) => b.dimension),
          confidentialTurn: confidential,
          userMessage: message,
        }),
        output: Output.object({ schema: LlmOnboardingTurnOutputSchema }),
        abortSignal: controller.signal,
      });
      clearTimeout(timer);

      if (output && !hasSycophanticReciprocation(output.wingmanReply)) {
        const safeInsights = output.extractedInsights.map((ins) => ({
          ...ins,
          visibility: confidential ? ('private' as const) : ins.visibility,
        }));
        const safeReply = confidential
          ? sanitizeTextAgainstPrivateInsights(output.wingmanReply, user)
          : output.wingmanReply;
        return {
          executionMode: 'live_llm',
          wingmanReply: safeReply,
          extractedInsights: safeInsights,
          followUpQuestion: output.followUpQuestion,
          progressDelta: output.progressDelta,
          guardrailTriggered: false,
        };
      }
    } catch {
      // Seamless fallback to deterministic engine
    }
  }

  const fallback = buildDeterministicOnboardingFallback({
    user,
    wingmanName,
    message,
    isPrivateTurn: confidential,
  });
  return {
    executionMode: 'deterministic_simulation',
    ...fallback,
  };
}

export async function generateAgentMatchWithAi(params: {
  userA: UserProfile;
  userB: UserProfile;
  packetA: ShareableAgentPacket;
  packetB: ShareableAgentPacket;
  overrideModel?: LanguageModel;
}): Promise<{
  executionMode: ExecutionMode;
  turns: AgentDialogueTurn[];
  subScores: MatchDossier['subScores'];
  overallScore: number;
  headline: string;
  whyYoudClick: string[];
  potentialFrictionPoints: string[];
  sharedInterests: string[];
  complementaryPairingNote: string;
}> {
  const { userA, userB, packetA, packetB, overrideModel } = params;
  const resolved = overrideModel
    ? { model: overrideModel, kind: 'openai' as const }
    : getLiveLanguageModel();

  if (resolved.model) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 18_000);
      const { output } = await generateText({
        model: resolved.model,
        system: AGENT_NEGOTIATION_SYSTEM_PROMPT,
        prompt: JSON.stringify({
          agentA: packetA,
          agentB: packetB,
        }),
        output: Output.object({ schema: LlmAgentMatchOutputSchema }),
        abortSignal: controller.signal,
      });
      clearTimeout(timer);

      if (output) {
        const audit = verifyZeroPrivacyLeak(output, [userA, userB]);
        if (audit.clean) {
          const now = Date.now();
          const turns: AgentDialogueTurn[] = output.turns.map((t, idx) => ({
            turnNumber: idx + 1,
            speakerAgentId: t.speaker === 'initiator' ? packetA.agentId : packetB.agentId,
            speakerLabel:
              t.speaker === 'initiator'
                ? `${packetA.wingmanName} (${packetA.displayName}'s Wingman)`
                : `${packetB.wingmanName} (${packetB.displayName}'s Wingman)`,
            phase: t.phase,
            scenarioPrompt: t.scenarioPrompt || undefined,
            message: t.message,
            signalExtracted: t.signalExtracted,
            timestamp: new Date(now + (idx + 1) * 1000).toISOString(),
          }));

          const subScores = {
            values: clampScore(output.subScores.values),
            emotionalRhythm: clampScore(output.subScores.emotionalRhythm),
            lifestyle: clampScore(output.subScores.lifestyle),
            playfulness: clampScore(output.subScores.playfulness),
          };
          const overallScore = clampScore(
            subScores.values * 0.35 +
              subScores.emotionalRhythm * 0.3 +
              subScores.lifestyle * 0.2 +
              subScores.playfulness * 0.15,
          );
          const sharedInterests = packetA.interests.filter((interest) =>
            packetB.interests.some((other) => other.toLowerCase() === interest.toLowerCase()),
          );

          return {
            executionMode: 'live_llm',
            turns,
            subScores,
            overallScore,
            headline: output.headline,
            whyYoudClick: output.whyYoudClick,
            potentialFrictionPoints: output.potentialFrictionPoints,
            sharedInterests,
            complementaryPairingNote: output.complementaryPairingNote,
          };
        }
      }
    } catch {
      // Fall back cleanly if live LLM fails, times out, or leaks private data
    }
  }

  const fallback = buildDeterministicAgentMatchFallback({ packetA, packetB });
  return {
    executionMode: 'deterministic_simulation',
    ...fallback,
  };
}

export async function generateFutureModuleWithAi(params: {
  matchId: string;
  userA: UserProfile;
  userB: UserProfile;
  packetA: ShareableAgentPacket;
  packetB: ShareableAgentPacket;
  sharedInterests: string[];
  module: 'date_nights' | 'world_adventure' | 'future_family' | 'all';
  includeFamily: boolean;
  overrideModel?: LanguageModel;
  overrideImageModel?: ImageModel;
  overrideImageProviderKind?: 'openai' | 'gemini';
}): Promise<{
  executionMode: ExecutionMode;
  dateNightBlueprints?: FutureSimulation['dateNightBlueprints'];
  worldAdventure?: FutureSimulation['worldAdventure'];
  futureFamily?: FutureSimulation['futureFamily'];
}> {
  const {
    matchId,
    userA,
    userB,
    packetA,
    packetB,
    sharedInterests,
    module,
    includeFamily,
    overrideModel,
    overrideImageModel,
    overrideImageProviderKind,
  } = params;

  const needDateNights = module === 'date_nights' || module === 'all';
  const needWorld = module === 'world_adventure' || module === 'all';
  const needFamily = includeFamily && (module === 'future_family' || module === 'all');

  const deterministic = buildDeterministicFutureSimulation({
    matchId,
    userA,
    userB,
    sharedInterests,
    includeDateNights: needDateNights,
    includeWorldAdventure: needWorld,
    includeFutureFamily: needFamily,
  });

  const resolved = overrideModel
    ? { model: overrideModel, kind: 'openai' as const }
    : getLiveLanguageModel();

  let executionMode: ExecutionMode = 'deterministic_simulation';
  let dateNightBlueprints = deterministic.dateNightBlueprints;
  let worldAdventure = deterministic.worldAdventure;
  let futureFamily = deterministic.futureFamily;

  if (resolved.model) {
    try {
      if (needDateNights) {
        const res = await generateText({
          model: resolved.model,
          system: 'Generate 3 bespoke, grounded date night blueprints using only shareable partner summaries.',
          prompt: JSON.stringify({ partnerA: packetA, partnerB: packetB, sharedInterests }),
          output: Output.object({ schema: LlmDateNightsOutputSchema }),
        });
        if (res.output && verifyZeroPrivacyLeak(res.output, [userA, userB]).clean) {
          dateNightBlueprints = res.output.concepts;
          executionMode = 'live_llm';
        }
      }
      if (needWorld) {
        const res = await generateText({
          model: resolved.model,
          system: 'Generate an around-the-world balanced itinerary using only shareable partner summaries.',
          prompt: JSON.stringify({ partnerA: packetA, partnerB: packetB, sharedInterests }),
          output: Output.object({ schema: LlmWorldAdventureOutputSchema }),
        });
        if (res.output && verifyZeroPrivacyLeak(res.output, [userA, userB]).clean) {
          worldAdventure = res.output;
          executionMode = 'live_llm';
        }
      }
      if (needFamily && futureFamily) {
        const res = await generateText({
          model: resolved.model,
          system: 'Generate a lighthearted, warm future family personality mashup using only shareable summaries.',
          prompt: JSON.stringify({ partnerA: packetA, partnerB: packetB, sharedInterests }),
          output: Output.object({ schema: LlmFutureFamilyOutputSchema }),
        });
        if (res.output && verifyZeroPrivacyLeak(res.output, [userA, userB]).clean) {
          futureFamily = {
            ...futureFamily,
            mashupHeadline: res.output.mashupHeadline,
            kidPersonalityBlend: res.output.kidPersonalityBlend,
            inheritedFromUserA: res.output.inheritedFromUserA,
            inheritedFromUserB: res.output.inheritedFromUserB,
            futureKidHobbies: res.output.futureKidHobbies,
            sundayFamilyRitual: res.output.sundayFamilyRitual,
            dinnerTableDebateTopic: res.output.dinnerTableDebateTopic,
            portraitConcept: {
              ...futureFamily.portraitConcept,
              caption: res.output.portraitCaption,
              promptUsed: res.output.portraitPrompt,
            },
          };
          executionMode = 'live_llm';
        }
      }
    } catch {
      // Keep deterministic outputs seamlessly
    }
  }

  // Optional live AI portrait generation (with provider-specific sizing & SVG fallback)
  if (needFamily && futureFamily) {
    const imgResolved = overrideImageModel
      ? { model: overrideImageModel, kind: overrideImageProviderKind ?? ('openai' as const) }
      : getLiveImageModel();

    if (imgResolved.model) {
      try {
        const imgResult = await generateImage({
          model: imgResolved.model,
          prompt: futureFamily.portraitConcept.promptUsed,
          ...(imgResolved.kind === 'openai'
            ? { size: '1024x1024' as const }
            : { aspectRatio: '1:1' as const }),
        });
        const firstImage = imgResult.images?.[0];
        if (firstImage?.base64) {
          const mediaType = firstImage.mediaType || 'image/png';
          futureFamily = {
            ...futureFamily,
            portraitConcept: {
              ...futureFamily.portraitConcept,
              renderMode: 'ai_image_api',
              imageUrl: `data:${mediaType};base64,${firstImage.base64}`,
            },
          };
          executionMode = 'live_llm';
        }
      } catch {
        // Keep svg_canvas_composer fallback
      }
    }
  }

  return {
    executionMode,
    dateNightBlueprints,
    worldAdventure,
    futureFamily,
  };
}

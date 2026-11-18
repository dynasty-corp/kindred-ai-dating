import type {
  AgentPersona,
  BlueprintInsight,
  KindredStoreSnapshot,
  UserProfile,
} from '@/lib/types/schemas';

const SEED_TS = '2026-11-16T12:00:00.000Z';

function makeInsight(
  id: string,
  dimension: BlueprintInsight['dimension'],
  title: string,
  summary: string,
  visibility: BlueprintInsight['visibility'] = 'shareable',
  confidence = 90,
): BlueprintInsight {
  return {
    id,
    dimension,
    title,
    summary,
    visibility,
    confidence,
    source: 'seeded',
    updatedAt: SEED_TS,
  };
}

export function buildDefaultMayaProfile(): UserProfile {
  return {
    id: 'user-default',
    email: 'maya.lin@kindred.demo',
    displayName: 'Maya Lin',
    age: 29,
    pronouns: 'she/her',
    city: 'San Francisco, CA',
    occupation: 'Architectural Ceramicist & Spatial Designer',
    bioTagline:
      'Tactile maker who loves unhurried Sunday espresso walks, collaborative cooking, and honest repair after conflict.',
    interests: [
      'ceramics',
      'espresso',
      'indie cinema',
      'coastal architecture',
      'farmer markets',
      'vinyl jazz',
    ],
    isSeededDemo: false,
    avatarConfig: {
      skinTone: '#D9A684',
      hairStyle: 'wavy_bob',
      hairColor: '#262322',
      accentColor: '#D96B4F',
      expression: 'warm_smile',
      accessory: 'earrings',
    },
    onboardingMessages: [
      {
        id: 'maya-msg-1',
        role: 'wingman',
        content:
          "Hey Maya — I'm Sage, your Wingman. I'm not here to flatter you or play matchmaker with cheesy bios; I'm here to understand what actually makes a partnership feel steady and alive for you. When a week goes sideways, what helps you feel grounded with a partner?",
        timestamp: SEED_TS,
        isPrivateTurn: false,
      },
      {
        id: 'maya-msg-2',
        role: 'user',
        content:
          "I value same-night repair talks when tension comes up, calm honesty over guessing games, and someone who balances my spontaneous studio bursts with steady warmth. I'm open to future family down the road.",
        timestamp: SEED_TS,
        isPrivateTurn: false,
      },
      {
        id: 'maya-msg-3',
        role: 'wingman',
        content:
          'Got it — same-night repair, emotional directness, and grounded warmth paired with creative spontaneity. I updated your Blueprint with 6 insights (and kept your private boundary note off-limits to other agents). Want to refine anything or add one more detail before meeting the Agent Lounge?',
        timestamp: SEED_TS,
        isPrivateTurn: false,
      },
    ],
    blueprint: [
      makeInsight(
        'maya-ins-1',
        'coreValues',
        'Grounded Curiosity & Warmth',
        'Values intellectual honesty, kindness in everyday rituals, and building a home with creative warmth.',
        'shareable',
        92,
      ),
      makeInsight(
        'maya-ins-2',
        'attachmentStyle',
        'Earned Secure & Direct',
        'Leans secure when partners communicate openly; appreciates reassurance paired with healthy autonomy.',
        'shareable',
        88,
      ),
      makeInsight(
        'maya-ins-3',
        'conflictResolution',
        'Same-Night Calm Repair',
        'Prefers pausing to cool down for 20 minutes, then talking things through the same evening without silent treatment.',
        'shareable',
        94,
      ),
      makeInsight(
        'maya-ins-4',
        'humorStyle',
        'Observational & Playful Banter',
        'Loves dry, affectionate teasing during errands and shared kitchen experiments.',
        'shareable',
        86,
      ),
      makeInsight(
        'maya-ins-5',
        'relationshipGoals',
        'Intentional Long-Term Partnership',
        'Looking for a committed partner and remains open to building a warm family chapter in the future.',
        'shareable',
        91,
      ),
      makeInsight(
        'maya-ins-6',
        'dealbreakers',
        'Chronic Stonewalling',
        'Does not thrive with multi-day silent treatment or dismissiveness during vulnerable conversations.',
        'private',
        95,
      ),
    ],
    onboardingProgress: 75,
    onboardingCompleted: false,
    activeMatchIds: [],
    createdAt: SEED_TS,
    updatedAt: SEED_TS,
  };
}

export function buildSeededUsers(): UserProfile[] {
  return [
    {
      id: 'seed-1',
      displayName: 'Marcus Hale',
      age: 31,
      pronouns: 'he/him',
      city: 'San Francisco, CA',
      occupation: 'Urban Acoustic Architect',
      bioTagline:
        'Structured studio planner who loves rainy-day ramen broth, jazz listening bars, and thoughtful design walks.',
      interests: [
        'vinyl jazz',
        'coastal architecture',
        'ramen craft',
        'espresso',
        'cycling',
        'bookstores',
      ],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#8C583A',
        hairStyle: 'short_fade',
        hairColor: '#1B1918',
        accentColor: '#6E8F78',
        expression: 'calm_gaze',
        accessory: 'glasses',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's1-ins-1',
          'coreValues',
          'Intentional Craft & Integrity',
          'Cares deeply about curiosity, keeping commitments, and creating calm spaces for people he loves.',
        ),
        makeInsight(
          's1-ins-2',
          'attachmentStyle',
          'Steady Secure Anchor',
          'Brings predictable reliability and enjoys giving a creative partner room to explore.',
        ),
        makeInsight(
          's1-ins-3',
          'conflictResolution',
          'Collaborative De-escalation',
          'Believes in naming friction kindly the same evening and finding practical next steps together.',
        ),
        makeInsight(
          's1-ins-4',
          'lifestyleRhythm',
          'Structured Weekdays, Unhurried Sundays',
          'Plans logistics smoothly while protecting slow, unscripted Sunday mornings for coffee and markets.',
        ),
        makeInsight(
          's1-ins-5',
          'humorStyle',
          'Dry Architectural Wit',
          'Enjoys playful storytelling, puns over dinner prep, and affectionate banter.',
        ),
        makeInsight(
          's1-ins-6',
          'relationshipGoals',
          'Rooted Partnership & Future Family',
          'Seeking a lifelong creative teammate and excited about family rituals down the road.',
        ),
        makeInsight(
          's1-ins-7',
          'unspokenPreferences',
          'Gentle Transition Time After Work',
          'Needs 20 quiet minutes after intense studio deadlines before diving into heavy logistics.',
          'private',
        ),
      ],
      onboardingProgress: 92,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
    {
      id: 'seed-2',
      displayName: 'Priya Nair',
      age: 30,
      pronouns: 'she/her',
      city: 'Oakland, CA',
      occupation: 'Botanical Pastry Chef & Cookbook Researcher',
      bioTagline:
        'Morning market regular experimenting with cardamom croissants, mystery novels, and neighborhood supper clubs.',
      interests: [
        'farmer markets',
        'pastry baking',
        'indie cinema',
        'botanical gardens',
        'ceramics',
        'board games',
      ],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#B57B56',
        hairStyle: 'long_waves',
        hairColor: '#1E1A18',
        accentColor: '#C89B54',
        expression: 'curious_grin',
        accessory: 'earrings',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's2-ins-1',
          'coreValues',
          'Hospitality & Emotional Courage',
          'Values generosity, curiosity about different cultures, and showing care through tangible everyday gestures.',
        ),
        makeInsight(
          's2-ins-2',
          'attachmentStyle',
          'Warm & Communicative',
          'Thrives on regular check-ins and honest celebration of each other’s creative projects.',
        ),
        makeInsight(
          's2-ins-3',
          'conflictResolution',
          'Tea-Table Repair Talks',
          'Prefers sitting down with tea to talk gently and clearly before bed whenever misunderstandings arise.',
        ),
        makeInsight(
          's2-ins-4',
          'lifestyleRhythm',
          'Early Risers & Cozy Evenings',
          'Loves early farmer market mornings paired with cozy indie films and experimental cooking at night.',
        ),
        makeInsight(
          's2-ins-5',
          'humorStyle',
          'Playful Kitchen Banter',
          'Turns small kitchen mishaps into running jokes and loves wordplay.',
        ),
        makeInsight(
          's2-ins-6',
          'relationshipGoals',
          'Warm Co-Created Life',
          'Ready for an intentional partnership open to family, traditions, and collaborative travel.',
        ),
        makeInsight(
          's2-ins-7',
          'dealbreakers',
          'Cynicism About Small Joys',
          'Avoids partners who mock sincerity or treat vulnerability as weakness.',
          'private',
        ),
      ],
      onboardingProgress: 95,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
    {
      id: 'seed-3',
      displayName: 'Julian Vega',
      age: 32,
      pronouns: 'he/they',
      city: 'San Francisco, CA',
      occupation: 'Documentary Sound Designer',
      bioTagline:
        'Field-recording traveler collecting coastal fog sounds, late-night street tacos, and slow analog photography.',
      interests: [
        'vinyl jazz',
        'indie cinema',
        'analog photography',
        'espresso',
        'coastal trails',
        'world cinema',
      ],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#C88D68',
        hairStyle: 'curly_crop',
        hairColor: '#2B221E',
        accentColor: '#D96B4F',
        expression: 'playful_wink',
        accessory: 'scarf',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's3-ins-1',
          'coreValues',
          'Presence & Deep Listening',
          'Believes active listening and curiosity keep love alive far longer than performative romance.',
        ),
        makeInsight(
          's3-ins-2',
          'attachmentStyle',
          'Reflective & Attuned',
          'Balances emotional depth with respectful space for independent artistic work.',
        ),
        makeInsight(
          's3-ins-3',
          'conflictResolution',
          'Curious Non-Defensive Repair',
          'Asks what the other person heard before defending intent, aiming for same-day reconnection.',
        ),
        makeInsight(
          's3-ins-4',
          'lifestyleRhythm',
          'Rhythmic Travel & Cozy Home Base',
          'Mixes short creative field trips with deeply grounded, screen-free evenings at home.',
        ),
        makeInsight(
          's3-ins-5',
          'humorStyle',
          'Warm Absurdist Storytelling',
          'Notices tiny quirky details on street corners and shares affectionate comedic observations.',
        ),
        makeInsight(
          's3-ins-6',
          'relationshipGoals',
          'Enduring Co-Adventure',
          'Wants a long-term partner to build a warm creative home with and remains open to future family.',
        ),
      ],
      onboardingProgress: 90,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
    {
      id: 'seed-4',
      displayName: 'Elena Vance',
      age: 28,
      pronouns: 'she/her',
      city: 'Berkeley, CA',
      occupation: 'Climate Systems Strategist',
      bioTagline:
        'Spreadsheet-loving trail planner who brings thermos matcha to dawn viewpoints and loves spontaneous museum detours.',
      interests: [
        'coastal architecture',
        'farmer markets',
        'trail running',
        'puzzle escapes',
        'matcha',
        'sci-fi books',
      ],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#E8BFA3',
        hairStyle: 'sleek_bun',
        hairColor: '#5A3A28',
        accentColor: '#6E8F78',
        expression: 'warm_smile',
        accessory: 'headband',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's4-ins-1',
          'coreValues',
          'Stewardship & Mutual Reliability',
          'Values clarity, shared responsibility, and turning big ideals into thoughtful daily habits.',
        ),
        makeInsight(
          's4-ins-2',
          'attachmentStyle',
          'Direct & Grounded',
          'Expresses appreciation verbally and checks in directly rather than letting assumptions fester.',
        ),
        makeInsight(
          's4-ins-3',
          'conflictResolution',
          'Structured Same-Evening Debrief',
          'Likes naming the shared problem clearly and repairing quickly with warmth and zero scorekeeping.',
        ),
        makeInsight(
          's4-ins-4',
          'lifestyleRhythm',
          'Steady Planner Seeking Creative Spark',
          'Enjoys advance structure while admiring partners who bring spontaneous artistic detours.',
        ),
        makeInsight(
          's4-ins-5',
          'humorStyle',
          'Quick Wordplay & Nerd Joy',
          'Loves clever banter, collaborative escape puzzles, and light-hearted trivia.',
        ),
        makeInsight(
          's4-ins-6',
          'relationshipGoals',
          'Committed Life Partner',
          'Building toward a grounded long-term partnership open to family and shared community.',
        ),
      ],
      onboardingProgress: 89,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
    {
      id: 'seed-5',
      displayName: 'Devon Brooks',
      age: 33,
      pronouns: 'he/him',
      city: 'San Jose, CA',
      occupation: 'Venture Growth Operator & Weekend Motorsport Hobbyist',
      bioTagline:
        'Always chasing the next adrenaline sprint, red-eye flight, and high-stakes pitch — slow Sundays make me antsy.',
      interests: ['motorsport', 'biohacking', 'high-altitude skiing', 'steakhouse', 'poker'],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#DFAD8C',
        hairStyle: 'swept_back',
        hairColor: '#3B2C22',
        accentColor: '#3D5A80',
        expression: 'curious_grin',
        accessory: 'none',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's5-ins-1',
          'coreValues',
          'Relentless Velocity & Autonomy',
          'Prioritizes career intensity, extreme independence, and spontaneous high-adrenaline sprints.',
        ),
        makeInsight(
          's5-ins-2',
          'attachmentStyle',
          'Hyper-Independent',
          'Needs wide personal space and resists routine domestic check-ins or slow homebody weekends.',
        ),
        makeInsight(
          's5-ins-3',
          'conflictResolution',
          'Cool-Off Until Next Week',
          'Prefers shelving emotional disagreements for several days rather than processing tension the same night.',
        ),
        makeInsight(
          's5-ins-4',
          'lifestyleRhythm',
          'Nonstop Red-Eye Schedule',
          'Thrives on constant travel, late-night networking, and minimal predictable home rhythm.',
        ),
        makeInsight(
          's5-ins-5',
          'relationshipGoals',
          'Casual Companion Without Anchors',
          'Not looking to settle into shared domestic routines or family planning anytime soon.',
        ),
      ],
      onboardingProgress: 86,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
    {
      id: 'seed-6',
      displayName: 'Clara Lindqvist',
      age: 34,
      pronouns: 'she/her',
      city: 'Palo Alto, CA',
      occupation: 'Biotech Patent Litigator',
      bioTagline:
        'Strict minimalist who lives by calendar blocks, quiet Nordic design, and zero tolerance for last-minute detours.',
      interests: ['ultramarathons', 'minimalist interiors', 'classical cello', 'alpine hiking'],
      isSeededDemo: true,
      avatarConfig: {
        skinTone: '#F0CEB6',
        hairStyle: 'straight_bob',
        hairColor: '#D4B07A',
        accentColor: '#5B6770',
        expression: 'calm_gaze',
        accessory: 'glasses',
      },
      onboardingMessages: [],
      blueprint: [
        makeInsight(
          's6-ins-1',
          'coreValues',
          'Order & Uncluttered Solitude',
          'Values precision, rigid predictability, and protecting quiet solo routines above spontaneity.',
        ),
        makeInsight(
          's6-ins-2',
          'attachmentStyle',
          'Highly Compartmentalized',
          'Keeps work, emotions, and weekend plans tightly compartmentalized on separate tracks.',
        ),
        makeInsight(
          's6-ins-3',
          'conflictResolution',
          'Formal Scheduled Review',
          'Dislikes immediate emotional dialogue and prefers waiting days to review disagreements calmly.',
        ),
        makeInsight(
          's6-ins-4',
          'lifestyleRhythm',
          'Strict 5am Training & Minimalism',
          'Zero tolerance for last-minute schedule changes, tactile studio clutter, or lingering mornings.',
        ),
        makeInsight(
          's6-ins-5',
          'relationshipGoals',
          'Strictly Child-Free & Separate Homes',
          'Explicitly child-free and prefers living in separate residences long-term.',
        ),
        makeInsight(
          's6-ins-6',
          'dealbreakers',
          'Unscheduled Spontaneous Plans',
          'Unplanned detours or messy creative spaces cause high daily friction.',
          'private',
        ),
      ],
      onboardingProgress: 91,
      onboardingCompleted: true,
      activeMatchIds: [],
      createdAt: SEED_TS,
      updatedAt: SEED_TS,
    },
  ];
}

export function deriveAgentPersonaFromUser(
  user: UserProfile,
  existing?: AgentPersona,
): AgentPersona {
  const shareableInsights = user.blueprint.filter((b) => b.visibility === 'shareable');
  const privateCount = user.blueprint.filter((b) => b.visibility !== 'shareable').length;

  const corpus = shareableInsights.map((i) => `${i.title} ${i.summary}`.toLowerCase()).join(' ');

  const structureVsSpontaneity = corpus.includes('strict') || corpus.includes('structured') || corpus.includes('planner')
    ? 78
    : corpus.includes('spontaneous') || corpus.includes('unscripted')
      ? 35
      : 54;
  const socialBattery = corpus.includes('supper') || corpus.includes('networking')
    ? 74
    : corpus.includes('solitude') || corpus.includes('quiet')
      ? 36
      : 58;
  const emotionalDirectness =
    corpus.includes('same-night') ||
    corpus.includes('direct') ||
    corpus.includes('repair') ||
    corpus.includes('tea-table')
      ? 88
      : corpus.includes('shelving') || corpus.includes('compartmentalized') || corpus.includes('waiting days')
        ? 28
        : 65;
  const noveltyAppetite =
    corpus.includes('travel') || corpus.includes('experimental') || corpus.includes('curiosity')
      ? 78
      : corpus.includes('rigid') || corpus.includes('predictability')
        ? 30
        : 64;
  const familyOrientation =
    corpus.includes('child-free') || corpus.includes('without anchors') || corpus.includes('casual')
      ? 12
      : corpus.includes('family') || corpus.includes('warm') || corpus.includes('traditions')
        ? 85
        : 55;

  const dealbreakerSignals = shareableInsights
    .filter((i) => i.dimension === 'dealbreakers')
    .map((i) => `${i.title}: ${i.summary}`);

  const complementaryStrengths: string[] = [];
  if (structureVsSpontaneity >= 70) complementaryStrengths.push('Steadies shared logistics & planning');
  if (structureVsSpontaneity <= 45) complementaryStrengths.push('Brings creative warmth & spontaneous wonder');
  if (emotionalDirectness >= 75) complementaryStrengths.push('Anchors honest same-day repair');
  if (noveltyAppetite >= 70) complementaryStrengths.push('Invites curious shared exploration');
  if (complementaryStrengths.length === 0) {
    complementaryStrengths.push('Grounded curiosity and thoughtful presence');
  }

  const wingmanNames: Record<string, string> = {
    'user-default': 'Sage',
    'seed-1': 'Atlas',
    'seed-2': 'Saffron',
    'seed-3': 'Lyric',
    'seed-4': 'Compass',
    'seed-5': 'Velo',
    'seed-6': 'Nord',
  };

  return {
    id: existing?.id ?? `agent-${user.id}`,
    userId: user.id,
    wingmanName: existing?.wingmanName ?? wingmanNames[user.id] ?? 'Kindred Wingman',
    coachingTone: existing?.coachingTone ?? 'warm_grounded',
    systemGuardrailVersion: 'fiduciary-v2.1',
    shareableSummaries: shareableInsights.map((i) => ({
      insightId: i.id,
      dimension: i.dimension,
      title: i.title,
      summary: i.summary,
    })),
    dealbreakerSignals,
    compatibilityVector: {
      structureVsSpontaneity,
      socialBattery,
      emotionalDirectness,
      noveltyAppetite,
      familyOrientation,
    },
    complementaryStrengths,
    privateContextCount: privateCount,
    lastSyncedFromBlueprintAt: new Date().toISOString(),
  };
}

export function buildInitialSeedSnapshot(): KindredStoreSnapshot {
  const maya = buildDefaultMayaProfile();
  const seeds = buildSeededUsers();
  const allUsers = [maya, ...seeds];

  const users: Record<string, UserProfile> = {};
  const personas: Record<string, AgentPersona> = {};

  for (const user of allUsers) {
    users[user.id] = user;
    const persona = deriveAgentPersonaFromUser(user);
    personas[persona.id] = persona;
  }

  return {
    version: 1,
    activeUserId: maya.id,
    users,
    personas,
    conversations: {},
    matches: {},
    gameSessions: {},
    futureSimulations: {},
  };
}

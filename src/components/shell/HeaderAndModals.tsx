'use client';

import { useState } from 'react';
import { RotateCcw, Sparkles, UserPlus, Users, Archive } from 'lucide-react';
import { AvatarPortrait } from '@/components/ui/AvatarPortrait';
import { Badge, Button, Modal } from '@/components/ui/primitives';
import type { AvatarConfig, MatchDossier, SanitizedCandidate } from '@/lib/types/schemas';

export interface WorkspaceUserSummary {
  id: string;
  displayName: string;
  isSeededDemo: boolean;
  onboardingProgress: number;
  activeCohortCount: number;
  occupation: string;
  city: string;
  avatarConfig: AvatarConfig;
}

export function HeaderBar({
  currentUser,
  users,
  activeCohortCount,
  maxCohortSize,
  aiMode,
  onSwitchUser,
  onOpenNewProfile,
  onOpenCohort,
  onResetDemo,
}: {
  currentUser: WorkspaceUserSummary;
  users: WorkspaceUserSummary[];
  activeCohortCount: number;
  maxCohortSize: number;
  aiMode: string;
  onSwitchUser: (userId: string) => void;
  onOpenNewProfile: () => void;
  onOpenCohort: () => void;
  onResetDemo: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#E4DDD2] bg-[#FAF7F2]/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#15181C] text-[#FAF7F2] shadow-sm">
            <Sparkles className="h-5 w-5 text-[#D96B4F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-editorial text-xl font-semibold tracking-tight text-[#15181C]">
                KindredAI
              </h1>
              <Badge tone="sage" className="hidden sm:inline-flex">
                {aiMode === 'deterministic_simulation' ? 'Simulation Ready' : `Live ${aiMode}`}
              </Badge>
            </div>
            <p className="text-[11px] text-[#535963]">
              Fiduciary Wingman · Privacy-Safe Agent Lounge · Co-Op Play
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="account-switcher">
            Switch active user profile
          </label>
          <select
            id="account-switcher"
            data-testid="account-switcher"
            value={currentUser.id}
            onChange={(e) => onSwitchUser(e.target.value)}
            className="h-9 rounded-xl border border-[#DFD7CA] bg-white px-3 text-xs font-medium text-[#15181C] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[#D96B4F]/40"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} {u.isSeededDemo ? '(Demo)' : '(You)'} · {u.onboardingProgress}%
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            data-testid="new-profile-button"
            onClick={onOpenNewProfile}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>New Profile</span>
          </Button>

          <Button
            variant={activeCohortCount >= maxCohortSize ? 'terracotta' as never : 'outline'}
            size="sm"
            data-testid="focused-cohort-trigger"
            onClick={onOpenCohort}
            className={
              activeCohortCount >= maxCohortSize
                ? 'border-[#D96B4F] bg-[#D96B4F]/12 text-[#B85137]'
                : ''
            }
          >
            <Users className="h-3.5 w-3.5" />
            <span>
              Focused Cohort ({activeCohortCount}/{maxCohortSize})
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            data-testid="reset-demo-button"
            onClick={onResetDemo}
            title="Reset demo state"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Reset Demo</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export function NewProfileModal({
  open,
  onOpenChange,
  onCreate,
  busy,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: {
    displayName: string;
    age: number;
    pronouns: string;
    city: string;
    occupation: string;
    bioTagline: string;
    interests: string[];
    wingmanName: string;
  }) => Promise<void>;
  busy: boolean;
  error: string | null;
}) {
  const [displayName, setDisplayName] = useState('');
  const [age, setAge] = useState('29');
  const [pronouns, setPronouns] = useState('she/her');
  const [city, setCity] = useState('San Francisco, CA');
  const [occupation, setOccupation] = useState('Product Designer');
  const [bioTagline, setBioTagline] = useState(
    'Curious conversationalist who values emotional honesty and shared weekend rituals.',
  );
  const [interests, setInterests] = useState('espresso, architecture, indie cinema');
  const [wingmanName, setWingmanName] = useState('Sage');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCreate({
      displayName,
      age: Number(age),
      pronouns,
      city,
      occupation,
      bioTagline,
      interests: interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      wingmanName,
    });
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Real Multi-User Profile"
      description="Spin up an independent account to test real 2-human mutual matching, blind co-op picks, and dual-consent gates."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-xl border border-[#9B3B2E]/30 bg-[#9B3B2E]/10 px-3 py-2 text-xs text-[#9B3B2E]">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">
              Display Name *
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Clara Chen"
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B4F]/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">Age (18+) *</label>
            <input
              required
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D96B4F]/40"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">Pronouns</label>
            <input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">City</label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">Occupation</label>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[#15181C]">Wingman Name</label>
            <input
              value={wingmanName}
              onChange={(e) => setWingmanName(e.target.value)}
              className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#15181C]">
            Interests (comma-separated)
          </label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[#15181C]">Bio Tagline</label>
          <textarea
            rows={2}
            value={bioTagline}
            onChange={(e) => setBioTagline(e.target.value)}
            className="w-full rounded-xl border border-[#DFD7CA] bg-white px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? 'Creating...' : 'Create Profile'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function FocusedCohortModal({
  open,
  onOpenChange,
  activeMatches,
  candidates,
  currentUserId,
  maxCohortSize,
  onArchiveMatch,
  onOpenMatchInArena,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeMatches: MatchDossier[];
  candidates: SanitizedCandidate[];
  currentUserId: string;
  maxCohortSize: number;
  onArchiveMatch: (matchId: string) => Promise<void>;
  onOpenMatchInArena: (matchId: string) => void;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Focused Cohort (${activeMatches.length}/${maxCohortSize})`}
      description="KindredAI caps active connections at 3 to prevent swipe fatigue and encourage intentional real-world dates."
    >
      <div className="space-y-3">
        {activeMatches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#DFD7CA] bg-white/70 p-6 text-center text-sm text-[#535963]">
            Your Focused Cohort is empty. Visit the Agent Lounge to review compatibility dossiers and accept up to 3 connections.
          </div>
        ) : (
          activeMatches.map((match) => {
            const partnerId = match.userAId === currentUserId ? match.userBId : match.userAId;
            const partner = candidates.find((c) => c.id === partnerId);
            return (
              <div
                key={match.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E4DDD2] bg-white p-3.5"
              >
                <div className="flex items-center gap-3">
                  {partner && (
                    <AvatarPortrait
                      config={partner.avatarConfig}
                      name={partner.displayName}
                      size={42}
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#15181C]">
                        {partner?.displayName ?? partnerId}
                      </span>
                      <Badge tone="sage">{match.overallScore}% Match</Badge>
                    </div>
                    <p className="text-xs text-[#535963]">{partner?.occupation}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      onOpenMatchInArena(match.id);
                      onOpenChange(false);
                    }}
                  >
                    Open Arena
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    data-testid={`archive-match-${match.id}`}
                    onClick={() => onArchiveMatch(match.id)}
                    title="Archive to release cohort slot"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    <span>Archive</span>
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
}

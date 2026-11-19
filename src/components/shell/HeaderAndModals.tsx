'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  ChevronDown,
  Heart,
  Moon,
  RotateCcw,
  Sparkles,
  Sun,
  UserPlus,
} from 'lucide-react';
import { AvatarPortrait } from '@/components/ui/AvatarPortrait';
import { Badge, Button, Modal } from '@/components/ui/primitives';
import { KINDRED_SPRING } from '@/lib/motion';
import { useKindredTheme } from '@/lib/theme';
import type { AvatarConfig, MatchDossier, SanitizedCandidate } from '@/lib/types/schemas';

export type StageTab = 'onboarding' | 'discovery' | 'games' | 'future';

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

const JOURNEY_STEPS: Array<{ id: StageTab; step: string; label: string }> = [
  { id: 'onboarding', step: '1', label: 'Your Story' },
  { id: 'discovery', step: '2', label: 'Introductions' },
  { id: 'games', step: '3', label: 'Play Together' },
  { id: 'future', step: '4', label: 'What If?' },
];

export function HeaderBar({
  stage,
  onSelectStage,
  onReturnToLanding,
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
  stage: StageTab;
  onSelectStage: (next: StageTab) => void;
  onReturnToLanding?: () => void;
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
  const { theme, toggleTheme } = useKindredTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--surface-glass-strong)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Clean Brand Wordmark */}
        <button
          type="button"
          onClick={onReturnToLanding}
          className="flex items-center gap-2.5 text-left transition hover:opacity-85 cursor-pointer"
          title="Back to KindredAI Intro"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--accent-coral-soft)] text-[var(--accent-coral)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <h1 className="font-editorial text-2xl font-normal tracking-tight text-[var(--ink-primary)]">
            KindredAI
          </h1>
        </button>

        {/* Unified Single-Layer 4-Step Journey Navigation (Desktop) */}
        <nav
          aria-label="KindredAI journey"
          className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/80 p-1 md:flex"
        >
          {JOURNEY_STEPS.map((item) => {
            const active = stage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-testid={`stage-tab-${item.id}`}
                onClick={() => onSelectStage(item.id)}
                className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'text-[var(--ink-primary)]'
                    : 'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="kindred-stage-pill"
                    transition={KINDRED_SPRING}
                    className="absolute inset-0 rounded-full bg-[var(--surface-elevated)] shadow-xs border border-[var(--border-hairline)]"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full font-mono-label text-[10px] ${
                      active
                        ? 'bg-[var(--accent-coral)] text-white'
                        : 'bg-[var(--border-hairline)] text-[var(--ink-muted)]'
                    }`}
                  >
                    {item.step}
                  </span>
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Minimal Right Utility Cluster */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeCohortCount >= maxCohortSize ? 'terracotta' : 'outline'}
            size="sm"
            data-testid="focused-cohort-trigger"
            onClick={onOpenCohort}
            className="rounded-full"
          >
            <Heart className="h-3.5 w-3.5 text-[var(--accent-coral)]" />
            <span>
              Matches ({activeCohortCount}/{maxCohortSize})
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            data-testid="theme-toggle-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'alabaster' ? 'Warm Nocturne' : 'Editorial Alabaster'} theme`}
            title={theme === 'alabaster' ? 'Switch to dark mode' : 'Switch to bright mode'}
            className="h-8 w-8 rounded-full p-0"
          >
            {theme === 'alabaster' ? (
              <Moon className="h-4 w-4 text-[var(--ink-secondary)]" />
            ) : (
              <Sun className="h-4 w-4 text-[var(--accent-amber)]" />
            )}
          </Button>

          {/* Clean Profile & Demo Popover Menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Open account and demo controls"
              className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--surface-elevated)] py-1 pl-1 pr-2.5 text-xs font-medium text-[var(--ink-primary)] shadow-2xs transition hover:border-[var(--border-strong)] cursor-pointer"
            >
              <AvatarPortrait
                config={currentUser.avatarConfig}
                name={currentUser.displayName}
                size={26}
              />
              <span className="hidden max-w-[90px] truncate sm:inline">
                {currentUser.displayName.split(' ')[0]}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-3.5 shadow-xl z-40 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-2.5">
                  <div>
                    <p className="text-xs font-semibold text-[var(--ink-primary)]">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[11px] text-[var(--ink-muted)]">{currentUser.city}</p>
                  </div>
                  <Badge tone="sage">
                    {aiMode === 'deterministic_simulation' ? 'Demo AI' : `Live ${aiMode}`}
                  </Badge>
                </div>

                <div>
                  <label
                    htmlFor="account-switcher"
                    className="mb-1 block text-[11px] font-medium text-[var(--ink-secondary)]"
                  >
                    Switch Account
                  </label>
                  <select
                    id="account-switcher"
                    data-testid="account-switcher"
                    value={currentUser.id}
                    onChange={(e) => {
                      onSwitchUser(e.target.value);
                      setMenuOpen(false);
                    }}
                    className="h-9 w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)] px-2.5 text-xs font-medium text-[var(--ink-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40"
                  >
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.displayName} {u.isSeededDemo ? '(Demo)' : '(You)'} · {u.onboardingProgress}%
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 border-t border-[var(--border-hairline)] pt-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="new-profile-button"
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenNewProfile();
                    }}
                    className="w-full justify-start"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Create New Profile</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    data-testid="reset-demo-button"
                    onClick={() => {
                      setMenuOpen(false);
                      onResetDemo();
                    }}
                    className="w-full justify-start text-[var(--ink-secondary)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Demo State</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Compact 4-Step Journey Strip */}
      <nav
        aria-label="KindredAI mobile journey"
        className="grid grid-cols-4 gap-1 border-t border-[var(--border-hairline)] bg-[var(--surface-glass-strong)] px-2 py-1.5 md:hidden"
      >
        {JOURNEY_STEPS.map((item) => {
          const active = stage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`mobile-stage-tab-${item.id}`}
              onClick={() => onSelectStage(item.id)}
              className={`rounded-xl py-1.5 text-[11px] font-medium transition cursor-pointer ${
                active
                  ? 'bg-[var(--accent-coral-soft)] text-[var(--accent-coral)] font-semibold'
                  : 'text-[var(--ink-secondary)]'
              }`}
            >
              {item.step}. {item.label.split(' ')[0]}
            </button>
          );
        })}
      </nav>
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

  const inputClass =
    'w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-coral)]/40';

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Create Real Multi-User Profile"
      description="Spin up an independent account to test real 2-human mutual matching, blind co-op picks, and dual-consent gates."
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="rounded-xl border border-[var(--accent-danger)]/35 bg-[var(--accent-danger-soft)] px-3 py-2 text-xs text-[var(--accent-danger)]">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              Display Name *
            </label>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., Clara Chen"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              Age (18+) *
            </label>
            <input
              required
              type="number"
              min={18}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              Pronouns
            </label>
            <input
              value={pronouns}
              onChange={(e) => setPronouns(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              City
            </label>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              Occupation
            </label>
            <input
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
              Wingman Name
            </label>
            <input
              value={wingmanName}
              onChange={(e) => setWingmanName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
            Interests (comma-separated)
          </label>
          <input
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--ink-secondary)]">
            Bio Tagline
          </label>
          <textarea
            rows={2}
            value={bioTagline}
            onChange={(e) => setBioTagline(e.target.value)}
            className={inputClass}
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
      title={`Your Focused Matches (${activeMatches.length}/${maxCohortSize})`}
      description="KindredAI caps active connections at 3 to prevent swipe fatigue and encourage intentional real-world dates."
    >
      <div className="space-y-3">
        {activeMatches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-subtle)]/50 p-6 text-center text-sm text-[var(--ink-secondary)]">
            No active matches yet. Visit <strong>Introductions</strong> to let your Wingman interview candidates and accept up to 3 connections.
          </div>
        ) : (
          activeMatches.map((match) => {
            const partnerId = match.userAId === currentUserId ? match.userBId : match.userAId;
            const partner = candidates.find((c) => c.id === partnerId);
            return (
              <div
                key={match.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--surface-subtle)]/70 p-3.5"
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
                      <span className="text-sm font-semibold text-[var(--ink-primary)]">
                        {partner?.displayName ?? partnerId}
                      </span>
                      <Badge tone="sage">{match.overallScore}% Match</Badge>
                    </div>
                    <p className="text-xs text-[var(--ink-secondary)]">{partner?.occupation}</p>
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
                    Play Together
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

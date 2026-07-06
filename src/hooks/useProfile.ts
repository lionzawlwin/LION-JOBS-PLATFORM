'use client';

import { useLocalStorageValue, useHasHydrated } from './useLocalStorageValue';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  lastApplied?: string;
}

const STORAGE_KEY = 'lion_profile';
const DEFAULT_PROFILE: UserProfile | null = null;

export function useProfile() {
  const [profile, setProfile] = useLocalStorageValue<UserProfile | null>(STORAGE_KEY, DEFAULT_PROFILE);
  const hydrated = useHasHydrated();

  function saveProfile(p: Partial<UserProfile>) {
    const merged: UserProfile = {
      name: '',
      email: '',
      phone: '',
      skills: [],
      ...profile,
      ...p,
      lastApplied: new Date().toISOString(),
    };
    setProfile(merged);
  }

  function clearProfile() {
    setProfile(null);
  }

  return { profile, hydrated, saveProfile, clearProfile };
}

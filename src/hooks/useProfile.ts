'use client';

import { useState, useEffect } from 'react';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  lastApplied?: string;
}

const STORAGE_KEY = 'lion_profile';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw) as UserProfile);
    } catch {
      // ignore parse errors
    }
    setHydrated(true);
  }, []);

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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      setProfile(merged);
    } catch {
      // ignore storage errors (e.g. private browsing quota)
    }
  }

  function clearProfile() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setProfile(null);
  }

  return { profile, hydrated, saveProfile, clearProfile };
}

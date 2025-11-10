import { Injectable } from '@angular/core';

export interface UserContext {
  care_recipient_name?: string;
  user_name?: string;
}

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly storageKey = 'sn_user_context';
  private context: UserContext = {};

  constructor() {
    this.load();
  }

  getContext(): UserContext {
    return { ...this.context };
  }

  updateContext(patch: UserContext): void {
    this.context = { ...this.context, ...patch };
    this.save();
  }

  reset(): void {
    this.context = {};
    sessionStorage.removeItem(this.storageKey);
  }

  private load(): void {
    try {
      const saved = sessionStorage.getItem(this.storageKey);
      if (saved) {
        this.context = JSON.parse(saved);
      }
    } catch (err) {
      console.warn('[UserContext] Failed to load context', err);
      this.context = {};
    }
  }

  private save(): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.context));
    } catch (err) {
      console.warn('[UserContext] Failed to persist context', err);
    }
  }
}

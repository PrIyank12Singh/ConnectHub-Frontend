import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeKey = 'connecthub_theme';
  private isDark = new BehaviorSubject<boolean>(this.getSavedTheme());
  isDark$ = this.isDark.asObservable();

  constructor() {
    this.applyTheme(this.isDark.value);
  }

  toggle(): void {
    const newVal = !this.isDark.value;
    this.isDark.next(newVal);
    localStorage.setItem(this.themeKey, newVal ? 'dark' : 'light');
    this.applyTheme(newVal);
  }

  private applyTheme(dark: boolean): void {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private getSavedTheme(): boolean {
    return localStorage.getItem(this.themeKey) === 'light' ? false : true;
  }
}

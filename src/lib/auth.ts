const AUTH_KEY = 'sautika-auth';

export function isSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function signIn(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, 'true');
  window.location.assign('/home');
}

export function signOut(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  window.location.assign('/');
}

// Replace this route with the real OAuth callback when authentication is connected.
export function continueWithGoogle(): void { signIn(); }
export function continueWithEmail(): void { window.location.assign('/signin/email'); }

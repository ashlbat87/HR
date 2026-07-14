// Authentication seam.
//
// This is the ONE place authentication is defined. Everything else in the app
// depends only on `getCurrentUser()` and the `AuthUser` shape below. Swapping the
// mock provider for real Microsoft Entra ID means adding an EntraAuthProvider that
// implements the same interface and selecting it here — NO caller changes.
//
// Stage 1 ships the mock provider only. It never stores passwords; it simulates
// "who is signed in" so the rest of the app (permissions, navigation, screens)
// can be built and tested against real behaviour.

import type { Role } from "@prisma/client";

export interface AuthUser {
  employeeId: string;
  email: string;
  displayName: string;
  roles: Role[];
}

export interface AuthProvider {
  /** The signed-in user for this request, or null if not signed in. */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Begin a session as the given email (mock). Real Entra handles this via OIDC. */
  signIn(email: string): Promise<void>;
  signOut(): Promise<void>;
}

// Provider selection. Only "mock" is implemented in Stage 1.
// When Entra is ready: implement EntraAuthProvider and switch on AUTH_MODE here.
import { MockAuthProvider } from "./mock-provider";

let provider: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (provider) return provider;
  const mode = process.env.AUTH_MODE ?? "mock";
  switch (mode) {
    case "mock":
      provider = new MockAuthProvider();
      break;
    // case "entra":
    //   provider = new EntraAuthProvider();  // Stage: production auth
    //   break;
    default:
      throw new Error(`Unknown AUTH_MODE "${mode}". Stage 1 supports "mock".`);
  }
  return provider;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return getAuthProvider().getCurrentUser();
}

import { registerPlugin } from "@capacitor/core";

type AppleSignInResponse = {
  identityToken?: string;
  email?: string;
  givenName?: string;
  familyName?: string;
};

type AppleSignInPlugin = {
  authorize(options: {
    clientId: string;
    redirectURI: string;
    scopes?: string;
  }): Promise<{ response: AppleSignInResponse }>;
};

export const SignInWithApple = registerPlugin<AppleSignInPlugin>("SignInWithApple");

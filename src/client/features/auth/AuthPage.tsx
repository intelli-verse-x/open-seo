import { z } from "zod";
import { Button } from "@/client/components/ui/button";
import {
  getCurrentAuthRedirect,
  getOAuthSignedQuery,
} from "@/lib/auth-redirect";
import { isHostedClientAuthMode, usesBetterAuthClient } from "@/lib/auth-mode";
import { PRIVACY_URL, TERMS_URL } from "@/shared/terms";

export const authRedirectSearchSchema = z.object({
  redirect: z.string().optional(),
});

// Shared ToBa auth controls; submissions remain owned by each route.
export const authInputClassName =
  "toba-auth-input bg-card text-base md:text-sm";
export const authSubmitClassName =
  "toba-auth-submit w-full bg-primary text-primary-foreground font-semibold hover:bg-primary/90";

export function useAuthPageState(redirect: string | undefined) {
  const redirectTo = getCurrentAuthRedirect(redirect);
  const oauthQuery =
    typeof window !== "undefined"
      ? getOAuthSignedQuery(window.location.search)
      : null;
  const isHostedMode = isHostedClientAuthMode();
  // Better Auth accounts exist (hosted or the standalone Docker edition), so
  // the email/password form can sign someone in.
  const isBetterAuthMode = usesBetterAuthClient();

  return {
    redirectTo,
    oauthQuery,
    isHostedMode,
    isBetterAuthMode,
  };
}

const termsLinkClassName =
  "text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors";

// Clickwrap: shown next to every button that can create an account, so
// clicking it is the affirmative acceptance the signup hook records.
export function TermsAgreementNotice({ action }: { action: string }) {
  return (
    <p className="text-center text-sm leading-relaxed text-muted-foreground">
      {action}, you agree to our{" "}
      <a
        href={TERMS_URL}
        target="_blank"
        rel="noreferrer"
        className={termsLinkClassName}
      >
        Terms
      </a>{" "}
      and{" "}
      <a
        href={PRIVACY_URL}
        target="_blank"
        rel="noreferrer"
        className={termsLinkClassName}
      >
        Privacy Policy
      </a>
      .
    </p>
  );
}

export function AuthMethodChooser({
  googleLabel,
  isBusy,
  disabled,
  onContinueWithGoogle,
}: {
  googleLabel: string;
  isBusy?: boolean;
  disabled?: boolean;
  onContinueWithGoogle: () => void;
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full border-border bg-card font-semibold hover:bg-accent"
        onClick={onContinueWithGoogle}
        disabled={disabled || isBusy}
      >
        <GoogleLogo />
        {isBusy ? "Opening Google..." : googleLabel}
      </Button>

      <div className="toba-auth-divider">or continue with email</div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 18 18" className="size-4 shrink-0">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.72H.94v2.34A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.96 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.96H.94A9 9 0 0 0 0 9c0 1.45.34 2.82.94 4.04l3.02-2.34Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.64 8.64 0 0 0 9 0 9 9 0 0 0 .94 4.96L3.96 7.3C4.67 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthPageCard({
  title,
  helperText,
  children,
  footer,
}: {
  title: string;
  helperText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="toba-auth-card w-full space-y-6">
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-semibold">{title}</h1>
          {helperText ? (
            <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">{children}</div>

      {footer ? <div className="text-center">{footer}</div> : null}
    </div>
  );
}

export function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="toba-auth-shell">
      <aside className="toba-auth-brand">
        <img src="/toba/logo.svg" alt="ToBa SEO" className="toba-auth-logo" />
        <div className="toba-auth-story">
          <span className="toba-auth-pill">
            SEO + AI visibility in one workspace
          </span>
          <h2>
            Rank higher on Google
            <br />
            <span>and in AI answers.</span>
          </h2>
          <p>
            Research keywords, track rankings, audit your sites and see how
            ChatGPT, Claude, Gemini and Perplexity talk about your brand.
          </p>
          <div className="toba-auth-preview">
            <p>Search visibility</p>
            <h3>Your workspace, in focus</h3>
            <p>Sign in to see your project’s search performance.</p>
            <div className="toba-auth-preview-grid">
              <span>
                Keywords tracked<strong>—</strong>
              </span>
              <span>
                Top 10 rankings<strong>—</strong>
              </span>
              <span>
                AI mentions<strong>—</strong>
              </span>
            </div>
          </div>
        </div>
        <p className="toba-auth-legal">
          © 2026 ToBa Tech Solutions · <a href={PRIVACY_URL}>Privacy</a> ·{" "}
          <a href={TERMS_URL}>Terms</a>
        </p>
      </aside>
      <main className="toba-auth-form">{children}</main>
    </div>
  );
}

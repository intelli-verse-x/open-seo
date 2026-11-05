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
        {isBusy ? "Opening Google..." : googleLabel}
      </Button>

      <div className="toba-auth-divider">
        or {googleLabel.startsWith("Sign up") ? "sign up" : "sign in"} with
        email
      </div>
    </div>
  );
}

export function AuthPageCard({
  title,
  helperText,
  children,
  footer,
  icon,
}: {
  title: string;
  helperText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="toba-auth-card w-full space-y-6">
      <div className="space-y-3">
        {icon ? <div className="toba-auth-icon">{icon}</div> : null}
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
            <h3>72.4%</h3>
            <span className="toba-preview-change">↑ 8.2% this month</span>
            <div className="toba-preview-bars" aria-hidden="true">
              {[24, 34, 30, 40, 37, 46, 43, 50, 48, 56, 53, 62, 59, 69].map(
                (height, i) => (
                  <i key={i} style={{ height }} />
                ),
              )}
            </div>
            <div className="toba-auth-preview-grid">
              <span>
                Keywords tracked<strong>207</strong>
              </span>
              <span>
                Top 10 rankings<strong>48</strong>
              </span>
              <span>
                AI mentions<strong>12</strong>
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

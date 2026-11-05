import { PRIVACY_URL, TERMS_URL } from "@/shared/terms";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { PageLoading } from "@/client/components/Spinner";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthMethodChooser,
  authInputClassName,
  authSubmitClassName,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
import {
  TURNSTILE_SITE_KEY,
  TurnstileWidget,
  useTurnstileCaptcha,
} from "@/client/features/auth/TurnstileWidget";
import { passwordSchema } from "@/client/features/auth/passwordSchema";
import { signUpStatusQueryOptions } from "@/client/features/auth/signUpStatus";
import { useGoogleAuth } from "@/client/features/auth/useGoogleAuth";
import { getFormError } from "@/client/lib/forms";
import { captureClientEvent } from "@/client/lib/posthog";
import { authClient } from "@/lib/auth-client";
import {
  getSignInSearch,
  getVerifyEmailSearch,
  toAuthCallbackURL,
} from "@/lib/auth-redirect";
import { z } from "zod";

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
] as const;

const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: passwordSchema,
  acceptTerms: z.boolean().refine(Boolean, "Agree to the terms to continue."),
});

export const Route = createFileRoute("/_auth/sign-up")({
  validateSearch: authRedirectSearchSchema.extend({
    // A site checked with the marketing site's free tool; onboarding
    // prefills it, and the website step validates it on save.
    domain: z.string().optional().catch(undefined),
    // An ad's campaign tags, which the marketing site's landing pages carry
    // onto the sign-up link. Passed on through the post-signup redirect so the
    // server can save the campaign on the new account.
    utm_source: z.string().optional().catch(undefined),
    utm_medium: z.string().optional().catch(undefined),
    utm_campaign: z.string().optional().catch(undefined),
    utm_content: z.string().optional().catch(undefined),
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const search = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { redirectTo, isHostedMode, isBetterAuthMode } = useAuthPageState(
    search.redirect,
  );
  const onboardingSearch = new URLSearchParams();
  if (search.domain) onboardingSearch.set("domain", search.domain);
  for (const name of UTM_PARAMS) {
    const value = search[name];
    if (value) onboardingSearch.set(name, value);
  }
  const postSignupRedirect =
    redirectTo !== "/"
      ? redirectTo
      : onboardingSearch.size > 0
        ? `/onboarding?${onboardingSearch.toString()}`
        : "/onboarding";
  const google = useGoogleAuth({ redirectTo, postSignupRedirect });
  // The standalone Docker edition: no Google, no email verification, and the
  // server accepts a sign-up only for the first account or an invited address
  // (src/server/standalone/sign-up.ts).
  const standalone = isBetterAuthMode && !isHostedMode;
  const invited = redirectTo.startsWith("/accept-invitation/");
  const signUpStatus = useQuery({
    ...signUpStatusQueryOptions(),
    enabled: standalone,
  });
  const firstAccount = signUpStatus.data?.firstAccount === true;

  // Turnstile is active only in hosted mode with a configured site key.
  const isTurnstileEnabled = isHostedMode && Boolean(TURNSTILE_SITE_KEY);
  const captcha = useTurnstileCaptcha();

  const form = useAppForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      acceptTerms: false,
    },
    validators: {
      onSubmit: signUpSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      const captchaToken = captcha.tokenRef.current;
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_up_submit", {
          redirect_to: redirectTo,
        });
        const verificationCallbackURL = new URL(
          "/verify-email",
          window.location.origin,
        );
        const verificationSearch = getVerifyEmailSearch(
          undefined,
          postSignupRedirect,
        );
        if (verificationSearch.redirect) {
          verificationCallbackURL.searchParams.set(
            "redirect",
            verificationSearch.redirect,
          );
        }
        const result = await authClient.signUp.email({
          name: value.name.trim(),
          email,
          password: value.password,
          callbackURL: verificationCallbackURL.toString(),
          ...(isTurnstileEnabled && captchaToken
            ? {
                fetchOptions: {
                  headers: { "x-captcha-response": captchaToken },
                },
              }
            : {}),
        });

        if (result.error) {
          // Turnstile tokens are single-use; re-challenge so a retry can succeed.
          if (isTurnstileEnabled) captcha.reset();
          formApi.setErrorMap({
            onSubmit: {
              form: result.error.message || "Unable to create account.",
              fields: {},
            },
          });
          return;
        }

        captureClientEvent("auth:sign_up_success", {
          redirect_to: redirectTo,
        });
        if (standalone) {
          // Nothing to verify here, and autoSignIn is off so the operator's
          // create-user never mints a session: sign in explicitly, and the
          // layout sends the new session to redirectTo.
          const signedIn = await authClient.signIn.email({
            email,
            password: value.password,
            callbackURL: toAuthCallbackURL(redirectTo),
          });
          if (signedIn.error) {
            formApi.setErrorMap({
              onSubmit: {
                form:
                  signedIn.error.message ||
                  "Account created. Sign in to continue.",
                fields: {},
              },
            });
          }
          return;
        }
        void navigate({
          to: "/verify-email",
          search: getVerifyEmailSearch(email, postSignupRedirect),
          replace: true,
        });
      } catch {
        if (isTurnstileEnabled) captcha.reset();
        formApi.setErrorMap({
          onSubmit: {
            form: "Unable to create account right now. Please try again.",
            fields: {},
          },
        });
      }
    },
  });

  if (standalone && !firstAccount && !invited && signUpStatus.isPending) {
    return <PageLoading />;
  }

  return (
    <AuthPageCard
      title={firstAccount ? "Create the admin account" : "Create your account"}
      helperText={
        firstAccount
          ? "This installation has no accounts yet. The first one becomes the administrator."
          : invited
            ? "Use the email address that received the invitation."
            : "Start tracking keywords and AI visibility in minutes."
      }
      footer={
        standalone ? (
          firstAccount ? null : (
            <p className="text-sm text-foreground/50">
              Already have an account?{" "}
              <Link
                to="/sign-in"
                search={getSignInSearch(redirectTo)}
                className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          )
        ) : isHostedMode ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground/50">
              Already have an account?{" "}
              <Link
                to="/sign-in"
                search={getSignInSearch(redirectTo)}
                className="text-foreground underline underline-offset-2 hover:text-foreground/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        ) : null
      }
    >
      {
        <>
          <AuthMethodChooser
            googleLabel="Sign up with Google"
            disabled={!isBetterAuthMode}
            isBusy={google.isStarting}
            onContinueWithGoogle={() => {
              void google.start();
            }}
          />
          {google.error ? (
            <p className="text-sm text-destructive">{google.error}</p>
          ) : null}
        </>
      }
      <form.AppForm>
        <form.Form className="space-y-4">
          <form.AppField name="name">
            {(field) => (
              <field.TextField
                label="Full name"
                className={authInputClassName}
                placeholder="Your full name"
                autoComplete="name"
                disabled={!isBetterAuthMode}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Work email"
                className={authInputClassName}
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                disabled={!isBetterAuthMode}
                required
              />
            )}
          </form.AppField>
          <form.AppField name="password">
            {(field) => (
              <div className="toba-password-field">
                <field.TextField
                  label="Password"
                  className={authInputClassName}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 12 characters"
                  autoComplete="new-password"
                  disabled={!isBetterAuthMode}
                  required
                />
                <button
                  type="button"
                  className="toba-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}
          </form.AppField>
          <form.Subscribe selector={(state) => state.values.password}>
            {(password) => (
              <div
                className="toba-password-strength"
                aria-label="Password strength"
              >
                <div>
                  {[1, 2, 3, 4].map((level) => (
                    <span
                      key={level}
                      data-filled={password.length >= level * 3}
                    />
                  ))}
                </div>
                <p>
                  Use 12+ characters with a mix of letters, numbers &amp;
                  symbols.
                </p>
              </div>
            )}
          </form.Subscribe>
          <form.AppField name="acceptTerms">
            {(field) => (
              <field.CheckboxField
                label={
                  <>
                    I agree to the{" "}
                    <a
                      href={TERMS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary"
                    >
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a
                      href={PRIVACY_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary"
                    >
                      Privacy Policy
                    </a>
                  </>
                }
              />
            )}
          </form.AppField>

          {isTurnstileEnabled ? (
            <TurnstileWidget
              onToken={captcha.onToken}
              resetNonce={captcha.resetNonce}
            />
          ) : null}

          <form.Subscribe
            selector={(state) => ({
              submitError: state.errorMap.onSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ submitError, isSubmitting }) => {
              const errorMessage = getFormError(submitError);
              return (
                <>
                  {errorMessage ? (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  ) : null}
                  <Button
                    type="submit"
                    variant="secondary"
                    className={authSubmitClassName}
                    pending={isSubmitting}
                    disabled={
                      !isBetterAuthMode ||
                      (isTurnstileEnabled && !captcha.hasToken)
                    }
                  >
                    {isSubmitting ? "Creating account..." : "Create account"}
                  </Button>
                </>
              );
            }}
          </form.Subscribe>
        </form.Form>
      </form.AppForm>
    </AuthPageCard>
  );
}

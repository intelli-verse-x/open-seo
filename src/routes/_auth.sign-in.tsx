import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAppForm } from "@/client/components/form/useAppForm";
import { Button } from "@/client/components/ui/button";
import {
  AuthPageCard,
  AuthMethodChooser,
  TermsAgreementNotice,
  authInputClassName,
  authSubmitClassName,
  authRedirectSearchSchema,
  useAuthPageState,
} from "@/client/features/auth/AuthPage";
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

const signInSchema = z.object({
  rememberMe: z.boolean(),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export const Route = createFileRoute("/_auth/sign-in")({
  validateSearch: authRedirectSearchSchema,
  component: SignInPage,
});

function SignInPage() {
  const search = Route.useSearch();
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { redirectTo, oauthQuery, isHostedMode, isBetterAuthMode } =
    useAuthPageState(search.redirect);
  // The standalone Docker edition has accounts but no Google sign-in and no
  // emailed password reset: go straight to the email form. Accounts come from
  // invitations, and a fresh installation has nobody to sign in, so its first
  // visitor is sent to create the admin account instead.
  const emailOnly = isBetterAuthMode && !isHostedMode;
  const google = useGoogleAuth({ redirectTo });
  const signUpStatus = useQuery({
    ...signUpStatusQueryOptions(),
    enabled: emailOnly,
  });
  const firstAccount = signUpStatus.data?.firstAccount === true;
  useEffect(() => {
    if (!firstAccount) return;
    void navigate({
      to: "/sign-up",
      search: getSignInSearch(redirectTo),
      replace: true,
    });
  }, [firstAccount, navigate, redirectTo]);

  const form = useAppForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ formApi, value }) => {
      try {
        const email = value.email.trim();
        captureClientEvent("auth:sign_in_submit", {
          redirect_to: redirectTo,
        });

        const result = await authClient.signIn.email({
          email,
          password: value.password,
          rememberMe: value.rememberMe,
          callbackURL: toAuthCallbackURL(redirectTo),
          ...(oauthQuery ? { oauth_query: oauthQuery } : {}),
        });

        if (!result.error) {
          captureClientEvent("auth:sign_in_success", {
            redirect_to: redirectTo,
          });
          return;
        }

        if (result.error.status === 403) {
          captureClientEvent("auth:sign_in_block_unverified", {
            redirect_to: redirectTo,
          });
          // Email not verified yet: send them to the verification page (which
          // shows "check your inbox" + resend) instead of leaving them on a
          // sign-in form that will keep rejecting them.
          void navigate({
            to: "/verify-email",
            search: getVerifyEmailSearch(email, redirectTo),
          });
          return;
        }

        formApi.setErrorMap({
          onSubmit: {
            form: result.error.message || "We couldn't sign you in.",
            fields: {},
          },
        });
      } catch {
        formApi.setErrorMap({
          onSubmit: {
            form: "Unable to sign in right now. Please try again.",
            fields: {},
          },
        });
      }
    },
  });

  return (
    <AuthPageCard
      title="Welcome back"
      helperText="Sign in to your ToBa SEO workspace to continue."
      footer={
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/sign-up"
            search={getSignInSearch(redirectTo)}
            className="font-semibold text-primary"
          >
            Create account
          </Link>
        </p>
      }
    >
      {isHostedMode ? (
        <>
          <AuthMethodChooser
            googleLabel="Continue with Google"
            disabled={!isHostedMode}
            isBusy={google.isStarting}
            onContinueWithGoogle={() => {
              void google.start();
            }}
          />
          {isHostedMode ? (
            <TermsAgreementNotice action="By continuing with Google" />
          ) : null}
          {google.error ? (
            <p className="text-sm text-destructive">{google.error}</p>
          ) : null}
        </>
      ) : null}
      <form.AppForm>
        <form.Form className="space-y-4">
          <form.AppField name="email">
            {(field) => (
              <field.TextField
                label="Email address"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={!isBetterAuthMode}
                  required
                />
                <button
                  type="button"
                  className="toba-password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            )}
          </form.AppField>
          <div className="flex items-center justify-between gap-4 text-sm">
            <form.AppField name="rememberMe">
              {(field) => (
                <field.CheckboxField
                  label="Remember me"
                  disabled={!isBetterAuthMode}
                />
              )}
            </form.AppField>
            <Link
              to="/forgot-password"
              search={getSignInSearch(redirectTo)}
              className="shrink-0 font-semibold text-primary"
            >
              Forgot password?
            </Link>
          </div>

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
                    disabled={!isBetterAuthMode}
                  >
                    {isSubmitting ? "Signing in..." : "Sign in"}
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

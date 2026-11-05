import { useState } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Input } from "@/client/components/ui/input";
import { Button } from "@/client/components/ui/button";
import { TeamSettings } from "@/client/features/team/TeamSettings";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ApiKeySettings } from "@/client/features/settings/ApiKeySettings";
import { SectionHeader } from "@/client/components/PageHeader";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
import { DeleteAccountSettings } from "@/client/features/settings/DeleteAccountSettings";
import { McpConnectionsSettings } from "@/client/features/settings/McpConnectionsSettings";
import { PrivacySettings } from "@/client/features/settings/PrivacySettings";
import {
  isEveryAppClientAuthMode,
  isHostedClientAuthMode,
  usesBetterAuthClient,
} from "@/lib/auth-mode";
import { version } from "../../../../package.json";

export const Route = createFileRoute("/_app/settings/")({
  component: PersonalSettings,
});

function PersonalSettings() {
  const isHosted = isHostedClientAuthMode();
  // API keys need Better Auth accounts (hosted or the standalone Docker
  // edition); the analytics choices only exist on hosted.
  const hasAccounts = usesBetterAuthClient();
  return (
    <div className="space-y-6">
      {hasAccounts ? (
        <>
          <div className="toba-dashboard-grid">
            <ProfileSettings />
            <section className="toba-panel">
              <h2>Notifications</h2>
              <p>Choose what we email you about</p>
              {[
                "Weekly ranking report",
                "Ranking drops",
                "Audit completed",
                "AI mention alerts",
                "Product updates",
              ].map((label) => (
                <div
                  className="flex items-center justify-between gap-4 py-4 text-sm"
                  key={label}
                >
                  {label}
                  <span className="text-xs text-muted-foreground">
                    Unavailable
                  </span>
                </div>
              ))}
            </section>
          </div>
          <section className="toba-panel">
            <TeamSettings />
          </section>
        </>
      ) : null}

      {isEveryAppClientAuthMode() ? <EveryAppSettings /> : null}

      {isHosted ? <McpConnectionsSettings /> : null}

      {hasAccounts ? <ApiKeySettings /> : null}

      {isHosted ? (
        <PrivacySettings />
      ) : (
        <section className="space-y-3">
          <SectionHeader title="About" />
          <div className="flex items-center justify-between gap-6">
            <span className="text-sm">Version</span>
            <span className="font-mono text-sm text-muted-foreground">
              v{version}
            </span>
          </div>
        </section>
      )}

      {isHosted ? <DeleteAccountSettings /> : null}
    </div>
  );
}

// Behind an Every App gateway, which owns the account, the team and the AI
// connections: say so, and link back.
function EveryAppSettings() {
  const { data: account } = useQuery(everyAppAccountQueryOptions());
  return (
    <section className="space-y-3">
      <SectionHeader title="Every App" />
      <p className="text-sm text-muted-foreground">
        Your account, teammates and AI connections are managed on Every App.
      </p>
      {account?.gatewayUrl ? (
        <a
          href={account.gatewayUrl}
          className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Open Every App →
        </a>
      ) : null}
    </section>
  );
}

function ProfileSettings() {
  const { data: session } = useSession();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <section className="toba-panel">
      <h2>Profile</h2>
      <p>The information visible to your team.</p>
      <form
        key={session?.user.id}
        className="mt-6 space-y-5"
        onSubmit={async (event) => {
          event.preventDefault();
          const name = new FormData(event.currentTarget)
            .get("name")
            ?.toString()
            .trim();
          if (!name) return;
          setPending(true);
          try {
            const result = await authClient.updateUser({ name });
            setMessage(result.error?.message ?? "Profile saved.");
          } catch {
            setMessage("Unable to save your profile. Please try again.");
          } finally {
            setPending(false);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-accent p-4 text-primary">
            {session?.user.name?.slice(0, 2).toUpperCase()}
          </span>
          <strong>{session?.user.name}</strong>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs">
            Full name
            <Input name="name" defaultValue={session?.user.name} required />
          </label>
          <label className="space-y-2 text-xs">
            Email
            <Input type="email" value={session?.user.email ?? ""} readOnly />
          </label>
        </div>
        {message ? <p role="status">{message}</p> : null}
        <div className="flex justify-end">
          <Button type="submit" pending={pending}>
            Save changes
          </Button>
        </div>
      </form>
    </section>
  );
}

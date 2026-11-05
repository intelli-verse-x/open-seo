import { Link, useLocation, useMatchRoute } from "@tanstack/react-router";
import type { LinkOptions } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ComponentType } from "react";
import { toast } from "sonner";
import { cn } from "cn";
import {
  ArrowLeftRight,
  Check,
  ChevronLeft,
  CircleHelp,
  CreditCard,
  LogOut,
  Settings,
  User,
} from "lucide-react";
import { organizationContextQueryOptions } from "@/client/features/team/organizationQueries";
import { switchOrganization } from "@/serverFunctions/organization";
import { clearLastProjectId } from "@/client/lib/active-project";
import {
  connectNavGroup,
  getProjectNavGroups,
} from "@/client/navigation/items";
import { ProjectSwitcher } from "@/client/features/projects/ProjectSwitcher";
import {
  SamChatListSkeleton,
  SamSidebarPanel,
} from "@/client/features/sam/SamSidebarPanel";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { signOutAndRedirect, useSession } from "@/lib/auth-client";
import {
  isEveryAppClientAuthMode,
  isHostedClientAuthMode,
  usesBetterAuthClient,
} from "@/lib/auth-mode";
import { everyAppAccountQueryOptions } from "@/client/features/every-app/everyAppAccountQueries";
import { BILLING_ROUTE } from "@/shared/billing";
import {
  Sidebar as UiSidebar,
  SidebarContent,
  SidebarFooter as UiSidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  useSidebar,
} from "@/client/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/client/components/ui/dropdown-menu";

const navButtonClass =
  "toba-nav-link text-sidebar-foreground hover:bg-sidebar-accent/50 data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground";

function SidebarNavLink({
  icon: Icon,
  label,
  linkProps,
  placeholder = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  linkProps: LinkOptions;
  /** Show the row without its link, while its project is still unknown. */
  placeholder?: boolean;
}) {
  const { setOpenMobile } = useSidebar();
  const matchRoute = useMatchRoute();
  const isPromptHistory =
    linkProps.to === "/p/$projectId/ai-visibility" &&
    Boolean(
      matchRoute({
        to: "/p/$projectId/ai-visibility/prompts/$promptId",
        fuzzy: true,
      }),
    );
  const row = (isActive: boolean) => (
    <SidebarMenuButton
      render={<span />}
      isActive={isActive}
      aria-disabled={placeholder || undefined}
      className={navButtonClass}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </SidebarMenuButton>
  );
  return (
    <SidebarMenuItem>
      {placeholder ? (
        row(false)
      ) : (
        <Link
          {...linkProps}
          activeOptions={{
            exact: false,
            includeSearch: false,
            ...linkProps.activeOptions,
          }}
          onClick={() => setOpenMobile(false)}
          inactiveProps={
            isPromptHistory ? { "aria-current": "page" } : undefined
          }
        >
          {({ isActive }) => row(isActive || isPromptHistory)}
        </Link>
      )}
    </SidebarMenuItem>
  );
}

export function Sidebar({
  projectId,
  projectPending,
  ready,
}: {
  projectId: string | null;
  /** No project is known yet, but the projects list may still name one. */
  projectPending: boolean;
  /** The session is confirmed, so the sidebar's own data can load. */
  ready: boolean;
}) {
  // Keep the nav shape while the project loads.
  const navPlaceholder = projectId === null && projectPending;
  const navGroups =
    projectId !== null || navPlaceholder
      ? getProjectNavGroups(projectId ?? "")
      : [connectNavGroup];
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  // SAM is hidden from navigation: the chat route is only reachable by URL,
  // and while it is open its chat list takes the nav's place.
  const onSamRoute = pathname.includes("/sam");

  return (
    <UiSidebar variant="inset" collapsible="offcanvas" className="md:!p-0">
      <SidebarHeader
        className={cn("gap-0 px-3 pb-1", everyApp ? "pt-2" : "pt-3")}
      >
        {everyApp ? <EveryAppLink /> : null}
        <Link
          to="/"
          onClick={() => setOpenMobile(false)}
          className="px-1 pb-2 text-base font-semibold text-sidebar-foreground"
        >
          <img
            src="/toba/logo.svg"
            alt="ToBa SEO"
            className="toba-logo h-[34px] w-[155px]"
          />
        </Link>
        <ProjectSwitcher
          activeProjectId={projectId}
          ready={ready}
          onCloseDrawer={() => setOpenMobile(false)}
        />
      </SidebarHeader>

      <SidebarContent>
        {onSamRoute && projectId ? (
          ready ? (
            <SamSidebarPanel
              projectId={projectId}
              onNavigate={() => setOpenMobile(false)}
            />
          ) : (
            <div className="px-2 py-1">
              <SamChatListSkeleton />
            </div>
          )
        ) : (
          <nav
            aria-label="Main navigation"
            aria-busy={navPlaceholder || undefined}
          >
            {navGroups
              .filter((group) => group.label !== "Workspace")
              .map((group) => (
                <SidebarGroup key={group.label} className="py-1">
                  <SidebarGroupLabel className="toba-nav-group text-muted-foreground">
                    {group.label}
                  </SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items
                        .filter(
                          (item) =>
                            !["Prompt Tracking", "Prompt Research"].includes(
                              item.label,
                            ),
                        )
                        .map((item) => {
                          const { icon, label, ...linkProps } = item;
                          return (
                            <SidebarNavLink
                              key={linkProps.to}
                              icon={icon}
                              label={label}
                              linkProps={linkProps}
                              placeholder={navPlaceholder}
                            />
                          );
                        })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              ))}
          </nav>
        )}
      </SidebarContent>
      <AccountFooter ready={ready} />
    </UiSidebar>
  );
}

// The gateway owns accounts in Every App mode.
const everyApp = isEveryAppClientAuthMode();

/**
 * The way back up, first in the sidebar as in every Every App app. The row
 * keeps its height while the gateway's URL loads so the header doesn't jump.
 */
function EveryAppLink() {
  const accountQuery = useQuery(everyAppAccountQueryOptions());
  const gatewayUrl = accountQuery.data?.gatewayUrl;
  if (!accountQuery.isPending && !gatewayUrl) return null;
  return (
    <a
      href={gatewayUrl ?? undefined}
      aria-label="Back to Every App"
      className={cn(
        "mb-1 inline-flex h-7 w-fit items-center gap-0.5 rounded-md pl-0.5 pr-2 text-sm text-sidebar-foreground/60 transition-colors hover:text-sidebar-foreground",
        accountQuery.isPending && "invisible",
      )}
    >
      <ChevronLeft className="size-4" aria-hidden />
      <span>Every App</span>
    </a>
  );
}

function AccountFooter({ ready }: { ready: boolean }) {
  const { data: session } = useSession();
  const { setOpenMobile } = useSidebar();
  const everyAppAccountQuery = useQuery({
    ...everyAppAccountQueryOptions(),
    enabled: everyApp,
  });
  const email = everyApp
    ? everyAppAccountQuery.data?.email
    : session?.user?.email;
  const [isSwitching, setIsSwitching] = useState(false);
  const orgContextQuery = useQuery({
    ...organizationContextQueryOptions(),
    enabled: Boolean(email) && !everyApp,
  });
  const organizations = everyApp
    ? []
    : (orgContextQuery.data?.organizations ?? []);
  const activeOrganizationId = orgContextQuery.data?.organizationId;

  async function handleSwitchOrganization(organizationId: string) {
    if (isSwitching || organizationId === activeOrganizationId) return;
    setIsSwitching(true);
    try {
      await switchOrganization({ data: { organizationId } });
      // The remembered project belongs to the old workspace; without this,
      // "/" would open it before the access check bounces back.
      clearLastProjectId();
      window.location.assign("/");
    } catch (error) {
      toast.error(getStandardErrorMessage(error));
      setIsSwitching(false);
    }
  }

  return (
    <UiSidebarFooter className="gap-0 border-t border-sidebar-border pb-safe">
      <SidebarMenu>
        {email && !everyApp ? (
          <>
            <SidebarNavLink
              icon={Settings}
              label="Settings"
              linkProps={{ to: "/settings" }}
            />
            <SidebarNavLink
              icon={CircleHelp}
              label="Help & Support"
              linkProps={{ to: "/support" }}
            />
            <SidebarMenuItem>
              <SidebarMenuButton
                className={navButtonClass}
                onClick={() => signOutAndRedirect()}
              >
                <LogOut className="size-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </>
        ) : null}
        {everyApp ? (
          <SidebarNavLink
            icon={Settings}
            label="Settings"
            linkProps={{ to: "/settings" }}
          />
        ) : email ? (
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    className={navButtonClass}
                    aria-label="Open account menu"
                  />
                }
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-primary">
                  {session?.user.name?.slice(0, 2).toUpperCase() ?? "U"}
                </span>
                <span className="truncate text-xs" data-ph-mask>
                  <strong className="block">
                    {session?.user.name ?? email}
                  </strong>
                  <span className="text-muted-foreground">{email}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-56">
                {organizations.length > 1 ? (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex items-center gap-1.5">
                        <ArrowLeftRight className="size-3" />
                        Organization
                      </DropdownMenuLabel>
                      {organizations.map((organization) => (
                        <DropdownMenuItem
                          key={organization.organizationId}
                          disabled={isSwitching}
                          onClick={() =>
                            void handleSwitchOrganization(
                              organization.organizationId,
                            )
                          }
                        >
                          <span className="truncate">
                            {organization.organizationName}
                          </span>
                          {organization.organizationId ===
                          activeOrganizationId ? (
                            <Check className="ml-auto size-4" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                  </>
                ) : null}
                <DropdownMenuItem
                  render={
                    <Link to="/settings" onClick={() => setOpenMobile(false)} />
                  }
                >
                  <Settings className="size-4" />
                  Settings
                </DropdownMenuItem>
                {isHostedClientAuthMode() ? (
                  <DropdownMenuItem
                    render={
                      <Link
                        to={BILLING_ROUTE}
                        onClick={() => setOpenMobile(false)}
                      />
                    }
                  >
                    <CreditCard className="size-4" />
                    Billing
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => signOutAndRedirect()}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ) : ready ? (
          <SidebarNavLink
            icon={usesBetterAuthClient() ? User : Settings}
            label={usesBetterAuthClient() ? "Sign in" : "Settings"}
            linkProps={{
              to: usesBetterAuthClient() ? "/sign-in" : "/settings",
            }}
          />
        ) : (
          // The account row's slot while the session loads.
          <SidebarMenuItem>
            <SidebarMenuSkeleton showIcon />
          </SidebarMenuItem>
        )}
      </SidebarMenu>
    </UiSidebarFooter>
  );
}

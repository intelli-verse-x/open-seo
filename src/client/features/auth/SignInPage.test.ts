import type * as ReactRouter from "@tanstack/react-router";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { load } from "cheerio";
import { afterEach, expect, it, vi } from "vitest";
import { setRuntimeAuthMode } from "@/lib/auth-mode";
import { Route } from "@/routes/_auth.sign-in";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof ReactRouter>()),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
    createElement("a", { href: to }, children),
}));
vi.mock("@/lib/auth-client", () => ({ authClient: {} }));
vi.mock("@/client/lib/posthog", () => ({ captureClientEvent: vi.fn() }));

afterEach(() => setRuntimeAuthMode(undefined));

it("renders enabled password sign-in with account creation and recovery links", () => {
  setRuntimeAuthMode("password");
  vi.spyOn(Route, "useSearch").mockReturnValue({});
  const client = new QueryClient();
  client.setQueryData(["sign-up-status"], { firstAccount: false });
  const component = Route.options.component!;
  const $ = load(
    renderToStaticMarkup(
      createElement(QueryClientProvider, { client }, createElement(component)),
    ),
  );

  expect($('a[href="/sign-up"]').text()).toBe("Create account");
  expect($('a[href="/forgot-password"]').text()).toBe("Forgot password?");
  for (const type of ["email", "password"]) {
    const field = $(`input[type="${type}"]`);
    expect(field.length).toBe(1);
    expect(field.is(":disabled")).toBe(false);
  }
  expect($('button[type="submit"]').text()).toBe("Sign in");
  expect($('button[type="submit"]').is(":disabled")).toBe(false);
  client.clear();
});

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasskeyForm } from "./passkeys.js";
import { PasswordForm } from "./password-forms.js";
import { ForgottenPasswordForm } from "./password-reset.js";
import { SignInForm } from "./sign-in-form.js";

vi.mock("@simplewebauthn/browser", () => ({
  browserSupportsWebAuthn: vi.fn(),
  startAuthentication: vi.fn(),
  startRegistration: vi.fn(),
}));

interface HeldRequest {
  method: string;
  path: string;
  answer: (response: Response) => void;
}

/** Fakes fetch so each request waits until the test answers it. */
const holdRequests = () => {
  const held: HeldRequest[] = [];
  vi.stubGlobal(
    "fetch",
    (path: string, init: RequestInit = {}): Promise<Response> =>
      new Promise((resolve) => {
        held.push({ method: init.method ?? "GET", path, answer: resolve });
      }),
  );
  const waitForRequest = (path: string) =>
    vi.waitFor(() => {
      const request = held.find((candidate) => candidate.path === path);
      if (request === undefined) {
        throw new Error(`nothing has asked for ${path} yet`);
      }
      return request;
    });
  return { held, waitForRequest };
};

/** Something the test settles itself, such as the browser's own passkey prompt. */
const holdPromise = <Value,>() => {
  let settle: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
};

const findButton = (label: string, within: ParentNode = document) => {
  const button = [...within.querySelectorAll("button")].find(
    (candidate) => candidate.textContent === label,
  );
  if (button === undefined) {
    throw new Error(`the page has no "${label}" button`);
  }
  return button;
};

const findForm = (heading: string) => {
  const form = [...document.querySelectorAll("form")].find(
    (candidate) =>
      candidate.querySelector("h1, h2, h3")?.textContent === heading,
  );
  if (form === undefined) {
    throw new Error(`the page has no "${heading}" form`);
  }
  return form;
};

const fillIn = (name: string, value: string) => {
  const input = document.querySelector(`input[name="${name}"]`);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`the page has no ${name} box`);
  }
  input.value = value;
};

const readBusyLabel = (within: ParentNode) =>
  within.querySelector(".busy-label")?.textContent;

const readBusyDetail = (within: ParentNode) =>
  within.querySelector(".busy-detail")?.textContent;

/** Checks the form says what it waits on, shows the bar, and can't be sent again meanwhile. */
const expectWaiting = (
  form: HTMLFormElement,
  label: string,
  button: string,
) => {
  expect(readBusyLabel(form)).toBe(label);
  expect(form.querySelector('[role="progressbar"]')).not.toBeNull();
  expect(form.getAttribute("aria-busy")).toBe("true");
  expect(findButton(button, form).disabled).toBe(true);
};

const expectDoneWaiting = (form: HTMLFormElement, button: string) => {
  expect(form.querySelector(".busy")).toBeNull();
  expect(form.getAttribute("aria-busy")).toBe("false");
  expect(findButton(button, form).disabled).toBe(false);
};

const fakePasskeySignIn: AuthenticationResponseJSON = {
  id: "cGhvbmU",
  rawId: "cGhvbmU",
  type: "public-key",
  response: {
    clientDataJSON: "Y2xpZW50LWRhdGE",
    authenticatorData: "YXV0aGVudGljYXRvcg",
    signature: "c2lnbmF0dXJl",
  },
  clientExtensionResults: {},
};

const fakePasskeyRegistration: RegistrationResponseJSON = {
  id: "cGhvbmU",
  rawId: "cGhvbmU",
  type: "public-key",
  response: {
    clientDataJSON: "Y2xpZW50LWRhdGE",
    attestationObject: "YXR0ZXN0YXRpb24",
  },
  clientExtensionResults: {},
};

const longPassword = "a-new-long-enough-password";

describe("what sign-in and account buttons say while they wait", () => {
  let root: Root;

  beforeEach(() => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    vi.mocked(browserSupportsWebAuthn).mockReturnValue(true);
  });

  afterEach(() => {
    root.unmount();
    document.body.replaceChildren();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it("says it is signing the adult in, with the button pressed only once, until Wizzaroo answers", async () => {
    const { waitForRequest } = holdRequests();
    const onSignedIn = vi.fn();
    root.render(<SignInForm onSignedIn={onSignedIn} />);
    const form = await vi.waitFor(() => findForm("Sign in to Wizzaroo"));
    fillIn("email", "owner@example.com");
    fillIn("password", "the-owner's-long-password");

    findButton("Sign in", form).click();

    const signIn = await waitForRequest("/api/sign-in");
    await vi.waitFor(() => {
      expectWaiting(form, "Signing you in…", "Sign in");
    });
    expect(findButton("Sign in with a passkey", form).disabled).toBe(true);
    expect(onSignedIn).not.toHaveBeenCalled();

    signIn.answer(new Response(null, { status: 204 }));

    await vi.waitFor(() => {
      expectDoneWaiting(form, "Sign in");
    });
    expect(onSignedIn).toHaveBeenCalledOnce();
  });

  it("says which step of signing in with a passkey it waits on, the browser's own prompt included", async () => {
    const { waitForRequest } = holdRequests();
    const passkeyPrompt = holdPromise<AuthenticationResponseJSON>();
    vi.mocked(startAuthentication).mockReturnValue(passkeyPrompt.promise);
    const onSignedIn = vi.fn();
    root.render(<SignInForm onSignedIn={onSignedIn} />);
    const form = await vi.waitFor(() => findForm("Sign in to Wizzaroo"));

    findButton("Sign in with a passkey", form).click();

    const options = await waitForRequest("/api/passkey-sign-in-options");
    await vi.waitFor(() => {
      expectWaiting(
        form,
        "Signing you in with your passkey…",
        "Sign in with a passkey",
      );
    });
    expect(readBusyDetail(form)).toBe(
      "Asking Wizzaroo to get a passkey request ready…",
    );
    options.answer(Response.json({ challenge: "a-challenge" }));
    await vi.waitFor(() => {
      expect(readBusyDetail(form)).toBe("Waiting for your passkey…");
    });
    passkeyPrompt.settle(fakePasskeySignIn);
    const signIn = await waitForRequest("/api/passkey-sign-ins");
    await vi.waitFor(() => {
      expect(readBusyDetail(form)).toBe("Checking your passkey with Wizzaroo…");
    });

    signIn.answer(new Response(null, { status: 204 }));

    await vi.waitFor(() => {
      expectDoneWaiting(form, "Sign in with a passkey");
    });
    expect(onSignedIn).toHaveBeenCalledOnce();
  });

  it("says it is emailing a link to reset the password, then says the link is on its way", async () => {
    const { waitForRequest } = holdRequests();
    root.render(<ForgottenPasswordForm onCancelled={vi.fn()} />);
    const form = await vi.waitFor(() => findForm("Reset your password"));
    fillIn("email", "owner@example.com");

    findButton("Email me a link", form).click();

    const resetRequest = await waitForRequest("/api/password-reset-requests");
    await vi.waitFor(() => {
      expectWaiting(
        form,
        "Emailing you a link to reset your password…",
        "Email me a link",
      );
    });

    resetRequest.answer(new Response(null, { status: 204 }));

    await vi.waitFor(() => {
      expect(form.querySelector('[role="status"]')?.textContent).toContain(
        "a link to reset its password is on its way",
      );
    });
    expect(form.querySelector(".busy")).toBeNull();
    expect(form.getAttribute("aria-busy")).toBe("false");
  });

  it("says each step of adding a passkey, and that it is making a code for the phone", async () => {
    const { waitForRequest } = holdRequests();
    const passkeyPrompt = holdPromise<RegistrationResponseJSON>();
    vi.mocked(startRegistration).mockReturnValue(passkeyPrompt.promise);
    const onAdded = vi.fn();
    root.render(
      <PasskeyForm
        onAdded={onAdded}
        onPhoneFinished={vi.fn()}
        onCancelled={vi.fn()}
      />,
    );
    await waitForRequest("/api/passkey-hand-offs");
    const phoneSection = await vi.waitFor(() => {
      const section = document.querySelector(".passkey-hand-off");
      if (section === null) {
        throw new Error("no phone section yet");
      }
      return section;
    });
    expect(readBusyLabel(phoneSection)).toBe(
      "Making a code for your phone to scan…",
    );
    expect(findButton("Make a new code", phoneSection).disabled).toBe(true);
    const form = findForm("Add one on this device");
    fillIn("passkeyName", "My laptop");

    findButton("Add the passkey", form).click();

    const options = await waitForRequest("/api/passkey-registration-options");
    await vi.waitFor(() => {
      expectWaiting(
        form,
        "Adding your passkey on My laptop…",
        "Add the passkey",
      );
    });
    options.answer(
      Response.json({
        challenge: "a-challenge",
        rp: { name: "Wizzaroo" },
        user: { id: "an-id", name: "owner@example.com", displayName: "Owner" },
        pubKeyCredParams: [],
      }),
    );
    await vi.waitFor(() => {
      expect(readBusyDetail(form)).toBe("Waiting for your passkey…");
    });
    passkeyPrompt.settle(fakePasskeyRegistration);
    const added = await waitForRequest("/api/passkeys");
    await vi.waitFor(() => {
      expect(readBusyDetail(form)).toBe("Saving your passkey with Wizzaroo…");
    });
    expect(onAdded).not.toHaveBeenCalled();

    added.answer(new Response(null, { status: 201 }));

    await vi.waitFor(() => {
      expectDoneWaiting(form, "Add the passkey");
    });
    expect(onAdded).toHaveBeenCalledWith("My laptop");
  });

  it("says it is changing the password, then shows Wizzaroo's problem with it once it answers", async () => {
    const { waitForRequest } = holdRequests();
    const onChanged = vi.fn();
    root.render(<PasswordForm onChanged={onChanged} onCancelled={vi.fn()} />);
    const form = await vi.waitFor(() => findForm("Change your password"));
    fillIn("currentPassword", "not-the-password");
    fillIn("newPassword", longPassword);
    fillIn("repeatedPassword", longPassword);

    findButton("Change my password", form).click();

    const change = await waitForRequest("/api/password");
    await vi.waitFor(() => {
      expectWaiting(
        form,
        "Changing your password and signing out your other browsers…",
        "Change my password",
      );
    });
    expect(form.querySelector('[role="alert"]')).toBeNull();

    change.answer(new Response(null, { status: 403 }));

    await vi.waitFor(() => {
      expectDoneWaiting(form, "Change my password");
    });
    expect(form.querySelector('[role="alert"]')?.textContent).toBe(
      "That isn't your current password.",
    );
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("doesn't wait on Wizzaroo for a new password that is too short", async () => {
    const { held } = holdRequests();
    root.render(<PasswordForm onChanged={vi.fn()} onCancelled={vi.fn()} />);
    const form = await vi.waitFor(() => findForm("Change your password"));
    fillIn("currentPassword", "the-owner's-long-password");
    fillIn("newPassword", "short");
    fillIn("repeatedPassword", "short");

    findButton("Change my password", form).click();

    await vi.waitFor(() => {
      expect(form.querySelector('[role="alert"]')).not.toBeNull();
    });
    expect(form.querySelector(".busy")).toBeNull();
    expect(form.getAttribute("aria-busy")).toBe("false");
    expect(held).toEqual([]);
  });
});

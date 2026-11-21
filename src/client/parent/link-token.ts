type LinkTokenName =
  | "accept-invite"
  | "add-passkey"
  | "confirm-email"
  | "reset-password"
  | "sign-in-code";

export const takeLinkToken = (name: LinkTokenName): string | undefined => {
  const linkFragment = new RegExp(`^#${name}=([\\w-]+)$`);
  const token = linkFragment.exec(window.location.hash)?.at(1);
  if (token !== undefined) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
  return token;
};

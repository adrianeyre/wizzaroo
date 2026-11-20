export const shortestPasswordLength = 12;

export const isPasswordLongEnough = (password: string): boolean =>
  password.length >= shortestPasswordLength;

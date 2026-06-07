export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return String(err);
}

// `@inquirer/prompts` throws an `ExitPromptError` when the user hits Ctrl-C.
export function isPromptCancellation(err: unknown): boolean {
  return err instanceof Error && err.name === "ExitPromptError";
}

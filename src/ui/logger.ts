import pc from "picocolors";
import ora, { type Ora } from "ora";

export const symbols = {
  success: pc.green("✓"),
  error: pc.red("✗"),
  warn: pc.yellow("⚠"),
  info: pc.cyan("ℹ"),
  bullet: pc.dim("•"),
};

export const log = {
  success: (msg: string) => console.log(`${symbols.success} ${msg}`),
  error: (msg: string) => console.error(`${symbols.error} ${msg}`),
  warn: (msg: string) => console.warn(`${symbols.warn} ${msg}`),
  info: (msg: string) => console.log(`${symbols.info} ${msg}`),
  step: (msg: string) => console.log(`${symbols.bullet} ${msg}`),
  line: (msg = "") => console.log(msg),
  dim: (msg: string) => console.log(pc.dim(msg)),
};

// Animates in a TTY, silent otherwise, so piped/CI output stays clean.
export class Spinner {
  private readonly ora: Ora | null;
  private current: string;

  constructor(text: string) {
    this.current = text;
    this.ora = process.stdout.isTTY ? ora({ text, spinner: "dots" }) : null;
  }

  start(): this {
    this.ora?.start();
    return this;
  }

  stop(): this {
    this.ora?.stop();
    return this;
  }

  fail(text?: string): this {
    this.ora?.fail(text);
    return this;
  }

  get text(): string {
    return this.current;
  }

  set text(value: string) {
    this.current = value;
    if (this.ora) this.ora.text = value;
  }
}

export function createSpinner(text: string): Spinner {
  return new Spinner(text);
}

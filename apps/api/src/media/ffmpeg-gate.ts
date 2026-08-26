export function ffmpegMaxConcurrent(): number {
  const raw = Number(process.env.FFMPEG_MAX_CONCURRENT);
  if (Number.isFinite(raw) && raw >= 1 && raw <= 8) return Math.floor(raw);
  return 2;
}

export class ResourceGate {
  private used = 0;
  private readonly waiters: Array<() => void> = [];

  constructor(private readonly limitFn: () => number) {}

  get inUse(): number {
    return this.used;
  }

  async acquire(): Promise<void> {
    if (this.used < this.limitFn()) {
      this.used += 1;
      return;
    }
    await new Promise<void>((resolve) => {
      this.waiters.push(resolve);
    });
  }

  release(): void {
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    this.used = Math.max(0, this.used - 1);
  }
}

export const ffmpegEncodeGate = new ResourceGate(ffmpegMaxConcurrent);

export function isHeavyFfmpegEncode(args: string[]): boolean {
  return args.some(
    (arg) =>
      arg === "libx264" ||
      arg.includes("filter_complex") ||
      arg.includes("loudnorm=") ||
      arg.includes("silenceremove=") ||
      arg.includes("hqdn3d") ||
      arg.includes("zoompan="),
  );
}

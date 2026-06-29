import { promises as fs } from "fs";
import { dirname, join } from "path";
import { tmpdir } from "os";

export class TestDir {
  private constructor(public readonly path: string) {}

  static async create(): Promise<TestDir> {
    const path = await fs.mkdtemp(join(tmpdir(), "xagents-test-"));
    return new TestDir(path);
  }

  abs(relativePath: string): string {
    return join(this.path, relativePath);
  }

  async write(relativePath: string, content = ""): Promise<void> {
    const target = this.abs(relativePath);
    await fs.mkdir(dirname(target), { recursive: true });
    await fs.writeFile(target, content, "utf-8");
  }

  async mkdir(relativePath: string): Promise<void> {
    await fs.mkdir(this.abs(relativePath), { recursive: true });
  }

  async read(relativePath: string): Promise<string> {
    return fs.readFile(this.abs(relativePath), "utf-8");
  }

  async exists(relativePath: string): Promise<boolean> {
    try {
      await fs.access(this.abs(relativePath));
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    await fs.rm(this.path, { recursive: true, force: true });
  }
}

import { test, expect } from "bun:test";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
    resolve,
    artifact,
    url,
    sha256Key,
    binaryName,
    expectedChecksum,
    verifyChecksum,
    findBinary,
    download,
} from "./platform.js";

const cases: Array<[NodeJS.Platform, string, string, string]> = [
    ["linux", "ia32", "linux", "386"],
    ["linux", "x64", "linux", "amd64"],
    ["linux", "arm", "linux", "arm"],
    ["linux", "arm64", "linux", "arm64"],
    ["darwin", "x64", "mac", "amd64"],
    ["darwin", "arm64", "mac", "arm64"],
    ["win32", "ia32", "windows", "386"],
    ["win32", "x64", "windows", "amd64"],
];

for (const [platform, arch, os, cpu] of cases) {
    test(`${platform}/${arch} → ${os}-${cpu}`, () => {
        expect(resolve(platform, arch)).toEqual({ os, cpu });
    });
}

test("resolve returns null for unknown platform/arch", () => {
    expect(resolve("freebsd", "x64")).toBeNull();
    expect(resolve("linux", "mips")).toBeNull();
});

test("artifact for linux/amd64", () => {
    expect(artifact("2.4.0", "linux", "x64"))
        .toBe("ossutil-2.4.0-linux-amd64.zip");
});

test("artifact for mac/arm64", () => {
    expect(artifact("2.4.0", "darwin", "arm64"))
        .toBe("ossutil-2.4.0-mac-arm64.zip");
});

test("artifact with go1.20 variant", () => {
    expect(artifact("2.4.0", "win32", "x64", "go1.20"))
        .toBe("ossutil-2.4.0-windows-amd64-go1.20.zip");
});

test("artifact throws on unknown platform", () => {
    expect(() => artifact("2.4.0", "freebsd", "x64"))
        .toThrow("Unknown Platform,Arch: freebsd/x64");
});

test("url includes version segment", () => {
    expect(url("2.4.0", "linux", "x64"))
        .toBe("https://gosspublic.alicdn.com/ossutil/v2/2.4.0/ossutil-2.4.0-linux-amd64.zip");
});

test("url with variant", () => {
    expect(url("2.4.0", "win32", "x64", "go1.20"))
        .toBe("https://gosspublic.alicdn.com/ossutil/v2/2.4.0/ossutil-2.4.0-windows-amd64-go1.20.zip");
});

test("sha256Key for linux/amd64", () => {
    expect(sha256Key("2.4.0", "linux", "x64")).toBe("2.4.0-linux-amd64");
});

test("sha256Key for mac/arm64", () => {
    expect(sha256Key("2.4.0", "darwin", "arm64")).toBe("2.4.0-mac-arm64");
});

test("sha256Key with variant", () => {
    expect(sha256Key("2.4.0", "win32", "x64", "go1.20"))
        .toBe("2.4.0-windows-amd64-go1.20");
});

test("sha256Key throws on unknown platform", () => {
    expect(() => sha256Key("2.4.0", "freebsd", "x64"))
        .toThrow("Unknown Platform,Arch: freebsd/x64");
});

test("binaryName on windows is ossutil.exe", () => {
    expect(binaryName("win32")).toBe("ossutil.exe");
});

test("binaryName on linux is ossutil", () => {
    expect(binaryName("linux")).toBe("ossutil");
});

test("binaryName on mac is ossutil", () => {
    expect(binaryName("darwin")).toBe("ossutil");
});

test("expectedChecksum returns registered hash", () => {
    expect(expectedChecksum("2.4.0", "linux", "x64")).toMatch(/^[0-9a-f]{64}$/);
});

test("expectedChecksum throws for unregistered version", () => {
    expect(() => expectedChecksum("9.9.9", "linux", "x64"))
        .toThrow("sha256.json 中未找到 9.9.9-linux-amd64");
});

test("expectedChecksum includes variant in lookup key", () => {
    expect(() => expectedChecksum("2.4.0", "win32", "x64", "nope"))
        .toThrow("sha256.json 中未找到 2.4.0-windows-amd64-nope");
});

test("verifyChecksum passes on match", () => {
    expect(() => verifyChecksum("abc", "abc")).not.toThrow();
});

test("verifyChecksum throws on mismatch", () => {
    expect(() => verifyChecksum("abc", "def")).toThrow("校验失败: 期望 def, 实际 abc");
});

test("download fails fast on unregistered version before any network", async () => {
    await expect(download("9.9.9", "linux", "x64"))
        .rejects.toThrow("sha256.json 中未找到 9.9.9-linux-amd64");
});

function tempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), "action-ossutil-test-"));
}

test("findBinary finds binary at top level", () => {
    const dir = tempDir();
    try {
        const file = path.join(dir, "ossutil");
        fs.writeFileSync(file, "");
        expect(findBinary(dir, "ossutil")).toBe(file);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("findBinary finds binary in nested directory", () => {
    const dir = tempDir();
    try {
        const nested = path.join(dir, "ossutil-2.4.0-linux-amd64");
        fs.mkdirSync(nested);
        const file = path.join(nested, "ossutil");
        fs.writeFileSync(file, "");
        expect(findBinary(dir, "ossutil")).toBe(file);
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("findBinary returns null when missing", () => {
    const dir = tempDir();
    try {
        fs.writeFileSync(path.join(dir, "README.md"), "");
        expect(findBinary(dir, "ossutil")).toBeNull();
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});

test("findBinary ignores other file names", () => {
    const dir = tempDir();
    try {
        fs.writeFileSync(path.join(dir, "ossutil.exe"), "");
        expect(findBinary(dir, "ossutil")).toBeNull();
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
});
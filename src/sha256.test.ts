import { test, expect } from "bun:test";
import { sha256Key } from "./platform.js";
import sha256 from "./sha256.json" with { type: "json" };

const registry = sha256 as Record<string, string>;

// 与 README「支持平台」一致：8 个基础组合 + windows-amd64 的 go1.20 变体
const combos: Array<[NodeJS.Platform, string, string | undefined]> = [
    ["linux", "ia32", undefined],
    ["linux", "x64", undefined],
    ["linux", "arm", undefined],
    ["linux", "arm64", undefined],
    ["darwin", "x64", undefined],
    ["darwin", "arm64", undefined],
    ["win32", "ia32", undefined],
    ["win32", "x64", undefined],
    ["win32", "x64", "go1.20"],
];

// 键格式为 `${version}-${os}-${cpu}${suffix}`，用已知后缀剥离出版本号
const suffixes = combos.map(([platform, arch, variant]) =>
    sha256Key("0.0.0", platform, arch, variant).slice("0.0.0".length)
);

function versionOf(key: string): string {
    const suffix = suffixes.find((s) => key.endsWith(s));
    if (!suffix) throw new Error(`无法识别的 sha256.json 键: ${key}`);
    return key.slice(0, -suffix.length);
}

test("sha256.json keys all parse into version + platform combo", () => {
    const bad = Object.keys(registry).filter((key) => {
        try {
            versionOf(key);
            return false;
        } catch {
            return true;
        }
    });
    expect(bad).toEqual([]);
});

test("sha256.json covers every platform combo for every version", () => {
    const versions = [...new Set(Object.keys(registry).map(versionOf))];
    expect(versions.length).toBeGreaterThan(0);
    const missing: string[] = [];
    for (const version of versions) {
        for (const [platform, arch, variant] of combos) {
            const key = sha256Key(version, platform, arch, variant);
            if (!registry[key]) missing.push(key);
        }
    }
    expect(missing).toEqual([]);
});

test("sha256.json values are 64-char hex digests", () => {
    const bad = Object.entries(registry)
        .filter(([, value]) => !/^[0-9a-f]{64}$/.test(value))
        .map(([key]) => key);
    expect(bad).toEqual([]);
});

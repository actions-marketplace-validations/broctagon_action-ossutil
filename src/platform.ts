import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import sha256 from "./sha256.json" with {type: "json"};

export interface Platform {
    os: string;
    cpu: string;
}

export function resolve(
    platform: NodeJS.Platform,
    arch: string
): Platform | null {
    if (platform === "linux") {
        if (arch === "ia32") return {os: "linux", cpu: "386"};
        if (arch === "x64") return {os: "linux", cpu: "amd64"};
        if (arch === "arm") return {os: "linux", cpu: "arm"};
        if (arch === "arm64") return {os: "linux", cpu: "arm64"};
    }
    if (platform === "win32") {
        if (arch === "ia32") return {os: "windows", cpu: "386"};
        if (arch === "x64") return {os: "windows", cpu: "amd64"};
    }
    if (platform === "darwin") {
        if (arch === "x64") return {os: "mac", cpu: "amd64"};
        if (arch === "arm64") return {os: "mac", cpu: "arm64"};
    }
    return null;
}

export function artifact(
    version: string,
    platform: NodeJS.Platform,
    arch: string,
    variant?: string
): string {
    const key = resolve(platform, arch);
    if (!key) throw new Error(`Unknown Platform,Arch: ${platform}/${arch}`);
    const suffix = variant ? `-${variant}` : "";
    return `ossutil-${version}-${key.os}-${key.cpu}${suffix}.zip`;
}

export function url(
    version: string,
    platform: NodeJS.Platform,
    arch: string,
    variant?: string
): string {
    return `https://gosspublic.alicdn.com/ossutil/v2/${version}/${artifact(version, platform, arch, variant)}`;
}

export function binaryName(platform: NodeJS.Platform): string {
    return platform === "win32" ? "ossutil.exe" : "ossutil";
}

export function sha256Key(
    version: string,
    platform: NodeJS.Platform,
    arch: string,
    variant?: string
): string {
    const key = resolve(platform, arch);
    if (!key) throw new Error(`Unknown Platform,Arch: ${platform}/${arch}`);
    const suffix = variant ? `-${variant}` : "";
    return `${version}-${key.os}-${key.cpu}${suffix}`;
}

export function expectedChecksum(
    version: string,
    platform: NodeJS.Platform,
    arch: string,
    variant?: string
): string {
    const key = sha256Key(version, platform, arch, variant);
    const expected = (sha256 as Record<string, string>)[key];
    if (!expected) {
        throw new Error(`sha256.json 中未找到 ${key}，无法校验`);
    }
    return expected;
}

export function verifyChecksum(actual: string, expected: string): void {
    if (actual !== expected) {
        throw new Error(`校验失败: 期望 ${expected}, 实际 ${actual}`);
    }
}

export async function download(
    version: string,
    platform: NodeJS.Platform,
    arch: string,
    variant?: string
): Promise<string> {
    const expected = expectedChecksum(version, platform, arch, variant);

    const downloadUrl = url(version, platform, arch, variant);

    const archive = await tc.downloadTool(downloadUrl);

    const actual = crypto
        .createHash("sha256")
        .update(fs.readFileSync(archive))
        .digest("hex");
    verifyChecksum(actual, expected);

    const extracted = await tc.extractZip(archive);
    const name = binaryName(platform);
    const found = findBinary(extracted, name);
    if (!found) throw new Error(`压缩包中未找到 ${name}`);
    fs.chmodSync(found, 0o755);
    return path.dirname(found);
}

export function findBinary(dir: string, name: string): string | null {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && entry.name === name) {
            return full;
        }
        if (entry.isDirectory()) {
            const inner = findBinary(full, name);
            if (inner) return inner;
        }
    }
    return null;
}
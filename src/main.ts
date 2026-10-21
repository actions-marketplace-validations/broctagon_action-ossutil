import * as core from "@actions/core";
import * as exec from "@actions/exec";
import * as tc from "@actions/tool-cache";
import * as path from "path";
import {binaryName, download} from "./platform.js";

async function main(): Promise<void> {
    try {
        const version = core.getInput("version").trim() || "2.4.0";
        const region = core.getInput("region", {required: true});
        const endpoint = core.getInput("endpoint");
        const accessKeyID = core.getInput("access-key-id");
        const secretAccessKey = core.getInput("access-key-secret");
        const stsToken = core.getInput("sts-token");
        const variant = core.getInput("variant") || undefined;
        if (variant && (process.platform !== "win32" || process.arch !== "x64")) {
            throw new Error(`variant 仅支持 windows/amd64，当前平台 ${process.platform}/${process.arch} 不支持`);
        }

        const cacheVersion = variant ? `${version}-${variant}` : version;
        let toolDir = tc.find("ossutil", cacheVersion);
        if (!toolDir) {
            toolDir = await download(version, process.platform, process.arch, variant);
            toolDir = await tc.cacheDir(toolDir, "ossutil", cacheVersion);
        }

        const binary = path.join(toolDir, binaryName(process.platform));
        core.addPath(toolDir);
        core.setOutput("ossutil-path", binary);
        core.setOutput("ossutil-version", version);
        core.info(`ossutil ${version} 已就绪: ${binary}`);

        core.exportVariable("OSS_REGION", region);
        if (endpoint) core.exportVariable("OSS_ENDPOINT", endpoint);
        if (accessKeyID) {
            core.setSecret(accessKeyID);
            core.exportVariable("OSS_ACCESS_KEY_ID", accessKeyID);
        }
        if (secretAccessKey) {
            core.setSecret(secretAccessKey);
            core.exportVariable("OSS_ACCESS_KEY_SECRET", secretAccessKey);
        }
        if (stsToken) {
            core.setSecret(stsToken);
            core.exportVariable("OSS_SESSION_TOKEN", stsToken);
        }

        await exec.exec(binary, ["version"]);
    }catch (err: unknown) {
        core.setFailed(err instanceof Error ? err.message : String(err));
    }
}

main();
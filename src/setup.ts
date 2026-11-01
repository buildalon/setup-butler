import tc = require('@actions/tool-cache');
import core = require('@actions/core');
import exec = require('@actions/exec');
import crypto = require('crypto');
import path = require('path');
import fs = require('fs');
import os = require('os');

const butler = 'butler';
const BUTLER_PATH = 'BUTLER_PATH';
const BUTLER_DIR = 'BUTLER_DIR';
const IS_WINDOWS = process.platform === 'win32';
const toolExtension = IS_WINDOWS ? '.exe' : '';
const toolPath = `${butler}${toolExtension}`;
const arch = os.arch();

export async function Run(): Promise<void> {
  const version = await resolveVersion();
  const toolDirectory = await findOrDownload(version);
  const butlerPath = path.join(toolDirectory, toolPath);
  await validateVersion(butlerPath, version);
  core.addPath(toolDirectory);
  core.info(`${BUTLER_DIR} -> ${toolDirectory}`);
  core.exportVariable(BUTLER_DIR, toolDirectory);
  core.info(`${BUTLER_PATH} -> ${butlerPath}`);
  core.exportVariable(BUTLER_PATH, butlerPath);
  core.setOutput('path', butlerPath);
  core.setOutput('version', version);
}

async function resolveVersion(): Promise<string> {
  let version = (core.getInput('version') || 'latest').trim().toLowerCase();
  if (version === 'latest') {
    version = await getLatestVersion();
  }
  version = version.replace(/^v/, '');
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Invalid version string: ${version}`);
  }
  return version;
}

async function findOrDownload(version: string): Promise<string> {
  let toolDirectory = tc.find(butler, version, arch);
  if (toolDirectory) {
    core.debug(`Found ${butler} ${version} in tool cache: ${toolDirectory}`);
    return toolDirectory;
  }
  const [url, archiveName] = getDownloadUrl(version);
  core.info(`Installing ${butler} ${version}...`);
  const downloadDirectory = path.join(getTempDirectory(), `${butler}-${crypto.randomUUID()}`);
  const archivePath = await tc.downloadTool(url, path.join(downloadDirectory, archiveName));
  core.debug(`Downloaded ${butler} to ${archivePath}`);
  const extractDirectory = await tc.extractZip(archivePath, path.join(downloadDirectory, butler));
  if (!extractDirectory) {
    throw new Error(`Failed to extract ${butler} from ${archivePath}!`);
  }
  const tool = path.join(extractDirectory, toolPath);
  if (!IS_WINDOWS) {
    await fs.promises.chmod(tool, 0o755);
  }
  await fs.promises.access(tool, fs.constants.X_OK);
  core.debug(`Setting tool cache: ${extractDirectory} | ${butler} | ${version} | ${arch}`);
  toolDirectory = await tc.cacheDir(extractDirectory, butler, version, arch);
  await fs.promises.rm(downloadDirectory, { recursive: true, force: true });
  return toolDirectory;
}

async function validateVersion(tool: string, version: string): Promise<void> {
  let output = '';
  await exec.exec(`"${tool}"`, ['--version'], {
    listeners: {
      stdout: (data: Buffer) => { output += data.toString(); },
      stderr: (data: Buffer) => { output += data.toString(); }
    }
  });
  const match = output.match(/v?(\d+\.\d+\.\d+)/);
  if (!match || match[1] !== version) {
    throw new Error(`Expected ${butler} ${version}, but found: ${output.trim()}`);
  }
}

async function getLatestVersion(): Promise<string> {
  const url = `${baseUrl}${getVariant()}/LATEST`;
  core.debug(`Getting latest ${butler} version from ${url}`);
  // tool-cache honors the runner's proxy settings, unlike a bare fetch
  const latestPath = await tc.downloadTool(url, path.join(getTempDirectory(), `${butler}-LATEST-${crypto.randomUUID()}`));
  const version = (await fs.promises.readFile(latestPath, 'utf8')).trim();
  await fs.promises.rm(latestPath, { force: true });
  core.debug(`Latest version: ${version}`);
  return version;
}

const baseUrl = 'https://broth.itch.zone/butler/';

const variantMap = {
  linux: 'linux-amd64',
  darwin: 'darwin-amd64',
  win32: 'windows-amd64'
}

function getVariant(): string {
  const variant = variantMap[process.platform];
  if (!variant) {
    throw new Error(`${butler} is not available for ${process.platform}`);
  }
  return variant;
}

function getDownloadUrl(version: string): [string, string] {
  const variant = getVariant();
  return [`${baseUrl}${variant}/${version}/archive/default`, `butler-${variant}.zip`];
}

function getTempDirectory(): string {
  return process.env['RUNNER_TEMP'] || os.tmpdir();
}

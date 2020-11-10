// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { cloneDeep } from 'lodash';
import * as path from 'path';
import { getArchitectureDisplayName } from '../../../common/platform/registry';
import { DeepReadonly } from '../../../common/utils/misc';
import { Architecture } from '../../../common/utils/platform';
import { arePathsSame } from '../../common/externalDependencies';
import {
    copyEnvBase,
    normalizeEnvBase,
    validateEnvBase,
} from './envBase';
import {
    getKindDisplayName,
    getPrioritizedEnvKinds,
} from './envKind';
import {
    getEnvExecutable,
    mergeExecutables,
    parseExeVersion,
} from './executable';
import {
    copyBuild,
    mergeBuilds,
    normalizeBuild,
    validateBuild,
} from './pythonBuild';
import {
    copyDistro,
    mergeDistros,
    normalizeDistro,
    validateDistro,
} from './pythonDistro';
import {
    areIdenticalVersion,
    areSimilarVersions,
    getShortVersionString,
    isVersionEmpty,
    parseVersion,
} from './pythonVersion';

import {
    PythonEnvBaseInfo,
    PythonEnvInfo,
    PythonEnvKind,
    PythonVersion,
} from '.';

const EMPTY_ENV: DeepReadonly<PythonEnvInfo> = {
    // base
    kind: PythonEnvKind.Unknown,
    executable: {
        filename: '',
        sysPrefix: '',
        ctime: -1,
        mtime: -1,
    },
    name: '',
    location: '',
    // build
    version: { major: -1, minor: -1, micro: -1, release: undefined, sysVersion: undefined }, // effictively EMPTY_VERSION
    arch: Architecture.Unknown,
    // top-level
    distro: {
        // meta
        org: '',
        defaultDisplayName: undefined,
        // installed
        version: undefined,
        binDir: undefined
    },
    defaultDisplayName: undefined,
    searchLocation: undefined,
};

/**
 * Create a new info object with all values empty.
 *
 * @param init - if provided, these values are applied to the new object
 */
export function buildEnvInfo(
    init?: {
        kind?: PythonEnvKind;
        executable?: string;
        location?: string;
        version?: PythonVersion | string;
        org?: string;
        arch?: Architecture;
        fileInfo?: {ctime:number, mtime:number};
    },
): PythonEnvInfo {
    const env = getEmptyEnv();
    if (init === undefined) {
        return env;
    }

    if (init.fileInfo !== undefined) {
        env.executable.ctime = init.fileInfo.ctime;
        env.executable.mtime = init.fileInfo.mtime;
    }
    if (init.arch !== undefined) {
        env.arch = init.arch;
    }
    if (init.org !== undefined) {
        env.distro.org = init.org;
    }

    updateEnv(env, init);

    return env;
}

/**
 * Build an "empty" info object.
 */
export function getEmptyEnv(): PythonEnvInfo {
    return cloneDeep(EMPTY_ENV) as PythonEnvInfo;
}

/**
 * Return a deep copy of the given env info.
 *
 * @param updates - if provided, these values are applied to the copy
 */
export function copyEnvInfo(
    env: PythonEnvInfo,
    updates?: {
        kind?: PythonEnvKind,
    },
    strict = false,
): PythonEnvInfo {
    const copied = strict
        ? copyStrict(env)
        // We don't care whether or not extra/hidden properties
        // get preserved, so we do the easy thing here.
        : cloneDeep(env);
    if (updates !== undefined) {
        updateEnv(copied, updates);
    }
    return copied;
}

function copyStrict(env: PythonEnvInfo): PythonEnvInfo {
    // "embedded" parts
    const base = copyEnvBase(env);
    const build = copyBuild(env);
    const copied: PythonEnvInfo = { ...env, ...base, ...build };
    // top-level parts
    copied.distro = copyDistro(copied.distro);
    return copied;
}

function updateEnv(
    env: PythonEnvInfo,
    updates: {
        kind?: PythonEnvKind;
        executable?: string;
        location?: string;
        version?: PythonVersion | string;
    },
): void {
    if (updates.kind !== undefined) {
        env.kind = updates.kind;
    }
    if (updates.executable !== undefined) {
        env.executable.filename = updates.executable;
    }
    if (updates.location !== undefined) {
        env.location = updates.location;
    }
    if (updates.version === undefined) {
        // We could fall back to parsing env.executable.filename...
        // but we don't need that for now.
    } else {
        env.version = typeof updates.version === 'string'
            ? parseVersion(updates.version)
            : updates.version;
    }
}

/**
 * Make a copy and set all the properties properly.
 */
export function normalizeEnv(info: PythonEnvInfo): PythonEnvInfo {
    // "embedded" parts
    const base = normalizeEnvBase(info);
    const build = normalizeBuild(info);
    const norm: PythonEnvInfo = { ...info, ...base, ...build };
    // top-level parts
    norm.distro = normalizeDistro(norm.distro);
    if (!norm.defaultDisplayName) {
        norm.defaultDisplayName = '';
    }
    // cross-cutting
    if (isVersionEmpty(norm.version)) {
        norm.version = parseExeVersion(norm.executable.filename, { ignoreErrors: true });
    }
    if (norm.defaultDisplayName === '') {
        norm.defaultDisplayName = buildEnvDisplayName(norm);
    }
    return norm;
}

/**
 * Fail if any properties are not set properly.
 *
 * Optional properties that are not set are ignored.
 *
 * This assumes that the info has already been normalized.
 */
export function validateEnv(info: PythonEnvInfo) {
    // "embedded" parts
    validateEnvBase(info);
    validateBuild(info);
    // top-level parts
    validateDistro(info.distro);
    // info.defaultDisplayName can be empty.
}

/**
 * Convert the info to a user-facing representation.
 */
export function buildEnvDisplayName(env: PythonEnvInfo): string {
    const displayNameParts: string[] = ['Python'];
    const envSuffixParts: string[] = [];

    if (!isVersionEmpty(env.version)) {
        displayNameParts.push(getShortVersionString(env.version));
    }
    if (env.arch !== Architecture.Unknown) {
        displayNameParts.push(getArchitectureDisplayName(env.arch));
    }
    if (env.name !== '') {
        envSuffixParts.push(`'${env.name}'`);
    }
    const kindName = getKindDisplayName(env.kind);
    if (kindName !== '') {
        envSuffixParts.push(kindName);
    }

    const envSuffix = envSuffixParts.length === 0 ? '' : `(${envSuffixParts.join(': ')})`;
    return `${displayNameParts.join(' ')} ${envSuffix}`.trim();
}

/**
 * For the given data, build a normalized partial info object.
 *
 * If insufficient data is provided to generate a minimal object, such
 * that it is not identifiable, then `undefined` is returned.
 */
export function getMinimalPartialInfo(env: string | Partial<PythonEnvInfo>): Partial<PythonEnvInfo> | undefined {
    if (typeof env === 'string') {
        if (env === '') {
            return undefined;
        }
        return {
            executable: {
                filename: env,
                sysPrefix: '',
                ctime: -1,
                mtime: -1,
            },
        };
    }
    if (env.executable === undefined) {
        return undefined;
    }
    if (env.executable.filename === '') {
        return undefined;
    }
    return env;
}

/**
 * Build an object with at least the minimal info about a Python env.
 *
 * This is meant to be as fast an operation as possible.
 *
 * Note that passing `PythonEnvKind.Unknown` for `kind` is okay,
 * though not ideal.
 */
export function getFastEnvInfo(kind: PythonEnvKind, executable: string): PythonEnvInfo {
    const env = buildEnvInfo({ kind, executable });

    try {
        env.version = parseExeVersion(env.executable.filename);
    } catch {
        // It didn't have version info in it.
        // We could probably walk up the directory tree trying dirnames
        // too, but we'll skip that for now.  Windows gives us a few
        // other options which we will also skip for now.
    }

    return env;
}

/**
 * Build a new object with at much info as possible about a Python env.
 *
 * This does as much as possible without distro-specific or other
 * special knowledge.
 *
 * @param minimal - the minimal info (e.g. from `getFastEnvInfo()`)
 *                  on which to base the "full" object; this may include
 *                  extra info beyond the "minimal", but at the very
 *                  least it will include the minimum info necessary
 *                  to be useful
 */
export async function getMaxDerivedEnvInfo(minimal: PythonEnvInfo): Promise<PythonEnvInfo> {
    const env = cloneDeep(minimal);

    // For now we do not worry about adding anything more to env.executable.
    // `ctime` and `mtime` would require a stat call,  `sysPrefix` would
    // require guessing.

    // For now we do not fill anything in for `name` or `location`.  If
    // we had `env.executable.sysPrefix` we could set a meaningful
    // `location`, but we don't.

    if (isVersionEmpty(env.version)) {
        try {
            env.version = parseExeVersion(env.executable.filename);
        } catch {
            // It didn't have version info in it.
            // We could probably walk up the directory tree trying dirnames
            // too, but we'll skip that for now.  Windows gives us a few
            // other options which we will also skip for now.
        }
    }

    // Note that we do not set `env.arch` to the host's native
    // architecture.  Nearly all Python builds will match the host
    // architecture, with the notable exception being older PSF builds
    // for Windows,  There is enough uncertainty that we play it safe
    // by not setting `env.arch` here.

    // We could probably make a decent guess at the distro, but that
    // is best left to distro-specific locators.

    return env;
}

/**
 * Create a function that decides if the given "query" matches some env info.
 *
 * The returned function is compatible with `Array.filter()`.
 */
export function getEnvMatcher(
    query: string | Partial<PythonEnvInfo>,
): (env: PythonEnvInfo) => boolean {
    const executable = getEnvExecutable(query);
    if (executable === '') {
        // We could throw an exception error, but skipping it is fine.
        return () => false;
    }
    function matchEnv(candidate: PythonEnvInfo): boolean {
        return arePathsSame(executable, candidate.executable.filename);
    }
    return matchEnv;
}

/**
 * Checks if two environments are same.
 * @param {string | PythonEnvInfo} left: environment to compare.
 * @param {string | PythonEnvInfo} right: environment to compare.
 * @param {boolean} allowPartialMatch: allow partial matches of properties when comparing.
 *
 * Remarks: The current comparison assumes that if the path to the executables are the same
 * then it is the same environment. Additionally, if the paths are not same but executables
 * are in the same directory and the version of python is the same than we can assume it
 * to be same environment. This later case is needed for comparing windows store python,
 * where multiple versions of python executables are all put in the same directory.
 */
export function areSameEnv(
    left: string | Partial<PythonEnvInfo>,
    right: string | Partial<PythonEnvInfo>,
    allowPartialMatch = true,
): boolean | undefined {
    const leftInfo = getMinimalPartialInfo(left);
    const rightInfo = getMinimalPartialInfo(right);
    if (leftInfo === undefined || rightInfo === undefined) {
        return undefined;
    }
    const leftFilename = leftInfo.executable!.filename;
    const rightFilename = rightInfo.executable!.filename;

    // For now we assume that matching executable means they are the same.
    if (arePathsSame(leftFilename, rightFilename)) {
        return true;
    }

    if (arePathsSame(path.dirname(leftFilename), path.dirname(rightFilename))) {
        const leftVersion = typeof left === 'string' ? undefined : left.version;
        const rightVersion = typeof right === 'string' ? undefined : right.version;
        if (leftVersion && rightVersion) {
            if (
                areIdenticalVersion(leftVersion, rightVersion)
                || (allowPartialMatch && areSimilarVersions(leftVersion, rightVersion))
            ) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Selects an environment based on the environment selection priority. This should
 * match the priority in the environment identifier.
 */
export function sortByPriority(...envs: PythonEnvInfo[]): PythonEnvInfo[] {
    // tslint:disable-next-line: no-suspicious-comment
    // TODO: When we consolidate the PythonEnvKind and EnvironmentType we should have
    // one location where we define priority and
    const envKindByPriority: PythonEnvKind[] = getPrioritizedEnvKinds();
    return envs.sort(
        (a:PythonEnvInfo, b:PythonEnvInfo) => envKindByPriority.indexOf(a.kind) - envKindByPriority.indexOf(b.kind),
    );
}

/**
 * Determine which of the given envs should be used.
 *
 * The candidates must be equivalent in some way.
 */
export function pickBestEnv(candidates: PythonEnvInfo[]): PythonEnvInfo {
    const sorted = sortByPriority(...candidates);
    return sorted[0];
}

/**
 * Merges properties of the `target` environment and `other` environment and returns the merged environment.
 * if the value in the `target` environment is not defined or has less information. This does not mutate
 * the `target` instead it returns a new object that contains the merged results.
 * @param env - properties of this object are favored
 * @param other - properties of this object are used to fill the gaps in the merged result
 */
export function mergeEnvs(env: PythonEnvInfo, other: PythonEnvInfo): PythonEnvInfo {
    const merged = {
        ...cloneDeep(env),
        ...mergeBaseInfo(env, other),
        ...mergeBuilds(env, other),
    };
    merged.distro = mergeDistros(env.distro, other.distro);

    if (env.defaultDisplayName === undefined || env.defaultDisplayName === '') {
        if (other.defaultDisplayName !== undefined) {
            merged.defaultDisplayName = other.defaultDisplayName;
        } else {
            delete merged.defaultDisplayName;
        }
    }

    if (env.searchLocation === undefined) {
        if (other.searchLocation !== undefined) {
            merged.searchLocation = cloneDeep(other.searchLocation);
        } else {
            delete merged.searchLocation;
        }
    }

    return merged;
}

function mergeBaseInfo(base: PythonEnvBaseInfo, other: PythonEnvBaseInfo): PythonEnvBaseInfo {
    const merged: PythonEnvBaseInfo = {
        kind: base.kind,
        executable: mergeExecutables(base.executable, other.executable),
        name: base.name,
        location: base.location,
    };

    // Always use the original kind unless it is missing.
    if (base.kind === PythonEnvKind.Unknown) {
        merged.kind = other.kind;
    }

    if (base.name === '') {
        merged.name = other.name;
    }
    if (base.location === '') {
        merged.location = other.location;
    }

    return merged;
}

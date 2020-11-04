// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { cloneDeep } from 'lodash';
import * as path from 'path';
import { traceError } from '../../../common/logger';
import {
    compareVersions as compareBasicVersions,
    EMPTY_VERSION,
    isVersionInfoEmpty,
    parseBasicVersionInfo,
} from '../../../common/utils/version';

import { PythonReleaseLevel, PythonVersion } from '.';

export function getPythonVersionFromPath(exe:string): PythonVersion {
    let version = getEmptyVersion();
    try {
        version = parseVersion(path.basename(exe));
    } catch (ex) {
        traceError(`Failed to parse version from path: ${exe}`, ex);
    }
    return version;
}

/**
 * Convert the given string into the corresponding Python version object.
 * Example:
 *   3.9.0
 *   3.9.0a1
 *   3.9.0b2
 *   3.9.0rc1
 *
 * Does not parse:
 *   3.9.0.final.0
 */
export function parseVersion(versionStr: string): PythonVersion {
    const parsed = parseBasicVersionInfo<PythonVersion>(versionStr);
    if (!parsed) {
        if (versionStr === '') {
            return getEmptyVersion();
        }
        throw Error(`invalid version ${versionStr}`);
    }
    const { version, after } = parsed;
    const match = after.match(/^(a|b|rc)(\d+)$/);
    if (match) {
        const [, levelStr, serialStr] = match;
        let level: PythonReleaseLevel;
        if (levelStr === 'a') {
            level = PythonReleaseLevel.Alpha;
        } else if (levelStr === 'b') {
            level = PythonReleaseLevel.Beta;
        } else if (levelStr === 'rc') {
            level = PythonReleaseLevel.Candidate;
        } else {
            throw Error('unreachable!');
        }
        version.release = {
            level,
            serial: parseInt(serialStr, 10),
        };
    }
    return version;
}

/**
 * Convert the given string into the corresponding Python version object.
 * Example:
 *   3.9.0.final.0
 *   3.9.0.alpha.1
 *   3.9.0.beta.2
 *   3.9.0.candidate.1
 *
 * Does not parse:
 *   3.9.0
 *   3.9.0a1
 *   3.9.0b2
 *   3.9.0rc1
 */
export function parseVersionInfo(versionInfoStr: string): PythonVersion {
    const parts = versionInfoStr.split('.');
    const version = getEmptyVersion();
    if (parts.length >= 2) {
        version.major = parseInt(parts[0], 10);
        version.minor = parseInt(parts[1], 10);
    }

    if (parts.length >= 3) {
        version.micro = parseInt(parts[2], 10);
    }

    if (parts.length >= 4 && version.release) {
        const levels = ['alpha', 'beta', 'candidate', 'final'];
        const level = parts[3].toLowerCase();
        if (levels.includes(level)) {
            version.release.level = level as PythonReleaseLevel;
        }
    }

    if (parts.length >= 5 && version.release) {
        version.release.serial = parseInt(parts[4], 10);
    }

    return version;
}

/**
 * Get a new version object with all properties "zeroed out".
 */
export function getEmptyVersion(): PythonVersion {
    return { ...EMPTY_VERSION };
}

/**
 * Determine if the version is effectively a blank one.
 */
export function isVersionEmpty(version: PythonVersion): boolean {
    // We really only care the `version.major` is -1.  However, using
    // generic util is better in the long run.
    return isVersionInfoEmpty(version);
}

/**
 * Checks if all the fields in the version object match.
 *
 * Note that "sysVersion" is ignored.
 */
export function areIdenticalVersion(left: PythonVersion, right: PythonVersion): boolean {
    // We do not do a simple deep-equal check here due to "sysVersion".
    const [result] = compareVersionsRaw(left, right);
    return result === 0;
}

/**
 * Checks if major and minor version fields match. True here means that the python ABI is the
 * same, but the micro version could be different. But for the purpose this is being used
 * it does not matter.
 */
export function areSimilarVersions(left: PythonVersion, right: PythonVersion): boolean {
    let [result, prop] = compareVersionsRaw(left, right);
    if (result === 0) {
        return true;
    }
    if (left.major === 2 && right.major === 2) {
        // We are going to assume that if the major version is 2 then the version is 2.7
        if (left.minor === -1) {
            [result, prop] = compareBasicVersions({ ...left, minor: 7 }, right);
        }
        if (right.minor === -1) {
            [result, prop] = compareBasicVersions(left, { ...right, minor: 7 });
        }
    }
    // tslint:disable:no-any
    if (result < 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((right as unknown) as any)[prop] === -1;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((left as unknown) as any)[prop] === -1;
    // tslint:enable:no-any
}

/**
 * Determine if the first version is less-than (-1), equal (0), or greater-than (1).
 */
export function compareVersions(left: PythonVersion, right: PythonVersion): number {
    const [compared] = compareVersionsRaw(left, right);
    return compared;
}

function compareVersionsRaw(left: PythonVersion, right: PythonVersion): [number, string] {
    const [result, prop] = compareBasicVersions(left, right);
    if (result !== 0) {
        return [result, prop];
    }
    const [release] = compareVersionRelease(left, right);
    return release === 0 ? [0, ''] : [release, 'release'];
}

function compareVersionRelease(left: PythonVersion, right: PythonVersion): [number, string] {
    if (left.release === undefined) {
        if (right.release === undefined) {
            return [0, ''];
        }
        return [1, 'level'];
    }
    if (right.release === undefined) {
        return [-1, 'level'];
    }

    // Compare the level.
    if (left.release.level < right.release.level) {
        return [1, 'level'];
    }
    if (left.release.level > right.release.level) {
        return [-1, 'level'];
    }
    if (left.release.level === PythonReleaseLevel.Final) {
        // We ignore "serial".
        return [0, ''];
    }

    // Compare the serial.
    if (left.release.serial < right.release.serial) {
        return [1, 'serial'];
    }
    if (left.release.serial > right.release.serial) {
        return [-1, 'serial'];
    }

    return [0, ''];
}

/**
 * Build a new version based on the given objects.
 *
 * "version" is used if the two are equivalent and "other" does not
 * have more info.  Otherwise "other" is used.
 */
export function mergeVersions(version: PythonVersion, other: PythonVersion): PythonVersion {
    let winner = version;
    const [result] = compareVersionsRaw(version, other);
    if (result === 0) {
        if (version.major === 2 && version.minor === -1) {
            winner = other;
        }
    } else if (result > 0) {
        winner = other;
    }
    return cloneDeep(winner);
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Architecture } from '../../../common/utils/platform';
import { copyVersion, mergeVersions, normalizeVersion, validateVersion } from './pythonVersion';

import { PythonBuildInfo, PythonVersion } from '.';

/**
 * Make an as-is (deep) copy of the given info.
 */
export function copyBuild(info: PythonBuildInfo): PythonBuildInfo {
    const copied: PythonBuildInfo = { ...info };
    copied.version = copyVersion(copied.version);
    return copied;
}

/**
 * Make a copy and set all the properties properly.
 */
export function normalizeBuild(info: PythonBuildInfo): PythonBuildInfo {
    const norm = { ...info };
    if (!norm.version) {
        // tslint:disable-next-line:no-object-literal-type-assertion
        norm.version = {} as PythonVersion;
    }
    norm.version = normalizeVersion(norm.version);
    if (!norm.arch) {
        norm.arch = Architecture.Unknown;
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
export function validateBuild(info: PythonBuildInfo) {
    validateVersion(info.version);
    // There's nothing to do for info.arch.
}

/**
 * Make a copy of "build" and fill in empty properties using "other."
 */
export function mergeBuilds(build: PythonBuildInfo, other: PythonBuildInfo): PythonBuildInfo {
    const merged: PythonBuildInfo = {
        version: mergeVersions(build.version, other.version),
        arch: build.arch,
    };

    if (build.arch === Architecture.Unknown) {
        merged.arch = other.arch;
    }

    return merged;
}

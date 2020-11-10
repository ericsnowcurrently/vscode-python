// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { cloneDeep } from 'lodash';
import { mergeVersions, normalizeVersionInfo, validateVersionInfo } from '../../../common/utils/version';
import { mergeMetaDistros, normalizeDistroMeta, validateDistroMeta } from './pythonDistroMeta';

import { PythonDistroInfo } from '.';

/**
 * Make an as-is (deep) copy of the given info.
 */
export function copyDistro(info: PythonDistroInfo): PythonDistroInfo {
    return { ...info };
}

/**
 * Make a copy and set all the properties properly.
 */
export function normalizeDistro(info: PythonDistroInfo): PythonDistroInfo {
    const norm = { ...info, ...normalizeDistroMeta(info) };
    if (!norm.version || (norm.version as object) === {}) {
        norm.version = undefined;
    } else {
        norm.version = normalizeVersionInfo(norm.version);
    }
    if (!norm.binDir || norm.binDir === '') {
        norm.binDir = undefined;
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
export function validateDistro(info: PythonDistroInfo) {
    validateDistroMeta(info);
    if (info.version !== undefined) {
        validateVersionInfo(info.version);
    }
    // `info.binDir` can be anything.
}

/**
 * Make a copy of "distro" and fill in empty properties using "other."
 */
export function mergeDistros(distro: PythonDistroInfo, other: PythonDistroInfo): PythonDistroInfo {
    const merged: PythonDistroInfo = mergeMetaDistros(distro, other);

    if (other.version !== undefined) {
        if (distro.version === undefined) {
            merged.version = cloneDeep(other.version);
        } else {
            merged.version = mergeVersions(distro.version, other.version);
        }
    } else if (distro.version !== undefined) {
        merged.version = cloneDeep(distro.version);
    }

    if (distro.binDir !== undefined && distro.binDir !== '') {
        merged.binDir = distro.binDir;
    } else if (other.binDir !== undefined) {
        merged.binDir = other.binDir;
    }

    return merged;
}

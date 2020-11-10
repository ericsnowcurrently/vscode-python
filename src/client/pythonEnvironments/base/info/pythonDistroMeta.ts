// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { PythonDistroMetaInfo } from '.';

/**
 * Make a copy and set all the properties properly.
 */
export function normalizeDistroMeta(info: PythonDistroMetaInfo): PythonDistroMetaInfo {
    const norm = { ...info };
    if (!norm.org) {
        norm.org = '';
    }
    if (!norm.defaultDisplayName || norm.defaultDisplayName === '') {
        norm.defaultDisplayName = undefined;
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
export function validateDistroMeta(_info: PythonDistroMetaInfo) {
    // `info.org` can be anything.
    // `info.defaultDisplayName` can be anything.
}

/**
 * Make a copy of "meta" and fill in empty properties using "other."
 */
export function mergeMetaDistros(
    meta: PythonDistroMetaInfo,
    other: PythonDistroMetaInfo,
): PythonDistroMetaInfo {
    const merged: PythonDistroMetaInfo = {
        org: meta.org,
    };

    if (meta.org === '') {
        merged.org = other.org;
    }

    if (meta.defaultDisplayName !== undefined && meta.defaultDisplayName !== '') {
        merged.defaultDisplayName = meta.defaultDisplayName;
    } else if (other.defaultDisplayName !== undefined) {
        merged.defaultDisplayName = other.defaultDisplayName;
    }

    return merged;
}

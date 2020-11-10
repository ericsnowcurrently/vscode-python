// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { copyExecutable, normalizeExecutable, validateExecutable } from './executable';

import { PythonEnvBaseInfo, PythonEnvKind, PythonExecutableInfo } from '.';

/**
 * Make an as-is (deep) copy of the given info.
 */
export function copyEnvBase(info: PythonEnvBaseInfo): PythonEnvBaseInfo {
    const copied = { ...info };
    copied.executable = copyExecutable(copied.executable);
    return copied;
}

/**
 * Make a copy and set all the properties properly.
 */
export function normalizeEnvBase(info: PythonEnvBaseInfo): PythonEnvBaseInfo {
    const norm = { ...info };
    // clean up
    if (!norm.kind) {
        norm.kind = PythonEnvKind.Unknown;
    }
    if (!norm.executable) {
        // tslint:disable-next-line:no-object-literal-type-assertion
        norm.executable = {} as PythonExecutableInfo;
    }
    if (!norm.name) {
        norm.name = '';
    }
    if (!norm.location) {
        norm.location = '';
    }
    // normalize
    norm.executable = normalizeExecutable(norm.executable);
    return norm;
}

/**
 * Fail if any properties are not set properly.
 *
 * Optional properties that are not set are ignored.
 *
 * This assumes that the info has already been normalized.
 */
export function validateEnvBase(info: PythonEnvBaseInfo) {
    // `info.kind` has nothing to check.
    validateExecutable(info.executable);
    if (info.name === '' && info.location === '') {
        throw Error('missing name');
    }
}

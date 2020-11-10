// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';

import { PythonReleaseLevel, PythonVersion } from '../../../../client/pythonEnvironments/base/info';
import {
    getShortVersionString,
    parseVersion
} from '../../../../client/pythonEnvironments/base/info/pythonVersion';

export function ver(
    major: number,
    minor: number | undefined,
    micro: number | undefined,
    level: string,
    serial: number
): PythonVersion {
    return {
        major,
        minor: (minor as unknown) as number,
        micro: (micro as unknown) as number,
        release: {
            serial,
            level: level as PythonReleaseLevel
        }
    };
}

const VERSION_STRINGS: [string, PythonVersion][] = [
    ['0.9.2b2', ver(0, 9, 2, 'beta', 2)],
    ['3.3.1', ver(3, 3, 1, 'final', 0)],
    ['3.9.0rc1', ver(3, 9, 0, 'candidate', 1)],
    ['2.7.11a3', ver(2, 7, 11, 'alpha', 3)]
];

suite('pyenvs info - getShortVersionString', () => {
    for (const data of VERSION_STRINGS) {
        const [expected, info] = data;
        test(`conversion works for '${expected}'`, () => {
            const result = getShortVersionString(info);

            assert.equal(result, expected);
        });
    }
});

suite('pyenvs info - parseVersion', () => {
    for (const data of VERSION_STRINGS) {
        const [text, expected] = data;
        test(`conversion works for '${text}'`, () => {
            const result = parseVersion(text);

            assert.deepEqual(result, expected);
        });
    }
});

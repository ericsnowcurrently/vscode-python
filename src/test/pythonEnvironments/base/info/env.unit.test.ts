// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as assert from 'assert';

import { Architecture } from '../../../../client/common/utils/platform';

import { PythonEnvKind } from '../../../../client/pythonEnvironments/base/info';
import { buildEnvDisplayName, getEmptyEnv } from '../../../../client/pythonEnvironments/base/info/env';

import { ver } from './pythonVersion.unit.test';

suite('pyenvs info - buildEnvDisplayName', () => {
    test('minimal', () => {
        const env = getEmptyEnv();

        const result = buildEnvDisplayName(env);

        assert.equal(result, 'Python');
    });

    test('full', () => {
        const env = getEmptyEnv();
        env.version = ver(3, 8, 1, 'candidate', 2);
        env.arch = Architecture.x64;
        env.name = 'foo';
        env.kind = PythonEnvKind.Conda;

        const result = buildEnvDisplayName(env);

        assert.equal(result, "Python 3.8.1rc2 64-bit ('foo': conda)");
    });
});

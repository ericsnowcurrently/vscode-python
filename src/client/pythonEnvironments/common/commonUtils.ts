// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as path from 'path';
import { chain, iterable } from '../../common/utils/async';
import { getOSType, OSType } from '../../common/utils/platform';
import { PythonVersion } from '../base/info';
import { compareVersions, getEmptyVersion, parseVersion } from '../base/info/pythonVersion';
import { getPythonVersionFromConda } from '../discovery/locators/services/condaLocator';
import { getPythonVersionFromVenv } from '../discovery/locators/services/virtualEnvironmentIdentifier';
import { isDirectory, listDir } from './externalDependencies';
import { isPosixPythonBin } from './posixUtils';
import { isWindowsPythonExe } from './windowsUtils';

/**
 * Searches recursively under the given `root` directory for python interpreters.
 * @param root : Directory where the search begins.
 * @param recurseLevels : Number of levels to search for from the root directory.
 * @param filter : Callback that identifies directories to ignore.
 */
export async function* findInterpretersInDir(
    root: string,
    recurseLevels?: number,
    filter?: (x: string) => boolean,
): AsyncIterableIterator<string> {
    const os = getOSType();
    const checkBin = os === OSType.Windows ? isWindowsPythonExe : isPosixPythonBin;
    const itemFilter = filter ?? (() => true);

    const dirContents = (await listDir(root))
        .map((c) => path.join(root, c))
        .filter(itemFilter);

    const generators = dirContents.map((fullPath) => {
        async function* generator() {
            if (await isDirectory(fullPath)) {
                if (recurseLevels && recurseLevels > 0) {
                    const subItems = findInterpretersInDir(fullPath, recurseLevels - 1);

                    for await (const subItem of subItems) {
                        yield subItem;
                    }
                }
            } else if (checkBin(fullPath)) {
                yield fullPath;
            }
        }

        return generator();
    });

    yield* iterable(chain(generators));
}

/**
 * Looks for files in the same directory which might have version in their name.
 * @param interpreterPath
 */
export async function getPythonVersionFromNearByFiles(interpreterPath:string): Promise<PythonVersion> {
    const root = path.dirname(interpreterPath);
    let version = getEmptyVersion();
    for await (const interpreter of findInterpretersInDir(root)) {
        try {
            const curVersion = parseVersion(path.basename(interpreter));
            if (compareVersions(curVersion, version) > 0) {
                version = curVersion;
            }
        } catch (ex) {
            // Ignore any parse errors
        }
    }
    return version;
}

/**
 * This function does the best effort of finding version of python without running the
 * python binary.
 * @param interpreterPath Absolute path to the interpreter.
 * @param hint Any string that might contain version info.
 */
export async function getPythonVersionFromPath(
    interpreterPath: string | undefined,
    hint: string | undefined,
): Promise<PythonVersion> {
    let versionA;
    try {
        versionA = hint ? parseVersion(hint) : getEmptyVersion();
    } catch (ex) {
        versionA = getEmptyVersion();
    }
    const versionB = interpreterPath ? await getPythonVersionFromNearByFiles(interpreterPath) : getEmptyVersion();
    const versionC = interpreterPath ? await getPythonVersionFromVenv(interpreterPath) : getEmptyVersion();
    const versionD = interpreterPath ? await getPythonVersionFromConda(interpreterPath) : getEmptyVersion();

    let version = getEmptyVersion();
    for (const v of [versionA, versionB, versionC, versionD]) {
        version = compareVersions(version, v) > 0 ? version : v;
    }
    return version;
}

/**
 * This function looks specifically for 'python' or 'python.exe' binary in the sub folders of a given
 * environment directory.
 * @param envDir Absolute path to the environment directory
 */
export async function getInterpreterPathFromDir(envDir: string): Promise<string|undefined> {
    // Ignore any folders or files that not directly python binary related.
    function filter(str:string):boolean {
        const lower = str.toLowerCase();
        return ['bin', 'scripts'].includes(lower) || lower.search('python') >= 0;
    }

    // Search in the sub-directories for python binary
    for await (const bin of findInterpretersInDir(envDir, 2, filter)) {
        const base = path.basename(bin).toLowerCase();
        if (base === 'python.exe' || base === 'python') {
            return bin;
        }
    }
    return undefined;
}

/**
 * Gets the root environment directory based on the absolute path to the python
 *  interpreter binary.
 * @param interpreterPath Absolute path to the python interpreter
 */
export function getEnvironmentDirFromPath(interpreterPath:string): string {
    const skipDirs = ['bin', 'scripts'];

    // env <--- Return this directory if it is not 'bin' or 'scripts'
    // |__ python  <--- interpreterPath
    const dir = path.basename(path.dirname(interpreterPath));
    if (!skipDirs.includes(dir.toLowerCase())) {
        return path.dirname(interpreterPath);
    }

    // This is the best next guess.
    // env <--- Return this directory if it is not 'bin' or 'scripts'
    // |__ bin or Scripts
    //     |__ python  <--- interpreterPath
    return path.dirname(path.dirname(interpreterPath));
}

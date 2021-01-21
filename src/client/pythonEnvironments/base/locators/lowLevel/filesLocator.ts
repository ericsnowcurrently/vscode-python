// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

// tslint:disable-next-line:no-single-line-block-comment
/* eslint-disable max-classes-per-file */

import { Event, EventEmitter } from 'vscode';
import { iterPythonExecutablesInDir } from '../../../common/commonUtils';
import { normalizePath } from '../../../common/externalDependencies';
import { PythonEnvInfo, PythonEnvKind } from '../../info';
import { getFastEnvInfo } from '../../info/env';
import { ILocator, IPythonEnvsIterator, PythonEnvUpdatedEvent, PythonLocatorQuery } from '../../locator';
import { iterAndUpdateEnvs, resolveEnvFromIterator } from '../../locatorUtils';
import { PythonEnvsChangedEvent, PythonEnvsWatcher } from '../../watcher';
import { FSWatchingLocator } from './fsWatchingLocator';

/**
 * A naive locator the wraps a function that finds Python executables.
 */
export class FoundFilesLocator implements ILocator {
    public readonly onChanged: Event<PythonEnvsChangedEvent>;

    protected readonly watcher = new PythonEnvsWatcher();

    constructor(
        private readonly kind: PythonEnvKind,
        private readonly getExecutables: () => Promise<string[]> | AsyncIterableIterator<string>,
    ) {
        this.onChanged = this.watcher.onChanged;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public iterEnvs(_query?: PythonLocatorQuery): IPythonEnvsIterator {
        const executablesPromise = this.getExecutables();
        const emitter = new EventEmitter<PythonEnvUpdatedEvent | null>();
        async function* generator(kind: PythonEnvKind): IPythonEnvsIterator {
            const executables = await executablesPromise;
            yield* iterAndUpdateEnvs(
                iterMinimalEnvsFromExecutables(executables, kind),
                (evt: PythonEnvUpdatedEvent | null) => emitter.fire(evt),
            );
        }
        const iterator = generator(this.kind);
        iterator.onUpdated = emitter.event;
        return iterator;
    }

    public async resolveEnv(env: string | Partial<PythonEnvInfo>): Promise<PythonEnvInfo | undefined> {
        const iterator = this.iterEnvs();
        return resolveEnvFromIterator(env, iterator);
    }
}

/**
 * Build minimal env info corresponding to each executable filename.
 */
async function* iterMinimalEnvsFromExecutables(
    executables: string[] | AsyncIterableIterator<string>,
    kind: PythonEnvKind,
): AsyncIterableIterator<PythonEnvInfo> {
    for await (const filename of executables) {
        const executable = normalizePath(filename);
        yield getFastEnvInfo(kind, executable);
    }
}

/**
 * A locator for executables in a single directory.
 */
export class DirFilesLocator extends FoundFilesLocator {
    constructor(
        dirname: string,
        kind: PythonEnvKind,
        getExecutables: (dir: string) => AsyncIterableIterator<string> = getExecutablesDefault,
    ) {
        super(
            kind,
            // a wrapper
            () => getExecutables(dirname),
        );
    }
}

/**
 * A locator for executables in a single directory.
 */
export class DirFilesWatchingLocator extends FSWatchingLocator {
    private readonly subLocator: ILocator;

    constructor(
        dirname: string,
        kind: PythonEnvKind,
        // The default is defined by DirFilesLocator.
        getExecutables?: (dir: string) => AsyncIterableIterator<string>,
    ) {
        super(
            () => [dirname],
            async () => kind,
            // Watch just the directory.
            { noTree: true },
        );
        this.subLocator = new DirFilesLocator(dirname, kind, getExecutables);
    }

    protected doIterEnvs(query: PythonLocatorQuery): IPythonEnvsIterator {
        return this.subLocator.iterEnvs(query);
    }

    protected async doResolveEnv(env: string | PythonEnvInfo): Promise<PythonEnvInfo | undefined> {
        return this.subLocator.resolveEnv(env);
    }
}

async function* getExecutablesDefault(dirname: string): AsyncIterableIterator<string> {
    for await (const entry of iterPythonExecutablesInDir(dirname)) {
        yield entry.filename;
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { createDeferred, Deferred } from '../../common/utils/async';
import { createWorkerPool, IWorkerPool, QueuePosition } from '../../common/utils/workerPool';
import { getInterpreterInfo, InterpreterInformation } from '../base/info/interpreter';
import { shellExecute } from '../common/externalDependencies';
import { buildPythonExecInfo } from '../exec';

export enum EnvironmentInfoServiceQueuePriority {
    Default,
    High
}

export interface IEnvironmentInfoService {
    getEnvironmentInfo(
        interpreterPath: string,
        priority?: EnvironmentInfoServiceQueuePriority
    ): Promise<InterpreterInformation | undefined>;
    isInfoProvided(interpreterPath: string): boolean;
}

async function buildEnvironmentInfo(interpreterPath: string): Promise<InterpreterInformation | undefined> {
    const interpreterInfo = await getInterpreterInfo(buildPythonExecInfo(interpreterPath), shellExecute).catch(
        () => undefined,
    );
    if (interpreterInfo === undefined || interpreterInfo.version === undefined) {
        return undefined;
    }
    return interpreterInfo;
}

export class EnvironmentInfoService implements IEnvironmentInfoService {
    private active = false;

    // Caching environment here in-memory. This is so that we don't have to run this on the same
    // path again and again in a given session. This information will likely not change in a given
    // session. There are definitely cases where this will change. But a simple reload should address
    // those.
    private readonly cache: Map<string, Deferred<InterpreterInformation>> = new Map<
        string,
        Deferred<InterpreterInformation>
    >();

    private readonly workerPool: IWorkerPool<string, InterpreterInformation | undefined>;

    public constructor() {
        this.workerPool = createWorkerPool<string, InterpreterInformation | undefined>(buildEnvironmentInfo);
    }

    public activate(): void {
        if (this.active) {
            return;
        }
        this.active = true;

        this.workerPool.start();
    }

    public dispose(): void {
        if (!this.active) {
            return;
        }
        this.active = false;

        this.workerPool.stop();
    }

    public async getEnvironmentInfo(
        interpreterPath: string,
        priority?: EnvironmentInfoServiceQueuePriority,
    ): Promise<InterpreterInformation | undefined> {
        const result = this.cache.get(interpreterPath);
        if (result !== undefined) {
            // Another call for this environment has already been made, return its result
            return result.promise;
        }
        const deferred = createDeferred<InterpreterInformation>();
        this.cache.set(interpreterPath, deferred);
        return (priority === EnvironmentInfoServiceQueuePriority.High
            ? this.workerPool.addToQueue(interpreterPath, QueuePosition.Front)
            : this.workerPool.addToQueue(interpreterPath, QueuePosition.Back)
        ).then((r) => {
            deferred.resolve(r);
            if (r === undefined) {
                this.cache.delete(interpreterPath);
            }
            return r;
        });
    }

    public isInfoProvided(interpreterPath: string): boolean {
        const result = this.cache.get(interpreterPath);
        return !!(result && result.completed);
    }
}

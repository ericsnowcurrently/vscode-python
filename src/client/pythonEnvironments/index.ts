// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as vscode from 'vscode';
import { IServiceContainer, IServiceManager } from '../ioc/types';
import { PythonEnvInfo } from './base/info';
import { ILocator, PythonEnvsIterator, PythonLocatorQuery } from './base/locator';
import { PythonEnvsChangedEvent } from './base/watcher';
import { ExtensionLocators, WorkspaceLocators } from './discovery/locators';
import { registerForIOC } from './legacyIOC';

/**
 * Activate the Python environments component (during extension activation).'
 */
export function activate(serviceManager: IServiceManager, serviceContainer: IServiceContainer) {
    const [api, activateAPI] = createAPI();
    activateAPI();
    // tslint:disable-next-line:no-unused-expression
    api;

    registerForIOC(serviceManager, serviceContainer);
}

/**
 * The public API for the Python environments component.
 *
 * Note that this is composed of sub-components.
 */
export class PythonEnvironments implements ILocator {
    constructor(
        // These are the sub-components the full component is composed of:
        private readonly locators: ILocator
    ) {}

    public get onChanged(): vscode.Event<PythonEnvsChangedEvent> {
        return this.locators.onChanged;
    }

    public iterEnvs(query?: PythonLocatorQuery): PythonEnvsIterator {
        return this.locators.iterEnvs(query);
    }

    public async resolveEnv(env: string | PythonEnvInfo): Promise<PythonEnvInfo | undefined> {
        return this.locators.resolveEnv(env);
    }
}

/**
 * Initialize everything needed for the API and provide the API object.
 *
 * An activation function is also returned, which should be called soon.
 */
export function createAPI(): [PythonEnvironments, () => void] {
    const [locators, activateLocators] = initLocators();

    return [
        new PythonEnvironments(locators),
        () => {
            activateLocators();
            // Any other activation needed for the API will go here later.
        }
    ];
}

function initLocators(): [ExtensionLocators, () => void] {
    // We will add locators in similar order
    // to PythonInterpreterLocatorService.getLocators().
    const nonWorkspaceLocators: ILocator[] = [
        // Add an ILocator object here for each non-workspace locator.
    ];

    const workspaceLocators = new WorkspaceLocators([
        // Add an ILocator factory func here for each kind of workspace-rooted locator.
    ]);

    return [
        new ExtensionLocators(nonWorkspaceLocators, workspaceLocators),
        // combined activation func:
        () => {
            // Any non-workspace locator activation goes here.
            workspaceLocators.activate(getWorkspaceFolders());
        }
    ];
}

function getWorkspaceFolders() {
    const rootAdded = new vscode.EventEmitter<vscode.Uri>();
    const rootRemoved = new vscode.EventEmitter<vscode.Uri>();
    vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        for (const root of event.removed) {
            rootRemoved.fire(root.uri);
        }
        for (const root of event.added) {
            rootAdded.fire(root.uri);
        }
    });
    const folders = vscode.workspace.workspaceFolders;
    return {
        roots: folders ? folders.map((f) => f.uri) : [],
        onAdded: rootAdded.event,
        onRemoved: rootRemoved.event
    };
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { Event, Uri, } from 'vscode';
import { chain } from '../../../common/utils/async';
import { PythonEnvInfo } from '../../base/info';
import { ILocator, Locator, NOOP_ITERATOR, PythonEnvsIterator, PythonLocatorQuery } from '../../base/locator';
import { DisableableLocator, Locators } from '../../base/locators';

/**
 * A wrapper around all locators used by the extension.
 */
export class ExtensionLocators extends Locators {
    constructor(
        // These are expected to be low-level locators (e.g. system).
        nonWorkspace: ILocator[],
        // This is expected to be a locator wrapping any found in
        // the workspace (i.e. WorkspaceLocators).
        workspace: ILocator
    ) {
        super([...nonWorkspace, workspace]);
    }
}

type WorkspaceLocatorFactory = (root: Uri) => ILocator[];

interface IWorkspaceFolders {
    readonly roots: ReadonlyArray<Uri>;
    readonly onAdded: Event<Uri>;
    readonly onRemoved: Event<Uri>;
}

type RootURI = string;

/**
 * The collection of all workspace-specific locators used by the extension.
 *
 * The factories are used to produce the locators for each workspace folder.
 */
export class WorkspaceLocators extends Locator {
    private readonly locators: Record<RootURI, DisableableLocator> = {};
    private readonly roots: Record<RootURI, Uri> = {};
    constructor(
        // used to produce the per-root locators:
        private readonly factories: WorkspaceLocatorFactory[]
    ) {
        super();
    }

    /**
     * Activate the locator.
     *
     * @param folders - the info used to keep track of the workspace folders
     */
    public activate(folders: IWorkspaceFolders) {
        for (const root of folders.roots) {
            this.addRoot(root);
        }
        folders.onAdded((root: Uri) => this.addRoot(root));
        folders.onRemoved((root: Uri) => this.removeRoot(root));
    }

    public iterEnvs(query?: PythonLocatorQuery): PythonEnvsIterator {
        const iterators = Object.keys(this.locators).map((key) => {
            if (query?.searchLocations) {
                const root = this.roots[key];
                if (!matchURI(root, ...query.searchLocations)) {
                    return NOOP_ITERATOR;
                }
            }
            // The query matches or was not location-specific.
            const locator = this.locators[key];
            return locator.iterEnvs(query);
        });
        return chain(iterators);
    }

    public async resolveEnv(env: string | PythonEnvInfo): Promise<PythonEnvInfo | undefined> {
        if (typeof env !== 'string' && env.searchLocation) {
            const rootLocator = this.locators[env.searchLocation.toString()];
            if (rootLocator) {
                return rootLocator.resolveEnv(env);
            }
        }
        // Fall back to checking all the roots.
        for (const key of Object.keys(this.locators)) {
            const resolved = await this.locators[key].resolveEnv(env);
            if (resolved !== undefined) {
                return resolved;
            }
        }
        return undefined;
    }

    private addRoot(root: Uri) {
        // Drop the old one, if necessary.
        this.removeRoot(root);
        // Create the root's locator, wrapping each factory-generated locator.
        const locators: ILocator[] = [];
        for (const create of this.factories) {
            locators.push(...create(root));
        }
        const locator = new DisableableLocator(new Locators(locators));
        // Cache it.
        const key = root.toString();
        this.locators[key] = locator;
        this.roots[key] = root;
        this.emitter.fire({ searchLocation: root });
        // Hook up the watchers.
        locator.onChanged((e) => {
            if (e.searchLocation === undefined) {
                e.searchLocation = root;
            }
            this.emitter.fire(e);
        });
    }

    private removeRoot(root: Uri) {
        const key = root.toString();
        const locator = this.locators[key];
        if (locator === undefined) {
            return;
        }
        delete this.locators[key];
        delete this.roots[key];
        locator.disable();
        this.emitter.fire({ searchLocation: root });
    }
}

/**
 * Determine if the given URI matches one of the candidates.
 *
 * The scheme must match, as well as path.  The path must match exactly
 * or the URI must be a parent of one of the candidates.
 */
function matchURI(uri: Uri, ...candidates: Uri[]): boolean {
    const uriPath = uri.path.endsWith('/') ? uri.path : `{uri.path}/`;
    for (const candidate of candidates) {
        if (candidate.scheme === uri.scheme) {
            if (candidate.path === uri.path) {
                return true;
            } else if (candidate.path.startsWith(uriPath)) {
                return true;
            }
        }
    }
    return false;
}

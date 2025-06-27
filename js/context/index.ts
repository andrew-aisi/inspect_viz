import { AsyncDuckDBConnection } from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';

import { wasmConnector } from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-core@0.16.2/+esm';

import { InstantiateContext } from 'https://cdn.jsdelivr.net/npm/@uwdata/mosaic-spec@0.16.2/+esm';

import { INPUTS } from '../inputs';
import { initDuckdb, waitForTable } from './duckdb';
import { ErrorInfo, errorInfo } from '../util/errors.js';
import { sleep } from '../util/async.js';

class VizContext extends InstantiateContext {
    private readonly tables_ = new Set<string>();
    private workerErrors_: ErrorInfo[] = [];

    constructor(
        worker: Worker,
        private readonly conn_: AsyncDuckDBConnection,
        plotDefaults: any[]
    ) {
        super({ plotDefaults });
        this.api = { ...this.api, ...INPUTS };
        this.coordinator.databaseConnector(wasmConnector({ connection: this.conn_ }));

        // track worker errors
        worker.addEventListener('message', event => {
            if (event.data.type === 'ERROR') {
                this.workerErrors_.push(errorInfo(event.data.data.message));
            }
        });
    }

    async insertTable(table: string, data: Uint8Array) {
        // insert table into database
        await this.conn_?.insertArrowFromIPCStream(data, {
            name: table,
            create: true,
        });

        // add to list of tables
        this.tables_.add(table);
    }

    async waitForTable(table: string) {
        await waitForTable(this.conn_, table);
    }

    async collectWorkerError(wait: number = 1000): Promise<ErrorInfo | undefined> {
        const startTime = Date.now();
        while (Date.now() - startTime < wait) {
            if (this.workerErrors_.length > 0) {
                return this.workerErrors_.shift();
            }
            await sleep(100);
        }
        return undefined;
    }
}

// get the global context instance, ensuring we get the same
// instance eval across different js bundles loaded into the page
const VIZ_CONTEXT_KEY = Symbol.for('@@inspect-viz-context');
async function vizContext(plotDefaults: any[]): Promise<VizContext> {
    const globalScope: any = typeof window !== 'undefined' ? window : globalThis;
    if (!globalScope[VIZ_CONTEXT_KEY]) {
        globalScope[VIZ_CONTEXT_KEY] = (async () => {
            const { db, worker } = await initDuckdb();
            const conn = await db.connect();
            return new VizContext(worker, conn, plotDefaults);
        })();
    }
    return globalScope[VIZ_CONTEXT_KEY] as Promise<VizContext>;
}

export { VizContext, vizContext };

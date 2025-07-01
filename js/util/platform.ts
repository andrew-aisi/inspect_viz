export function isNotebook(): boolean {
    const win = window as Window & {
        Jupyter?: any;
        _JUPYTERLAB?: any;
        google?: { colab?: any };
        IPython?: any;
        mo?: any;
        acquireVsCodeApi?: any;
    };

    const hasNotebookGlobal =
        typeof win.Jupyter !== 'undefined' ||
        typeof win._JUPYTERLAB !== 'undefined' ||
        (typeof win.google !== 'undefined' && win.google.colab) ||
        typeof win.IPython !== 'undefined' ||
        typeof win.mo !== 'undefined' ||
        typeof win.acquireVsCodeApi !== 'undefined';

    return hasNotebookGlobal || isVSCodeNotebook();
}

export function isVSCodeNotebook() {
    return (
        window.location.protocol === 'vscode-webview:' &&
        window.location.search.includes('purpose=notebookRenderer')
    );
}

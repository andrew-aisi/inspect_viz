import { isNotebook } from "./platform";

export interface ErrorInfo {
    name: string;
    message: string;
    stack: string;
    code: string | number | null;
    originalValue?: unknown;
    [key: string]: unknown; // Allow additional properties
}

export function errorInfo(error: unknown): ErrorInfo {
    if (isError(error)) {
        return {
            name: error.name || 'Error',
            message: error.message || 'An unknown error occurred',
            stack: error.stack || '',
            code: (error as any).code || null,
            ...(error as any), // Include any custom properties
        };
    } else if (typeof error === 'string') {
        return {
            name: 'Error',
            message: error,
            stack: new Error().stack || '',
            code: null,
        };
    } else {
        // For non-error objects
        return {
            name: 'Unknown Error',
            message: JSON.stringify(error, null, 2),
            stack: new Error().stack || '',
            code: null,
            originalValue: error,
        };
    }
}

export function errorAsHTML(error: ErrorInfo): string {
    const colors = {
        bg: '#ffffff',
        border: '#dc3545',
        title: '#dc3545',
        text: '#212529',
        subtext: '#6c757d',
        codeBg: '#f8f9fa',
        link: '#007bff',
    };

    // Parse stack trace
    const stackLines = parseStackTrace(error.stack);

    // Build HTML
    let html = `
    <div style="
      background: ${colors.bg};
      border: 2px solid ${colors.border};
      border-radius: 8px;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
      color: ${colors.text};
      margin: 10px 0;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; margin-bottom: 15px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="margin-right: 10px;">
          <circle cx="12" cy="12" r="10" stroke="${colors.title}" stroke-width="2" fill="none"/>
          <path d="M12 8v5m0 4h.01" stroke="${colors.title}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <h3 style="margin: 0; color: ${colors.title}; font-size: 20px; font-weight: 600;">
          ${escapeHtml(error.name)}
        </h3>
      </div>
      
      <div style="
        background: ${colors.codeBg};
        padding: 15px;
        border-radius: 6px;
        margin-bottom: 15px;
        border-left: 4px solid ${colors.border};
      ">
        <p style="margin: 0; font-size: 13px; line-height: 1.5; font-family: monospace; white-space: pre-wrap;">${escapeHtml(error.message)}</p>
      </div>`;

    if (error.code !== null) {
        html += `
      <div style="margin-bottom: 10px;">
        <span style="color: ${colors.subtext}; font-size: 143x;">Error Code:</span>
        <span style="color: ${colors.text}; font-weight: 500; margin-left: 8px;">
          ${escapeHtml(String(error.code))}
        </span>
      </div>`;
    }

    if (stackLines.length > 0) {
        html += `
      <details style="margin-top: 15px;">
        <summary style="
          cursor: pointer;
          color: ${colors.subtext};
          font-size: 13px;
          font-weight: 500;
          outline: none;
          user-select: none;
        ">
          Stack Trace (${stackLines.length} frames)
        </summary>
        <div style="margin-top: 10px; font-size: 13px; font-family: monospace;">`;

        stackLines.forEach((line, i) => {
            html += `
        <div style="
          background: ${i % 2 === 0 ? colors.codeBg : 'transparent'};
          border-radius: 4px;
          margin: 2px 0;
          display: flex;
          align-items: center;
        ">
          <span style="color: ${colors.subtext}; min-width: 24px;">${i + 1}.</span>
          <span style="color: ${colors.link}; margin-left: 8px;">
            ${escapeHtml(line)}
          </span>
        </div>`;
        });

        html += `
        </div>
      </details>`;
    }

    html += `</div>`;

    return html;
}

export function displayRenderError(error: ErrorInfo, renderEl: HTMLElement) {
    const errorHTML = errorAsHTML(error);
    if (isNotebook()) {
        renderEl.setAttribute('style', '');
        renderEl.innerHTML = errorAsHTML(error);
    } else {
        showErrorModal(errorHTML);
    }
}

function parseStackTrace(stack: string): string[] {
    if (!stack) return [];

    const lines = stack.split('\n');
    const functions: string[] = [];

    // Patterns to extract function names
    const patterns: RegExp[] = [
        // Chrome/Edge: "    at functionName (file:line:column)"
        /^\s*at\s+(.+?)\s+\(/,
        // Chrome/Edge: "    at file:line:column" (anonymous)
        /^\s*at\s+[^(]+$/,
        // Firefox/Safari: "functionName@file:line:column"
        /^(.+?)@/,
    ];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === 'Error') continue;

        let functionName = 'anonymous';

        for (const pattern of patterns) {
            const match = trimmed.match(pattern);
            if (match) {
                if (match[1]) {
                    functionName = match[1].trim();
                }
                break;
            }
        }

        // If no pattern matched, use the whole line as the function name
        if (functionName === 'anonymous' && !patterns.some(p => p.test(trimmed))) {
            functionName = trimmed;
        }

        functions.push(functionName);
    }

    return functions;
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function isError(value: unknown): value is Error {
    return value instanceof Error;
}

let activeModal: HTMLElement | null = null;

function showErrorModal(htmlContent: string): void {
    // Remove any existing modal
    if (activeModal) {
        activeModal.remove();
    }

    // Create modal backdrop
    const backdrop = document.createElement('div');
    backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 200px;
        padding-left: 20px;
        padding-right: 20px;
        box-sizing: border-box;
    `;

    // Create modal container
    const modal = document.createElement('div');
    modal.style.cssText = `
        max-width: 80vw;
        max-height: 80vh;
        overflow-y: auto;
        position: relative;
    `;

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
        position: absolute;
        top: 15px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
        z-index: 1;
    `;

    closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = '#f0f0f0';
    };

    closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = 'transparent';
    };

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = htmlContent;

    // Assemble modal
    modal.appendChild(closeButton);
    modal.appendChild(contentWrapper);
    backdrop.appendChild(modal);

    // Close modal on backdrop click
    backdrop.onclick = e => {
        if (e.target === backdrop) {
            backdrop.remove();
            activeModal = null;
        }
    };

    // Close modal on close button click
    closeButton.onclick = () => {
        backdrop.remove();
        activeModal = null;
    };

    // Close on Escape key
    const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && activeModal) {
            backdrop.remove();
            activeModal = null;
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Add to DOM
    document.body.appendChild(backdrop);
    activeModal = backdrop;
}

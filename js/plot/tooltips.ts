import tippy from 'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/+esm';

// TODO: links
// TODO: test multiple plots

export const replaceTooltipImpl = (specEl: HTMLElement) => {
    // Check if SVG already exists
    const existingSvg = specEl.querySelector('svg');
    if (existingSvg) {
        setupTooltipObserver(existingSvg, specEl);
        return;
    }

    // Wait for SVG to be added (give up after a few mutations
    // since this might not be a plot)
    let mutationCount = 0;
    const maxMutations = 5;
    const observer = new MutationObserver(() => {
        const svgEl = specEl.querySelector('svg');
        if (svgEl) {
            observer.disconnect();
            setupTooltipObserver(svgEl, specEl);
        } else if (mutationCount >= maxMutations) {
            observer.disconnect();
        }
        mutationCount++;
    });

    observer.observe(specEl, { childList: true, subtree: true });
};

let tooltipInstance: any | undefined = undefined;

const setupTooltipObserver = (svgEl: SVGElement, specEl: HTMLElement) => {
    if (!tooltipInstance) {
        tooltipInstance = tippy(specEl, {
            trigger: 'manual',
            placement: 'top',
            theme: 'inspect',
        });
    }

    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                const tipElements = svgEl.querySelectorAll('g[aria-label="tip"]');

                if (tipElements.length === 1) {
                    const tipContainerEl = tipElements[0] as SVGGElement;
                    tipContainerEl.style.display = 'none';

                    const tipEl = tipContainerEl.firstChild as SVGGElement | null;
                    if (!tipEl) {
                        return;
                    }
                    const rect = specEl.getBoundingClientRect();
                    const parsed = parseSVGTooltip(tipEl);

                    tooltipInstance.setProps({
                        getReferenceClientRect: () => {
                            console.log({ rect, parsed });

                            const centerX = rect.left + (parsed.transform?.x || 0);
                            const centerY = rect.top + (parsed.transform?.y || 0);

                            return {
                                width: 0,
                                height: 0,
                                top: centerY,
                                bottom: centerY,
                                left: centerX,
                                right: centerX,
                                x: centerX,
                                y: centerY,
                                toJSON: () => {},
                            } as DOMRect;
                        },
                    });

                    const contentEl = document.createElement('div');
                    contentEl.classList.add('inspect-tip-container');
                    let count = 0;
                    for (const row of parsed.values) {
                        // The row
                        const rowEl = document.createElement('div');
                        rowEl.className = 'inspect-tip-row';
                        contentEl.appendChild(rowEl);

                        // The key
                        const keyEl = document.createElement('div');
                        keyEl.className = 'inspect-tip-key';
                        keyEl.append(document.createTextNode(row.key));

                        // The value
                        const valueEl = document.createElement('div');
                        valueEl.className = 'inspect-tip-value';

                        valueEl.append(document.createTextNode(row.value));
                        if (row.color) {
                            const colorEl = document.createElement('span');
                            colorEl.className = 'inspect-tip-color';
                            colorEl.style.backgroundColor = row.color;
                            valueEl.append(colorEl);
                        }

                        rowEl.appendChild(keyEl);
                        rowEl.appendChild(valueEl);
                        count++;
                    }
                    tooltipInstance.setContent(contentEl);

                    if (tipContainerEl.childElementCount === 0) {
                        tooltipInstance.hide();
                    } else {
                        tooltipInstance.show();
                    }
                } else {
                    throw new Error(
                        `Expected exactly one tip element, found ${tipElements.length}`
                    );
                }
            }
        });
    });

    observer.observe(svgEl, {
        childList: true,
        subtree: true,
    });
};

interface TooltipRow {
    key: string;
    value: string;
    color?: string;
}

interface ParsedTooltip {
    transform?: {
        x: number;
        y: number;
    };
    values: Array<TooltipRow>;
}

const parseSVGTooltip = (tipEl: SVGGElement): ParsedTooltip => {
    const result: ParsedTooltip = { values: [] };

    // Parse the transform attribute to capture the position
    // offset (relative to SVG element)
    const transformVal = tipEl.getAttribute('transform');
    if (transformVal) {
        const match = transformVal.match(/translate\(([^)]+)\)/);
        if (match) {
            const [x, y] = match[1].split(',').map(Number);
            result.transform = { x, y };
        }
    }

    // Parse the child spans
    const tspanEls = tipEl.querySelectorAll('tspan');
    tspanEls.forEach(tspan => {
        let key = undefined;
        let value = undefined;
        let color = undefined;
        tspan.childNodes.forEach(node => {
            if (node.nodeName === 'tspan') {
                // Nested tspan, either key or color
                const colorAttr = (node as Element).getAttribute('fill');
                if (colorAttr) {
                    color = colorAttr;
                } else {
                    key = node.textContent?.trim();
                }
            } else if (node.nodeName === '#text') {
                // Bare text nodes are a key
                value = node.textContent?.trim();
            }
        });
        if (key !== undefined && value !== undefined) {
            result.values.push({ key, value, color });
        }
    });

    return result;
};

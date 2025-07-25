import * as d3 from 'https://cdn.jsdelivr.net/npm/d3-force@3.0.0/+esm';

interface TextLabelNode {
    element: SVGTextElement;
    x: number;
    y: number;
    rect: DOMRect;
    initialX: number;
    initialY: number;
    originalSvgX: number;
    originalSvgY: number;
}

export const installTextCollisionHandler = (specEl: HTMLElement) => {
    configurePlotObservers(specEl);

    // Watch the spec element for svgs to be added
    // When they are added, configure plot observer
    const observer = new MutationObserver(() => {
        configurePlotObservers(specEl);
    });
    observer.observe(specEl, { childList: true, subtree: true });
};

// Track which SVGs have been setup
// to avoid setting up multiple observers on the same SVG.
const configuredPlots = new WeakSet<Element>();

const configurePlotObservers = (specEl: HTMLElement) => {
    const childSvgEls = specEl.querySelectorAll('div.plot svg');
    childSvgEls.forEach(svgEl => {
        if (svgEl && !configuredPlots.has(svgEl)) {
            const options = readTextOptions(svgEl);
            if (options.enableTextCollision) {
                configurePlotObserver(svgEl as HTMLElement);
                configuredPlots.add(svgEl);
            }
        }
    });
};

const configurePlotObserver = (plotElement: HTMLElement) => {
    const observer = new MutationObserver(() => {
        // Get all text elements from the plot
        processCollidingText(plotElement);
    });
    processCollidingText(plotElement);
    observer.observe(plotElement, { childList: true, subtree: true });
};

function processCollidingText(plotElement: HTMLElement) {
    const textElements = plotElement.querySelectorAll('g[aria-label="text"] text');

    // No text elements to process
    if (textElements.length === 0) {
        return;
    }

    // Convert to array and add initial positions
    const nodes: TextLabelNode[] = Array.from(textElements).map(el => {
        const textEl = el as SVGTextElement;

        // Get the screen coordinates by using getBoundingClientRect
        const screenRect = textEl.getBoundingClientRect();
        const svgRect = plotElement.getBoundingClientRect();

        // Convert screen coordinates to SVG coordinates
        const actualX = screenRect.left - svgRect.left + screenRect.width / 2;
        const actualY = screenRect.top - svgRect.top + screenRect.height / 2;

        // Store original SVG attribute values
        const originalSvgX = parseFloat(textEl.getAttribute('x') || '0');
        const originalSvgY = parseFloat(textEl.getAttribute('y') || '0');

        return {
            element: textEl,
            rect: screenRect,
            x: actualX,
            y: actualY,
            initialX: actualX,
            initialY: actualY,
            originalSvgX: originalSvgX,
            originalSvgY: originalSvgY,
        };
    });

    // Create and run the simulation for all elements with collision detection
    d3.forceSimulation(nodes)
        .force('collision', rectangularVerticalCollisionForce().padding(0))
        .force('x', d3.forceX((d: TextLabelNode) => d.initialX).strength(0.1))
        .force('y', d3.forceY((d: TextLabelNode) => d.initialY).strength(0.1))
        .alphaDecay(0.75)
        .velocityDecay(0.9)
        .on('tick', () => {
            nodes.forEach((d: TextLabelNode) => {
                // Calculate offset from initial position
                const deltaX = d.x - d.initialX;
                if (deltaX !== 0) {
                    d.element.setAttribute('x', String(d.originalSvgX + deltaX));
                }

                const deltaY = d.y - d.initialY;
                if (deltaY !== 0) {
                    d.element.setAttribute('y', String(d.originalSvgY + deltaY));
                }
            });
        });
}

// General vertical collision force that detects overlaps dynamically
function rectangularVerticalCollisionForce() {
    let nodes: TextLabelNode[];
    let padding = 2;

    function force() {
        // Check all pairs for overlaps each tick
        for (let i = 0; i < nodes.length; i++) {
            const nodeA = nodes[i];
            const rectA = nodeA.rect;

            for (let j = i + 1; j < nodes.length; j++) {
                const nodeB = nodes[j];
                const rectB = nodeB.rect;

                // Check for overlap using current positions
                const aLeft = nodeA.x - rectA.width / 2;
                const aRight = nodeA.x + rectA.width / 2;
                const aTop = nodeA.y - rectA.height / 2;
                const aBottom = nodeA.y + rectA.height / 2;

                const bLeft = nodeB.x - rectB.width / 2;
                const bRight = nodeB.x + rectB.width / 2;
                const bTop = nodeB.y - rectB.height / 2;
                const bBottom = nodeB.y + rectB.height / 2;

                const xOverlap = aRight + padding > bLeft && bRight + padding > aLeft;
                const yOverlap = aBottom + padding > bTop && bBottom + padding > aTop;

                if (xOverlap && yOverlap) {
                    // Calculate vertical separation needed
                    const dy = nodeB.y - nodeA.y;
                    const minDistanceY = (rectA.height + rectB.height) / 2 + padding;

                    if (Math.abs(dy) < minDistanceY) {
                        const overlapY = minDistanceY - Math.abs(dy);
                        const moveY = (overlapY / 2) * (dy > 0 ? 1 : -1);
                        nodeA.y -= moveY;
                        nodeB.y += moveY;
                    }
                }
            }
        }
    }

    force.initialize = function (newNodes: TextLabelNode[]) {
        nodes = newNodes;
    };

    force.padding = function (value?: number) {
        if (value === undefined) return padding;
        padding = value;
        return force;
    };

    return force;
}

interface TextOptions {
    enableTextCollision?: boolean;
}

const readTextOptions = (svgEl: Element): TextOptions => {
    const textOptions: TextOptions = {};
    // Check the parent element for marks
    const plotEl = svgEl.parentElement;
    if (plotEl) {
        // Read the value from the plot element
        const value = (plotEl as any).value;
        const marks = value.marks || [];

        const textMarks = marks.filter((mark: { type: string }) => mark.type === 'text');

        for (const mark of textMarks) {
            if (mark.channels) {
                const shiftTextEnabled = mark.channels.some(
                    (c: { channel: string; value: any }) => {
                        if (c.channel === '_shift_overlapping_text') {
                            const val = c.value;
                            if (Array.isArray(val)) {
                                return val.includes(true);
                            }
                        }
                        return false;
                    }
                );
                if (shiftTextEnabled) {
                    // Enable text collision for this mark
                    textOptions.enableTextCollision = true;
                    break;
                }
            }
        }
    }
    return textOptions;
};

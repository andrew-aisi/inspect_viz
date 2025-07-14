import svgPathParser from 'https://cdn.jsdelivr.net/npm/svg-path-parser@1.1.0/+esm';
import tippy, { Placement } from 'https://cdn.jsdelivr.net/npm/tippy.js@6.3.7/+esm';
import { isLinkableUrl } from '../util/url';

export const replaceTooltipImpl = (specEl: HTMLElement) => {
    // Check if SVG already exists
    configureSpecSvgTooltips(specEl);

    // Watch the spec element for svgs to be added
    // When they are added, attempt to connect our tooltip
    // handler
    const observer = new MutationObserver(() => {
        configureSpecSvgTooltips(specEl);
    });
    observer.observe(specEl, { childList: true, subtree: true });
};

// Track which SVGs have been setup
// to avoid setting up multiple observers on the same SVG.
const configuredSvgs = new WeakSet<SVGSVGElement>();

const configureSpecSvgTooltips = (specEl: HTMLElement) => {
    const childSvgEls = specEl.querySelectorAll('svg');
    childSvgEls.forEach(svgEl => {
        if (svgEl && !configuredSvgs.has(svgEl)) {
            setupTooltipObserver(svgEl, specEl);
            configuredSvgs.add(svgEl);
            return;
        }
    });
};

let tooltipInstance: any | undefined = undefined;

function hideTooltip() {
    tooltipInstance.hide();
    window.removeEventListener('scroll', hideTooltip);
}

function showTooltip() {
    tooltipInstance.show();
    window.addEventListener('scroll', hideTooltip, { once: true });
}

const setupTooltipObserver = (svgEl: SVGSVGElement, specEl: HTMLElement) => {
    // Initialize tippy for this spec element if not already done.
    if (!tooltipInstance) {
        tooltipInstance = tippy(specEl, {
            trigger: 'manual',
            theme: 'inspect',
            interactive: true,
        });
    }

    // Watch the SVG for childList mutations and inspect the tip element
    // whenever it changes.
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                const tipElements = svgEl.querySelectorAll('g[aria-label="tip"]');
                if (tipElements.length === 1) {
                    const tipContainerEl = tipElements[0] as SVGGElement;
                    tipContainerEl.style.display = 'none';

                    // If the tip container is empty, the tooltip has been dismissed
                    // hide the tooltip
                    const tipEl = tipContainerEl.firstChild as SVGGElement | null;
                    if (!tipEl) {
                        if (!tooltipInstance.popper.matches(':hover')) {
                            hideTooltip();
                        }
                    } else {
                        // Find the tip container and parse it to determine how the tooltips
                        // are configured and what is being displayed.
                        const parsed = parseSVGTooltip(tipEl);

                        // Convert the SVG point to screen coordinates
                        const svgPoint = svgEl.createSVGPoint();
                        svgPoint.x = parsed.transform?.x || 0;
                        svgPoint.y = parsed.transform?.y || 0;

                        // Apply any container transforms
                        const containerTransform = parseTransform(tipContainerEl);
                        if (containerTransform) {
                            svgPoint.x += containerTransform.x;
                            svgPoint.y += containerTransform.y;
                        }

                        const screenPoint = svgPoint.matrixTransform(svgEl.getScreenCTM()!);

                        // Position the tooltip
                        const centerX = screenPoint.x;
                        const centerY = screenPoint.y;

                        // Configure tippy to display the HTML tooltip
                        tooltipInstance.setProps({
                            placement:
                                parsed.placement !== 'middle' ? parsed.placement || 'top' : 'top',
                            getReferenceClientRect: () => {
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
                            arrow: parsed.placement !== 'middle',
                            offset: parsed.placement === 'middle' ? [0, 0] : undefined,
                            popperOptions:
                                // Special handling for middle placement, which isn't a supported
                                // tippy placement
                                parsed.placement === 'middle'
                                    ? {
                                          modifiers: [
                                              {
                                                  name: 'preventOverflow',
                                                  enabled: false,
                                              },
                                              {
                                                  name: 'flip',
                                                  enabled: false,
                                              },
                                              {
                                                  name: 'customMiddle',
                                                  enabled: true,
                                                  phase: 'main',
                                                  fn: ({ state }: any) => {
                                                      // Center the popover at the reference point
                                                      state.modifiersData.popperOffsets.x =
                                                          centerX - state.rects.popper.width / 2;
                                                      state.modifiersData.popperOffsets.y =
                                                          centerY - state.rects.popper.height / 2;
                                                  },
                                              },
                                          ],
                                      }
                                    : undefined,
                        });

                        // Create the tooltip content
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

                            if (row.href) {
                                const linkEl = document.createElement('a');
                                linkEl.href = row.href;
                                linkEl.target = '_blank';
                                linkEl.rel = 'noopener noreferrer';
                                linkEl.className = 'inspect-tip-link';
                                linkEl.textContent = row.value;
                                valueEl.appendChild(linkEl);
                            } else {
                                valueEl.append(document.createTextNode(row.value));
                            }

                            // Add a color, if provided
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

                        // Show the tooltip
                        tooltipInstance.setContent(contentEl);
                        showTooltip();
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
    href?: string;
    color?: string;
}

interface ParsedTooltip {
    transform?: {
        x: number;
        y: number;
    };
    values: Array<TooltipRow>;
    placement?: Placement | 'middle';
}

const parseTransform = (el: HTMLElement | SVGGElement): { x: number; y: number } | undefined => {
    // Parse the transform attribute to capture the position
    // offset (relative to SVG element)
    const transformVal = el.getAttribute('transform');
    if (transformVal) {
        const match = transformVal.match(/translate\(([^)]+)\)/);
        if (match) {
            const [x, y] = match[1].split(',').map(Number);
            return { x, y };
        }
    }
    return undefined;
};

const parseSVGTooltip = (tipEl: SVGGElement): ParsedTooltip => {
    const result: ParsedTooltip = { values: [] };

    // Parse the transform attribute to capture the position
    // offset (relative to SVG element)
    result.transform = parseTransform(tipEl);

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
            if (isLinkableUrl(value)) {
                result.values.push({ key, value: 'Link', href: value, color });
            } else {
                result.values.push({ key, value, color });
            }
        }
    });

    // Parse the path to determine the arrow direction
    const pathEl = tipEl.querySelector('path');
    if (pathEl) {
        const pathData = pathEl.getAttribute('d');
        if (pathData) {
            result.placement = parseArrowDirection(pathData);
        }
    }

    return result;
};

const parseArrowPosition = (a: number, b: number): 'start' | 'center' | 'end' => {
    if (a < b) {
        return 'end';
    } else if (a > b) {
        return 'start';
    } else {
        return 'center';
    }
};

const parseArrowDirection = (pathData: string): Placement | 'middle' => {
    const parsed = svgPathParser.parseSVG(pathData);
    if (parsed.length < 3) {
        return 'top';
    }

    const moveTo = parsed[0];
    if (moveTo.code !== 'M') {
        console.warn('Expected moveto command (M) in path data, found:', moveTo);
        return 'top';
    }

    if (moveTo.x !== 0 && moveTo.y !== 0) {
        return 'middle';
    }

    const lineTo = parsed[1];
    if (lineTo.code !== 'l') {
        console.warn('Expected lineto command (l) in path data, found:', lineTo);
        return 'top';
    }

    const firstEdgeLineTo = parsed[2];
    if (firstEdgeLineTo.code !== 'h' && firstEdgeLineTo.code !== 'v') {
        console.warn(
            'Expected horizontal (h) or vertical (v) line command after move, found:',
            firstEdgeLineTo
        );
        return 'top';
    }

    const lastEdgeLineTo = parsed[parsed.length - 2];
    if (lastEdgeLineTo.code !== 'h' && lastEdgeLineTo.code !== 'v') {
        console.warn(
            'Expected horizontal (h) or vertical (v) line command before close, found:',
            lastEdgeLineTo
        );
        return 'top';
    }

    // first determine the direction of the arrow
    const x = lineTo.x;
    const y = lineTo.y;

    let arrowDirection: 'top' | 'bottom' | 'left' | 'right' = 'top';
    if (x > 0 && y > 0) {
        arrowDirection = 'bottom';
    } else if (x < 0 && y < 0) {
        if (firstEdgeLineTo.code === 'h') {
            arrowDirection = 'bottom';
        } else {
            arrowDirection = 'left';
        }
    } else if (x > 0 && y < 0) {
        if (firstEdgeLineTo.code === 'h') {
            arrowDirection = 'top';
        } else {
            arrowDirection = 'right';
        }
    } else if (x < 0 && y > 0) {
        arrowDirection = 'bottom';
    } else {
        console.warn(
            'Could not determine arrow direction from path data, returning default placement: top'
        );
    }

    // Next determine the placement within the svg (start, center, end)
    let arrowPosition: 'start' | 'center' | 'end' = 'center';
    if (firstEdgeLineTo.code === 'h') {
        arrowPosition = parseArrowPosition(firstEdgeLineTo.x, lastEdgeLineTo.x);
    } else {
        arrowPosition = parseArrowPosition(firstEdgeLineTo.y, lastEdgeLineTo.y);
    }

    // Finalize the placement based on direction and position
    if (arrowPosition === 'center') {
        return arrowDirection as Placement;
    } else {
        return `${arrowDirection}-${arrowPosition}` as Placement;
    }
};

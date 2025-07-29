export interface MarkData {
    type: string;
    channels?: [{ channel: string; value: any }];
}

export const readMarks = (plotEl: HTMLElement): MarkData[] => {
    // Read the value from the plot element
    const value = (plotEl as any).value;
    const marks = value ? value.marks || [] : [];
    return marks;
};

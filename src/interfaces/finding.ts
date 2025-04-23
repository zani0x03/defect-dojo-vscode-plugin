export interface Finding {
    file_path: string;
    line: number;
    description: string;
    title: string;
    severity: string;
    id: number;
}
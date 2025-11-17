interface CsvImportRow {
    sku: string;
    name: string;
    price: number;
    cost: number;
    stock: number;
    description: string;
    barcode: string;
    unit: string;
    minStock: number;
    maxStock: number;
}
interface ImportError {
    rowIndex: number;
    field: string;
    message: string;
    sku?: string;
    value?: string;
}
export declare function parseCsvFile(content: string): string[][];
export declare function validateCsvData(data: string[][]): {
    validRows: CsvImportRow[];
    errors: ImportError[];
};
export declare function generateCsvTemplate(): string;
export declare function createBatches<T>(data: T[], batchSize: number): T[][];
export declare function calculateProgress(processed: number, total: number): number;
export declare function formatErrorMessage(error: ImportError): string;
export declare function calculateImportStats(result: any): {
    successRate: number;
    errorRate: number;
    skippedRate: number;
};
export declare function validateCsvFile(file: File): {
    isValid: boolean;
    error?: string;
};
export {};
//# sourceMappingURL=csv.d.ts.map
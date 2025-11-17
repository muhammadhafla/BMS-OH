import { z } from 'zod';
export declare const csvImportRowSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    sku: z.ZodString;
    name: z.ZodString;
    price: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
    cost: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
    stock: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
    description: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
    barcode: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
    unit: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
    minStock: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>, number, string | undefined>;
    maxStock: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>, number, string | undefined>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    sku: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    maxStock: number;
    unit: string;
}, {
    name: string;
    sku: string;
    price: string;
    cost: string;
    stock: string;
    description?: string | undefined;
    barcode?: string | undefined;
    minStock?: string | undefined;
    maxStock?: string | undefined;
    unit?: string | undefined;
}>, {
    name: string;
    description: string;
    sku: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    maxStock: number;
    unit: string;
}, {
    name: string;
    sku: string;
    price: string;
    cost: string;
    stock: string;
    description?: string | undefined;
    barcode?: string | undefined;
    minStock?: string | undefined;
    maxStock?: string | undefined;
    unit?: string | undefined;
}>, {
    name: string;
    description: string;
    sku: string;
    barcode: string;
    price: number;
    cost: number;
    stock: number;
    minStock: number;
    maxStock: number;
    unit: string;
}, {
    name: string;
    sku: string;
    price: string;
    cost: string;
    stock: string;
    description?: string | undefined;
    barcode?: string | undefined;
    minStock?: string | undefined;
    maxStock?: string | undefined;
    unit?: string | undefined;
}>;
export declare const csvImportFileSchema: z.ZodObject<{
    rows: z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        sku: z.ZodString;
        name: z.ZodString;
        price: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
        cost: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
        stock: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, number, string>;
        description: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
        barcode: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
        unit: z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string, string | undefined>;
        minStock: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>, number, string | undefined>;
        maxStock: z.ZodEffects<z.ZodEffects<z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>, string | undefined, string | undefined>, number, string | undefined>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description: string;
        sku: string;
        barcode: string;
        price: number;
        cost: number;
        stock: number;
        minStock: number;
        maxStock: number;
        unit: string;
    }, {
        name: string;
        sku: string;
        price: string;
        cost: string;
        stock: string;
        description?: string | undefined;
        barcode?: string | undefined;
        minStock?: string | undefined;
        maxStock?: string | undefined;
        unit?: string | undefined;
    }>, {
        name: string;
        description: string;
        sku: string;
        barcode: string;
        price: number;
        cost: number;
        stock: number;
        minStock: number;
        maxStock: number;
        unit: string;
    }, {
        name: string;
        sku: string;
        price: string;
        cost: string;
        stock: string;
        description?: string | undefined;
        barcode?: string | undefined;
        minStock?: string | undefined;
        maxStock?: string | undefined;
        unit?: string | undefined;
    }>, {
        name: string;
        description: string;
        sku: string;
        barcode: string;
        price: number;
        cost: number;
        stock: number;
        minStock: number;
        maxStock: number;
        unit: string;
    }, {
        name: string;
        sku: string;
        price: string;
        cost: string;
        stock: string;
        description?: string | undefined;
        barcode?: string | undefined;
        minStock?: string | undefined;
        maxStock?: string | undefined;
        unit?: string | undefined;
    }>, "many">;
    duplicates: z.ZodArray<z.ZodObject<{
        sku: z.ZodString;
        rowIndex: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        sku: string;
        rowIndex: number;
    }, {
        sku: string;
        rowIndex: number;
    }>, "many">;
    errors: z.ZodArray<z.ZodObject<{
        rowIndex: z.ZodNumber;
        field: z.ZodString;
        message: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        message: string;
        rowIndex: number;
        field: string;
    }, {
        message: string;
        rowIndex: number;
        field: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    rows: {
        name: string;
        description: string;
        sku: string;
        barcode: string;
        price: number;
        cost: number;
        stock: number;
        minStock: number;
        maxStock: number;
        unit: string;
    }[];
    duplicates: {
        sku: string;
        rowIndex: number;
    }[];
    errors: {
        message: string;
        rowIndex: number;
        field: string;
    }[];
}, {
    rows: {
        name: string;
        sku: string;
        price: string;
        cost: string;
        stock: string;
        description?: string | undefined;
        barcode?: string | undefined;
        minStock?: string | undefined;
        maxStock?: string | undefined;
        unit?: string | undefined;
    }[];
    duplicates: {
        sku: string;
        rowIndex: number;
    }[];
    errors: {
        message: string;
        rowIndex: number;
        field: string;
    }[];
}>;
export type CsvImportRow = z.infer<typeof csvImportRowSchema>;
export type CsvImportFile = z.infer<typeof csvImportFileSchema>;
export interface ImportStatus {
    id: string;
    total: number;
    processed: number;
    successful: number;
    failed: number;
    skipped: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    currentBatch?: number;
    totalBatches?: number;
    errors: ImportError[];
    startedAt: string;
    completedAt?: string;
}
export interface ImportError {
    rowIndex: number;
    field: string;
    message: string;
    sku?: string;
    value?: string;
}
export interface ImportResult {
    id: string;
    totalProcessed: number;
    successful: number;
    failed: number;
    skipped: number;
    errors: ImportError[];
    duration: number;
    startedAt: string;
    completedAt: string;
    duplicateSkus: string[];
}
export declare const CSV_TEMPLATE: {
    headers: string[];
    sampleData: string[][];
};
//# sourceMappingURL=csv-import.d.ts.map
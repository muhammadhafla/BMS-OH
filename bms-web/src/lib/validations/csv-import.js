"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSV_TEMPLATE = exports.csvImportFileSchema = exports.csvImportRowSchema = void 0;
const zod_1 = require("zod");
exports.csvImportRowSchema = zod_1.z.object({
    sku: zod_1.z.string()
        .min(1, 'SKU is required')
        .max(50, 'SKU must be less than 50 characters')
        .regex(/^[A-Z0-9-_]+$/, 'SKU must contain only uppercase letters, numbers, hyphens, and underscores'),
    name: zod_1.z.string()
        .min(1, 'Product name is required')
        .max(255, 'Product name must be less than 255 characters')
        .trim(),
    price: zod_1.z.string()
        .min(1, 'Price is required')
        .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Price must be a non-negative number')
        .transform((val) => Number(val)),
    cost: zod_1.z.string()
        .min(1, 'Cost is required')
        .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, 'Cost must be a non-negative number')
        .transform((val) => Number(val)),
    stock: zod_1.z.string()
        .min(1, 'Stock is required')
        .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val)), 'Stock must be a non-negative whole number')
        .transform((val) => Number(val)),
    description: zod_1.z.string()
        .max(1000, 'Description must be less than 1000 characters')
        .trim()
        .optional()
        .or(zod_1.z.literal(''))
        .transform(val => val || ''),
    barcode: zod_1.z.string()
        .max(50, 'Barcode must be less than 50 characters')
        .trim()
        .optional()
        .or(zod_1.z.literal(''))
        .transform(val => val || ''),
    unit: zod_1.z.string()
        .max(20, 'Unit must be less than 20 characters')
        .trim()
        .optional()
        .or(zod_1.z.literal(''))
        .transform(val => val || 'pcs'),
    minStock: zod_1.z.string()
        .optional()
        .or(zod_1.z.literal(''))
        .refine(val => !val || val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), 'MinStock must be a non-negative whole number')
        .transform(val => !val || val === '' ? 0 : Number(val)),
    maxStock: zod_1.z.string()
        .optional()
        .or(zod_1.z.literal(''))
        .refine(val => !val || val === '' || (!isNaN(Number(val)) && Number(val) >= 0 && Number.isInteger(Number(val))), 'MaxStock must be a non-negative whole number')
        .transform(val => !val || val === '' ? 100 : Number(val)),
}).refine((data) => {
    if (data.stock > data.maxStock) {
        return false;
    }
    return true;
}, {
    message: 'Current stock cannot exceed maximum stock level',
    path: ['stock'],
}).refine((data) => {
    if (data.maxStock <= data.minStock) {
        return false;
    }
    return true;
}, {
    message: 'Maximum stock must be greater than minimum stock',
    path: ['maxStock'],
});
exports.csvImportFileSchema = zod_1.z.object({
    rows: zod_1.z.array(exports.csvImportRowSchema),
    duplicates: zod_1.z.array(zod_1.z.object({
        sku: zod_1.z.string(),
        rowIndex: zod_1.z.number(),
    })),
    errors: zod_1.z.array(zod_1.z.object({
        rowIndex: zod_1.z.number(),
        field: zod_1.z.string(),
        message: zod_1.z.string(),
    })),
});
exports.CSV_TEMPLATE = {
    headers: [
        'SKU',
        'Name',
        'Price',
        'Cost',
        'Stock',
        'Description',
        'Barcode',
        'Unit',
        'MinStock',
        'MaxStock'
    ],
    sampleData: [
        ['ELEC001', 'Samsung Galaxy S24', '15000000', '12000000', '50', 'Latest Samsung smartphone', '880123456789', 'pcs', '5', '100'],
        ['CLOTH002', 'Cotton T-Shirt', '85000', '45000', '200', '100% cotton t-shirt', '', 'pcs', '20', '500'],
        ['FOOD003', 'Organic Coffee Beans', '125000', '85000', '75', 'Premium arabica coffee beans', '899123456789', 'kg', '10', '200']
    ]
};
//# sourceMappingURL=csv-import.js.map
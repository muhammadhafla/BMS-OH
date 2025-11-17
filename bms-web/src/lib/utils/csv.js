"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCsvFile = parseCsvFile;
exports.validateCsvData = validateCsvData;
exports.generateCsvTemplate = generateCsvTemplate;
exports.createBatches = createBatches;
exports.calculateProgress = calculateProgress;
exports.formatErrorMessage = formatErrorMessage;
exports.calculateImportStats = calculateImportStats;
exports.validateCsvFile = validateCsvFile;
const CSV_TEMPLATE = {
    headers: ['sku', 'name', 'description', 'price', 'cost', 'stock', 'minstock', 'maxstock', 'unit', 'barcode'],
    sampleData: [
        ['PROD001', 'Sample Product', 'Product description', '10000', '8000', '50', '10', '100', 'pcs', '123456789'],
    ]
};
function parseCsvFile(content) {
    const lines = content.trim().split('\n');
    return lines.map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            }
            else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            }
            else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    });
}
function validateCsvData(data) {
    const validRows = [];
    const errors = [];
    const seenSkus = new Set();
    data.forEach((row, index) => {
        const rowData = {};
        CSV_TEMPLATE.headers.forEach((header, colIndex) => {
            rowData[header.toLowerCase().replace(' ', '')] = (row[colIndex] || '').trim();
        });
        try {
            const validatedRow = csvImportRowSchema(rowData);
            if (seenSkus.has(validatedRow.sku)) {
                errors.push({
                    rowIndex: index,
                    field: 'sku',
                    message: `Duplicate SKU: ${validatedRow.sku} (already exists in this file)`,
                    sku: validatedRow.sku,
                    value: validatedRow.sku
                });
                return;
            }
            seenSkus.add(validatedRow.sku);
            validRows.push(validatedRow);
        }
        catch (error) {
            if (error.errors) {
                error.errors.forEach((err) => {
                    errors.push({
                        rowIndex: index,
                        field: err.path.join('.'),
                        message: err.message,
                        sku: rowData.sku || '',
                        value: rowData[err.path.join('')] || ''
                    });
                });
            }
            else {
                errors.push({
                    rowIndex: index,
                    field: 'row',
                    message: error.message || 'Invalid row data',
                    sku: rowData.sku || '',
                    value: ''
                });
            }
        }
    });
    return { validRows, errors };
}
function generateCsvTemplate() {
    const headers = CSV_TEMPLATE.headers.join(',');
    const sampleRows = CSV_TEMPLATE.sampleData.map((row) => row.map((cell) => `"${cell}"`).join(','));
    return [headers, ...sampleRows].join('\n');
}
function createBatches(data, batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
    }
    return batches;
}
function calculateProgress(processed, total) {
    return total > 0 ? Math.round((processed / total) * 100) : 0;
}
function formatErrorMessage(error) {
    const rowInfo = error.rowIndex !== undefined ? `Row ${error.rowIndex + 1}: ` : '';
    const fieldInfo = error.field ? `${error.field}: ` : '';
    return `${rowInfo}${fieldInfo}${error.message}`;
}
function calculateImportStats(result) {
    return {
        successRate: result.totalProcessed > 0 ? (result.successful / result.totalProcessed) * 100 : 0,
        errorRate: result.totalProcessed > 0 ? (result.failed / result.totalProcessed) * 100 : 0,
        skippedRate: result.totalProcessed > 0 ? (result.skipped / result.totalProcessed) * 100 : 0,
    };
}
function validateCsvFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv')) {
        return { isValid: false, error: 'File must be a CSV file (.csv)' };
    }
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        return { isValid: false, error: 'File size must be less than 10MB' };
    }
    if (file.size === 0) {
        return { isValid: false, error: 'File cannot be empty' };
    }
    return { isValid: true };
}
function csvImportRowSchema(data) {
    return {
        sku: data.sku || '',
        name: data.name || '',
        price: Number(data.price || 0),
        cost: Number(data.cost || 0),
        stock: Number(data.stock || 0),
        description: data.description || '',
        barcode: data.barcode || '',
        unit: data.unit || 'pcs',
        minStock: Number(data.minstock || 0),
        maxStock: Number(data.maxstock || 100),
    };
}
//# sourceMappingURL=csv.js.map
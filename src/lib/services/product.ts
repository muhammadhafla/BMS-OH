'use server';

import { firestore } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';
import { WriteBatch } from 'firebase-admin/firestore';
import Papa from 'papaparse';

const productsCollection = firestore.collection('products');

/**
 * Mengambil semua produk dari Firestore.
 * @returns {Promise<Product[]>} Array dari produk.
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const snapshot = await productsCollection.orderBy('name').get();
    if (snapshot.empty) {
      return [];
    }
    const products: Product[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as Product));
    return products;
  } catch (error) {
    console.error('Error getting all products:', error);
    throw new Error('Gagal mengambil data produk dari server.');
  }
}

/**
 * Mendapatkan satu produk berdasarkan ID-nya dari Firestore.
 * @param {string} id - ID produk.
 * @returns {Promise<Product | null>} Objek produk atau null jika tidak ditemukan.
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const doc = await productsCollection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as Product;
  } catch (error) {
    console.error(`Error getting product by ID (${id}):`, error);
    throw new Error('Gagal mengambil detail produk dari server.');
  }
}

/**
 * Menambahkan produk baru ke Firestore.
 * @param {Omit<Product, 'id'>} productData - Data produk baru.
 * @returns {Promise<Product>} Objek produk yang baru dibuat termasuk ID-nya.
 */
export async function addProduct(productData: Omit<Product, 'id'>): Promise<Product> {
  try {
    const docRef = await productsCollection.add(productData);
    const newDoc = await docRef.get();
    return {
      id: newDoc.id,
      ...newDoc.data(),
    } as Product;
  } catch (error) {
    console.error('Error adding product:', error);
    throw new Error('Gagal menambahkan produk baru ke server.');
  }
}

/**
 * Memperbarui produk yang ada di Firestore.
 * @param {string} id - ID produk yang akan diperbarui.
 * @param {Partial<Product>} productData - Data produk yang akan diubah.
 * @returns {Promise<void>}
 */
export async function updateProduct(id: string, productData: Partial<Product>): Promise<void> {
  try {
    await productsCollection.doc(id).update(productData);
  } catch (error) {
    console.error(`Error updating product (${id}):`, error);
    throw new Error('Gagal memperbarui produk di server.');
  }
}


type ColumnMapping = Record<string, keyof Omit<Product, 'id'> | 'ignore'>;

interface ImportProductsInput {
    csvContent: string;
    columnMapping: ColumnMapping;
}

/**
 * Imports products from a CSV string into Firestore using a batch write and a dynamic column mapping.
 * @param {ImportProductsInput} input - The CSV content and column mapping.
 * @returns {Promise<{success: boolean; count: number; error?: string}>} Result of the import operation.
 */
export async function importProductsFromCSV({ csvContent, columnMapping }: ImportProductsInput): Promise<{success: boolean; count: number; error?: string}> {
  try {
    const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
    const jsonData = parseResult.data as Record<string, string>[];

    if (!jsonData.length) {
      return { success: false, count: 0, error: 'File CSV kosong atau tidak berisi data.' };
    }
    
    // Invert mapping for easier lookup: dbField -> csvHeader
    const dbToCsvMapping: Record<string, string> = {};
    for(const csvHeader in columnMapping) {
        const dbField = columnMapping[csvHeader];
        if (dbField !== 'ignore') {
            dbToCsvMapping[dbField] = csvHeader;
        }
    }

    const productsToAdd: Omit<Product, 'id'>[] = jsonData.map(row => {
      const name = row[dbToCsvMapping['name']] || '';
      const sku = row[dbToCsvMapping['sku']] || '';
      const price = parseFloat(row[dbToCsvMapping['price']]?.replace(/[^0-9.-]+/g,"")) || 0;
      const stock = parseInt(row[dbToCsvMapping['stock']], 10) || 0;
      const unit = row[dbToCsvMapping['unit']] || 'pcs';

      return { name, sku, price, stock: { main: stock }, unit };
    });

    const batch: WriteBatch = firestore.batch();
    
    productsToAdd.forEach(productData => {
      if (productData.name && productData.sku) { // Basic validation
          const docRef = productsCollection.doc(); // Create a new doc with a random ID
          batch.set(docRef, productData);
      }
    });

    await batch.commit();

    return { success: true, count: productsToAdd.length };

  } catch (error) {
    console.error('Error importing products from CSV:', error);
    if (error instanceof Error && error.message.includes('permission')) {
        return { success: false, count: 0, error: 'Izin ditolak. Pastikan kredensial server Anda benar.' };
    }
    return { success: false, count: 0, error: 'Gagal memproses file CSV di server.' };
  }
}

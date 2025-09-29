// src/lib/services/product.ts
'use server';

import { firestore } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';
import { WriteBatch } from 'firebase-admin/firestore';

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
 * Imports products from a CSV string into Firestore using a batch write.
 * Assumes CSV has headers: name,sku,price,stock,unit
 * @param {string} csvContent - The content of the CSV file.
 * @returns {Promise<{success: boolean; count: number; error?: string}>} Result of the import operation.
 */
export async function importProductsFromCSV(csvContent: string): Promise<{success: boolean; count: number; error?: string}> {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length <= 1) {
      return { success: false, count: 0, error: 'File CSV kosong atau hanya berisi header.' };
    }

    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['name', 'sku', 'price', 'stock', 'unit'];
    const missingHeaders = requiredHeaders.filter(h => !header.includes(h));

    if (missingHeaders.length > 0) {
      return { success: false, count: 0, error: `Header CSV tidak lengkap. Header yang dibutuhkan: ${missingHeaders.join(', ')}.` };
    }

    const productsToAdd: Omit<Product, 'id'>[] = lines.slice(1).map(line => {
      const values = line.split(',');
      const product: any = {};
      header.forEach((h, i) => {
        product[h] = values[i].trim();
      });
      
      return {
        name: product.name,
        sku: product.sku,
        price: parseFloat(product.price) || 0,
        stock: { main: parseInt(product.stock, 10) || 0 },
        unit: product.unit,
      };
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

// src/lib/services/product.ts
'use server';

import { firestore } from '@/lib/firebase-admin';
import type { Product } from '@/lib/types';

const productsCollection = firestore.collection('products');

/**
 * Mengambil semua produk dari Firestore.
 * @returns {Promise<Product[]>} Array dari produk.
 */
export async function getAllProducts(): Promise<Product[]> {
  try {
    const snapshot = await productsCollection.get();
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

// Anda dapat menambahkan fungsi lain di sini seiring kebutuhan, seperti:
// - addProduct(product: Omit<Product, 'id'>): Promise<Product>
// - updateProduct(id: string, updates: Partial<Product>): Promise<void>
// - deleteProduct(id: string): Promise<void>

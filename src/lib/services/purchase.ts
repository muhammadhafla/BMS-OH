
'use server';

import { firestore } from '@/lib/firebase-admin';
import type { Product, PurchaseItem } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const productsCollection = firestore.collection('products'); //perlu diganti//
const purchaseHistoryCollection = firestore.collection('purchaseHistory'); //perlu diganti//
const purchasesCollection = firestore.collection('purchases'); //perlu diganti//


interface RecordPurchaseInput {
  supplier: string;
  notes?: string;
  items: PurchaseItem[];
}

/**
 * Records a new purchase, updates stock for existing products or creates new ones,
 * and logs the purchase history.
 * @param {RecordPurchaseInput} input - The purchase data.
 * @returns {Promise<{success: boolean; purchaseId?: string; error?: string}>} Result of the operation.
 */
export async function recordPurchase({ supplier, notes, items }: RecordPurchaseInput): Promise<{success: boolean; purchaseId?: string; error?: string}> {
  
  const totalAmount = items.reduce((sum, item) => sum + item.total, 0);

  try {
    const result = await firestore.runTransaction(async (transaction) => { //perlu diganti//
      // 1. Create the main purchase document
      const purchaseRef = purchasesCollection.doc(); //perlu diganti//
      transaction.set(purchaseRef, { //perlu diganti//
        supplier,
        notes: notes || '',
        items,
        totalAmount,
        purchaseDate: FieldValue.serverTimestamp(),
      });

      for (const item of items) {
        const { productName, quantity, purchasePrice, unit, sku } = item;
        
        // Find product by name
        const productQuery = productsCollection.where('name', '==', productName.trim()); //perlu diganti//
        const productSnapshot = await transaction.get(productQuery); //perlu diganti//
        
        let productRef;
        let existingData: Partial<Product> = {};

        if (!productSnapshot.empty) { //perlu diganti//
          // Product exists, get its reference and data
          const productDoc = productSnapshot.docs[0]; //perlu diganti//
          productRef = productDoc.ref;
          existingData = productDoc.data();
          
          // Update existing product
          transaction.update(productRef, { //perlu diganti//
            stock: { main: FieldValue.increment(quantity) },
            hargaBeli: purchasePrice, // Update to the latest purchase price
          });

        } else {
          // Product does not exist, create a new one
          productRef = productsCollection.doc(); //perlu diganti//
          const newProduct: Omit<Product, 'id'> = {
            name: productName.trim(),
            sku: sku || `NEW-${Date.now()}`,
            price: 0, // Default selling price to 0, needs to be set manually
            hargaBeli: purchasePrice,
            stock: { main: quantity },
            unit: unit || 'pcs',
          };
          transaction.set(productRef, newProduct); //perlu diganti//
        }

        // 2. Log this purchase in purchaseHistory
        const historyRef = purchaseHistoryCollection.doc(); //perlu diganti//
        transaction.set(historyRef, { //perlu diganti//
          productId: productRef.id,
          productName: productName.trim(),
          sku: existingData.sku || sku || `NEW-${Date.now()}`,
          quantity,
          purchasePrice,
          supplier,
          purchaseDate: FieldValue.serverTimestamp(),
        });
      }

      return { purchaseId: purchaseRef.id };
    });

    return { success: true, purchaseId: result.purchaseId };

  } catch (error) {
    console.error('Error recording purchase:', error);
    if (error instanceof Error) {
       return { success: false, error: `Gagal menjalankan transaksi: ${error.message}` };
    }
    return { success: false, error: 'Terjadi kesalahan yang tidak diketahui di server.' };
  }
}

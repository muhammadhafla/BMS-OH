// src/lib/services/accounting.ts
'use server';

import { firestore } from '@/lib/firebase-admin';
import type { ChartOfAccountsEntry } from '@/lib/types';

const chartOfAccountsCollection = firestore.collection('chartOfAccounts');

const defaultAccounts: ChartOfAccountsEntry[] = [
    // Assets
    { id: '1110', name: 'Kas', type: 'Asset', description: 'Uang tunai yang dimiliki perusahaan.' },
    { id: '1120', name: 'Bank', type: 'Asset', description: 'Uang yang disimpan di rekening bank.' },
    { id: '1210', name: 'Piutang Usaha', type: 'Asset', description: 'Uang yang akan diterima dari pelanggan.' },
    { id: '1310', name: 'Persediaan Barang', type: 'Asset', description: 'Nilai barang dagangan yang tersedia untuk dijual.' },
    { id: '1510', name: 'Peralatan Kantor', type: 'Asset', description: 'Nilai peralatan kantor seperti komputer, meja, dll.' },

    // Liabilities
    { id: '2110', name: 'Utang Usaha', type: 'Liability', description: 'Uang yang harus dibayarkan kepada pemasok.' },
    { id: '2210', name: 'Utang Gaji', type: 'Liability', description: 'Gaji yang belum dibayarkan kepada karyawan.' },

    // Equity
    { id: '3110', name: 'Modal Disetor', type: 'Equity', description: 'Modal awal yang diinvestasikan oleh pemilik.' },
    { id: '3210', name: 'Laba Ditahan', type: 'Equity', description: 'Akumulasi laba bersih yang tidak dibagikan sebagai dividen.' },

    // Revenue
    { id: '4110', name: 'Pendapatan Penjualan', type: 'Revenue', description: 'Pendapatan dari penjualan produk atau jasa.' },

    // Expenses
    { id: '5110', name: 'Harga Pokok Penjualan (HPP)', type: 'Expense', description: 'Biaya langsung yang terkait dengan produksi barang yang dijual.' },
    { id: '5210', name: 'Beban Gaji', type: 'Expense', description: 'Biaya gaji dan upah karyawan.' },
    { id: '5220', name: 'Beban Sewa', type: 'Expense', description: 'Biaya sewa untuk kantor atau toko.' },
    { id: '5230', name: 'Beban Utilitas', type: 'Expense', description: 'Biaya listrik, air, dan internet.' },
];

/**
 * Seeds the database with a default chart of accounts.
 * This function is intended to be run once during setup.
 * @returns {Promise<{success: boolean; message: string}>}
 */
export async function seedChartOfAccounts(): Promise<{ success: boolean; message: string }> {
  try {
    const batch = firestore.batch();

    defaultAccounts.forEach(account => {
      // The document ID will be the account number (e.g., '1110')
      const docRef = chartOfAccountsCollection.doc(account.id!);
      batch.set(docRef, {
        name: account.name,
        type: account.type,
        description: account.description,
      });
    });

    await batch.commit();

    console.log('Successfully seeded Chart of Accounts.');
    return { success: true, message: 'Daftar Akun berhasil diinisialisasi.' };
  } catch (error) {
    console.error('Error seeding Chart of Accounts:', error);
    return { success: false, message: 'Gagal menginisialisasi Daftar Akun.' };
  }
}

/**
 * Fetches all entries from the Chart of Accounts.
 * @returns {Promise<ChartOfAccountsEntry[]>} An array of account entries.
 */
export async function getChartOfAccounts(): Promise<ChartOfAccountsEntry[]> {
    try {
        const snapshot = await chartOfAccountsCollection.orderBy('__name__').get();
        if (snapshot.empty) {
            // If empty, let's seed the data
            await seedChartOfAccounts();
            const seededSnapshot = await chartOfAccountsCollection.orderBy('__name__').get();
            return seededSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            } as ChartOfAccountsEntry));
        }
        const accounts: ChartOfAccountsEntry[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as ChartOfAccountsEntry));
        return accounts;

    } catch (error) {
        console.error('Error getting chart of accounts:', error);
        throw new Error('Gagal mengambil data Daftar Akun dari server.');
    }
}

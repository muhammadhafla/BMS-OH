
'use server';

import { firestore } from '@/lib/firebase-admin';
import type { User } from '@/lib/types';

// In a real application, this data would be in a 'users' collection in Firestore.
// For this demo, we use a hardcoded list to simulate fetching user data.
// This data should ideally be consistent with what's in `src/app/(app)/settings/page.tsx`
const allUsers: User[] = [
  { id: 'user_admin_001', name: 'Pengguna Admin', email: 'admin@bms.app', role: 'admin', salaryType: 'Bulanan', baseSalary: 10000000 },
  { id: 'user_manager_001', name: 'Pengguna Manajer', email: 'manager@bms.app', role: 'manager', salaryType: 'Bulanan', baseSalary: 7500000 },
  { id: 'user_staff_001', name: 'Pengguna Staf', email: 'staff@bms.app', role: 'staff', salaryType: 'Per Jam', baseSalary: 50000 },
  { id: 'user_staff_002', name: 'Karyawan Baru', email: 'new@bms.app', role: 'staff', salaryType: 'Bulanan', baseSalary: 4000000 },
];

/**
 * Fetches all users with their salary information.
 * This is a simulation and reads from a hardcoded array.
 * @returns {Promise<User[]>} A promise that resolves to an array of users.
 */
export async function getAllUsersWithSalary(): Promise<User[]> {
  try {
    // Simulate an async database call
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real app, you would fetch from Firestore like this:
    /*
    const usersCollection = firestore.collection('users'); //perlu diganti//
    const snapshot = await usersCollection.get(); //perlu diganti//
    if (snapshot.empty) { //perlu diganti//
      return [];
    }
    const users: User[] = snapshot.docs.map(doc => ({ //perlu diganti//
      id: doc.id,
      ...doc.data()
    } as User));
    return users;
    */
    
    return allUsers;

  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error("Gagal mengambil data karyawan dari server.");
  }
}

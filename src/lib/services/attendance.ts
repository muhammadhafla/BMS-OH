
'use server';

import { firestore } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AttendanceEntry } from '@/lib/types';

const attendanceCollection = firestore.collection('attendance'); //perlu diganti//

interface RecordAttendanceInput {
  type: 'clock-in' | 'clock-out';
  employeeId: string;
  employeeName: string;
  location: string;
  photoDataUri: string;
  entryId?: string | null; // ID of the entry to update (for clock-out)
}

/**
 * Records a clock-in or clock-out event.
 * For clock-in, it creates a new document.
 * For clock-out, it updates an existing document.
 * @param {RecordAttendanceInput} input - The attendance data.
 * @returns {Promise<{success: boolean; entryId?: string; error?: string}>} Result of the operation.
 */
export async function recordAttendance({
  type,
  employeeId,
  employeeName,
  location,
  photoDataUri,
  entryId,
}: RecordAttendanceInput): Promise<{success: boolean; entryId?: string; error?: string}> {
  try {
    if (type === 'clock-in') {
      const newEntryRef = attendanceCollection.doc(); //perlu diganti//
      const newEntry: Omit<AttendanceEntry, 'id'> = {
        employeeId,
        employeeName,
        clockIn: FieldValue.serverTimestamp(),
        clockOut: null,
        status: 'Hadir',
        location,
        photoIn: photoDataUri,
        photoOut: null,
      };
      await newEntryRef.set(newEntry); //perlu diganti//
      return { success: true, entryId: newEntryRef.id };
    } else if (type === 'clock-out') {
      if (!entryId) {
        throw new Error('ID Entri dibutuhkan untuk clock-out.');
      }
      const entryRef = attendanceCollection.doc(entryId); //perlu diganti//
      await entryRef.update({ //perlu diganti//
        clockOut: FieldValue.serverTimestamp(),
        photoOut: photoDataUri,
      });
      return { success: true, entryId };
    } else {
      throw new Error('Tipe absensi tidak valid.');
    }
  } catch (error) {
    console.error('Error recording attendance:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Terjadi kesalahan saat mencatat absensi di server.' };
  }
}


/**
 * Fetches attendance history for a specific user.
 * @param {string} employeeId - The ID of the employee.
 * @returns {Promise<AttendanceEntry[]>} An array of attendance entries.
 */
export async function getAttendanceHistoryForUser(employeeId: string): Promise<AttendanceEntry[]> {
    if (!employeeId) return [];
    
    try {
        const snapshot = await attendanceCollection //perlu diganti//
            .where('employeeId', '==', employeeId)
            .orderBy('clockIn', 'desc')
            .get();

        if (snapshot.empty) { //perlu diganti//
            return [];
        }

        const history: AttendanceEntry[] = snapshot.docs.map(doc => { //perlu diganti//
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            } as AttendanceEntry;
        });

        return history;

    } catch (error) {
        console.error('Error getting attendance history:', error);
        throw new Error('Gagal mengambil riwayat absensi dari server.');
    }
}


'use server';

// This is a placeholder service that mimics the real one but uses dummy data.
// In a real application, this file would interact with Firestore.

import type { Conversation, Message, User } from '@/lib/types';
import { getAllUsersWithSalary } from './user';

interface ParticipantDetails {
    [key: string]: string; // userId: userName
}

/**
 * Fetches the names for a list of participant IDs.
 * @param {string[]} participantIds - Array of user IDs.
 * @returns {Promise<ParticipantDetails>} An object mapping user IDs to names.
 */
export async function getParticipantDetails(participantIds: string[]): Promise<ParticipantDetails> {
    const users = await getAllUsersWithSalary();
    const details: ParticipantDetails = {};
    participantIds.forEach(id => {
        const user = users.find(u => u.id === id);
        details[id] = user ? user.name : 'Pengguna Tidak Dikenal';
    });
    return details;
}

/**
 * Sends a message to a conversation. (Simulated)
 */
export async function sendMessage({
    conversationId,
    senderId,
    text,
}: {
    conversationId: string;
    senderId: string;
    text: string;
}): Promise<{success: boolean; conversationId?: string; error?: string}> {
    
    console.log(`(Simulated) Sending message: "${text}" to conversation ${conversationId} from ${senderId}`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real app, this would interact with Firestore.
    // For now, we just return success. The client-side state is handled optimistically.
    return { success: true, conversationId: conversationId };
}

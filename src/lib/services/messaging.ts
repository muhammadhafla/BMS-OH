
'use server';

import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Conversation, Message, User } from '@/lib/types';
import { getAllUsersWithSalary } from './user';

const conversationsCollection = firestore.collection('conversations');

interface ParticipantDetails {
    [key: string]: string; // userId: userName
}

/**
 * Fetches the names for a list of participant IDs.
 * @param {string[]} participantIds - Array of user IDs.
 * @returns {Promise<ParticipantDetails>} An object mapping user IDs to names.
 */
export async function getParticipantDetails(participantIds: string[]): Promise<ParticipantDetails> {
    const users = await getAllUsersWithSalary(); // This is our simulated user fetch
    const details: ParticipantDetails = {};
    participantIds.forEach(id => {
        const user = users.find(u => u.id === id);
        details[id] = user ? user.name : 'Pengguna Tidak Dikenal';
    });
    return details;
}


/**
 * Sends a message to a conversation, creating the conversation if it doesn't exist.
 * @param {string} conversationId - The ID of the conversation.
 * @param {string[]} participantIds - Array of user IDs in the conversation.
 * @param {ParticipantDetails} participantDetails - Object mapping participant IDs to their names.
 * @param {string} senderId - The ID of the message sender.
 * @param {string} senderName - The name of the message sender.
 * @param {string} text - The message content.
 * @returns {Promise<{success: boolean; conversationId?: string; error?: string}>}
 */
export async function sendMessage({
    conversationId,
    participantIds,
    participantDetails,
    senderId,
    senderName,
    text,
    groupName
}: {
    conversationId: string;
    participantIds: string[];
    participantDetails: ParticipantDetails;
    senderId: string;
    senderName: string;
    text: string;
    groupName?: string;
}): Promise<{success: boolean; conversationId?: string; error?: string}> {
    
    const conversationRef = conversationsCollection.doc(conversationId);
    const messageRef = conversationRef.collection('messages').doc();

    try {
        await firestore.runTransaction(async (transaction) => {
            const convDoc = await transaction.get(conversationRef);

            const lastMessage = {
                text,
                timestamp: FieldValue.serverTimestamp(),
                senderId,
            };

            const newMessage: Omit<Message, 'id' | 'timestamp'> = {
                conversationId,
                senderId,
                senderName,
                text,
                readBy: [senderId],
            };

            if (!convDoc.exists) {
                // If conversation doesn't exist, create it
                const conversationData: Partial<Conversation> = {
                    participants: participantIds,
                    participantNames: participantDetails,
                    lastMessage,
                    createdAt: FieldValue.serverTimestamp(),
                    unreadCounts: {}, // Initialize unread counts
                };

                if (participantIds.length > 2) {
                    conversationData.name = groupName || `Grup dari ${senderName}`;
                    conversationData.isGroup = true;
                }

                transaction.set(conversationRef, conversationData);
            } else {
                // If it exists, just update the last message
                transaction.update(conversationRef, { lastMessage });
            }

            // Add the new message to the messages subcollection
            transaction.set(messageRef, {
                ...newMessage,
                timestamp: FieldValue.serverTimestamp(),
            });
        });

        return { success: true, conversationId: conversationId };

    } catch (error) {
        console.error("Error sending message:", error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: "Gagal mengirim pesan." };
    }
}

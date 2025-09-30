'use server';

import { firestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Conversation, Message } from '@/lib/types';

const conversationsCollection = firestore.collection('conversations');

/**
 * Sends a message to a conversation, creating the conversation if it doesn't exist.
 * @param {string[]} participantIds - Array of user IDs in the conversation.
 * @param {string} senderId - The ID of the message sender.
 * @param {string} senderName - The name of the message sender.
 * @param {string} text - The message content.
 * @returns {Promise<{success: boolean; conversationId?: string; error?: string}>}
 */
export async function sendMessage({
    participantIds,
    senderId,
    senderName,
    text
}: {
    participantIds: string[],
    senderId: string,
    senderName: string,
    text: string
}): Promise<{success: boolean; conversationId?: string; error?: string}> {
    
    // Sort participant IDs to create a consistent conversation ID
    const sortedParticipantIds = [...participantIds].sort();
    const conversationId = sortedParticipantIds.join('_');

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
                 const participantNames = {
                    // This is a placeholder. In a real app, you'd fetch names from a users collection.
                    [senderId]: senderName,
                 };
                 // Assume other participant names need to be fetched or are passed in.
                 // For now, we'll just use IDs.
                 participantIds.forEach(id => {
                    if (!participantNames[id]) {
                        participantNames[id] = id; // Fallback to ID
                    }
                 });


                transaction.set(conversationRef, {
                    participants: sortedParticipantIds,
                    participantNames,
                    lastMessage,
                    createdAt: FieldValue.serverTimestamp(),
                    unreadCounts: {} // Initialize unread counts
                });
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
        return { success: false, error: "Failed to send message." };
    }
}

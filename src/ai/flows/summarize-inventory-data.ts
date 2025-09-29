// Summarize key inventory data (e.g., total value, low-stock items) using AI.

'use server';

/**
 * @fileOverview Summarizes key inventory data using AI to provide a quick overview of inventory status.
 *
 * - summarizeInventoryData - A function that takes inventory data as input and returns a summary.
 * - SummarizeInventoryDataInput - The input type for the summarizeInventoryData function.
 * - SummarizeInventoryDataOutput - The return type for the summarizeInventoryData function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeInventoryDataInputSchema = z.object({
  inventoryData: z.string().describe('JSON string of the current inventory data.'),
});
export type SummarizeInventoryDataInput = z.infer<typeof SummarizeInventoryDataInputSchema>;

const SummarizeInventoryDataOutputSchema = z.object({
  summary: z.string().describe('A summary of the key inventory data, including total value and low-stock items.'),
});
export type SummarizeInventoryDataOutput = z.infer<typeof SummarizeInventoryDataOutputSchema>;

export async function summarizeInventoryData(input: SummarizeInventoryDataInput): Promise<SummarizeInventoryDataOutput> {
  return summarizeInventoryDataFlow(input);
}

const summarizeInventoryDataPrompt = ai.definePrompt({
  name: 'summarizeInventoryDataPrompt',
  input: {schema: SummarizeInventoryDataInputSchema},
  output: {schema: SummarizeInventoryDataOutputSchema},
  prompt: `You are an AI assistant helping an inventory manager understand their inventory status quickly.\n\n  Summarize the key information from the following inventory data, including the total value of the inventory and any items that are low in stock. Be concise and focus on the most important insights.\n\n  Inventory Data: {{{inventoryData}}}`,
});

const summarizeInventoryDataFlow = ai.defineFlow(
  {
    name: 'summarizeInventoryDataFlow',
    inputSchema: SummarizeInventoryDataInputSchema,
    outputSchema: SummarizeInventoryDataOutputSchema,
  },
  async input => {
    const {output} = await summarizeInventoryDataPrompt(input);
    return output!;
  }
);

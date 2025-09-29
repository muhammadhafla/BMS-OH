'use server';

/**
 * @fileOverview A flow for extracting items from a receipt image using OCR.
 *
 * - extractReceiptItems - A function that takes a receipt image and returns a list of purchase items.
 * - ExtractReceiptItemsInput - The input type for the extractReceiptItems function.
 * - ExtractReceiptItemsOutput - The return type for the extractReceiptItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { PurchaseItem } from '@/lib/types';


const ExtractReceiptItemsInputSchema = z.object({
  receiptImage: z
    .string()
    .describe(
      "A photo of a purchase receipt, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractReceiptItemsInput = z.infer<typeof ExtractReceiptItemsInputSchema>;

const PurchaseItemSchema = z.object({
    productName: z.string().describe("The name of the purchased product."),
    quantity: z.number().describe("The quantity of the product purchased."),
    purchasePrice: z.number().describe("The price of a single unit of the product."),
    total: z.number().describe("The total price for this line item (quantity * purchasePrice)."),
    unit: z.string().describe("The unit of the product (e.g., 'pcs', 'kg', 'box'). Infer if not present.").optional(),
});

const ExtractReceiptItemsOutputSchema = z.object({
  items: z.array(PurchaseItemSchema).describe("An array of items extracted from the receipt."),
});
export type ExtractReceiptItemsOutput = z.infer<typeof ExtractReceiptItemsOutputSchema>;


export async function extractReceiptItems(
  input: ExtractReceiptItemsInput
): Promise<ExtractReceiptItemsOutput> {
  return extractReceiptItemsFlow(input);
}


const prompt = ai.definePrompt({
  name: 'extractReceiptItemsPrompt',
  input: {schema: ExtractReceiptItemsInputSchema},
  output: {schema: ExtractReceiptItemsOutputSchema},
  prompt: `You are an intelligent data entry assistant for an inventory management system. Your task is to extract all line items from the provided receipt image.

Analyze the receipt image: {{media url=receiptImage}}

For each item, identify its name, quantity, and the price per unit. If only a total price is available for a line item with a quantity greater than one, calculate the per-unit price. Determine the total price for the line item.

Return the extracted information as a structured JSON array of items. Infer the unit of measurement if it's not explicitly stated (default to 'pcs').

Important:
- Only include items that are clearly identifiable as products.
- Ignore taxes, discounts, totals, and other non-product lines.
- Ensure all numbers (quantity, price, total) are returned as numeric types, not strings.
`,
});

const extractReceiptItemsFlow = ai.defineFlow(
  {
    name: 'extractReceiptItemsFlow',
    inputSchema: ExtractReceiptItemsInputSchema,
    outputSchema: ExtractReceiptItemsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

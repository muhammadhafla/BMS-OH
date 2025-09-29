'use server';

/**
 * @fileOverview A flow for generating descriptions for new inventory items.
 *
 * - generateItemDescription - A function that generates item descriptions based on a photo or keywords.
 * - GenerateItemDescriptionInput - The input type for the generateItemDescription function.
 * - GenerateItemDescriptionOutput - The return type for the generateItemDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateItemDescriptionInputSchema = z.object({
  photoDataUri: z
    .string()
    .optional()
    .describe(
      "A photo of the inventory item, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  keywords: z.string().optional().describe('Keywords describing the inventory item.'),
});
export type GenerateItemDescriptionInput = z.infer<
  typeof GenerateItemDescriptionInputSchema
>;

const GenerateItemDescriptionOutputSchema = z.object({
  description: z.string().describe('A detailed description of the inventory item.'),
});
export type GenerateItemDescriptionOutput = z.infer<
  typeof GenerateItemDescriptionOutputSchema
>;

export async function generateItemDescription(
  input: GenerateItemDescriptionInput
): Promise<GenerateItemDescriptionOutput> {
  return generateItemDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateItemDescriptionPrompt',
  input: {schema: GenerateItemDescriptionInputSchema},
  output: {schema: GenerateItemDescriptionOutputSchema},
  prompt: `You are an inventory management expert. Generate a detailed and engaging description for a new inventory item based on the provided information.

  {{#if photoDataUri}}
  Here is a photo of the item: {{media url=photoDataUri}}
  {{/if}}

  {{#if keywords}}
  Here are some keywords describing the item: {{{keywords}}}
  {{/if}}

  Please provide a description that highlights the item's key features, benefits, and any relevant specifications. The description should be suitable for use in an online store or inventory management system.
`,
});

const generateItemDescriptionFlow = ai.defineFlow(
  {
    name: 'generateItemDescriptionFlow',
    inputSchema: GenerateItemDescriptionInputSchema,
    outputSchema: GenerateItemDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

import Anthropic from '@anthropic-ai/sdk';
import { CATEGORIES_DATA } from '@/config/categories';
import { env } from '@/config/env';

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

export const getCategoryIdForOpenFoodFactsItem = async ({
  productName,
  brand,
  userCategories,
}: {
  productName: string;
  brand: string;
  userCategories: string[];
}) => {
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 50,
    system: [
      {
        type: 'text',
        text: `You are an expert product categorization system.

CATEGORIZATION STRATEGY:
1. Product name is MOST RELIABLE: Trust the product name and brand over user-submitted categories
2. User categories are OFTEN WRONG: The user categories can be inaccurate, misleading, or too generic
3. Start SPECIFIC: Always prefer the most specific category that accurately describes the product
4. Consider the hierarchy: Match to the deepest path possible (e.g., Fresh Food > Dairy > Milk > Whole Milk)
5. Brand context matters: "Activia" = yogurt, "Innocent" = juice/smoothies, "Alpro" = plant-based

AVAILABLE CATEGORIES:
${CATEGORIES_DATA}

Return ONLY the category ID number (e.g., 88). Nothing else.`,
      },
      {
        type: 'text',
        text: CATEGORIES_DATA,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Product Name: ${productName}
Brand: ${brand}
User Categories: ${userCategories.join(', ')}

IMPORTANT: The user categories may be wrong. Base your decision primarily on the product name and brand.

Return only the category ID number.`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock?.text.trim();
};

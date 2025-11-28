import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

class TokenTracker {
  constructor() {
    this.totalTokens = 0;
    this.inputTokens = 0;
    this.outputTokens = 0;
  }

  add(usage) {
    if (usage) {
      this.totalTokens += usage.total_tokens || 0;
      this.inputTokens += usage.prompt_tokens || 0;
      this.outputTokens += usage.completion_tokens || 0;
    }
  }

  getUsage() {
    return {
      total_tokens: this.totalTokens,
      input_tokens: this.inputTokens,
      output_tokens: this.outputTokens
    };
  }
}

const getSystemPrompt = () => `You are an expert bill/invoice data extractor. Your task is to extract all line items from the bill image provided.

IMPORTANT INSTRUCTIONS:
1. Extract EVERY line item visible in the bill - do not miss any entries
2. Do NOT double count items - each item should appear only once
3. Identify the page type: "Bill Detail" (itemized charges), "Final Bill" (summary page), or "Pharmacy" (medicine bills)
4. For each item, extract:
   - item_name: The exact name as it appears in the bill
   - item_amount: The net/final amount for that item (after any discounts)
   - item_rate: The unit rate/price per item (if visible, otherwise use item_amount)
   - item_quantity: The quantity (if visible, otherwise use 1)

5. Handle different bill formats:
   - Hospital bills: Look for room charges, doctor fees, procedures, tests, medicines
   - Pharmacy bills: Look for medicine names, quantities, prices
   - Lab bills: Look for test names and charges

6. IGNORE summary totals, subtotals, tax lines, and grand totals - only extract actual line items
7. If item_rate or item_quantity is not visible, derive them logically (amount = rate × quantity)

Return the data in this exact JSON format:
{
  "page_type": "Bill Detail | Final Bill | Pharmacy",
  "bill_items": [
    {
      "item_name": "string",
      "item_amount": float,
      "item_rate": float,
      "item_quantity": float
    }
  ]
}

Return ONLY valid JSON, no additional text.`;

const extractPageItems = async (pageData, tokenTracker) => {
  const systemPrompt = getSystemPrompt();
  const userPrompt = `Extract all line items from this bill image (Page ${pageData.pageNumber}). Return ONLY the JSON object with page_type and bill_items array.`;

  try {
    const imageContent = {
      type: 'image_url',
      image_url: {
        url: `data:${pageData.type};base64,${pageData.base64}`,
        detail: 'high'
      }
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userPrompt },
            imageContent
          ]
        }
      ],
      max_tokens: 4096,
      temperature: 0.1
    });

    tokenTracker.add(response.usage);

    const content = response.choices[0].message.content;
    
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse LLM response:', content);
      parsed = { page_type: 'Bill Detail', bill_items: [] };
    }

    return {
      page_no: String(pageData.pageNumber),
      page_type: parsed.page_type || 'Bill Detail',
      bill_items: (parsed.bill_items || []).map(item => ({
        item_name: String(item.item_name || ''),
        item_amount: parseFloat(item.item_amount) || 0,
        item_rate: parseFloat(item.item_rate) || parseFloat(item.item_amount) || 0,
        item_quantity: parseFloat(item.item_quantity) || 1
      }))
    };

  } catch (error) {
    console.error(`Error extracting items from page ${pageData.pageNumber}:`, error);
    return {
      page_no: String(pageData.pageNumber),
      page_type: 'Bill Detail',
      bill_items: []
    };
  }
};

const deduplicateItems = async (pagewiseItems, tokenTracker) => {
  if (pagewiseItems.length <= 1) {
    return pagewiseItems;
  }

  const allItems = [];
  pagewiseItems.forEach(page => {
    page.bill_items.forEach(item => {
      allItems.push({
        page_no: page.page_no,
        page_type: page.page_type,
        ...item
      });
    });
  });

  if (allItems.length <= 5) {
    return pagewiseItems;
  }

  const deduplicationPrompt = `Analyze these bill items from multiple pages and identify any DUPLICATE entries that should be removed to avoid double counting.

Items:
${JSON.stringify(allItems, null, 2)}

Rules:
1. Items with the same or very similar names AND same amounts are likely duplicates
2. Summary pages (Final Bill) often repeat items from detail pages - mark those for removal
3. Keep items from detail pages, remove duplicates from summary pages
4. Pharmacy items might have same medicine name but different quantities - these are NOT duplicates

Return a JSON array of objects to KEEP (remove duplicates), maintaining the original structure:
{
  "items_to_keep": [
    {
      "page_no": "string",
      "page_type": "string",
      "item_name": "string",
      "item_amount": float,
      "item_rate": float,
      "item_quantity": float
    }
  ]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: deduplicationPrompt }
      ],
      max_tokens: 4096,
      temperature: 0.1
    });

    tokenTracker.add(response.usage);

    const content = response.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const itemsToKeep = parsed.items_to_keep || [];

      const deduplicatedPages = pagewiseItems.map(page => ({
        page_no: page.page_no,
        page_type: page.page_type,
        bill_items: itemsToKeep
          .filter(item => item.page_no === page.page_no)
          .map(item => ({
            item_name: item.item_name,
            item_amount: item.item_amount,
            item_rate: item.item_rate,
            item_quantity: item.item_quantity
          }))
      }));

      return deduplicatedPages;
    }
  } catch (error) {
    console.error('Error in deduplication:', error);
  }

  return pagewiseItems;
};

export const extractLineItems = async (processedPages) => {
  const tokenTracker = new TokenTracker();

  let pagewiseResults = [];

  for (const page of processedPages) {
    const pageResult = await extractPageItems(page, tokenTracker);
    pagewiseResults.push(pageResult);
  }

  const deduplicatedResults = await deduplicateItems(pagewiseResults, tokenTracker);

  const totalItemCount = deduplicatedResults.reduce(
    (sum, page) => sum + page.bill_items.length, 
    0
  );

  return {
    token_usage: tokenTracker.getUsage(),
    data: {
      pagewise_line_items: deduplicatedResults,
      total_item_count: totalItemCount
    }
  };
};

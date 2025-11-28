import { processDocument } from '../services/documentProcessor.js';
import { extractLineItems } from '../services/llmService.js';

export const extractBillData = async (req, res) => {
  try {
    const { document } = req.body;

    if (!document) {
      return res.status(400).json({
        is_success: false,
        message: 'Document URL is required'
      });
    }

    const processedPages = await processDocument(document);
    const result = await extractLineItems(processedPages);

    return res.status(200).json({
      is_success: true,
      token_usage: result.token_usage,
      data: result.data
    });

  } catch (error) {
    console.error('Error in extractBillData:', error);
    return res.status(500).json({
      is_success: false,
      message: error.message || 'Failed to process document. Internal server error occurred'
    });
  }
};

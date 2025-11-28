import axios from 'axios';
import { fromBuffer } from 'pdf2pic';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';

const isPdfUrl = (url) => {
  const urlLower = url.toLowerCase();
  return urlLower.includes('.pdf') || urlLower.includes('pdf');
};

const processPdf = async (pdfUrl) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-'));
  
  try {
    const response = await axios.get(pdfUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxContentLength: 100 * 1024 * 1024
    });

    const pdfBuffer = Buffer.from(response.data);
    
    const converter = fromBuffer(pdfBuffer, {
      density: 200,
      saveFilename: 'page',
      savePath: tempDir,
      format: 'png',
      width: 2000,
      height: 2800
    });
    
    const pageInfo = await converter.bulk(-1, { responseType: 'buffer' });

    const images = [];
    
    for (let i = 0; i < pageInfo.length; i++) {
      const imageBuffer = pageInfo[i].buffer;
      
      const optimizedBuffer = await sharp(imageBuffer)
        .png({ quality: 90 })
        .toBuffer();
      
      const base64 = optimizedBuffer.toString('base64');
      
      images.push({
        pageNumber: i + 1,
        base64,
        type: 'image/png'
      });
    }

    return images;
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw new Error(`Failed to process PDF: ${error.message}`);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

const processImage = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000
    });

    const imageBuffer = Buffer.from(response.data);
    
    const optimizedBuffer = await sharp(imageBuffer)
      .png({ quality: 90 })
      .toBuffer();
    
    const base64 = optimizedBuffer.toString('base64');

    return [{
      pageNumber: 1,
      base64,
      type: 'image/png'
    }];
  } catch (error) {
    console.error('Error processing image:', error);
    throw new Error(`Failed to process image: ${error.message}`);
  }
};

export const processDocument = async (documentUrl) => {
  try {
    const isPdf = isPdfUrl(documentUrl);
    
    if (isPdf) {
      return await processPdf(documentUrl);
    } else {
      return await processImage(documentUrl);
    }
  } catch (error) {
    console.error('Error processing document:', error);
    throw new Error(`Failed to process document: ${error.message}`);
  }
};

# 🏥 Bajaj Finserv Health Datathon - Bill Extraction API

> **Submission by Harsh Kumar Verma** | Automated medical bill data extraction using GPT-4 Vision

---

## 📋 Problem Statement

The challenge requires building an intelligent system that can:
- Extract **every line item** from medical bills without missing entries
- Avoid **double-counting** items that appear on multiple pages
- Handle various formats: Hospital bills, Pharmacy invoices, Lab reports
- Return structured JSON matching the specified API schema

## 🎯 My Solution

I built a **multi-stage extraction pipeline** that processes documents through PDF-to-image conversion, GPT-4 Vision analysis, and intelligent deduplication. Unlike traditional OCR, this approach "reads" bills contextually—understanding item relationships, discounts, and page hierarchies.

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 📄 **Multi-format Support** | Handles PDFs (multi-page) and images (PNG, JPEG, WEBP) |
| 🤖 **Vision-based Extraction** | GPT-4o reads bills contextually, not just OCR |
| 🔄 **Smart Deduplication** | Removes duplicate items across summary/detail pages |
| 📊 **Accurate Parsing** | Extracts item_name, item_amount, item_rate, item_quantity |
| ⚡ **Token Tracking** | Reports API usage for cost monitoring |

## 🏗️ Architecture

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│  Document   │───▶│    PDF to    │───▶│  GPT-4      │───▶│   Smart      │
│  URL Input  │    │    Images    │    │  Vision     │    │ Deduplication│
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                          │                   │                   │
                          ▼                   ▼                   ▼
                   GraphicsMagick      Per-page item        Cross-page
                   + Ghostscript        extraction         duplicate removal
```

## 🛠️ Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Runtime | Node.js v18+ | Server environment |
| Framework | Express.js | REST API |
| LLM | OpenAI GPT-4o | Vision-based extraction |
| PDF Processing | pdf2pic | PDF to image conversion |
| Image Optimization | Sharp | Image processing |
| PDF Rendering | GraphicsMagick + Ghostscript | System-level PDF support |

## 📁 Project Structure

```
├── src/
│   ├── index.js                         # Express server setup
│   ├── controllers/
│   │   └── billExtractionController.js  # Request handler
│   ├── routes/
│   │   └── billExtraction.js            # Route definitions
│   └── services/
│       ├── documentProcessor.js         # PDF/Image processing
│       └── llmService.js                # OpenAI integration
├── Dockerfile
├── package.json
└── README.md
```

## 🔌 API Reference

### Endpoint: `POST /extract-bill-data`

Submit a document URL for processing. The API handles downloading, conversion, extraction, and aggregation automatically.

**Request Headers:**
`Content-Type: application/json`

**Request Body:**
```json
{
  "document": "https://example.com/path/to/invoice.pdf"
}
```

**Success Response (200 OK):**
```json
{
  "is_success": true,
  "token_usage": {
    "total_tokens": 1523,
    "input_tokens": 1245,
    "output_tokens": 278
  },
  "data": {
    "pagewise_line_items": [
      {
        "page_no": "1",
        "page_type": "Pharmacy",
        "bill_items": [
          {
            "item_name": "Livi 300mg Tab",
            "item_amount": 448.00,
            "item_rate": 32.00,
            "item_quantity": 14
          }
        ]
      }
    ],
    "total_item_count": 1
  }
}
```

## ⚙️ Setup & Installation

### Prerequisites
Ensure you have **GraphicsMagick** and **Ghostscript** installed on your system for PDF processing.

**macOS:**
```bash
brew install graphicsmagick ghostscript
```

**Ubuntu/Debian:**
```bash
sudo apt-get install graphicsmagick ghostscript
```

### Local Development

1.  **Clone the repository**
    ```bash
    git clone <your-repo-url>
    cd bill-extraction-api
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory:
    ```env
    OPENAI_API_KEY=sk-your-api-key-here
    PORT=3000
    ```

4.  **Start the Server**
    ```bash
    npm run dev
    ```

## 🐳 Docker Deployment

The application is fully containerized. To run it using Docker:

1.  **Build the image**
    ```bash
    docker build -t bill-extractor .
    ```

2.  **Run the container**
    ```bash
    docker run -p 3000:3000 -e OPENAI_API_KEY=your_key bill-extractor
    ```

## 🔍 How It Works

### Stage 1: Document Ingestion
- Accepts document URL (PDF or image)
- Downloads and validates the document

### Stage 2: PDF Processing
- Splits multi-page PDFs into individual pages
- Converts each page to high-resolution PNG (200 DPI)

### Stage 3: Vision-based Extraction
- Sends each page image to GPT-4 Vision
- Extracts: `item_name`, `item_amount`, `item_rate`, `item_quantity`
- Classifies page type: "Bill Detail", "Final Bill", or "Pharmacy"

### Stage 4: Deduplication
- Analyzes items across all pages
- Removes duplicate entries from summary pages

### Stage 5: Response Assembly
- Aggregates pagewise results
- Calculates total item count
- Returns structured JSON

## 📊 Testing Results

| Sample | Pages | Items | Status |
|--------|-------|-------|--------|
| train_sample_1.pdf | 2 | 30 | ✅ |
| train_sample_3.pdf | 1 | 2 | ✅ |
| train_sample_10.pdf | 3 | 17 | ✅ |
| train_sample_11.pdf | 1 | 4 | ✅ |

---

**Author**: Harsh Kumar Verma
**Event**: Bajaj Finserv Health Datathon 2025

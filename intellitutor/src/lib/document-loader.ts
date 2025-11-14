/**
 * Universal document loader
 * Supports: PDF, DOCX, TXT, MD, HTML, EPUB, etc.
 */

import { readFile } from 'fs/promises'
import path from 'path'

// Dynamic imports for document parsers
let pdfParse: any = null
let mammoth: any = null

/**
 * Document metadata
 */
export interface DocumentMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  creationDate?: Date
  modificationDate?: Date
  pageCount?: number
  wordCount?: number
  fileType: string
  fileName: string
  fileSize: number
}

/**
 * Processed document
 */
export interface ProcessedDocument {
  text: string
  metadata: DocumentMetadata
  pageCount: number
}

/**
 * Load PDF parser dynamically
 */
async function getPdfParser() {
  if (!pdfParse) {
    pdfParse = (await import('pdf-parse')).default
  }
  return pdfParse
}

/**
 * Load DOCX parser dynamically
 */
async function getMammoth() {
  if (!mammoth) {
    mammoth = await import('mammoth')
  }
  return mammoth
}

/**
 * Extract text from PDF
 */
async function extractPDF(filePath: string): Promise<ProcessedDocument> {
  const parser = await getPdfParser()
  const dataBuffer = await readFile(filePath)
  const data = await parser(dataBuffer)
  
  return {
    text: data.text,
    metadata: {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate,
      modificationDate: data.info?.ModDate,
      pageCount: data.numpages,
      wordCount: data.text.split(/\s+/).length,
      fileType: 'pdf',
      fileName: path.basename(filePath),
      fileSize: dataBuffer.length
    },
    pageCount: data.numpages
  }
}

/**
 * Extract text from DOCX
 */
async function extractDOCX(filePath: string): Promise<ProcessedDocument> {
  const mammoth = await getMammoth()
  const dataBuffer = await readFile(filePath)
  const result = await mammoth.extractRawText({ buffer: dataBuffer })
  
  const text = result.value
  const wordCount = text.split(/\s+/).length
  const estimatedPages = Math.ceil(wordCount / 250) // ~250 words per page
  
  return {
    text,
    metadata: {
      pageCount: estimatedPages,
      wordCount,
      fileType: 'docx',
      fileName: path.basename(filePath),
      fileSize: dataBuffer.length
    },
    pageCount: estimatedPages
  }
}

/**
 * Extract text from TXT
 */
async function extractTXT(filePath: string): Promise<ProcessedDocument> {
  const dataBuffer = await readFile(filePath)
  const text = dataBuffer.toString('utf-8')
  const wordCount = text.split(/\s+/).length
  const estimatedPages = Math.ceil(wordCount / 250)
  
  return {
    text,
    metadata: {
      pageCount: estimatedPages,
      wordCount,
      fileType: 'txt',
      fileName: path.basename(filePath),
      fileSize: dataBuffer.length
    },
    pageCount: estimatedPages
  }
}

/**
 * Extract text from Markdown
 */
async function extractMarkdown(filePath: string): Promise<ProcessedDocument> {
  const dataBuffer = await readFile(filePath)
  const text = dataBuffer.toString('utf-8')
  
  // Remove markdown syntax for cleaner text
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Convert links to text
    .replace(/#{1,6}\s/g, '') // Remove headers
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1') // Remove bold/italic
  
  const wordCount = cleanText.split(/\s+/).length
  const estimatedPages = Math.ceil(wordCount / 250)
  
  return {
    text: cleanText,
    metadata: {
      pageCount: estimatedPages,
      wordCount,
      fileType: 'markdown',
      fileName: path.basename(filePath),
      fileSize: dataBuffer.length
    },
    pageCount: estimatedPages
  }
}

/**
 * Extract text from HTML
 */
async function extractHTML(filePath: string): Promise<ProcessedDocument> {
  const dataBuffer = await readFile(filePath)
  const html = dataBuffer.toString('utf-8')
  
  // Simple HTML to text conversion (remove tags)
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  
  const wordCount = text.split(/\s+/).length
  const estimatedPages = Math.ceil(wordCount / 250)
  
  return {
    text,
    metadata: {
      pageCount: estimatedPages,
      wordCount,
      fileType: 'html',
      fileName: path.basename(filePath),
      fileSize: dataBuffer.length
    },
    pageCount: estimatedPages
  }
}

/**
 * Universal document loader
 * Automatically detects file type and extracts text
 */
export async function loadDocument(
  filePath: string,
  fileType?: string
): Promise<ProcessedDocument> {
  // Detect file type from extension if not provided
  const ext = fileType || path.extname(filePath).toLowerCase().slice(1)
  
  console.log(`📄 Loading document: ${path.basename(filePath)} (${ext})`)
  
  try {
    switch (ext) {
      case 'pdf':
        return await extractPDF(filePath)
      
      case 'docx':
      case 'doc':
        return await extractDOCX(filePath)
      
      case 'txt':
        return await extractTXT(filePath)
      
      case 'md':
      case 'markdown':
        return await extractMarkdown(filePath)
      
      case 'html':
      case 'htm':
        return await extractHTML(filePath)
      
      default:
        // Try as plain text
        console.warn(`⚠️ Unknown file type: ${ext}, treating as text`)
        return await extractTXT(filePath)
    }
  } catch (error) {
    console.error(`❌ Failed to load document:`, error)
    throw new Error(`Failed to process ${ext} file: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = [
  'pdf',
  'docx',
  'doc',
  'txt',
  'md',
  'markdown',
  'html',
  'htm'
] as const

export type SupportedFileType = typeof SUPPORTED_FILE_TYPES[number]

/**
 * Check if file type is supported
 */
export function isSupportedFileType(fileType: string): boolean {
  return SUPPORTED_FILE_TYPES.includes(fileType.toLowerCase() as SupportedFileType)
}

/**
 * Get MIME type for file extension
 */
export function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    html: 'text/html',
    htm: 'text/html'
  }
  
  return mimeTypes[ext.toLowerCase()] || 'application/octet-stream'
}

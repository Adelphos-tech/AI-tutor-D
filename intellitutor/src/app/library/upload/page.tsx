'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, X, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200MB
const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/msword': ['.doc'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md', '.markdown'],
  'text/html': ['.html', '.htm'],
  'application/epub+zip': ['.epub']
}

export default function UploadPage() {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    
    if (acceptedFiles.length === 0) {
      setError('Please select a valid file (PDF, DOCX, DOC, TXT, MD, HTML, or EPUB)')
      return
    }

    const selectedFile = acceptedFiles[0]
    
    // Validate file size
    if (selectedFile.size === 0) {
      setError('File is empty. Please select a valid file.')
      return
    }
    
    if (selectedFile.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 200MB limit. Your file is ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }
    
    // Validate filename
    if (selectedFile.name.length > 255) {
      setError('Filename is too long. Please rename the file (max 255 characters).')
      return
    }
    
    // Check for special characters that might cause issues
    const invalidChars = /[<>:"|?*\x00-\x1F]/
    if (invalidChars.test(selectedFile.name)) {
      setError('Filename contains invalid characters. Please rename the file.')
      return
    }

    setFile(selectedFile)
    setRetryCount(0)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    multiple: false
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      
      // Create abort controller for cancellation
      abortControllerRef.current = new AbortController()

      // Simulate upload progress
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      
      progressIntervalRef.current = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
            return 90
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/materials/upload', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      })

      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      
      setUploading(false)
      setProcessing(true)

      // Processing timeout
      const timeout1 = setTimeout(() => {
        setProcessing(false)
        setSuccess(true)
        
        const timeout2 = setTimeout(() => {
          router.push(`/material/${data.id}`)
        }, 2000)
        timeoutsRef.current.push(timeout2)
      }, 3000)
      timeoutsRef.current.push(timeout1)

    } catch (err: unknown) {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Upload cancelled.')
      } else if (err instanceof Error && err.message.includes('Failed to fetch')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'
        setError(message)
      }
      
      setUploading(false)
      setUploadProgress(0)
      setRetryCount(prev => prev + 1)
    }
  }

  const removeFile = () => {
    // Cancel upload if in progress
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    setFile(null)
    setError(null)
    setUploadProgress(0)
    setUploading(false)
    setProcessing(false)
  }
  
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    
    setUploading(false)
    setProcessing(false)
    setUploadProgress(0)
    setError('Upload cancelled by user.')
  }
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      const timers = [...timeoutsRef.current]
      timers.forEach(timeout => clearTimeout(timeout))
      timeoutsRef.current = []
      abortControllerRef.current?.abort()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/library">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Upload Textbook</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Upload your textbook and let AI transform it into an interactive learning experience
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Upload Your Textbook</CardTitle>
            <CardDescription>
              Supported formats: PDF, DOCX, TXT, EPUB • Max size: 200MB
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dropzone */}
            {!file && !success && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                {isDragActive ? (
                  <p className="text-lg font-medium text-blue-600 dark:text-blue-400">
                    Drop your file here
                  </p>
                ) : (
                  <>
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Drag and drop your textbook here
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      or click to browse files
                    </p>
                    <Button type="button" variant="outline">
                      Select File
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* File Preview */}
            {file && !success && (
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <FileText className="w-10 h-10 text-blue-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  {!uploading && !processing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={removeFile}
                      className="text-gray-500 hover:text-red-600"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>

                {/* Upload Progress */}
                {(uploading || processing) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {uploading ? 'Uploading...' : 'Processing your textbook...'}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {uploading ? `${uploadProgress}%` : ''}
                      </span>
                    </div>
                    <Progress value={uploadProgress} className="h-2" />
                    {processing && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        This usually takes 2-3 minutes. We&apos;re extracting text, generating summaries, and creating your study guide.
                      </p>
                    )}
                    {uploading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelUpload}
                        className="w-full"
                      >
                        Cancel Upload
                      </Button>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    {retryCount > 0 && retryCount < 3 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Attempt {retryCount} of 3
                      </p>
                    )}
                  </div>
                )}

                {/* Upload Button */}
                {!uploading && !processing && (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpload}
                      size="lg"
                      className="flex-1"
                      disabled={!file}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {error && retryCount > 0 ? 'Retry Upload' : 'Upload and Process'}
                    </Button>
                    {error && retryCount > 0 && (
                      <Button
                        onClick={removeFile}
                        size="lg"
                        variant="outline"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Success State */}
            {success && (
              <div className="text-center py-8">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Upload Successful!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your textbook has been processed and is ready to use.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Redirecting to your material...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <InfoCard
            title="OCR Support"
            description="Scanned PDFs are automatically processed with OCR technology"
          />
          <InfoCard
            title="Fast Processing"
            description="Most textbooks are ready in 2-3 minutes"
          />
          <InfoCard
            title="Secure & Private"
            description="Your documents are encrypted and never shared"
          />
        </div>
      </div>
    </div>
  )
}

function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </CardContent>
    </Card>
  )
}

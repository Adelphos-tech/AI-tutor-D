'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Upload, Search, BookOpen, Star, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Material {
  id: string
  title: string
  author: string | null
  uploadDate: string
  processingStatus: string
  pageCount: number | null
  isFavorite: boolean
  categories: string[]
}

export default function LibraryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMaterials()
  }, [])

  const fetchMaterials = async () => {
    try {
      const response = await fetch('/api/materials')
      if (response.ok) {
        const data = await response.json()
        setMaterials(data)
      }
    } catch (error) {
      console.error('Error fetching materials:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (materialId: string, materialTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${materialTitle}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/materials/${materialId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from local state
        setMaterials(materials.filter(m => m.id !== materialId))
        alert('Material deleted successfully')
      } else {
        const data = await response.json()
        alert(`Failed to delete: ${data.error}`)
      }
    } catch (error) {
      console.error('Error deleting material:', error)
      alert('Failed to delete material')
    }
  }

  const categories = ['All', ...Array.from(new Set(materials.flatMap(m => m.categories)))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading your library...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Library</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {materials.length} textbook{materials.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link href="/library/upload">
              <Button size="lg">
                <Upload className="w-4 h-4 mr-2" />
                Upload Textbook
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search your library..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Materials Grid */}
        {materials.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {materials.map((material) => (
              <MaterialCard 
                key={material.id} 
                material={material} 
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MaterialCard({ material, onDelete }: { material: Material; onDelete: (id: string, title: string) => void }) {
  const status = material.processingStatus ?? 'PROCESSING'
  const isReady = status === 'READY'
  const isProcessing = status === 'PROCESSING'
  const badgeLabel = isReady ? 'Ready' : status === 'ERROR' ? 'Error' : 'Processing...'
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
              <Link href={`/material/${material.id}`}>
                {material.title}
              </Link>
            </CardTitle>
            <CardDescription className="mt-1">{material.author}</CardDescription>
          </div>
          <div className="flex gap-1">
            {material.isFavorite && (
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Star className="w-4 h-4 mr-2" />
                  {material.isFavorite ? 'Unfavorite' : 'Favorite'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => onDelete(material.id, material.title)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Status Badge */}
          <div>
            <Badge
              variant={isReady ? 'default' : status === 'ERROR' ? 'destructive' : 'secondary'}
              className={isProcessing ? 'animate-pulse' : ''}
            >
              {badgeLabel}
            </Badge>
          </div>

          {/* Metadata */}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>{material.pageCount || 0} pages</span>
            </div>
            <div>
              Uploaded {new Date(material.uploadDate).toLocaleDateString()}
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-1 flex-wrap">
            {material.categories.map((cat: string) => (
              <Badge key={cat} variant="outline" className="text-xs">
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
        <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        No textbooks yet
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
        Upload your first textbook to start learning with AI-powered summaries, Q&A, and more.
      </p>
      <Link href="/library/upload">
        <Button size="lg">
          <Upload className="w-4 h-4 mr-2" />
          Upload Your First Textbook
        </Button>
      </Link>
    </div>
  )
}

# IntelliTutor - AI-Powered Personal Learning Companion

Transform any static textbook into an interactive, personalized learning experience with AI-powered summaries, Q&A, and text-to-speech.

## 🚀 Features

- **📚 Easy Upload**: Drag-and-drop PDF, DOCX, TXT, or EPUB files with OCR support
- **🤖 AI Content Transformation**: Automatic chapter summaries, key concepts, and study guides
- **💬 Grounded Q&A**: Ask questions and get accurate answers with citations from your textbook
- **🔊 Text-to-Speech**: Listen to content with natural Gemini TTS voices
- **📖 Personal Library**: Organize and manage all your learning materials
- **🎯 Study Guides**: AI-generated practice questions and flashcards

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS
- **UI Components**: Shadcn/UI, Lucide Icons
- **Database**: PostgreSQL with Prisma ORM
- **AI/ML**: Google Gemini (LLM, TTS, SST), Pinecone Vector Database
- **File Processing**: pdf-parse, mammoth (DOCX)

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- API keys for:
  - Google Gemini API
  - Pinecone

## 🔧 Installation

### 1. Clone the repository

```bash
cd intellitutor
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your credentials:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/intellitutor"

# Gemini API
GEMINI_API_KEY="your_gemini_api_key_here"

# Pinecone
PINECONE_API_KEY="your_pinecone_api_key_here"
PINECONE_ENVIRONMENT="your_pinecone_environment"
PINECONE_INDEX_NAME="intellitutor-vectors"

# NextAuth (generate a random secret)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret_here"
```

### 4. Set up the database

Generate Prisma client and run migrations:

```bash
npx prisma generate
npx prisma db push
```

### 5. Set up Pinecone

Create a Pinecone index with the following settings:
- **Dimensions**: 768 (for text-embedding-004 model)
- **Metric**: Cosine
- **Index Name**: intellitutor-vectors

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
intellitutor/
├── src/
│   ├── app/                    # Next.js app directory
│   │   ├── api/               # API routes
│   │   ├── library/           # Library and upload pages
│   │   └── page.tsx           # Landing page
│   ├── components/
│   │   └── ui/                # Shadcn/UI components
│   ├── lib/                   # Utility functions
│   │   ├── prisma.ts          # Prisma client
│   │   ├── gemini.ts          # Gemini AI functions
│   │   ├── pinecone.ts        # Vector database functions
│   │   ├── file-processor.ts # Document processing
│   │   └── utils.ts           # Helper functions
│   └── generated/
│       └── prisma/            # Generated Prisma client
├── prisma/
│   └── schema.prisma          # Database schema
├── uploads/                   # Uploaded files (gitignored)
└── public/                    # Static assets
```

## 🔑 Getting API Keys

### Google Gemini API

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### Pinecone

1. Sign up at [Pinecone](https://www.pinecone.io/)
2. Create a new project
3. Create an index (dimensions: 768, metric: cosine)
4. Copy your API key and environment to `.env`

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import your repository on [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Setup (Production)

For production, use a managed PostgreSQL service:
- [Vercel Postgres](https://vercel.com/storage/postgres)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Railway](https://railway.app/)

## 📚 Usage

### Upload a Textbook

1. Navigate to "My Library"
2. Click "Upload Textbook"
3. Drag and drop your PDF, DOCX, TXT, or EPUB file
4. Wait 2-3 minutes for AI processing
5. Start learning!

### Ask Questions

1. Open any processed textbook
2. Go to the "Q&A" tab
3. Type or speak your question
4. Get instant answers with citations

### Listen to Content

1. Open any chapter or summary
2. Click the "Listen" button
3. Choose your preferred voice
4. Adjust playback speed as needed

## 🧪 Development

### Run Prisma Studio

View and edit your database:

```bash
npx prisma studio
```

### Generate Prisma Client

After schema changes:

```bash
npx prisma generate
```

### Database Migrations

```bash
npx prisma migrate dev --name your_migration_name
```

## 📝 Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `PINECONE_API_KEY` | Pinecone API key | Yes |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Yes |
| `PINECONE_INDEX_NAME` | Pinecone index name | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | Random secret for auth | Yes |
| `MAX_FILE_SIZE` | Max upload size in bytes | No (default: 200MB) |

## 🐛 Troubleshooting

### "No space left on device" during npm install

Free up disk space or use `npm install --no-optional`

### Prisma Client errors

Regenerate the client:
```bash
npx prisma generate
```

### File upload fails

Check that the `uploads/` directory exists and has write permissions

### Pinecone connection errors

Verify your API key and index name in `.env`

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Shadcn/UI](https://ui.shadcn.com/)
- AI powered by [Google Gemini](https://deepmind.google/technologies/gemini/)
- Vector search by [Pinecone](https://www.pinecone.io/)

## 📧 Support

For questions or issues, please open an issue on GitHub or contact the development team.

---

**Made with ❤️ for students everywhere**

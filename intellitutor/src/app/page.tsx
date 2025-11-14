import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Upload, MessageSquare, Volume2 } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">
            Transform Your Textbooks into
            <span className="text-blue-600 dark:text-blue-400"> Interactive Learning</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            IntelliTutor turns any static textbook into an AI-powered personal tutor. 
            Get instant answers, listen to summaries, and study smarter—24/7.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/library">
              <Button size="lg" className="text-lg px-8">
                Get Started Free
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div id="features" className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Upload className="w-8 h-8" />}
            title="Easy Upload"
            description="Drag and drop your PDFs, DOCX, or EPUB files. We handle the rest with OCR support."
          />
          <FeatureCard
            icon={<BookOpen className="w-8 h-8" />}
            title="Smart Summaries"
            description="AI-generated chapter summaries, key concepts, and study guides automatically created."
          />
          <FeatureCard
            icon={<MessageSquare className="w-8 h-8" />}
            title="AI Q&A Tutor"
            description="Ask questions and get accurate answers grounded in your textbook with citations."
          />
          <FeatureCard
            icon={<Volume2 className="w-8 h-8" />}
            title="Listen & Learn"
            description="Natural text-to-speech with multiple voices. Study while commuting or exercising."
          />
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Step
              number="1"
              title="Upload Your Textbook"
              description="Upload any PDF, DOCX, or text file. Our AI processes it in minutes."
            />
            <Step
              number="2"
              title="AI Transforms Content"
              description="Get automatic summaries, key concepts, and a personalized study guide."
            />
            <Step
              number="3"
              title="Study Smarter"
              description="Ask questions, listen to content, and learn at your own pace."
            />
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-blue-600 dark:bg-blue-700 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Learning?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of students who study smarter with IntelliTutor.
          </p>
          <Link href="/library">
            <Button size="lg" variant="secondary" className="text-lg px-8">
              Start Learning Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="text-blue-600 dark:text-blue-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 bg-blue-600 dark:bg-blue-500 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300">{description}</p>
    </div>
  );
}

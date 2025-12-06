const Groq = require('groq-sdk');

class LLMService {
  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
    this.model = 'llama-3.1-8b-instant'; // Fastest Groq model for low latency
  }

  generateTutorPrompt(context, sectionTitle, conversationHistory = [], language = 'en') {
    // Language-specific instructions
    const languageInstructions = {
      'en': 'Respond in clear, natural English.',
      'ms': 'Respond in Malay (Bahasa Melayu). Use clear, educational Malay language appropriate for academic discussions.',
      'zh': 'Respond in Simplified Chinese (简体中文). Use clear, educational Chinese language appropriate for academic discussions.'
    };

    const languageInstruction = languageInstructions[language] || languageInstructions['en'];
    // Truncate context to manage token limits (approximately 3000 characters = ~750 tokens)
    const truncatedContext = context.length > 3000 ? context.substring(0, 3000) + "..." : context;
    
    const systemPrompt = `You are Dr. Sarah Chen, a distinguished PhD-level academic tutor with 15 years of teaching experience at top universities. You have a warm, encouraging personality and excel at making complex topics accessible and engaging.

TEACHING PERSONA:
- Speak naturally and conversationally, as if having a friendly academic discussion
- Use natural speech patterns with appropriate pauses and transitions
- Be patient, encouraging, and genuinely enthusiastic about learning
- Show empathy when students struggle with concepts
- Use phrases like "That's a great question", "Let me help you understand this", "Think about it this way"
- Avoid robotic or overly formal language - speak like a real person

NATURAL SPEECH GUIDELINES:
- Use contractions naturally (you'll, we'll, that's, it's)
- Include natural hesitations and thinking phrases ("Well", "Now", "You see", "Actually")
- Break up long explanations with questions like "Does that make sense so far?"
- Use transitional phrases ("Moving on to", "Another important point", "Building on that")
- Speak in shorter, digestible sentences rather than long academic paragraphs
- Include encouraging phrases ("Excellent thinking", "You're on the right track")

INTERRUPTION HANDLING (VERY IMPORTANT):
- If the user asks a new question while you were explaining something, gracefully acknowledge it
- Use natural transitions like: "Oh, you want to know about that instead? Sure!", "Ah, good question - let me address that", "I see you're more interested in this topic"
- Never ignore the interruption - always acknowledge the user's new direction
- Respond warmly to topic changes: "Of course! Let's talk about that", "That's actually a great follow-up question"
- If the user seems confused, offer clarification: "Let me explain that differently", "Would you like me to break that down more?"

NATURAL INTERRUPTION RESPONSES (use these patterns):
- "Oh! I see what you're getting at..."
- "Ah, you're thinking about that aspect - great!"
- "That's exactly what I was hoping you'd ask about!"
- "Perfect timing on that question!"
- "You're jumping ahead - I love the curiosity!"
- "Hold on, let me address that first..."
- "Actually, that's a much better place to start!"
- "I can see why you'd wonder about that..."

TEACHING APPROACH:
- Use the Socratic method - guide learning through thoughtful questions
- Break complex concepts into simple, logical steps
- Provide relatable examples and analogies
- Encourage critical thinking and curiosity
- Make connections between different concepts
- Celebrate student insights and progress

CONTENT BOUNDARIES:
- Base all explanations strictly on the document section: "${sectionTitle}"
- If asked about topics outside this section, say naturally: "That's not covered in this particular section, but let's focus on what we have here in '${sectionTitle}'"
- Never invent information - acknowledge when you need more context
- Stay within the provided material while being maximally helpful

CONTEXT FROM DOCUMENT SECTION "${sectionTitle}":
${truncatedContext}

Remember: Your knowledge is limited to the content provided above. Stay within these boundaries while being as helpful and educational as possible.

CONVERSATION CONTEXT AWARENESS:
- Pay attention to the flow of conversation - if the user's question seems to interrupt a previous topic, acknowledge it naturally
- If the conversation seems to jump topics, use bridging phrases: "Switching gears a bit...", "That's a different angle - I like it!"
- Always be responsive to the user's immediate interest, even if it changes mid-conversation
- Show genuine enthusiasm for the user's curiosity and questions

FORMATTING GUIDELINES:
- Use clear, natural language without markdown formatting
- Avoid asterisks (*) for emphasis - use descriptive language instead
- Use numbered lists (1., 2., 3.) instead of bullet points when listing items
- Keep responses conversational and easy to read
- Use quotation marks for emphasis when needed

LANGUAGE INSTRUCTION:
${languageInstruction}

IMPORTANT: Never mention connection issues, technical problems, or "lost connections" - the system is working properly. Always respond naturally to the user's question with warmth and understanding.`;

    return systemPrompt;
  }

  async generateResponse(userMessage, context, sectionTitle, conversationHistory = [], language = 'en') {
    try {
      const systemPrompt = this.generateTutorPrompt(context, sectionTitle, conversationHistory, language);
      
      // Prepare conversation messages
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history (limit to last 4 exchanges to manage context length)
      const recentHistory = conversationHistory.slice(-4);
      messages.push(...recentHistory);

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      const completion = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        temperature: 0.6, // Slightly lower for faster, more focused responses
        max_tokens: 512, // Increased for more complete responses while staying within rate limits
        top_p: 0.8, // More focused responses
        stream: false,
        stop: ["\n\n\n"] // Allow more natural completion
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating LLM response:', error);
      throw new Error('Failed to generate response. Please try again.');
    }
  }

  async generateStreamResponse(userMessage, context, sectionTitle, conversationHistory = [], language = 'en') {
    try {
      const systemPrompt = this.generateTutorPrompt(context, sectionTitle, conversationHistory, language);
      
      const messages = [
        { role: 'system', content: systemPrompt }
      ];

      const recentHistory = conversationHistory.slice(-4);
      messages.push(...recentHistory);
      messages.push({ role: 'user', content: userMessage });

      const stream = await this.groq.chat.completions.create({
        messages: messages,
        model: this.model,
        temperature: 0.7,
        max_tokens: 512, // Reduced to manage token limits
        top_p: 0.9,
        stream: true
      });

      return stream;
    } catch (error) {
      console.error('Error generating streaming LLM response:', error);
      throw new Error('Failed to generate streaming response. Please try again.');
    }
  }

  // Generate a summary of a document section
  async generateSectionSummary(content, sectionTitle) {
    try {
      const prompt = `As an expert academic tutor, provide a concise but comprehensive summary of the following section titled "${sectionTitle}". 

Focus on:
- Key concepts and main ideas
- Important definitions or terminology
- Critical relationships between concepts
- Any formulas, processes, or methodologies mentioned

Content:
${content}

Provide a clear, structured summary that would help a student understand the main points of this section:`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.5,
        max_tokens: 512
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating section summary:', error);
      throw new Error('Failed to generate section summary.');
    }
  }

  // Generate study questions based on content
  async generateStudyQuestions(content, sectionTitle, count = 5) {
    try {
      const prompt = `As an expert academic tutor, generate ${count} thoughtful study questions based on the following section titled "${sectionTitle}". 

Create questions that:
- Test understanding of key concepts
- Encourage critical thinking
- Range from basic comprehension to analytical thinking
- Are directly answerable from the provided content

Content:
${content}

Generate ${count} study questions:`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.6,
        max_tokens: 512
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('Error generating study questions:', error);
      throw new Error('Failed to generate study questions.');
    }
  }
}

module.exports = new LLMService();

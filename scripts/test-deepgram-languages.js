const { createClient } = require('@deepgram/sdk');
require('dotenv').config();

async function testDeepgramLanguages() {
  console.log('🔍 Testing Deepgram language support...');
  
  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
    return;
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  // Test text for different languages
  const testTexts = {
    'en': 'Hello, this is a test in English.',
    'zh': '你好，这是中文测试。',
    'ta': 'வணக்கம், இது தமிழ் சோதனை.',
    'ms': 'Halo, ini adalah ujian dalam Bahasa Melayu.'
  };

  // Test TTS models
  const ttsModels = [
    'aura-asteria-en',
    'aura-luna-en',
    'aura-stella-en',
    'aura-hera-en'
  ];

  console.log('\n📢 Testing Text-to-Speech models:');
  
  for (const model of ttsModels) {
    try {
      console.log(`\n🎵 Testing model: ${model}`);
      
      const response = await deepgram.speak.request(
        { text: testTexts.en },
        {
          model: model,
          encoding: 'linear16',
          sample_rate: 24000
        }
      );

      const stream = await response.getStream();
      if (stream) {
        console.log(`✅ ${model}: Working`);
      } else {
        console.log(`❌ ${model}: No stream received`);
      }
    } catch (error) {
      console.log(`❌ ${model}: Error - ${error.message}`);
    }
  }

  // Test STT languages
  console.log('\n🎤 Testing Speech-to-Text languages:');
  
  const sttLanguages = [
    'en-US',
    'zh-CN',
    'zh-TW',
    'zh-HK',
    'ta',
    'ms'
  ];

  for (const language of sttLanguages) {
    try {
      console.log(`\n🗣️ Testing language: ${language}`);
      
      // Create a minimal test with live connection
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: language,
        smart_format: false,
        interim_results: false
      });

      connection.on('open', () => {
        console.log(`✅ ${language}: STT connection opened successfully`);
        connection.finish();
      });

      connection.on('error', (error) => {
        console.log(`❌ ${language}: STT error - ${error.message}`);
      });

      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.log(`❌ ${language}: STT setup error - ${error.message}`);
    }
  }

  console.log('\n🔍 Language support test completed!');
}

// Run the test
testDeepgramLanguages().catch(console.error);

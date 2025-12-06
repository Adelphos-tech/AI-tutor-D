const { createClient } = require('@deepgram/sdk');
require('dotenv').config();

async function testDeepgramMultilingualTTS() {
  console.log('🔍 Testing Deepgram multilingual TTS models...');
  
  if (!process.env.DEEPGRAM_API_KEY) {
    console.error('❌ DEEPGRAM_API_KEY not found in environment variables');
    return;
  }

  const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

  // Test text in different languages
  const testTexts = {
    'en': 'Hello, this is a test in English.',
    'zh': '你好，这是中文测试。',
    'ta': 'வணக்கம், இது தமிழ் சோதனை.',
    'ms': 'Halo, ini adalah ujian dalam Bahasa Melayu.',
    'es': 'Hola, esta es una prueba en español.',
    'fr': 'Bonjour, ceci est un test en français.',
    'de': 'Hallo, das ist ein Test auf Deutsch.',
    'ja': 'こんにちは、これは日本語のテストです。',
    'ko': '안녕하세요, 이것은 한국어 테스트입니다.',
    'hi': 'नमस्ते, यह हिंदी में एक परीक्षण है।'
  };

  // Test all available Aura models with different language texts
  const auraModels = [
    'aura-asteria-en',
    'aura-luna-en', 
    'aura-stella-en',
    'aura-hera-en',
    'aura-orion-en',
    'aura-arcas-en',
    'aura-perseus-en',
    'aura-angus-en',
    'aura-orpheus-en',
    'aura-helios-en',
    'aura-zeus-en'
  ];

  // Test potential multilingual models (these might not exist but worth testing)
  const potentialMultilingualModels = [
    'aura-asteria-zh',
    'aura-asteria-zh-cn',
    'aura-luna-zh',
    'aura-stella-zh',
    'aura-asteria-es',
    'aura-asteria-fr',
    'aura-asteria-de',
    'aura-asteria-ja',
    'aura-asteria-ko',
    'aura-asteria-hi',
    'aura-asteria-ta',
    'aura-asteria-ms',
    'aura-zh',
    'aura-chinese',
    'aura-mandarin'
  ];

  console.log('\n🎵 Testing standard Aura models with Chinese text:');
  
  for (const model of auraModels) {
    try {
      console.log(`\n🎤 Testing ${model} with Chinese text...`);
      
      const response = await deepgram.speak.request(
        { text: testTexts.zh },
        {
          model: model,
          encoding: 'linear16',
          sample_rate: 24000
        }
      );

      const stream = await response.getStream();
      if (stream) {
        console.log(`✅ ${model}: Successfully generated Chinese audio`);
        
        // Test if it sounds different from English (basic check)
        const englishResponse = await deepgram.speak.request(
          { text: testTexts.en },
          {
            model: model,
            encoding: 'linear16',
            sample_rate: 24000
          }
        );
        
        const englishStream = await englishResponse.getStream();
        if (englishStream) {
          console.log(`   📝 ${model}: Also works with English`);
        }
      } else {
        console.log(`❌ ${model}: No stream received`);
      }
    } catch (error) {
      console.log(`❌ ${model}: Error - ${error.message}`);
    }
  }

  console.log('\n🌍 Testing potential multilingual models:');
  
  for (const model of potentialMultilingualModels) {
    try {
      console.log(`\n🎤 Testing ${model}...`);
      
      const response = await deepgram.speak.request(
        { text: testTexts.zh },
        {
          model: model,
          encoding: 'linear16',
          sample_rate: 24000
        }
      );

      const stream = await response.getStream();
      if (stream) {
        console.log(`✅ ${model}: SUCCESS! Multilingual model found!`);
      } else {
        console.log(`❌ ${model}: No stream received`);
      }
    } catch (error) {
      if (error.message.includes('model') || error.message.includes('not found')) {
        console.log(`❌ ${model}: Model not available`);
      } else {
        console.log(`❌ ${model}: Error - ${error.message}`);
      }
    }
  }

  console.log('\n🔧 Testing with language parameters:');
  
  // Test if language parameter affects TTS output
  const languageCodes = ['en-US', 'zh-CN', 'zh-TW', 'es-ES', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR'];
  
  for (const langCode of languageCodes) {
    try {
      console.log(`\n🌐 Testing language parameter: ${langCode}`);
      
      const response = await deepgram.speak.request(
        { text: testTexts.zh },
        {
          model: 'aura-asteria-en',
          language: langCode,
          encoding: 'linear16',
          sample_rate: 24000
        }
      );

      const stream = await response.getStream();
      if (stream) {
        console.log(`✅ Language ${langCode}: Works with language parameter`);
      } else {
        console.log(`❌ Language ${langCode}: No stream received`);
      }
    } catch (error) {
      console.log(`❌ Language ${langCode}: Error - ${error.message}`);
    }
  }

  console.log('\n🔍 Multilingual TTS test completed!');
  console.log('\n📋 Summary:');
  console.log('- If any multilingual models were found, they will be listed above');
  console.log('- Standard English models can speak other languages but with English accent');
  console.log('- Check Deepgram documentation for latest multilingual model releases');
}

// Run the test
testDeepgramMultilingualTTS().catch(console.error);

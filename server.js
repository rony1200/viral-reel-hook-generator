const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Validate API Key on startup
if (!OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY is not set in .env file');
    process.exit(1);
}

// API Endpoint: Generate Viral Hooks
app.post('/api/generate-hooks', async (req, res) => {
    try {
        const { topic, platform } = req.body;

        // Input validation
        if (!topic || !platform) {
            return res.status(400).json({ 
                error: 'Topic and platform are required' 
            });
        }

        if (topic.length < 3 || topic.length > 500) {
            return res.status(400).json({ 
                error: 'Topic must be between 3 and 500 characters' 
            });
        }

        // Construct AI prompt for viral hooks
        const systemPrompt = `You are a viral short-form content expert specializing in creating scroll-stopping hooks for Instagram Reels, YouTube Shorts, and Facebook Reels.

Your expertise includes:
- Understanding platform-specific audience behavior
- Crafting emotion-driven, curiosity-based hooks
- Maximizing retention rates in the first 3 seconds
- Creating pattern interrupts that stop the scroll

Generate hooks that are conversational, direct, and create an irresistible urge to keep watching.`;

        const userPrompt = `Generate 5 high-retention viral hooks for ${platform}.

Topic: ${topic}

Rules:
- Maximum 12 words per hook
- Focus on emotion and curiosity
- Use conversational, direct language
- Create pattern interrupts
- No emojis or special characters
- Each hook must be unique and scroll-stopping
- Start with action words or surprising statements

Return ONLY the 5 hooks as a numbered list, nothing else.`;

        // Call OpenAI API
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.9,
                max_tokens: 300,
                top_p: 1,
                frequency_penalty: 0.5,
                presence_penalty: 0.5
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API Error:', errorData);
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();

        // Parse hooks from AI response
        const hooks = parseHooks(aiResponse);

        if (hooks.length === 0) {
            throw new Error('Failed to parse hooks from AI response');
        }

        // Log successful generation (for monitoring)
        console.log(`✅ Generated ${hooks.length} hooks for topic: "${topic.substring(0, 50)}..."`);

        res.json({ 
            hooks,
            platform,
            topic 
        });

    } catch (error) {
        console.error('Error generating hooks:', error);
        res.status(500).json({ 
            error: 'Failed to generate hooks. Please try again.' 
        });
    }
});

// Helper function to parse hooks from AI response
function parseHooks(text) {
    const hooks = [];
    
    // Split by newlines and filter out empty lines
    const lines = text.split('\n').filter(line => line.trim());
    
    for (const line of lines) {
        // Remove numbering (1., 2., etc.) and quotes
        let hook = line
            .replace(/^\d+[\.\)]\s*/, '')  // Remove "1. " or "1) "
            .replace(/^[-•*]\s*/, '')      // Remove bullet points
            .replace(/^["']|["']$/g, '')   // Remove quotes
            .trim();
        
        if (hook && hook.length > 5) {
            hooks.push(hook);
        }
    }
    
    // Return first 5 hooks
    return hooks.slice(0, 5);
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'AI Viral Reel Hook Generator API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`✅ OpenAI API Key configured`);
    console.log(`📝 API Endpoint: POST /api/generate-hooks`);
});

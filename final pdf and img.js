const dotenv = require('dotenv');
const fs = require('fs');
const { google } = require('googleapis');
const mime = require('mime-types');
const pdf = require('pdf-parse'); // Library for parsing PDF content

// Load environment variables from .env file
dotenv.config({ path: '.env' });
const API_KEY = process.env.GOOGLE_API_KEY;
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

// Function to extract text from a PDF file
async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    return pdf(dataBuffer);
}

async function run(filePath, fileDisplayName) {
    try {
        // Initialize API Client
        const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
        const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);

        // Extract text from the PDF file
        const { text } = await extractTextFromPDF(filePath);
        
        // Make Gemini 1.5 API LLM call with the extracted text
        const prompt = "Write about the elements of visual perception and include figure no. also.";
        const model = "models/gemini-1.5-pro-latest";
        const contents = {
            'contents': [{
                'parts': [
                    { 'text': prompt },
                    { 'text': text } // Provide the extracted text here
                ]
            }]
        };

        // Generate description for the PDF content
        const generateContentResponse = await genaiService.models.generateContent({
            model: model,
            requestBody: contents,
            auth: auth
        });

        const generatedText = JSON.stringify(generateContentResponse.data);

        // Extract figure numbers from generated text
        const figureNumbers = generatedText.match(/Figure (\d+(\.\d+)?)/g);

        if (figureNumbers) {
            // Loop through each figure number found
            for (const figureNumber of figureNumbers) {
                // Construct the correct image path
                const figureNumberFormatted = figureNumber.replace('Figure ', '').replace('.', '.');
                const imagePath = `sample_data/Figure ${figureNumberFormatted}.png`;
                
                const imageExists = fs.existsSync(imagePath);
                // Write whether image is present or not
                if (imageExists) {
                    console.log(`${figureNumber}: Image found`);
                } else {
                    console.log(`${figureNumber}: Image not found`);
                }
            }
        }

        console.log(generatedText);
    } catch (err) {
        throw err;
    }
}

// Usage example
const filePath = "sample_data/book.pdf";
const fileDisplayName = "Book";

run(filePath, fileDisplayName);

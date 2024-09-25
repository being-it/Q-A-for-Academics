const express = require('express');
const multer = require('multer');
const dotenv = require('dotenv');
const fs = require('fs');
const { google } = require('googleapis');
const mime = require('mime-types');
const pdf = require('pdf-parse');
const { exec } = require('child_process'); // Add this for running the extract.py script


// Initialize Express app
const app = express();
const port = process.env.PORT || 4000;

// Configure Multer for handling file uploads
const upload = multer({ dest: 'uploads/' });

// Load environment variables from .env file
dotenv.config({ path: '.env' });
const API_KEY = process.env.GOOGLE_API_KEY;
const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${API_KEY}`;

// Function to extract text from a PDF file
async function extractTextFromPDF(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    return pdf(dataBuffer);
}

// Route to handle form submission
app.post('/process-pdf', upload.single('pdfFile'), async (req, res) => {
    try {
        // Initialize API Client
        const genaiService = await google.discoverAPI({ url: GENAI_DISCOVERY_URL });
        const auth = new google.auth.GoogleAuth().fromAPIKey(API_KEY);

        // Extract text from the uploaded PDF file
        const { text } = await extractTextFromPDF(req.file.path);

        // Get the question from the request
        const question = req.body.question;

        // Make Gemini 1.5 API LLM call with the extracted text and the question
        const model = "models/gemini-1.5-flash";
        const contents = {
            'contents': [{
                'parts': [
                    { 'text': question },
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

        // Extract relevant content from the response
        const generatedContent = generateContentResponse.data.candidates[0].content.parts[0].text;

        // Format the output in a human-readable way
        const output = `
        ${generatedContent}
        `;

        // Send the response
        res.send(output);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'An error occurred' });
    }
});

// Route to handle image extraction from PDF
app.post('/extract-images', upload.single('pdfFile'), (req, res) => {
    const pdfFilePath = req.file.path;

    exec(`python extract.py ${pdfFilePath}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing extract.py: ${error.message}`);
            return res.status(500).json({ error: 'Failed to extract images.' });
        }

        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).json({ error: 'Failed to extract images.' });
        }

        console.log(`stdout: ${stdout}`);
        res.json({ success: true, message: 'Images extracted successfully.' });
    });
});

// Serve static files
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

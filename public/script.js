document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("pdfForm");
    const outputDiv = document.getElementById("output");
    const container = document.querySelector('.container1');
    const loader = document.getElementById("loader");
    const copyButton = document.getElementById("copyButton");


    document.getElementById('extractButton').addEventListener('click', function () {
        const form = document.getElementById('uploadForm');
        const formData = new FormData(form);

        fetch('/extract-images', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Images extracted successfully!');
            } else {
                alert('Failed to extract images.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while extracting images.');
        });
    });

    form.addEventListener("submit", async function(event) {
        event.preventDefault();
        
        const pdfFile = document.getElementById("pdfFile").files[0];
        const question = document.getElementById("question").value;

        const formData = new FormData();
        formData.append("pdfFile", pdfFile);
        formData.append("question", question);

        container.classList.add('fade-out');
        loader.style.display = 'block';

        try {
            const response = await fetch("/process-pdf", {
                method: "POST",
                body: formData
            });

            let result = await response.text();
            
            const formattedResult = result
             .replace(/##\s*(.*)/g, '<h2><strong>$1</strong></h2>')
             .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
             .replace(/^\- /gm, '• ')
             .replace(/^\* (.*)$/gm, '<li>$1</li>')
             .replace(/^(\s*)\* (.*)$/gm, (match, p1, p2) => `<ul style="margin-left: ${p1.length * 20}px;"><li>${p2}</li></ul>`)
             .replace(/(<ul[^>]*>[\s\S]*?<\/ul>)/gm, '<ul>$1</ul>')
             .replace(/<\/ul>\s*<ul[^>]*>/gm, '')
             .replace(/^(?!<h2>)(?!<strong>)(?!<ul>)(?!<li>)(.*)$/gm, '<p>$1</p>');

            outputDiv.innerHTML = formattedResult;
        } catch (error) {
            outputDiv.innerHTML = "An error occurred. Please try again later.";
        } finally {
            loader.style.display = 'none';
            container.classList.remove('fade-out');
        }
    });

    // Copy button functionality
    copyButton.addEventListener("click", async function() {
        const html = outputDiv.innerHTML;
        const blob = new Blob([html], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/html': blob })];
        
        try {
            await navigator.clipboard.write(data);
            alert('Formatted content copied to clipboard!'); // Provide feedback
        } catch (err) {
            alert('Failed to copy text.'); // Handle failure
        }
    });
});

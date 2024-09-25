import fitz  # PyMuPDF
import cv2
import numpy as np
import os
from PIL import Image
import sys  # Import sys to handle command-line arguments

# Function to preprocess a specific page from a PDF file and return the image.
def preprocess_page(pdf_path, page_number):
    pdf_document = fitz.open(pdf_path)
    page = pdf_document[page_number]
    pix = page.get_pixmap(matrix="RGB")
    img = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.height, pix.width, 3))
    return img

# Function to extract figures from a specific page of a PDF file and save them as images.
def extract_figures_from_page(pdf_path, page_number, output_folder, use_grayscale_threshold=True):
    img = preprocess_page(pdf_path, page_number)
    contours = []

    if use_grayscale_threshold:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        _, binary = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    else:
        hsv_img = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
        lower_bound = np.array([0, 0, 0])
        upper_bound = np.array([179, 255, 255])
        mask = cv2.inRange(hsv_img, lower_bound, upper_bound)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    min_area = 500
    filtered_contours = [cnt for cnt in contours if cv2.contourArea(cnt) > min_area]

    for idx, cnt in enumerate(filtered_contours):
        x, y, w, h = cv2.boundingRect(cnt)
        expansion_factor = 0.1
        x1 = max(0, x - int(expansion_factor * w))
        y1 = max(0, y - int(expansion_factor * h))
        x2 = min(img.shape[1], x + w + int(expansion_factor * w))
        y2 = min(img.shape[0], y + h + int(expansion_factor * h))
        cropped_figure = img[y1:y2, x1:x2]
        output_filename = f"page{page_number + 1}_figure{idx + 1}.png"
        output_path = os.path.join(output_folder, output_filename)
        Image.fromarray(cropped_figure).save(output_path, quality=100)

# Function to extract figures from an entire PDF file.
def extract_figures_from_pdf(pdf_path, output_folder):
    pdf_document = fitz.open(pdf_path)
    for page_number in range(len(pdf_document)):
        extract_figures_from_page(pdf_path, page_number, output_folder)
    pdf_document.close()

# Main function to run the script with command-line arguments.
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python extract.py <path_to_pdf>")
        sys.exit(1)

    # Get the PDF file path from the command-line arguments.
    pdf_file_path = sys.argv[1]

    # Define the output folder path to save the extracted figures.
    output_folder = os.path.splitext(os.path.basename(pdf_file_path))[0] + "_figures"

    # If the output folder does not exist, create it.
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Call the function to extract figures from the PDF file and save them to the specified output folder.
    extract_figures_from_pdf(pdf_file_path, output_folder)

    # Print a message indicating the successful extraction of figures.
    print("Figures extracted successfully.")

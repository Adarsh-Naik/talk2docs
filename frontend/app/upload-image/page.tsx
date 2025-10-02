'use client';

import { marked } from 'marked';
import React, { useState, useRef } from 'react';

const BASE_URL = "http://127.0.0.1:8001";

interface ImageWithPreview {
  file: File;
  id: string;
  previewUrl: string;
}

export default function UploadImagePage() {
  const [question, setQuestion] = useState('');
  const [selectedImages, setSelectedImages] = useState<ImageWithPreview[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Allowed image extensions (matching your original code)
  const allowedExtensions = ["jpg", "jpeg", "png"];

  // Simple markdown parser (same as in ask page)
  const parseMarkdownText = (text: string) => {
    return marked.parse(text);
  };

  const validateImageType = (file: File) => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    return fileExt ? allowedExtensions.includes(fileExt) : false;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Validate image types
      for (const file of newFiles) {
        if (!validateImageType(file)) {
          setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Unsupported file type: ${file.name}. Only .jpg, .jpeg, and .png files are allowed.</div>`);
          return;
        }
      }

      // Create image objects with previews
      const imagesWithPreview: ImageWithPreview[] = newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        previewUrl: URL.createObjectURL(file)
      }));

      setSelectedImages(prev => [...prev, ...imagesWithPreview]);
      setResult(''); // Clear any previous error messages
    }
  };

  const removeImage = (imageId: string) => {
    setSelectedImages(prev => {
      const imageToRemove = prev.find(img => img.id === imageId);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.previewUrl); // Clean up memory
      }
      return prev.filter(img => img.id !== imageId);
    });
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllImages = () => {
    // Clean up all preview URLs
    selectedImages.forEach(img => {
      URL.revokeObjectURL(img.previewUrl);
    });
    
    setSelectedImages([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const cancelImageRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setResult('<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Image processing cancelled</div>');
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Cancel any previous request
    cancelImageRequest();

    // Validation
    if (!question.trim()) {
      setResult('<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Please enter your question.</div>');
      return;
    }

    if (selectedImages.length === 0) {
      setResult('<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Please select at least one image.</div>');
      return;
    }

    // Setup abort controller for cancellation
    abortControllerRef.current = new AbortController();
    setIsProcessing(true);

    try {
      // Show loading state
      setResult('<div class="flex justify-center items-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>');

      // Create FormData for multiple files
      const formData = new FormData();
      formData.append("query", question);

      // Add all selected images
      selectedImages.forEach(({ file }) => {
        formData.append("images", file);
      });

      console.log('Processing images:', selectedImages.map(img => img.file.name));
      console.log('Question:', question);

      // Send request with streaming response
      const response = await fetch(`${BASE_URL}/ask-image`, {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";

      // Initialize streaming output with cursor
      setResult('<div class="px-4 py-3">▌</div>');
      console.log("Starting to read image stream...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Image stream finished');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        console.log('Received image chunk:', chunk);
        fullResponse += chunk;

        // Parse markdown and update display
        const displayResponse = parseMarkdownText(fullResponse);
        setResult(`<div class=" px-4 py-3">${displayResponse} ▌</div>`);

        // Small delay for smooth streaming effect
        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      // Final output (without cursor)
      const finalResponse = parseMarkdownText(fullResponse);
      setResult(`<div class="px-4 py-3">${finalResponse}</div>`);

    } catch (error: any) {
      console.error("Error processing images:", error);
      
      if (error.name === "AbortError") {
        setResult('<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Image processing cancelled</div>');
      } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Network Error: Cannot connect to backend at ${BASE_URL}. Check if your FastAPI server is running.</div>`);
      } else {
        setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: ${error.message}</div>`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    cancelImageRequest();
  };

  // Clean up preview URLs when component unmounts
  React.useEffect(() => {
    return () => {
      selectedImages.forEach(img => {
        URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md m-5">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Image Processing</h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700">
            Ask a question about the images
          </label>
          <textarea
            id="question"
            rows={3}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="What do you want to know about the images?"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Choose Images (.jpg, .jpeg, .png)
          </label>
          
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="image-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Choose Images</span>
                  <input 
                    ref={fileInputRef}
                    id="image-upload" 
                    name="image-upload" 
                    type="file" 
                    className="sr-only" 
                    multiple 
                    accept=".jpg,.jpeg,.png"
                    onChange={handleImageChange} 
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">JPG, JPEG, PNG images only</p>
            </div>
          </div>

          {/* Image Previews */}
          {selectedImages.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Selected Images ({selectedImages.length})</h3>
                <button
                  type="button"
                  onClick={clearAllImages}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {selectedImages.map(({ file, id, previewUrl }) => (
                  <div key={id} className="relative group">
                    <img 
                      src={previewUrl}
                      alt={`Preview of ${file.name}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(id)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold hover:bg-red-700 opacity-80 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      ✖
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs p-1 rounded-b-lg truncate">
                      {file.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={isProcessing || selectedImages.length === 0}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isProcessing ? 'Processing...' : 'Upload'}
          </button>
          
          <button
            type="button"
            onClick={handleStop}
            disabled={!isProcessing}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-300"
          >
            Stop
          </button>
        </div>
      </form>

      {/* Results section */}
      {result && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis Result:</h2>
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: result }}
          />
        </div>
      )}
    </div>
  );
}
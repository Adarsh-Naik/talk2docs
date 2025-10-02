'use client';

import { useState, useRef } from 'react';

const BASE_URL = "http://127.0.0.1:8001";

interface FileWithPreview {
  file: File;
  id: string;
}

export default function UploadDocsPage() {
  const [tenantId, setTenantId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Allowed file extensions (matching your original code)
  const allowedExtensions = ["pdf", "doc", "docx", "txt"];

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(2);
  };

  const validateFileType = (file: File) => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    return fileExt ? allowedExtensions.includes(fileExt) : false;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);

      // Validate file types
      for (const file of newFiles) {
        if (!validateFileType(file)) {
          setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Unsupported file type: ${file.name}. Allowed formats are .pdf, .doc, .docx, .txt</div>`);
          return;
        }
      }

      // Add files with unique IDs
      const filesWithPreview: FileWithPreview[] = newFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9)
      }));

      setSelectedFiles(prev => [...prev, ...filesWithPreview]);
      setResult(''); // Clear any previous error messages
    }
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== fileId));

    // Clear the file input to allow re-selecting the same files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const testConnection = async () => {
    console.log('Testing connection to:', BASE_URL);
    try {
      const response = await fetch(`${BASE_URL}/docs`);
      console.log('Connection test response:', response.status);
      if (response.ok) {
        setResult('<div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">✅ Backend connection successful!</div>');
      } else {
        setResult('<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">❌ Backend responded with status: ' + response.status + '</div>');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      setResult('<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">❌ Cannot connect to backend: ' + error.message + '</div>');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId.trim() || selectedFiles.length === 0) {
      setResult('<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">Please provide Tenant ID and select at least one file.</div>');
      return;
    }

    setIsUploading(true);
    setResult('<div class="flex justify-center items-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>');

    try {
      const formData = new FormData();
      formData.append("tenantId", tenantId);

      // Add all selected files
      selectedFiles.forEach(({ file }) => {
        formData.append("files", file);
      });

      console.log('Uploading files:', selectedFiles.map(f => f.file.name));
      console.log('Tenant ID:', tenantId);

      const response = await fetch(`${BASE_URL}/ingest-multiple-files`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      console.log('Upload response:', data);

      if (response.ok) {
        let html = `<div class="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">${data.message}</div>`;

        if (data.total_chunks) {
          html += `<div class="mt-2 text-sm text-gray-600">Total Chunks Created: ${data.total_chunks}</div>`;
        }

        if (data.errors?.length) {
          html += `<div class="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mt-2">Some errors occurred: ${data.errors.join(", ")}</div>`;
        }

        setResult(html);

        // Clear files on successful upload
        clearAllFiles();
        setTenantId('');

      } else {
        setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">${data.error || "Something went wrong."}</div>`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setResult(`<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error: ${error.message}</div>`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md m-20">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Upload Documents for Ingestion</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700">
            Tenant ID
          </label>
          <input
            type="text"
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter tenant ID"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Files (.pdf, .doc, .docx, .txt)
          </label>

          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Choose Files</span>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    className="sr-only"
                    multiple
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PDF, DOC, DOCX, TXT files only</p>
            </div>
          </div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">Selected Files ({selectedFiles.length})</h3>
                <button
                  type="button"
                  onClick={clearAllFiles}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Clear All
                </button>
              </div>

              <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                {selectedFiles.map(({ file, id }) => (
                  <li key={id} className="flex items-center justify-between py-3 px-4">
                    <div className="flex items-center">
                      <svg className="flex-shrink-0 h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{formatFileSize(file.size)} KB</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="ml-4 text-red-600 hover:text-red-800 text-lg font-bold"
                      title="Remove file"
                    >
                      ✖
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="submit"
            disabled={isUploading || selectedFiles.length === 0}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>

          <button
            type="button"
            onClick={testConnection}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Test Connection
          </button>
        </div>
      </form>

      {/* Results section */}
      {result && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Result:</h2>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: result }}
          />
        </div>
      )}
    </div>
  );
}
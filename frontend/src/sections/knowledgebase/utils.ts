import axios from 'src/utils/axios';

import { CONFIG } from 'src/config-global';

import type { RecordDetailsResponse } from './types/record-details';
import type { KnowledgeBaseResponse } from './types/knowledge-base';
import type { SearchFilters, SearchResponse } from './types/search-response';

// export const fetchKnowledgeBaseDetails = async () => {
//   try {
//     const response = await axios.get(`${API_BASE_URL}/api/v1/knowledgebase`);
//     return response.data;
//   } catch (error) {
//     console.error('Error fetching knowledge base details:', error);
//     throw error;
//   }
// };

export const fetchKnowledgeBaseDetails = async (
  queryParams: URLSearchParams
): Promise<KnowledgeBaseResponse> => {
  try {
    const response = await axios.get<KnowledgeBaseResponse>(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase`,
      { params: queryParams }
    );
    return response.data;
  } catch (error) {
    throw new Error('Error fetching knowledge base details');
  }
};

export const searchKnowledgeBase = async (
  searchtext: string,
  topK: number = 10,
  filters: SearchFilters = {}
): Promise<SearchResponse['searchResponse']> => {
  try {
    // Map frontend filters to backend-accepted schema
    // Backend expects: { query, limit, filters: { apps?: ('drive'|'gmail'|'local')[], kb?: string[] } }
    const mapApps = (apps?: string[]) => {
      if (!apps || apps.length === 0) return undefined;
      // Normalize to lowercase expected by backend APP_TYPES
      return apps
        .map((a) => a.toLowerCase())
        .filter((a) => a === 'drive' || a === 'gmail' || a === 'local');
    };

    const body = {
      query: searchtext,
      limit: topK,
      filters: {
        apps: mapApps(filters.app),
        // If later the API supports more filters (kb, etc.), add here
      },
    };

    const response = await axios.post<SearchResponse>(`/api/v1/search`, body);
    return response.data.searchResponse;
  } catch (error) {
    // Surface backend validation errors when available for easier debugging
    if (error && typeof error === 'object' && (error as any).response?.data?.message) {
      throw new Error((error as any).response.data.message);
    }
    throw new Error('Error searching knowledge base');
  }
};

export const uploadKnowledgeBaseFiles = async (formData: FormData) => {
  try {
    const response = await axios.post(`${CONFIG.backendUrl}/api/v1/knowledgeBase`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    throw new Error('Error uploading files');
  }
};

// Upload File Cache Functions
export const processFilesForUploadFileCache = async (files: File[], sessionId: string) => {
  try {
    console.log('🚀 [Upload File Cache] Starting file processing for cache...', {
      fileCount: files.length,
      sessionId,
      files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    const formData = new FormData();
    formData.append('sessionId', sessionId);
    
    files.forEach((file, index) => {
      formData.append('files', file);
      formData.append('lastModified', file.lastModified.toString());
      console.log(`📁 [Upload File Cache] Added file ${index + 1}/${files.length}: ${file.name}`);
    });

    console.log('⏳ [Upload File Cache] Sending files for processing...');
    const response = await axios.post(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase/upload-file-cache/process`, 
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('✅ [Upload File Cache] Files processed and cached successfully:', {
      sessionId,
      cacheKeys: response.data.cacheKeys,
      processedCount: response.data.processedCount
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [Upload File Cache] Error processing files for cache:', {
      sessionId,
      error: error.message,
      details: error.response?.data
    });
    throw new Error('Error processing files for cache');
  }
};

export const commitUploadFileCache = async (sessionId: string, cacheKeys: string[], kbId?: string) => {
  try {
    console.log('🔄 [Upload File Cache] Committing cached files to database...', {
      sessionId,
      cacheKeys,
      fileCount: cacheKeys.length
    });

    const response = await axios.post(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase/upload-file-cache/commit`,
      {
        sessionId,
        cacheKeys,
        kbId
      }
    );

    console.log('✅ [Upload File Cache] Files committed to database successfully:', {
      sessionId,
      committedCount: response.data.committedCount,
      records: response.data.records
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [Upload File Cache] Error committing cached files:', {
      sessionId,
      error: error.message,
      details: error.response?.data
    });
    throw new Error('Error committing cached files');
  }
};

export const removeFileFromUploadFileCache = async (sessionId: string, fileId: string) => {
  try {
    console.log('🗑️ [Upload File Cache] Removing file from cache...', {
      sessionId,
      fileId
    });

    await axios.delete(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase/upload-file-cache/remove/${fileId}`,
      {
        params: { sessionId }
      }
    );

    console.log('✅ [Upload File Cache] File removed from cache successfully:', {
      sessionId,
      fileId
    });
  } catch (error: any) {
    console.error('❌ [Upload File Cache] Error removing file from cache:', {
      sessionId,
      fileId,
      error: error.message
    });
    throw new Error('Error removing file from cache');
  }
};

export const clearUploadFileCache = async (sessionId: string) => {
  try {
    console.log('🧹 [Upload File Cache] Clearing entire upload session cache...', {
      sessionId
    });

    await axios.delete(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase/upload-file-cache/clear/${sessionId}`
    );

    console.log('✅ [Upload File Cache] Upload session cache cleared successfully:', {
      sessionId
    });
  } catch (error: any) {
    console.error('❌ [Upload File Cache] Error clearing upload session cache:', {
      sessionId,
      error: error.message
    });
    // Don't throw error for cleanup operations
  }
};

// export const fetchDepartments = async () => {
//   try {
//     const response = await axios.get<Departments[]>(`${CONFIG.backendUrl}/api/v1/departments/`);
//     return response.data;
//   } catch (error) {
//     throw new Error('Error fetching departments');
//   }
// };

// export const fetchTags = async () => {
//   try {
//     const response = await axios.get<SearchTagsRecords[]>(
//       `${CONFIG.backendUrl}/api/v1/search-tags?category=Records`
//     );
//     return response.data;
//   } catch (error) {
//     throw new Error('Error fetching Tags');
//   }
// };

// export const fetchModules = async () => {
//   try {
//     const response = await axios.get<Modules[]>(`${CONFIG.backendUrl}/api/v1/modules`);
//     return response.data;
//   } catch (error) {
//     throw new Error('Error fetching modules');
//   }
// };

// export const fetchRecordCategories = async () => {
//   try {
//     const response = await axios.get<RecordCategories[]>(
//       `${CONFIG.backendUrl}/api/v1/recordCategories`
//     );
//     return response.data;
//   } catch (error) {
//     throw new Error('Error fetching record categories');
//   }
// };

export const fetchRecordDetails = async (recordId: string): Promise<RecordDetailsResponse> => {
  try {
    const response = await axios.get<RecordDetailsResponse>(
      `${CONFIG.backendUrl}/api/v1/knowledgeBase/record/${recordId}`
    );
    return response.data;
  } catch (error) {
    throw new Error('Error fetching record details');
  }
};

export const handleDownloadDocument = async (
  externalRecordId: string,
  fileName: string
): Promise<void> => {
  try {
    const response = await axios.get(
      `${CONFIG.backendUrl}/api/v1/document/${externalRecordId}/download`,
      { responseType: 'blob' } // Set response type to blob to handle binary data
    );
    // Read the blob response as text to check if it's JSON with signedUrl
    const reader = new FileReader();
    const textPromise = new Promise<string>((resolve) => {
      reader.onload = () => {
        resolve(reader.result?.toString() || '');
      };
    });

    reader.readAsText(response.data);
    const text = await textPromise;

    let downloadUrl;
    // Use the provided fileName instead of extracting it from headers or URL
    // Get filename from Content-Disposition header if available
    let filename;
    const contentDisposition = response.headers['content-disposition'];
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }

    if (!filename) {
      filename = fileName || `document-${externalRecordId}`;
    }

    // Try to parse as JSON to check for signedUrl property
    try {
      const jsonData = JSON.parse(text);
      if (jsonData && jsonData.signedUrl) {
        // Create a hidden link with download attribute
        const downloadLink = document.createElement('a');
        downloadLink.href = jsonData.signedUrl;
        downloadLink.setAttribute('download', filename); // Use provided filename
        downloadLink.setAttribute('target', '_blank');
        downloadLink.style.display = 'none';

        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
    } catch (e) {
      // Case 2: Response is binary data
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      downloadUrl = URL.createObjectURL(blob);

      // Create a temporary anchor element for download of binary data
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename); // Use provided filename

      // Append to the document, trigger click, and then remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL we created
      URL.revokeObjectURL(downloadUrl);
    }
  } catch (error) {
    throw new Error('Failed to download document');
  }
};

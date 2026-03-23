import { supabase } from '../supabaseClient';
import * as Sentry from '@sentry/react';

/**
 * Upload file to Supabase Storage
 * @param {File|Object} fileOrObject - File object or object with file property
 * @param {string} bucket - Storage bucket name (default: 'uploads')
 * @param {string} folder - Optional folder path within bucket
 * @returns {Promise<{url: string, path: string, file_url: string}>} Upload result
 */
export const uploadFile = async (fileOrObject, bucket = 'uploads', folder = '') => {
  // Handle both direct file and object with file property
  const file = fileOrObject?.file || fileOrObject;

  if (!file) {
    const error = new Error('No file provided');
    Sentry.captureException(error, { tags: { component: 'uploadFile' } });
    throw error;
  }

  // Validate file type and size
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    const error = new Error(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
    Sentry.captureException(error, {
      tags: { component: 'uploadFile' },
      extra: { fileSize: file.size, fileName: file.name },
    });
    throw error;
  }

  // Validate image types for logo uploads
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (file.type && !allowedImageTypes.includes(file.type) && bucket === 'logos') {
    const error = new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.');
    Sentry.captureException(error, {
      tags: { component: 'uploadFile' },
      extra: { fileType: file.type, fileName: file.name },
    });
    throw error;
  }

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'uploadFile', bucket },
        extra: { fileName: file.name, filePath, fileSize: file.size },
      });
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(filePath);

    // Return both formats for compatibility
    return {
      url: publicUrl,
      path: filePath,
      file_url: publicUrl, // For backward compatibility
    };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'uploadFile', bucket },
      extra: { fileName: file?.name, fileSize: file?.size },
    });
    throw error;
  }
};

/**
 * Upload logo specifically to logos bucket
 * @param {File|Object} fileOrObject - File object
 * @returns {Promise<{url: string, path: string, file_url: string}>}
 */
export const uploadLogo = async (fileOrObject) => {
  return uploadFile(fileOrObject, 'logos', 'company');
};

/**
 * Delete file from Supabase Storage
 * @param {string} filePath - Path to file in storage
 * @param {string} bucket - Storage bucket name
 */
export const deleteFile = async (filePath, bucket = 'uploads') => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      Sentry.captureException(error, {
        tags: { component: 'deleteFile', bucket },
        extra: { filePath },
      });
      throw error;
    }
  } catch (error) {
    Sentry.captureException(error, {
      tags: { component: 'deleteFile', bucket },
      extra: { filePath },
    });
    throw error;
  }
};

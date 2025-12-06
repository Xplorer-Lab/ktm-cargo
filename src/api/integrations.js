import { uploadFile } from './integrations/storage';
import { sendMessengerNotification } from './integrations/messenger';

// Mock Image Gen
const generateImage = async (prompt) => {
    console.log('MOCK IMAGE GEN:', prompt);
    return { url: 'https://via.placeholder.com/150' };
};

export const Core = {
    SendMessengerNotification: sendMessengerNotification,
    UploadFile: uploadFile,
    GenerateImage: generateImage,
};

// Re-export for compatibility if needed, or consumers should import Core
export const InvokeLLM = undefined; // Not implemented in original
export const SendMessengerNotification = sendMessengerNotification;
export const SendEmail = undefined; // Explicitly removed
export const UploadFile = uploadFile;
export const GenerateImage = generateImage;

// Direct camelCase exports for new refactored code
export { sendMessengerNotification, uploadFile, generateImage };
export const ExtractDataFromUploadedFile = undefined; // Not implemented in original
export const CreateFileSignedUrl = undefined; // Not implemented in original
export const UploadPrivateFile = undefined; // Not implemented in original

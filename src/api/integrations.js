import { uploadFile } from './integrations/storage';
import { sendMessengerNotification } from './integrations/messenger';

// ─── Not-implemented stubs ────────────────────────────────────────────────────
// These integrations are planned but not yet built.
// Exporting explicit stubs (instead of `undefined`) ensures callers get a clear
// Error with a file/line trace rather than a silent "undefined is not a function".

/** @throws {Error} always — LLM integration not yet implemented */
export const InvokeLLM = () => {
  throw new Error(
    '[integrations] InvokeLLM is not implemented. ' +
      'Wire up an LLM provider (e.g. OpenAI) in src/api/integrations/llm.js and re-export here.'
  );
};

/** @throws {Error} always — email integration not yet implemented */
export const SendEmail = () => {
  throw new Error(
    '[integrations] SendEmail is not implemented. ' +
      'Wire up an email provider (e.g. Resend, SendGrid) in src/api/integrations/email.js and re-export here.'
  );
};

/** @throws {Error} always — file data extraction not yet implemented */
export const ExtractDataFromUploadedFile = () => {
  throw new Error(
    '[integrations] ExtractDataFromUploadedFile is not implemented. ' +
      'Wire up a document parsing service in src/api/integrations/extraction.js and re-export here.'
  );
};

/** @throws {Error} always — signed URL generation not yet implemented */
export const CreateFileSignedUrl = () => {
  throw new Error(
    '[integrations] CreateFileSignedUrl is not implemented. ' +
      'Use supabase.storage.from(bucket).createSignedUrl() directly, or add a wrapper here.'
  );
};

/** @throws {Error} always — private file upload not yet implemented */
export const UploadPrivateFile = () => {
  throw new Error(
    '[integrations] UploadPrivateFile is not implemented. ' +
      'Use supabase.storage with a private bucket, or add a wrapper here.'
  );
};

// ─── Implemented integrations ─────────────────────────────────────────────────
export { sendMessengerNotification, uploadFile };
export const SendMessengerNotification = sendMessengerNotification;
export const UploadFile = uploadFile;

export const Core = {
  SendMessengerNotification: sendMessengerNotification,
  UploadFile: uploadFile,
};

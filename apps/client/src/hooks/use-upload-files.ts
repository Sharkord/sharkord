import { useCan, usePublicServerSettings } from '@/features/server/hooks';
import { uploadFiles } from '@/helpers/upload-file';
import { Permission, type TTempFile } from '@sharkord/shared';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject
} from 'react';
import { toast } from 'sonner';

// TODO: check if it works in all browsers
const useUploadFiles = (
  containerRef: RefObject<HTMLElement | null>,
  disabled: boolean = false
) => {
  const [files, setFiles] = useState<TTempFile[]>([]);
  const filesRef = useRef<TTempFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadingSize, setUploadingSize] = useState(0);
  const settings = usePublicServerSettings();
  const can = useCan();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // hackers gonna hack
  filesRef.current = files;

  const addFiles = useCallback((files: TTempFile[]) => {
    setFiles((prevFiles) => [...prevFiles, ...files]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file.id !== id));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const openFileDialog = useCallback(() => {
    if (disabled) return;

    const canUpload = can(Permission.UPLOAD_FILES);

    if (!settings?.storageUploadEnabled) {
      toast.warning('File uploads are disabled on this server.');
      return;
    }

    if (!canUpload) {
      toast.error('You do not have permission to upload files.');
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [can, settings, disabled]);

  const onFileDialogChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const canUpload = can(Permission.UPLOAD_FILES);

      if (!settings?.storageUploadEnabled) {
        toast.warning('File uploads are disabled on this server.');
        return;
      }

      if (!canUpload) {
        toast.error('You do not have permission to upload files.');
        return;
      }

      const list = event.currentTarget.files;

      if (!list || list.length === 0) return;

      const filesToUpload: File[] = Array.from(list);

      setUploading(true);

      const total = filesToUpload.reduce((acc, file) => acc + file.size, 0);

      setUploadingSize((size) => size + total);

      const uploaded = await uploadFiles(filesToUpload);

      addFiles(uploaded);
      setUploading(false);
      setUploadingSize((size) => size - total);
    },
    [addFiles, can, settings, disabled]
  );

  useEffect(() => {
    const container = containerRef.current;

    if (!container || !settings?.storageUploadEnabled || disabled) return;

    const canUpload = can(Permission.UPLOAD_FILES);
    const uploadEnabled = true;

    const processFiles = async (filesToUpload: File[]) => {
      if (!filesToUpload.length) return;

      setUploading(true);

      const total = filesToUpload.reduce((acc, file) => acc + file.size, 0);

      setUploadingSize((size) => size + total);

      const uploaded = await uploadFiles(filesToUpload);

      addFiles(uploaded);
      setUploading(false);
      setUploadingSize((size) => size - total);
    };

    const checkPermissions = () => {
      if (disabled) return false;

      if (!canUpload) {
        toast.error('You do not have permission to upload files.');
        return false;
      }

      if (!uploadEnabled) {
        toast.error('File uploads are disabled on this server.');
        return false;
      }

      return true;
    };

    const handlePaste = async (event: ClipboardEvent) => {
      if (!checkPermissions()) return;

      const items = event.clipboardData?.items ?? [];
      const filesToUpload: File[] = [];

      for (let i = 0; i < items.length; i++) {
        if (items[i].kind !== 'file') continue;

        const pastedFile = items[i].getAsFile();

        if (!pastedFile) continue;

        filesToUpload.push(pastedFile);
      }

      await processFiles(filesToUpload);
    };

    const handleDrop = async (event: DragEvent) => {
      event.preventDefault();
      if (!checkPermissions()) return;

      const filesToUpload: File[] = [];
      const items = event.dataTransfer?.items ?? [];
      const dFiles = event.dataTransfer?.files ?? [];

      if (items) {
        for (let i = 0; i < items.length; i++) {
          if (items[i].kind === 'file') {
            const file = items[i].getAsFile();
            if (file) filesToUpload.push(file);
          }
        }
      } else {
        for (let i = 0; i < dFiles.length; i++) {
          filesToUpload.push(dFiles[i]);
        }
      }

      await processFiles(filesToUpload);
    };

    const handleDragOver = (event: DragEvent) => {
      event.preventDefault();
    };

    container.addEventListener('paste', handlePaste);
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('drop', handleDrop);

    return () => {
      container.removeEventListener('paste', handlePaste);
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('drop', handleDrop);
    };
  }, [addFiles, can, settings, disabled, containerRef]);

  const fileInputProps = useMemo(
    () => ({
      ref: fileInputRef,
      type: 'file' as const,
      multiple: true,
      onChange: onFileDialogChange,
      style: { display: 'none' }
    }),
    [onFileDialogChange]
  );

  return useMemo(
    () => ({
      files,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      openFileDialog,
      fileInputProps
    }),
    [
      files,
      removeFile,
      clearFiles,
      uploading,
      uploadingSize,
      openFileDialog,
      fileInputProps
    ]
  );
};

export { useUploadFiles };

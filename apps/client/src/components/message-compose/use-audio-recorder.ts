import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

import { useDevices } from '../devices-provider/hooks/use-devices';

export const useAudioRecorder = (onStop: (file: File) => void) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { devices } = useDevices();
  const microphoneId = devices.microphoneId;

  const startRecording = useCallback(async () => {
    try {
      const hasSpecificMic = microphoneId && microphoneId !== 'default';
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: hasSpecificMic ? { deviceId: { exact: microphoneId } } : true
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());

        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { type: 'audio/ogg' });
          // create file with a unique name
          const filename = `audio-message-${Date.now()}.ogg`;
          const file = new File([blob], filename, { type: 'audio/ogg' });
          onStop(file);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch {
      toast.error('Could not access microphone');
    }
  }, [onStop, microphoneId]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      // remove chunks so onstop doesn't trigger file creation
      chunksRef.current = [];
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isRecording]);

  return {
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    cancelRecording
  };
};

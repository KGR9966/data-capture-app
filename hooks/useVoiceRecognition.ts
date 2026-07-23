import React, { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export type VoiceEndReason = "manual" | "silence" | "error";

interface UseVoiceRecognitionOptions {
  locale?: string;
  autoStopMs?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: (reason: VoiceEndReason) => void;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { locale = "da-DK", autoStopMs = 5000, onResult, onError, onEnd } = options;
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const endReasonRef = useRef<VoiceEndReason>("manual");
  const restartAttemptsRef = useRef(0);
  const lastStartTimeRef = useRef(0);
  const autoStopMsRef = useRef(autoStopMs);

  useEffect(() => {
    autoStopMsRef.current = autoStopMs;
  }, [autoStopMs]);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  }, []);

  const startRecordingInternal = useCallback(
    async (requestPermissionFirst = true) => {
      clearSilenceTimer();
      intentionalStopRef.current = false;
      endReasonRef.current = "manual";
      lastStartTimeRef.current = Date.now();
      activeRef.current = true;
      setIsRecording(true);

      if (requestPermissionFirst) {
        restartAttemptsRef.current = 0;
        const granted = await requestPermission();
        if (!granted) {
          activeRef.current = false;
          setIsRecording(false);
          onError?.("Mikrofontilladelse ikke givet.");
          return;
        }
      }

      try {
        if (Platform.OS === "ios") {
          ExpoSpeechRecognitionModule.setCategoryIOS({
            category: AVAudioSessionCategory.playAndRecord,
            categoryOptions: [AVAudioSessionCategoryOptions.defaultToSpeaker],
            mode: AVAudioSessionMode.default,
          });
        }

        await ExpoSpeechRecognitionModule.start({
          lang: locale,
          interimResults: true,
          maxAlternatives: 1,
          requiresOnDeviceRecognition: false,
          continuous: true,
        });
      } catch (error) {
        activeRef.current = false;
        setIsRecording(false);
        onError?.("Kunne ikke starte stemmegenkendelse.");
      }
    },
    [locale, onError, clearSilenceTimer, requestPermission]
  );

  const startRecording = useCallback(async () => {
    await startRecordingInternal(true);
  }, [startRecordingInternal]);

  useSpeechRecognitionEvent("result", (event) => {
    if (!activeRef.current) return;

    const text = event.results[0]?.transcript || "";
    const final = event.isFinal || false;
    setTranscript(text);
    onResult?.(text, final);

    if (activeRef.current && !final) {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        endReasonRef.current = "silence";
        ExpoSpeechRecognitionModule.stop();
      }, autoStopMsRef.current);
    }
  });

  useSpeechRecognitionEvent("error", (event: any) => {
    // Ignore errors after an intentional stop.
    if (!activeRef.current && !intentionalStopRef.current) return;

    const code = event?.code || event?.error?.code || "";
    const message =
      event?.message || event?.error?.message || "Fejl ved stemmegenkendelse";
    const elapsed = Date.now() - lastStartTimeRef.current;
    const isTimeoutLike = /timeout|no-speech|nospeech/i.test(`${code} ${message}`);

    if (
      !intentionalStopRef.current &&
      isTimeoutLike &&
      elapsed < 3000 &&
      restartAttemptsRef.current < 3
    ) {
      restartAttemptsRef.current += 1;
      // Restart immediately and swallow the error so callers stay unaware of
      // the brief platform interruption.
      startRecordingInternal(false);
      return;
    }

    clearSilenceTimer();
    activeRef.current = false;
    setIsRecording(false);
    endReasonRef.current = "error";
    onError?.(message);
  });

  useSpeechRecognitionEvent("end", () => {
    clearSilenceTimer();
    activeRef.current = false;
    setIsRecording(false);
    onEnd?.(endReasonRef.current);
    endReasonRef.current = "manual";
  });

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    intentionalStopRef.current = true;
    endReasonRef.current = "manual";
    activeRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log("Stop speech error", error);
    }
    setIsRecording(false);
  }, [clearSilenceTimer]);

  const resetTranscript = useCallback(() => {
    clearSilenceTimer();
    setTranscript("");
  }, [clearSilenceTimer]);

  return {
    transcript,
    isRecording,
    hasPermission,
    requestPermission,
    startRecording,
    stopRecording,
    resetTranscript,
  };
}

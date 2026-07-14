import React, { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

interface UseVoiceRecognitionOptions {
  locale?: string;
  autoStopMs?: number;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
}

export function useVoiceRecognition(options: UseVoiceRecognitionOptions = {}) {
  const { locale = "da-DK", autoStopMs = 3000, onResult, onError } = options;
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  useSpeechRecognitionEvent("result", (event) => {
    if (!activeRef.current) return;

    const text = event.results[0]?.transcript || "";
    const final = event.isFinal || false;
    setTranscript(text);
    onResult?.(text, final);

    if (isRecording && !final) {
      clearSilenceTimer();
      silenceTimerRef.current = setTimeout(() => {
        ExpoSpeechRecognitionModule.stop();
      }, autoStopMs);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (!activeRef.current) return;
    clearSilenceTimer();
    activeRef.current = false;
    setIsRecording(false);
    onError?.(event.message || "Fejl ved stemmegenkendelse");
  });

  useSpeechRecognitionEvent("end", () => {
    clearSilenceTimer();
    activeRef.current = false;
    setIsRecording(false);
  });

  const requestPermission = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  }, []);

  const startRecording = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      onError?.("Mikrofontilladelse ikke givet.");
      return;
    }

    clearSilenceTimer();
    setTranscript("");
    activeRef.current = true;
    setIsRecording(true);

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
  }, [locale, onError, requestPermission]);

  const stopRecording = useCallback(() => {
    clearSilenceTimer();
    activeRef.current = false;
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (error) {
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

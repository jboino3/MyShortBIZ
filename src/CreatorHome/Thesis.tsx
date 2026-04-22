import { useEffect, useMemo, useRef, useState } from "react";
import "./style.scss";
import { useAuth } from "../AccountCreationAndPayment/AuthContext";
import { REFERENCE_CLIPS, TEST_SCENARIOS, THESIS_STEPS } from "./thesisDemoData";

type ReferenceClipItem = {
  clip_id: string;
  label: string;
  prompt: string;
  completed: boolean;
  clip_label?: string | null;
  file_path?: string | null;
  recorded_at?: string | null;
  duration_seconds?: number | null;
};

type ConsentState = {
  profile_name?: string | null;
  confirmed_owner: boolean;
  consent_to_clone: boolean;
  consent_to_delete: boolean;
  consent_business_use: boolean;
  acknowledged_disclosure: boolean;
  completed_at?: string | null;
};

type VoiceProfileState = {
  status: "not_started" | "recording" | "ready" | "generating" | "ready_for_agent" | "error";
  attached_to_agent: boolean;
  recorded_clips: number;
  preview_available: boolean;
  generated_at?: string | null;
  preview_text?: string | null;
  preview_audio_base64?: string | null;
  notes?: string | null;
  generation_progress: number;
  generation_target: number;
  generation_error?: string | null;
  conversation_ready: boolean;
  conversation_cache_ready: boolean;
  conversation_history: ConversationTurn[];
};

type AgentConfig = {
  agent_name: string;
  business_name: string;
  greeting_script: string;
  business_description: string;
  business_hours: string;
  call_objective: string;
  fallback_behavior: string;
  transfer_instructions: string;
  after_hours_behavior: string;
};

type PhoneConfig = {
  phone_number: string;
  forwarding_number?: string | null;
  routing_mode: "ai_first" | "forward_only" | "voicemail_after_hours";
  connection_status: "not_connected" | "connected" | "demo_connected";
  ownership_confirmed: boolean;
  ai_disclosure_enabled: boolean;
  notes: string;
};

type TalkNowGuideStep = {
  title: string;
  detail: string;
};

type TestCallResult = {
  scenario_id: string;
  scenario_title: string;
  caller: string;
  outcome: string;
  transcript: string[];
  created_at: string;
};

type ConversationTurn = {
  role: "user" | "assistant";
  text: string;
  created_at: string;
  audio_base64?: string | null;
  audio_url?: string | null;
  audio_pending?: boolean;
  audio_job_id?: string | null;
};

type AgentConversationResponse = {
  conversation_history: ConversationTurn[];
  assistant_turn: ConversationTurn;
  response_time_ms: number;
  conversation_ready: boolean;
};

type AgentConversationResetResponse = {
  conversation_history: ConversationTurn[];
  conversation_ready: boolean;
};

type AgentThinkingAudioResponse = {
  text: string;
  audio_url: string;
};

type AgentConversationAudioStatusResponse = {
  status: "queued" | "generating" | "ready" | "error";
  audio_url?: string | null;
  error?: string | null;
};

type TelephonyHealth = {
  status: "ok";
  mode: string;
  voice_daemon_healthy: boolean;
  public_base_url_configured: boolean;
  vapi_api_key_present: boolean;
  phone_number_id_masked?: string | null;
  assistant_id_present: boolean;
  webhook_auth_configured: boolean;
};

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

type ThesisProject = {
  id: number;
  active_step: string;
  demo_mode: boolean;
  credits_required: boolean;
  phone_provider: string;
  live_phone_ready: boolean;
  voice_profile_name?: string | null;
  reference_clips: ReferenceClipItem[];
  consent: ConsentState;
  voice_profile: VoiceProfileState;
  agent_config: AgentConfig;
  phone_config: PhoneConfig;
  talknow_guide: TalkNowGuideStep[];
  test_results: TestCallResult[];
  created_at: string;
  updated_at: string;
};

type SelectedFiles = Record<string, File | null>;

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000";
type ConsentCheckboxField =
  | "confirmed_owner"
  | "consent_to_clone"
  | "consent_to_delete"
  | "consent_business_use"
  | "acknowledged_disclosure";

const formatTimestamp = (value?: string | null) => {
  if (!value) return "Not yet";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

const statusLabel = (status: VoiceProfileState["status"]) => {
  switch (status) {
    case "recording":
      return "Reference clips uploaded";
    case "ready":
      return "Ready";
    case "generating":
      return "Generating local clone";
    case "ready_for_agent":
      return "Clone ready";
    case "error":
      return "Needs attention";
    default:
      return "Not started";
  }
};

export default function Thesis() {
  const { token, user } = useAuth();
  const [project, setProject] = useState<ThesisProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFiles>({});
  const [previewText, setPreviewText] = useState(
    "Thank you for calling. This is my locally cloned business phone voice speaking through the thesis demo."
  );
  const [telephonyHealth, setTelephonyHealth] = useState<TelephonyHealth | null>(null);
  const [telephonyLoading, setTelephonyLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [liveModeEnabled, setLiveModeEnabled] = useState(false);
  const [autoStopOnSilence, setAutoStopOnSilence] = useState(false);
  const [assistantSpeaking, setAssistantSpeaking] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [liveStatus, setLiveStatus] = useState("Microphone off");
  const [responseProgress, setResponseProgress] = useState(0);
  const [responseTimeMs, setResponseTimeMs] = useState<number | null>(null);
  const [audioRendering, setAudioRendering] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const assistantAudioRef = useRef<HTMLAudioElement | null>(null);
  const thinkingAudioRef = useRef<HTMLAudioElement | null>(null);
  const thinkingAudioLoadingRef = useRef(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const responseProgressIntervalRef = useRef<number | null>(null);
  const thinkingTimerRef = useRef<number | null>(null);
  const transcriptBufferRef = useRef("");
  const shouldSubmitOnEndRef = useRef(false);
  const liveModeRef = useRef(false);
  const assistantSpeakingRef = useRef(false);
  const autoStopOnSilenceRef = useRef(false);
  const silenceSinceRef = useRef<number | null>(null);
  const autoStopTriggeredRef = useRef(false);

  const consentComplete =
    !!project?.consent.confirmed_owner &&
    !!project?.consent.consent_to_clone &&
    !!project?.consent.consent_to_delete &&
    !!project?.consent.consent_business_use &&
    !!project?.consent.acknowledged_disclosure;

  const referenceClips = useMemo(() => {
    const saved = new Map((project?.reference_clips || []).map((item) => [item.clip_id, item]));
    return REFERENCE_CLIPS.map((clip) => {
      const current = saved.get(clip.id);
      return {
        clip_id: clip.id,
        label: clip.label,
        prompt: clip.prompt,
        completed: current?.completed || false,
        clip_label: current?.clip_label || null,
        file_path: current?.file_path || null,
        recorded_at: current?.recorded_at || null,
        duration_seconds: current?.duration_seconds || null,
      };
    });
  }, [project?.reference_clips]);

  const completedClipCount = referenceClips.filter((item) => item.completed).length;
  const activeStep = project?.active_step || "overview";
  const previewAudioUrl = project?.voice_profile.preview_audio_base64
    ? `data:audio/wav;base64,${project.voice_profile.preview_audio_base64}`
    : null;
  const generationTarget = project?.voice_profile.generation_target || 1000;
  const generationProgress = Math.min(project?.voice_profile.generation_progress || 0, generationTarget);
  const generationProgressPercent = generationTarget ? Math.round((generationProgress / generationTarget) * 100) : 0;
  const telephonyChecks = telephonyHealth
    ? [
        { label: "API reachable", complete: telephonyHealth.status === "ok" },
        { label: "Direct mode enabled", complete: telephonyHealth.mode === "direct" },
        { label: "Public URL configured", complete: telephonyHealth.public_base_url_configured },
        { label: "Vapi API key loaded", complete: telephonyHealth.vapi_api_key_present },
        { label: "Voice daemon ready", complete: telephonyHealth.voice_daemon_healthy },
      ]
    : [];
  const telephonyProgress = telephonyChecks.length
    ? Math.round((telephonyChecks.filter((item) => item.complete).length / telephonyChecks.length) * 100)
    : 0;
  const liveOrbScale = 1 + Math.min(audioLevel, 1) * 0.55;
  const liveOrbClassName = `thesis-live-orb ${
    assistantSpeaking ? "is-speaking" : listening ? "is-listening" : liveModeEnabled ? "is-ready" : ""
  }`;
  const conversationFastReady = !!project?.voice_profile.conversation_cache_ready;

  useEffect(() => {
    const loadProject = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/thesis/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Unable to load the thesis setup.");
        }

        const data = (await res.json()) as ThesisProject;
        setProject(data);
        setPreviewText(
          data.voice_profile.preview_text ||
            "Thank you for calling. This is my locally cloned business phone voice speaking through the thesis demo."
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load the thesis setup.");
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [token]);

  useEffect(() => {
    if (activeStep !== "review") return;

    let cancelled = false;
    const loadTelephonyHealth = async () => {
      setTelephonyLoading(true);
      try {
        const res = await fetch(`${API_BASE}/telephony/vapi/health`, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          throw new Error("Unable to load telephony readiness.");
        }

        const data = (await res.json()) as TelephonyHealth;
        if (!cancelled) {
          setTelephonyHealth(data);
        }
      } catch {
        if (!cancelled) {
          setTelephonyHealth(null);
        }
      } finally {
        if (!cancelled) {
          setTelephonyLoading(false);
        }
      }
    };

    void loadTelephonyHealth();
    const intervalId = window.setInterval(() => {
      void loadTelephonyHealth();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeStep]);

  useEffect(() => {
    if (!token || activeStep !== "conversation" || project?.voice_profile.status !== "ready_for_agent") return;
    void fetch(`${API_BASE}/thesis/agent/thinking-audio`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }).catch(() => undefined);
  }, [activeStep, project?.voice_profile.status, token]);

  useEffect(() => {
    if (!token || activeStep !== "consent") return;
    if (project?.voice_profile.status !== "generating") return;

    let cancelled = false;
    const pollStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/thesis/voice-profile/status`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Unable to refresh voice generation status.");
        }
        const data = (await res.json()) as ThesisProject;
        if (!cancelled) {
          setProject(data);
          if (data.voice_profile.preview_text) {
            setPreviewText(data.voice_profile.preview_text);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to refresh voice generation status.");
        }
      }
    };

    void pollStatus();
    const intervalId = window.setInterval(() => {
      void pollStatus();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeStep, project?.voice_profile.status, token]);

  useEffect(() => {
    if (!token || activeStep !== "conversation") return;
    if (project?.voice_profile.status !== "ready_for_agent") return;
    if (project?.voice_profile.conversation_cache_ready) return;

    let cancelled = false;
    const pollConversationReadiness = async () => {
      try {
        const res = await fetch(`${API_BASE}/thesis/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        if (!res.ok) {
          throw new Error("Unable to refresh conversation readiness.");
        }
        const data = (await res.json()) as ThesisProject;
        if (!cancelled) {
          setProject(data);
        }
      } catch {
        // keep existing state; readiness will retry on next poll
      }
    };

    void pollConversationReadiness();
    const intervalId = window.setInterval(() => {
      void pollConversationReadiness();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeStep, project?.voice_profile.conversation_cache_ready, project?.voice_profile.status, token]);

  useEffect(() => {
    liveModeRef.current = liveModeEnabled;
  }, [liveModeEnabled]);

  useEffect(() => {
    autoStopOnSilenceRef.current = autoStopOnSilence;
  }, [autoStopOnSilence]);

  useEffect(() => {
    assistantSpeakingRef.current = assistantSpeaking;
  }, [assistantSpeaking]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      if (assistantAudioRef.current) {
        assistantAudioRef.current.pause();
      }
      if (thinkingAudioRef.current) {
        thinkingAudioRef.current.pause();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
      }
      if (responseProgressIntervalRef.current !== null) {
        window.clearInterval(responseProgressIntervalRef.current);
      }
      if (thinkingTimerRef.current !== null) {
        window.clearTimeout(thinkingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (activeStep === "conversation") return;
    if (!liveModeRef.current) return;
    void stopLiveMode();
  }, [activeStep]);

  const persistProject = async (
    partial: Partial<Pick<ThesisProject, "active_step" | "consent" | "voice_profile" | "agent_config" | "phone_config" | "test_results">>
  ) => {
    if (!token || !project) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/thesis/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(partial),
      });

      if (!res.ok) throw new Error("Unable to save thesis setup.");

      const next = (await res.json()) as ThesisProject;
      setProject(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save thesis setup.");
    } finally {
      setSaving(false);
    }
  };

  const updateStep = async (stepId: string) => {
    if (!project) return;
    setProject({ ...project, active_step: stepId });
    await persistProject({ active_step: stepId });
  };

  const uploadClip = async (clipId: string) => {
    if (!token) return;
    const file = selectedFiles[clipId];
    const clip = REFERENCE_CLIPS.find((item) => item.id === clipId);
    if (!file || !clip) {
      setError("Choose a WAV reference file before uploading.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".wav")) {
      setError("The local clone backend requires WAV reference files.");
      return;
    }

    const formData = new FormData();
    formData.append("clip_id", clip.id);
    formData.append("label", clip.label);
    formData.append("prompt", clip.prompt);
    formData.append("duration_seconds", "");
    formData.append("file", file);

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/thesis/reference-clips/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to upload the reference clip.");
      }

      const next = (await res.json()) as ThesisProject;
      setProject(next);
      setSelectedFiles((current) => ({ ...current, [clipId]: null }));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload the reference clip.");
    } finally {
      setSaving(false);
    }
  };

  const toggleConsent = (field: ConsentCheckboxField) => {
    if (!project) return;
    const nextConsent = { ...project.consent, [field]: !project.consent[field] };
    if (
      nextConsent.confirmed_owner &&
      nextConsent.consent_to_clone &&
      nextConsent.consent_to_delete &&
      nextConsent.consent_business_use &&
      nextConsent.acknowledged_disclosure
    ) {
      nextConsent.completed_at = new Date().toISOString();
    }
    setProject({ ...project, consent: nextConsent });
  };

  const updateConsentField = (value: string) => {
    if (!project) return;
    setProject({ ...project, consent: { ...project.consent, profile_name: value } });
  };

  const saveConsent = async () => {
    if (!project) return;
    await persistProject({ consent: project.consent });
  };

  const generateClone = async () => {
    if (!token || !project) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/thesis/voice-profile/generate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          attach_to_agent: true,
          preview_text: previewText,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to start the local voice clone generation.");
      }

      const next = (await res.json()) as ThesisProject;
      setProject(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start the local voice clone generation.");
    } finally {
      setSaving(false);
    }
  };

  const regeneratePreview = async () => {
    if (!token) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/thesis/voice-preview`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text: previewText }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to regenerate the voice preview.");
      }

      const next = (await res.json()) as ThesisProject;
      setProject(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to regenerate the voice preview.");
    } finally {
      setSaving(false);
    }
  };

  const updateAgentField = (field: keyof AgentConfig, value: string) => {
    if (!project) return;
    setProject({ ...project, agent_config: { ...project.agent_config, [field]: value } });
  };

  const saveAgent = async () => {
    if (!project) return;
    await persistProject({ agent_config: project.agent_config });
  };

  const updatePhoneField = (field: keyof PhoneConfig, value: string | boolean) => {
    if (!project) return;
    setProject({ ...project, phone_config: { ...project.phone_config, [field]: value } });
  };

  const savePhone = async () => {
    if (!project) return;
    await persistProject({ phone_config: project.phone_config });
  };

  const runScenario = async (scenarioId: string) => {
    if (!token) return;
    const scenario = TEST_SCENARIOS.find((item) => item.id === scenarioId);
    if (!scenario) return;

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/thesis/test-call`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          caller: scenario.caller,
        }),
      });

      if (!res.ok) throw new Error("Unable to run the test call.");

      const next = (await res.json()) as ThesisProject;
      setProject(next);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to run the test call.");
    } finally {
      setSaving(false);
    }
  };

  const startResponseProgress = () => {
    if (responseProgressIntervalRef.current !== null) {
      window.clearInterval(responseProgressIntervalRef.current);
    }
    setResponseProgress(12);
    responseProgressIntervalRef.current = window.setInterval(() => {
      setResponseProgress((current) => {
        if (current < 55) return current + 11;
        if (current < 78) return current + 6;
        if (current < 90) return current + 3;
        if (current < 97) return current + 1;
        return current;
      });
    }, 300);
  };

  const startAudioRenderProgress = () => {
    if (responseProgressIntervalRef.current !== null) {
      window.clearInterval(responseProgressIntervalRef.current);
    }
    setResponseProgress((current) => Math.max(current, 82));
    responseProgressIntervalRef.current = window.setInterval(() => {
      setResponseProgress((current) => {
        if (current < 90) return current + 2;
        if (current < 97) return current + 1;
        return current;
      });
    }, 450);
  };

  const completeResponseProgress = () => {
    if (responseProgressIntervalRef.current !== null) {
      window.clearInterval(responseProgressIntervalRef.current);
      responseProgressIntervalRef.current = null;
    }
    setResponseProgress(100);
    window.setTimeout(() => {
      setResponseProgress(0);
    }, 500);
  };

  const resetConversation = async () => {
    if (!project || !token) return;
    setResponseTimeMs(null);
    try {
      const res = await fetch(`${API_BASE}/thesis/agent/reset`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Unable to reset the conversation.");
      }

      const next = (await res.json()) as AgentConversationResetResponse;
      setProject({
        ...project,
        voice_profile: {
          ...project.voice_profile,
          conversation_history: next.conversation_history,
          conversation_ready: next.conversation_ready,
        },
      });
      setChatInput("");
      setLiveTranscript("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reset the conversation.");
    }
  };

  const playAssistantAudio = async (audioBase64?: string | null, audioUrl?: string | null) => {
    if (assistantAudioRef.current) {
      assistantAudioRef.current.pause();
      assistantAudioRef.current = null;
    }
    if (thinkingAudioRef.current) {
      thinkingAudioRef.current.pause();
      thinkingAudioRef.current = null;
    }

    let objectUrl: string | null = null;
    let sourceUrl = audioBase64 ? `data:audio/wav;base64,${audioBase64}` : null;
    if (audioUrl) {
      const res = await fetch(`${API_BASE}${audioUrl}`, {
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
      if (!res.ok) {
        throw new Error("Unable to load assistant audio.");
      }
      const audioBlob = await res.blob();
      objectUrl = URL.createObjectURL(audioBlob);
      sourceUrl = objectUrl;
    }

    if (!sourceUrl) {
      throw new Error("No assistant audio source available.");
    }

    const audio = new Audio(sourceUrl);
    assistantAudioRef.current = audio;
    setAssistantSpeaking(true);
    setLiveStatus("Agent speaking");

    audio.onended = () => {
      assistantAudioRef.current = null;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setAssistantSpeaking(false);
      setLiveStatus(liveModeRef.current ? "Ready for you to speak again" : "Reply finished");
    };

    audio.onerror = () => {
      assistantAudioRef.current = null;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setAssistantSpeaking(false);
      setLiveStatus(liveModeRef.current ? "Ready for you to speak again" : "Audio playback failed");
    };

    await audio.play();
  };

  const stopThinkingAudio = () => {
    if (thinkingTimerRef.current !== null) {
      window.clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = null;
    }
    thinkingAudioLoadingRef.current = false;
    if (thinkingAudioRef.current) {
      thinkingAudioRef.current.pause();
      thinkingAudioRef.current = null;
    }
  };

  const playThinkingAudio = async () => {
    if (!token || thinkingAudioRef.current || thinkingAudioLoadingRef.current || assistantAudioRef.current) return;
    thinkingAudioLoadingRef.current = true;
    try {
      const res = await fetch(`${API_BASE}/thesis/agent/thinking-audio`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        thinkingAudioLoadingRef.current = false;
        return;
      }
      const payload = (await res.json()) as AgentThinkingAudioResponse;
      const audioRes = await fetch(`${API_BASE}${payload.audio_url}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "audio/wav",
        },
      });
      if (!audioRes.ok) {
        thinkingAudioLoadingRef.current = false;
        return;
      }
      const audioBlob = await audioRes.blob();
      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      thinkingAudioLoadingRef.current = false;
      thinkingAudioRef.current = audio;
      setLiveStatus(payload.text);
      audio.onended = () => {
        if (thinkingAudioRef.current === audio) {
          thinkingAudioRef.current = null;
        }
        URL.revokeObjectURL(objectUrl);
      };
      audio.onerror = () => {
        if (thinkingAudioRef.current === audio) {
          thinkingAudioRef.current = null;
        }
        thinkingAudioLoadingRef.current = false;
        URL.revokeObjectURL(objectUrl);
      };
      await audio.play().catch(() => {
        if (thinkingAudioRef.current === audio) {
          thinkingAudioRef.current = null;
        }
        thinkingAudioLoadingRef.current = false;
        URL.revokeObjectURL(objectUrl);
      });
    } catch {
      thinkingAudioLoadingRef.current = false;
    }
  };

  const resolvePendingAssistantAudio = async (jobId: string) => {
    try {
      setAudioRendering(true);
      setLiveStatus("Rendering cloned voice...");
      startAudioRenderProgress();
      await playThinkingAudio();
      const generatedAudioUrl = await waitForAssistantAudio(jobId);
      setProject((current) => {
        if (!current) return current;
        const conversationHistory = [...current.voice_profile.conversation_history];
        if (conversationHistory.length > 0) {
          const lastTurn = conversationHistory[conversationHistory.length - 1];
          if (lastTurn.role === "assistant") {
            conversationHistory[conversationHistory.length - 1] = {
              ...lastTurn,
              audio_pending: false,
              audio_job_id: null,
              audio_url: generatedAudioUrl,
            };
          }
        }
        return {
          ...current,
          voice_profile: {
            ...current.voice_profile,
            conversation_history: conversationHistory,
          },
        };
      });
      stopThinkingAudio();
      await playAssistantAudio(undefined, generatedAudioUrl);
    } catch {
      stopThinkingAudio();
      setLiveStatus(liveModeRef.current ? "Reply text is ready. Voice playback failed." : "Reply text is ready");
      setAssistantSpeaking(false);
    } finally {
      completeResponseProgress();
      setAudioRendering(false);
    }
  };

  const waitForAssistantAudio = async (jobId: string) => {
    if (!token) return null;
    const startedAt = Date.now();
    while (Date.now() - startedAt < 45000) {
      const res = await fetch(`${API_BASE}/thesis/agent/audio-status/${jobId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (!res.ok) {
        throw new Error("Unable to check assistant audio status.");
      }
      const payload = (await res.json()) as AgentConversationAudioStatusResponse;
      if (payload.status === "ready" && payload.audio_url) {
        return payload.audio_url;
      }
      if (payload.status === "error") {
        throw new Error(payload.error || "Assistant audio generation failed.");
      }
      await new Promise((resolve) => {
        window.setTimeout(resolve, 400);
      });
    }
    throw new Error("Assistant audio generation timed out.");
  };

  const sendConversation = async (messageText?: string) => {
    if (!token || !project) return;
    const nextText = (messageText ?? chatInput).trim();
    if (!nextText) return;

    setChatBusy(true);
    setAudioRendering(false);
    setResponseTimeMs(null);
    startResponseProgress();
    setLiveStatus(liveModeRef.current ? "Processing your speech..." : "Generating response...");
    thinkingTimerRef.current = window.setTimeout(() => {
      void playThinkingAudio();
    }, 350);
    try {
      const res = await fetch(`${API_BASE}/thesis/agent/respond`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ text: nextText }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Unable to talk to the thesis agent.");
      }

      const next = (await res.json()) as AgentConversationResponse;
      setProject({
        ...project,
        voice_profile: {
          ...project.voice_profile,
          conversation_history: next.conversation_history,
          conversation_ready: next.conversation_ready,
          preview_available: true,
          preview_text: next.assistant_turn.text,
          preview_audio_base64: null,
          generated_at: new Date().toISOString(),
        },
      });
      setResponseTimeMs(next.response_time_ms);
      if (!messageText) {
        setChatInput("");
      }
      setLiveTranscript("");
      setError(null);
      setChatBusy(false);

      if (next.assistant_turn?.audio_base64 || next.assistant_turn?.audio_url) {
        stopThinkingAudio();
        completeResponseProgress();
        try {
          await playAssistantAudio(next.assistant_turn.audio_base64, next.assistant_turn.audio_url);
        } catch {
          setLiveStatus(liveModeRef.current ? "Ready for you to speak again" : "Reply ready");
          setAssistantSpeaking(false);
        }
      } else if (next.assistant_turn?.audio_pending && next.assistant_turn.audio_job_id) {
        setLiveStatus("Reply ready. Generating cloned voice...");
        void resolvePendingAssistantAudio(next.assistant_turn.audio_job_id);
      } else {
        stopThinkingAudio();
        completeResponseProgress();
        setLiveStatus(liveModeRef.current ? "Ready for you to speak again" : "Reply ready");
      }
    } catch (err) {
      stopThinkingAudio();
      setError(err instanceof Error ? err.message : "Unable to talk to the thesis agent.");
      setLiveStatus(liveModeRef.current ? "Response failed, try speaking again" : "Response failed");
      completeResponseProgress();
      setChatBusy(false);
    } finally {
      stopRecognitionSession();
    }
  };

  const stopRecognitionSession = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore stop failures from already-closed sessions
      }
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const startAudioVisualizer = async () => {
    if (mediaStreamRef.current && analyserRef.current && audioContextRef.current) {
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaStreamRef.current = stream;

    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      throw new Error("This browser does not support live audio analysis.");
    }

    const audioContext = new AudioContextCtor();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);

    audioContextRef.current = audioContext;
    analyserRef.current = analyser;

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    const updateLevel = () => {
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i += 1) {
        const normalized = (buffer[i] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / buffer.length);
      setAudioLevel(Math.min(rms * 4.5, 1));
      if (listening && autoStopOnSilenceRef.current && !autoStopTriggeredRef.current) {
        const heardText = transcriptBufferRef.current.trim();
        if (rms < 0.035) {
          if (silenceSinceRef.current === null) {
            silenceSinceRef.current = performance.now();
          } else if (heardText && performance.now() - silenceSinceRef.current >= 1000) {
            autoStopTriggeredRef.current = true;
            stopSpeaking();
          }
        } else {
          silenceSinceRef.current = null;
        }
      } else {
        silenceSinceRef.current = null;
      }
      animationFrameRef.current = window.requestAnimationFrame(updateLevel);
    };

    animationFrameRef.current = window.requestAnimationFrame(updateLevel);
  };

  const startRecognitionSession = async () => {
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setError("This browser does not support speech recognition. Use the text input instead.");
      throw new Error("Speech recognition unavailable");
    }

    const recognition = new RecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = true;
    transcriptBufferRef.current = "";
    shouldSubmitOnEndRef.current = false;
    silenceSinceRef.current = null;
    autoStopTriggeredRef.current = false;
    setLiveTranscript("");
    recognition.onresult = (event: any) => {
      const results = Array.from(event.results || []);
      const transcript = results
        .map((result: any) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();
      if (!transcript) return;
      transcriptBufferRef.current = transcript;
      setLiveTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      if (event?.error === "aborted") return;
      setError("Microphone capture failed. Check browser microphone permissions and try again.");
      setLiveStatus("Microphone error");
    };
    recognition.onend = () => {
      setListening(false);
      silenceSinceRef.current = null;
      autoStopTriggeredRef.current = false;
      const finalTranscript = transcriptBufferRef.current.trim();
      if (shouldSubmitOnEndRef.current && finalTranscript) {
        shouldSubmitOnEndRef.current = false;
        transcriptBufferRef.current = "";
        setLiveTranscript("");
        setLiveStatus("Processing your speech...");
        void sendConversation(finalTranscript);
        return;
      }
      shouldSubmitOnEndRef.current = false;
      setLiveStatus(liveModeRef.current ? "Ready for you to speak" : "Microphone off");
    };
    recognitionRef.current = recognition;
    setListening(true);
    setLiveStatus("Listening while you speak...");
    recognition.start();
  };

  const stopSpeaking = () => {
    if (!recognitionRef.current) return;
    shouldSubmitOnEndRef.current = true;
    recognitionRef.current.stop();
    setListening(false);
    silenceSinceRef.current = null;
    setLiveStatus("Finishing capture...");
  };

  const stopLiveMode = async () => {
    liveModeRef.current = false;
    setLiveModeEnabled(false);
    stopRecognitionSession();
    if (assistantAudioRef.current) {
      assistantAudioRef.current.pause();
      assistantAudioRef.current = null;
    }
    stopThinkingAudio();
    setAssistantSpeaking(false);
    setAudioLevel(0);
    setLiveStatus("Microphone off");

    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => undefined);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    transcriptBufferRef.current = "";
    shouldSubmitOnEndRef.current = false;
    silenceSinceRef.current = null;
    autoStopTriggeredRef.current = false;
    setChatInput("");
    setLiveTranscript("");
  };

  const toggleLiveMode = async () => {
    if (liveModeRef.current) {
      await stopLiveMode();
      return;
    }

    try {
      await startAudioVisualizer();
      liveModeRef.current = true;
      setLiveModeEnabled(true);
      setError(null);
      await resetConversation();
      setLiveStatus("Ready for you to speak");
    } catch (err) {
      await stopLiveMode();
      setError(err instanceof Error ? err.message : "Unable to start live conversation mode.");
    }
  };

  const startSpeaking = async () => {
    if (!liveModeRef.current || chatBusy || assistantSpeaking || project?.voice_profile.status !== "ready_for_agent") return;
    try {
      setError(null);
      await startRecognitionSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to start speech capture.");
    }
  };

  if (loading) {
    return (
      <main className="home">
        <div className="site-page thesis-page">
          <div className="thesis-loading-card">Loading thesis voice agent workspace...</div>
        </div>
      </main>
    );
  }

  if (!project || !user) {
    return (
      <main className="home">
        <div className="site-page thesis-page">
          <div className="thesis-loading-card">You need to be signed in to use the thesis voice agent workspace.</div>
        </div>
      </main>
    );
  }

  return (
    <main className="home">
      <div className="site-page thesis-page">
        <header className="page-header thesis-hero">
          <div className="thesis-hero__badges">
            <span className="pill">Thesis Voice Agent</span>
            <span className="thesis-badge thesis-badge--demo">Local Clone Mode</span>
            <span className="thesis-badge thesis-badge--muted">No credits, no paid TTS API</span>
          </div>
          <h1>Clone the user&apos;s voice locally and attach it to the thesis phone agent.</h1>
          <p className="subtitle">
            This thesis workspace now uses a local zero-shot voice cloning backend, consent-gated setup,
            a Vapi inbound setup guide, and your business demo number {project.phone_config.phone_number}.
          </p>
          <div className="thesis-hero__stats">
            <div className="thesis-stat-card">
              <strong>{completedClipCount}</strong>
              <span>Reference clips uploaded</span>
            </div>
            <div className="thesis-stat-card">
              <strong>{statusLabel(project.voice_profile.status)}</strong>
              <span>Voice clone status</span>
            </div>
            <div className="thesis-stat-card">
              <strong>{project.phone_config.phone_number}</strong>
              <span>Vapi inbound number</span>
            </div>
            <div className="thesis-stat-card">
              <strong>{project.phone_provider}</strong>
              <span>Phone provider path</span>
            </div>
          </div>
        </header>

        <section className="thesis-stepper" aria-label="Thesis setup steps">
          {THESIS_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`thesis-stepper__item ${activeStep === step.id ? "is-active" : ""}`}
              onClick={() => void updateStep(step.id)}
            >
              <span className="thesis-stepper__index">0{index + 1}</span>
              <span className="thesis-stepper__content">
                <strong>{step.label}</strong>
                <span>{step.description}</span>
              </span>
            </button>
          ))}
        </section>

        {error ? <div className="thesis-inline-alert">{error}</div> : null}

        <section className="thesis-shell">
          <div className="thesis-main-card">
            {activeStep === "overview" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Overview</h2>
                    <p>Capture a few natural reference clips, generate a local voice clone on CPU, connect the business number through Vapi, and test the phone agent end to end.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("voice")}>
                    Start voice clone setup
                  </button>
                </div>
                <div className="thesis-intro-grid">
                  <article className="thesis-info-card">
                    <h3>Exact-voice goal</h3>
                    <p>The flow now targets voice cloning from real reference audio instead of fixed phrase prompts, so arbitrary text can be spoken back in the cloned voice.</p>
                  </article>
                  <article className="thesis-info-card">
                    <h3>Free local backend</h3>
                    <p>The backend uses an open-source local model path rather than a paid speech API. Generation runs on CPU and produces WAV output for preview.</p>
                  </article>
                  <article className="thesis-info-card">
                    <h3>Vapi inbound setup</h3>
                    <p>The phone setup step now guides the user through configuring the real thesis number in Vapi: {project.phone_config.phone_number}.</p>
                  </article>
                </div>
              </div>
            ) : null}

            {activeStep === "voice" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Reference audio for voice cloning</h2>
                    <p>Upload clean WAV clips in the user&apos;s real voice. Natural speech works better than reading synthetic prompts for this local clone path.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("consent")}>
                    Continue to consent
                  </button>
                </div>

                <div className="thesis-checklist">
                  <div>
                    <strong>WAV only</strong>
                    <p>The current local backend is wired for WAV uploads because that is the most reliable free path without adding media transcoding infrastructure.</p>
                  </div>
                  <div>
                    <strong>Quiet environment</strong>
                    <p>Use a single speaker, low background noise, and natural speaking cadence for the best clone quality.</p>
                  </div>
                  <div>
                    <strong>Minimum for generation</strong>
                    <p>One good clip is enough to generate a first preview, but two or three cleaner clips make the thesis demo more credible.</p>
                  </div>
                </div>

                <div className="thesis-phrase-grid">
                  {REFERENCE_CLIPS.map((clip) => {
                    const current = referenceClips.find((item) => item.clip_id === clip.id);
                    return (
                      <article key={clip.id} className={`thesis-phrase-card ${current?.completed ? "is-complete" : ""}`}>
                        <div>
                          <h3>{clip.label}</h3>
                          <p>{clip.prompt}</p>
                        </div>
                        <div className="thesis-phrase-meta">
                          <span>{clip.targetDuration}</span>
                          <span>{current?.recorded_at ? formatTimestamp(current.recorded_at) : "Not uploaded yet"}</span>
                        </div>
                        <label className="thesis-file-field">
                          <span>Select WAV file</span>
                          <input
                            type="file"
                            accept=".wav,audio/wav"
                            onChange={(event) =>
                              setSelectedFiles((files) => ({
                                ...files,
                                [clip.id]: event.target.files?.[0] || null,
                              }))
                            }
                          />
                        </label>
                        <div className="thesis-phrase-actions">
                          <button type="button" className="thesis-button thesis-button--primary" onClick={() => void uploadClip(clip.id)}>
                            Upload reference clip
                          </button>
                        </div>
                        <div className="thesis-audio-placeholder">
                          {current?.clip_label ? `Stored clip: ${current.clip_label}` : "Upload a WAV file to use this slot as voice-clone reference audio."}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeStep === "consent" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Consent and local clone generation</h2>
                    <p>Complete explicit consent, then generate arbitrary speech in the uploaded voice using the local backend.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("agent")}>
                    Continue to agent config
                  </button>
                </div>

                <div className="thesis-summary-card">
                  <span className="thesis-summary-card__label">Generation progress</span>
                  <h3>Stage 3 voice readiness</h3>
                  <div className="thesis-progress">
                    <div className="thesis-progress__label">
                      <strong>{generationProgress} / {generationTarget}</strong>
                      <span>{generationProgressPercent}% complete</span>
                    </div>
                    <div className="thesis-progress__track">
                      <span style={{ width: `${generationProgressPercent}%` }} />
                    </div>
                  </div>
                  <p>
                    {project.voice_profile.status === "generating"
                      ? "The local exact-voice clone is building now. This uses the slower high-quality path that produced the 1:04 sample."
                      : project.voice_profile.notes || "Generation has not started yet."}
                  </p>
                </div>

                <div className="thesis-form-grid">
                  <label className="thesis-field">
                    <span>Voice profile name</span>
                    <input
                      value={project.consent.profile_name || ""}
                      onChange={(event) => updateConsentField(event.target.value)}
                      placeholder="Exact Voice Thesis Clone"
                    />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Preview text for generated speech</span>
                    <textarea rows={4} value={previewText} onChange={(event) => setPreviewText(event.target.value)} />
                  </label>
                </div>

                <div className="thesis-consent-list">
                  <label><input type="checkbox" checked={project.consent.confirmed_owner} onChange={() => toggleConsent("confirmed_owner")} /> I confirm this is my voice or I have permission to clone it.</label>
                  <label><input type="checkbox" checked={project.consent.consent_to_clone} onChange={() => toggleConsent("consent_to_clone")} /> I consent to creating a local voice clone from these recordings for this thesis project.</label>
                  <label><input type="checkbox" checked={project.consent.consent_to_delete} onChange={() => toggleConsent("consent_to_delete")} /> I understand the voice clone and source recordings can be deleted later.</label>
                  <label><input type="checkbox" checked={project.consent.consent_business_use} onChange={() => toggleConsent("consent_business_use")} /> I understand the cloned voice will be used for a business phone agent demo.</label>
                  <label><input type="checkbox" checked={project.consent.acknowledged_disclosure} onChange={() => toggleConsent("acknowledged_disclosure")} /> I understand callers should be told when an AI phone agent answers in this voice.</label>
                </div>

                <div className="thesis-form-actions">
                  <button type="button" className="thesis-button" onClick={() => void saveConsent()}>
                    Save consent
                  </button>
                  <button
                    type="button"
                    className="thesis-button thesis-button--primary"
                    onClick={() => void generateClone()}
                    disabled={!consentComplete || completedClipCount === 0 || saving}
                  >
                    {saving ? "Generating..." : "Generate local voice clone"}
                  </button>
                  <button
                    type="button"
                    className="thesis-button thesis-button--ghost"
                    onClick={() => void regeneratePreview()}
                    disabled={completedClipCount === 0 || saving}
                  >
                    Regenerate preview audio
                  </button>
                </div>

                <div className="thesis-summary-card">
                  <div>
                    <span className="thesis-summary-card__label">Voice clone summary</span>
                    <h3>{project.voice_profile_name || project.consent.profile_name || "Clone not named yet"}</h3>
                  </div>
                  <div className="thesis-summary-grid">
                    <div><strong>{completedClipCount}</strong><span>Reference clips</span></div>
                    <div><strong>{consentComplete ? "Confirmed" : "Pending"}</strong><span>Consent status</span></div>
                    <div><strong>{statusLabel(project.voice_profile.status)}</strong><span>Clone state</span></div>
                    <div><strong>{formatTimestamp(project.voice_profile.generated_at)}</strong><span>Last generation</span></div>
                  </div>
                  <p>{project.voice_profile.notes || "Upload voice references and generate a local preview."}</p>
                  {previewAudioUrl ? (
                    <div className="thesis-preview-player">
                      <audio controls preload="none" src={previewAudioUrl}>
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activeStep === "agent" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Business phone agent configuration</h2>
                    <p>Define how the agent should answer once Vapi routes calls into the thesis stack.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("phone")}>
                    Continue to phone setup
                  </button>
                </div>
                <div className="thesis-form-grid thesis-form-grid--two">
                  <label className="thesis-field">
                    <span>Agent name</span>
                    <input value={project.agent_config.agent_name} onChange={(event) => updateAgentField("agent_name", event.target.value)} />
                  </label>
                  <label className="thesis-field">
                    <span>Business name</span>
                    <input value={project.agent_config.business_name} onChange={(event) => updateAgentField("business_name", event.target.value)} />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Greeting script</span>
                    <textarea rows={3} value={project.agent_config.greeting_script} onChange={(event) => updateAgentField("greeting_script", event.target.value)} />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Business description</span>
                    <textarea rows={3} value={project.agent_config.business_description} onChange={(event) => updateAgentField("business_description", event.target.value)} />
                  </label>
                  <label className="thesis-field">
                    <span>Business hours</span>
                    <input value={project.agent_config.business_hours} onChange={(event) => updateAgentField("business_hours", event.target.value)} />
                  </label>
                  <label className="thesis-field">
                    <span>Call objective</span>
                    <input value={project.agent_config.call_objective} onChange={(event) => updateAgentField("call_objective", event.target.value)} />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Fallback behavior</span>
                    <textarea rows={3} value={project.agent_config.fallback_behavior} onChange={(event) => updateAgentField("fallback_behavior", event.target.value)} />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Transfer instructions</span>
                    <textarea rows={3} value={project.agent_config.transfer_instructions} onChange={(event) => updateAgentField("transfer_instructions", event.target.value)} />
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>After-hours behavior</span>
                    <textarea rows={3} value={project.agent_config.after_hours_behavior} onChange={(event) => updateAgentField("after_hours_behavior", event.target.value)} />
                  </label>
                </div>
                <div className="thesis-form-actions">
                  <button type="button" className="thesis-button thesis-button--primary" onClick={() => void saveAgent()}>
                    Save agent configuration
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === "phone" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Vapi phone setup guide</h2>
                    <p>Use Vapi to attach the real thesis number to this backend, then map it to the cloned-voice phone agent.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("review")}>
                    Continue to review
                  </button>
                </div>

                <div className="thesis-phone-note">
                  <strong>Configured thesis number</strong>
                  <p>{project.phone_config.phone_number} is preloaded throughout the backend and UI as the project Vapi number.</p>
                </div>

                <div className="thesis-guide-list">
                  {project.talknow_guide.map((step, index) => (
                    <article key={step.title} className="thesis-guide-step">
                      <span>0{index + 1}</span>
                      <div>
                        <h3>{step.title}</h3>
                        <p>{step.detail}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="thesis-form-grid thesis-form-grid--two">
                  <label className="thesis-field">
                    <span>Business phone number</span>
                    <input value={project.phone_config.phone_number} onChange={(event) => updatePhoneField("phone_number", event.target.value)} />
                  </label>
                  <label className="thesis-field">
                    <span>Forwarding number</span>
                    <input value={project.phone_config.forwarding_number || ""} onChange={(event) => updatePhoneField("forwarding_number", event.target.value)} placeholder="Optional human escalation line" />
                  </label>
                  <label className="thesis-field">
                    <span>Routing mode</span>
                    <select value={project.phone_config.routing_mode} onChange={(event) => updatePhoneField("routing_mode", event.target.value)}>
                      <option value="ai_first">AI answers first</option>
                      <option value="forward_only">Forward directly</option>
                      <option value="voicemail_after_hours">Voicemail after hours</option>
                    </select>
                  </label>
                  <label className="thesis-field">
                    <span>Connection status</span>
                    <select value={project.phone_config.connection_status} onChange={(event) => updatePhoneField("connection_status", event.target.value)}>
                      <option value="demo_connected">Vapi configured / demo connected</option>
                      <option value="connected">Fully connected</option>
                      <option value="not_connected">Not connected</option>
                    </select>
                  </label>
                  <label className="thesis-field thesis-field--full">
                    <span>Vapi notes</span>
                    <textarea rows={3} value={project.phone_config.notes} onChange={(event) => updatePhoneField("notes", event.target.value)} />
                  </label>
                </div>

                <div className="thesis-toggle-row">
                  <label><input type="checkbox" checked={project.phone_config.ownership_confirmed} onChange={(event) => updatePhoneField("ownership_confirmed", event.target.checked)} /> I confirm that {project.phone_config.phone_number} is authorized for this thesis demo.</label>
                  <label><input type="checkbox" checked={project.phone_config.ai_disclosure_enabled} onChange={(event) => updatePhoneField("ai_disclosure_enabled", event.target.checked)} /> Include AI-answering disclosure in the greeting and Vapi routing experience.</label>
                </div>

                <div className="thesis-form-actions">
                  <button type="button" className="thesis-button thesis-button--primary" onClick={() => void savePhone()}>
                    Save Vapi phone setup
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === "review" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Test and review</h2>
                    <p>Show the clone status, the Vapi number, and test how the AI business phone agent will respond.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("overview")}>
                    Return to overview
                  </button>
                </div>

                <div className="thesis-review-grid">
                  <article className="thesis-review-card">
                    <h3>Voice references</h3>
                    <p>{completedClipCount} uploaded WAV clips.</p>
                  </article>
                  <article className="thesis-review-card">
                    <h3>Consent</h3>
                    <p>{consentComplete ? "All clone permissions confirmed." : "Consent still incomplete."}</p>
                  </article>
                  <article className="thesis-review-card">
                    <h3>Local clone</h3>
                    <p>{statusLabel(project.voice_profile.status)}.</p>
                  </article>
                  <article className="thesis-review-card">
                    <h3>Phone setup</h3>
                    <p>{project.phone_config.phone_number} through {project.phone_provider}.</p>
                  </article>
                </div>

                <div className="thesis-summary-card">
                  <span className="thesis-summary-card__label">Phone readiness</span>
                  <h3>Stage 6 live telephony status</h3>
                  <div className="thesis-progress">
                    <div className="thesis-progress__label">
                      <strong>{telephonyLoading ? "Refreshing..." : `${telephonyProgress}% ready`}</strong>
                      <span>{telephonyChecks.filter((item) => item.complete).length}/{telephonyChecks.length || 5} checks complete</span>
                    </div>
                    <div className="thesis-progress__track">
                      <span style={{ width: `${telephonyProgress}%` }} />
                    </div>
                  </div>
                  <div className="thesis-readiness-list">
                    {(telephonyHealth ? telephonyChecks : [
                      { label: "API reachable", complete: false },
                      { label: "Direct mode enabled", complete: false },
                      { label: "Public URL configured", complete: false },
                      { label: "Vapi API key loaded", complete: false },
                      { label: "Voice daemon ready", complete: false },
                    ]).map((item) => (
                      <div key={item.label} className={`thesis-readiness-item ${item.complete ? "is-complete" : ""}`}>
                        <strong>{item.complete ? "Ready" : "Pending"}</strong>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <p>
                    {telephonyHealth
                      ? `Live number ${project.phone_config.phone_number} is using ${telephonyHealth.mode} mode. Voice daemon: ${telephonyHealth.voice_daemon_healthy ? "ready" : "warming"}.`
                      : "Telephony readiness will populate here once the review step queries the Vapi health endpoint."}
                  </p>
                </div>

                {previewAudioUrl ? (
                  <div className="thesis-summary-card">
                    <span className="thesis-summary-card__label">Generated clone preview</span>
                    <h3>Arbitrary text spoken in the uploaded voice</h3>
                    <p>{project.voice_profile.preview_text}</p>
                    <audio controls preload="none" src={previewAudioUrl}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                ) : null}

                <div className="thesis-scenario-grid">
                  {TEST_SCENARIOS.map((scenario) => (
                    <article key={scenario.id} className="thesis-scenario-card">
                      <h3>{scenario.title}</h3>
                      <p>{scenario.intent}</p>
                      <strong>Expected outcome</strong>
                      <p>{scenario.expected}</p>
                      <button type="button" className="thesis-button thesis-button--primary" onClick={() => void runScenario(scenario.id)}>
                        Run test
                      </button>
                    </article>
                  ))}
                </div>

                <div className="thesis-transcript-panel">
                  <div className="thesis-transcript-panel__header">
                    <h3>Recent test calls</h3>
                    <span>{project.test_results.length} stored</span>
                  </div>
                  {project.test_results.length === 0 ? (
                    <p className="thesis-empty-state">Run a scenario to generate a simulated phone-agent transcript tied to the Vapi thesis number.</p>
                  ) : (
                    project.test_results.map((result) => (
                      <article key={`${result.scenario_id}-${result.created_at}`} className="thesis-transcript-card">
                        <div className="thesis-transcript-card__top">
                          <div>
                            <h4>{result.scenario_title}</h4>
                            <p>{result.caller} · {formatTimestamp(result.created_at)}</p>
                          </div>
                          <span className="thesis-badge thesis-badge--success">{result.outcome}</span>
                        </div>
                        <div className="thesis-transcript-lines">
                          {result.transcript.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>

                <div className="thesis-form-actions">
                  <button type="button" className="thesis-button thesis-button--primary" onClick={() => void updateStep("conversation")}>
                    Continue to live conversation
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === "conversation" ? (
              <div className="thesis-section">
                <div className="thesis-section__heading">
                  <div>
                    <h2>Talk to the cloned agent</h2>
                    <p>Enable live voice mode and speak naturally. The site listens, converts speech to text, generates a reply from the configured agent, then speaks it back in the cloned voice.</p>
                  </div>
                  <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void updateStep("review")}>
                    Return to review
                  </button>
                </div>

                <div className="thesis-live-panel">
                  <div className="thesis-live-panel__top">
                    <div className={liveOrbClassName} style={{ transform: `scale(${liveOrbScale})` }} />
                    <div>
                      <span className="thesis-summary-card__label">Live voice mode</span>
                      <h3>{liveModeEnabled ? "Conversation active" : "Conversation idle"}</h3>
                      <p>
                        {assistantSpeaking
                          ? "The cloned agent is responding now."
                          : audioRendering
                            ? "The reply text is ready. The cloned voice is still rendering."
                          : conversationFastReady
                            ? liveStatus
                            : "Warming common reply audio in the background. New questions still return immediately."}
                      </p>
                      {liveTranscript ? <p className="thesis-live-transcript">Heard: {liveTranscript}</p> : null}
                    </div>
                  </div>
                  <div className="thesis-progress">
                    <div className="thesis-progress__label">
                      <strong>{chatBusy || audioRendering ? `${responseProgress}%` : "Idle"}</strong>
                      <span>
                        {chatBusy
                          ? "Response generation in progress"
                          : audioRendering
                            ? "Rendering cloned voice"
                          : responseTimeMs !== null
                            ? `Last reply: ${(responseTimeMs / 1000).toFixed(2)}s`
                            : conversationFastReady
                              ? "Ready for the next turn"
                              : "Warming common replies"}
                      </span>
                    </div>
                    <div className="thesis-progress__track">
                      <span style={{ width: `${chatBusy || audioRendering ? responseProgress : conversationFastReady ? 100 : 72}%` }} />
                    </div>
                  </div>
                  <div className="thesis-form-actions">
                    <button
                      type="button"
                      className={`thesis-button ${liveModeEnabled ? "thesis-button--danger" : "thesis-button--primary"}`}
                      onClick={() => void toggleLiveMode()}
                      disabled={project.voice_profile.status !== "ready_for_agent" || chatBusy || audioRendering}
                    >
                      {liveModeEnabled ? "End live conversation" : "Start live conversation"}
                    </button>
                    <button
                      type="button"
                      className="thesis-button thesis-button--ghost"
                      onClick={() => void startSpeaking()}
                      disabled={!liveModeEnabled || listening || chatBusy || audioRendering || assistantSpeaking}
                    >
                      Start speaking
                    </button>
                    <button
                      type="button"
                      className="thesis-button thesis-button--ghost"
                      onClick={stopSpeaking}
                      disabled={!liveModeEnabled || !listening}
                    >
                      Stop speaking
                    </button>
                    <button
                      type="button"
                      className="thesis-button thesis-button--ghost"
                      onClick={() => void resetConversation()}
                      disabled={chatBusy || audioRendering}
                    >
                      Start new conversation
                    </button>
                  </div>
                  <label className="thesis-checkbox">
                    <input
                      type="checkbox"
                      checked={autoStopOnSilence}
                      onChange={(event) => setAutoStopOnSilence(event.target.checked)}
                      disabled={!liveModeEnabled || chatBusy || audioRendering}
                    />
                    <span>Auto-reply after about one second of silence</span>
                  </label>
                </div>

                <div className="thesis-conversation-layout">
                  <div className="thesis-transcript-panel">
                    <div className="thesis-transcript-panel__header">
                      <h3>Live conversation</h3>
                      <span>{project.voice_profile.conversation_history.length} turns</span>
                    </div>
                    {project.voice_profile.conversation_history.length === 0 ? (
                      <p className="thesis-empty-state">Start speaking or send a text message to hear the configured agent respond in the cloned voice.</p>
                    ) : (
                      <div className="thesis-chat-log">
                        {project.voice_profile.conversation_history.map((turn, index) => (
                          <article key={`${turn.created_at}-${index}`} className={`thesis-chat-bubble thesis-chat-bubble--${turn.role}`}>
                            <strong>{turn.role === "assistant" ? project.agent_config.agent_name : "You"}</strong>
                            <p>{turn.text}</p>
                            {turn.role === "assistant" && turn.audio_pending ? <span className="thesis-summary-card__label">Cloned audio is still generating...</span> : null}
                            {turn.audio_base64 ? (
                              <audio controls preload="none" src={`data:audio/wav;base64,${turn.audio_base64}`}>
                                Your browser does not support audio playback.
                              </audio>
                            ) : null}
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="thesis-summary-card">
                    <span className="thesis-summary-card__label">Conversation controls</span>
                    <h3>Fallback text input</h3>
                    <div className="thesis-form-grid">
                      <label className="thesis-field thesis-field--full">
                        <span>Message to the agent</span>
                        <textarea
                          rows={4}
                          value={chatInput}
                          onChange={(event) => setChatInput(event.target.value)}
                          placeholder="Ask about business hours, appointments, billing, callbacks, or escalation."
                        />
                      </label>
                    </div>
                    <div className="thesis-form-actions">
                      <button type="button" className="thesis-button thesis-button--primary" onClick={() => void sendConversation()} disabled={chatBusy || audioRendering || project.voice_profile.status !== "ready_for_agent"}>
                        {chatBusy ? "Generating response..." : audioRendering ? "Rendering cloned voice..." : "Send message"}
                      </button>
                      <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void resetConversation()} disabled={chatBusy || audioRendering}>
                        Clear transcript
                      </button>
                    </div>
                    <p>
                      {project.voice_profile.status === "ready_for_agent"
                        ? conversationFastReady
                          ? "Live mode now works as press-to-speak and stop-to-send. This text box remains available as a fallback and keeps the transcript log below."
                          : "The cloned voice is ready. New replies return text immediately, then cloned audio finishes in the background if it is not already cached."
                        : "Finish stage 3 generation first. The conversation page requires the cloned voice to be ready."}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="thesis-sidebar">
            <div className="thesis-sidebar-card">
              <h3>Clone status</h3>
              <p>The backend is configured to use local zero-shot voice cloning and save a generated WAV preview directly in the thesis flow.</p>
              <button type="button" className="thesis-button thesis-button--ghost" onClick={() => void persistProject({ active_step: activeStep })}>
                {saving ? "Saving..." : "Save current progress"}
              </button>
            </div>
            <div className="thesis-sidebar-card">
              <h3>Vapi handoff</h3>
              <p><strong>{project.phone_config.phone_number}</strong></p>
              <p>Confirm this number in Vapi, attach the inbound server URL, and then keep this page open for clone preview and scenario testing.</p>
            </div>
            <div className="thesis-sidebar-card">
              <h3>Voice clone summary</h3>
              <dl className="thesis-summary-list">
                <div><dt>Profile</dt><dd>{project.voice_profile_name || project.consent.profile_name || "Not set"}</dd></div>
                <div><dt>Clips</dt><dd>{completedClipCount}</dd></div>
                <div><dt>Status</dt><dd>{statusLabel(project.voice_profile.status)}</dd></div>
                <div><dt>Updated</dt><dd>{formatTimestamp(project.updated_at)}</dd></div>
              </dl>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

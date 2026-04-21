export type ThesisStep = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
};

export type PhraseSeed = {
  id: string;
  category: string;
  text: string;
};

export type ReferenceClipSeed = {
  id: string;
  label: string;
  prompt: string;
  targetDuration: string;
};

export type GuideStep = {
  title: string;
  detail: string;
};

export type TestScenario = {
  id: string;
  title: string;
  intent: string;
  caller: string;
  expected: string;
};

export const THESIS_STEPS: ThesisStep[] = [
  {
    id: "overview",
    label: "Overview",
    shortLabel: "Overview",
    description: "Frame the thesis workflow and confirm demo mode.",
  },
  {
    id: "voice",
    label: "Voice clone capture",
    shortLabel: "Voice",
    description: "Upload or record clean reference audio for local zero-shot cloning.",
  },
  {
    id: "consent",
    label: "Consent and profile",
    shortLabel: "Consent",
    description: "Confirm permissions and generate the business voice profile.",
  },
  {
    id: "agent",
    label: "Phone agent config",
    shortLabel: "Agent",
    description: "Set greeting, hours, fallback behavior, and call objectives.",
  },
  {
    id: "phone",
    label: "Phone setup",
    shortLabel: "Phone",
    description: "Assign a number, explain routing, and disclose AI answering.",
  },
  {
    id: "review",
    label: "Test and review",
    shortLabel: "Review",
    description: "Run demo call scenarios and review the thesis configuration.",
  },
  {
    id: "conversation",
    label: "Agent conversation",
    shortLabel: "Talk",
    description: "Talk to the configured agent using the cloned voice and browser microphone.",
  },
];

export const REFERENCE_CLIPS: ReferenceClipSeed[] = [
  {
    id: "intro",
    label: "Natural introduction",
    prompt: "Speak naturally for thirty to sixty seconds. Introduce yourself and describe your business in your normal voice.",
    targetDuration: "30 to 60 seconds",
  },
  {
    id: "phone-style",
    label: "Phone-style sample",
    prompt: "Speak as if answering a customer call. Keep the pace clear and conversational, but do not read from a script unless you want to.",
    targetDuration: "20 to 45 seconds",
  },
  {
    id: "long-form",
    label: "Long-form speaking sample",
    prompt: "Talk continuously about a real topic you know well. Natural prosody and sentence variety help the local voice clone generalize better.",
    targetDuration: "45 to 90 seconds",
  },
];

export const TEST_SCENARIOS: TestScenario[] = [
  {
    id: "new-appointment",
    title: "New appointment request",
    intent: "Caller wants to book time with the business for a first-time service.",
    caller: "Jordan Lee",
    expected: "The agent should collect contact info, confirm a preferred time window, and mark the request for follow-up.",
  },
  {
    id: "after-hours-support",
    title: "After-hours support call",
    intent: "Caller reaches the line after business hours and needs next-day help.",
    caller: "Casey Morgan",
    expected: "The agent should disclose AI answering, capture a voicemail-style summary, and promise next-business-day response.",
  },
  {
    id: "billing-escalation",
    title: "Billing escalation",
    intent: "Caller has a billing issue that should be escalated rather than handled entirely by automation.",
    caller: "Taylor Brooks",
    expected: "The agent should acknowledge urgency, gather callback details, and route the issue to a human follow-up path.",
  },
];

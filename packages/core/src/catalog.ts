import type { Capability, CapabilityField } from "./types.js";

const MOTION: CapabilityField = {
  name: "motion",
  type: "enum",
  description: "How strongly the photo should move once it becomes video.",
  default: "steady",
  options: [
    { value: "subtle", label: "Subtle" },
    { value: "steady", label: "Steady" },
    { value: "explosive", label: "Explosive" },
  ],
};

const CAMERA: CapabilityField = {
  name: "camera",
  type: "enum",
  description: "Camera path applied while making video from the photo.",
  default: "static",
  options: [
    { value: "static", label: "Locked / static" },
    { value: "push_in", label: "Dolly in" },
    { value: "orbit", label: "Orbit" },
    { value: "side_track", label: "Side track" },
  ],
};

function enumField(
  name: string,
  description: string,
  values: string[],
  fallback: string,
  required = true
): CapabilityField {
  return {
    name,
    type: "enum",
    required,
    description,
    default: fallback,
    options: values.map((value) => ({ value, label: value })),
  };
}

function photoToVideo(
  partial: Omit<Capability, "feature" | "product" | "startImageRequired"> & {
    startImageRequired?: boolean;
  }
): Capability {
  return {
    ...partial,
    feature: "video",
    product: "photo_to_video",
    startImageRequired: partial.startImageRequired ?? true,
  };
}

export const CAPABILITIES: Capability[] = [
  photoToVideo({
    id: "photo-to-video.seedance25",
    modelType: "seedance25",
    label: "Seedance 2.5 — photo to video",
    description:
      "Turn a still photo into a clip up to 30s. Optional end-frame photo for a guided start and finish.",
    estimatedCredits: 124,
    estimatedSeconds: 90,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["480p", "720p"], "480p"),
      enumField(
        "duration",
        "Clip length",
        ["4s", "5s", "8s", "10s", "12s", "15s", "20s", "25s", "30s"],
        "5s"
      ),
      enumField(
        "aspectRatio",
        "Aspect ratio. Adaptive follows the source photo.",
        ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9", "Adaptive"],
        "Adaptive"
      ),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.seedance20",
    modelType: "seedance20",
    label: "Seedance 2.0 — make video from photos",
    description: "Photo to video with optional last frame. Supports 480p through 4K.",
    estimatedCredits: 84,
    estimatedSeconds: 90,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["480p", "720p", "1080p", "4K"], "480p"),
      enumField("duration", "Clip length", ["4s", "5s", "8s", "10s", "12s", "15s"], "5s"),
      enumField(
        "aspectRatio",
        "Aspect ratio",
        ["16:9", "9:16", "1:1", "4:3", "3:4", "21:9"],
        "16:9"
      ),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.seedance20fast",
    modelType: "seedance20fast",
    label: "Seedance 2.0 Fast — photo to video",
    description: "Faster photo-to-video for drafts from a single photo or first/last frames.",
    estimatedCredits: 68,
    estimatedSeconds: 45,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["480p", "720p"], "480p"),
      enumField("duration", "Clip length", ["4s", "5s", "8s", "10s", "12s", "15s"], "5s"),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.seedance1pro",
    modelType: "seedance1pro",
    label: "Seedance 1.0 Pro — photo to video",
    description: "Lower-credit photo to video from one still.",
    estimatedCredits: 15,
    estimatedSeconds: 60,
    endImageSupported: false,
    fields: [
      enumField("resolution", "Output resolution", ["480p", "1080p"], "480p"),
      enumField("duration", "Clip length", ["5s", "10s"], "5s"),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.seedance15",
    modelType: "seedance15",
    label: "Seedance 1.5 — make video from photos",
    description: "Photo to video with optional end frame and audio-aware output.",
    estimatedCredits: 20,
    estimatedSeconds: 70,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["480p", "720p", "1080p"], "480p"),
      enumField("duration", "Clip length", ["4s", "8s", "12s"], "4s"),
      enumField("aspectRatio", "Aspect ratio", ["16:9", "9:16", "1:1", "4:3", "3:4"], "16:9"),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.veo31fast",
    modelType: "veo31fast",
    label: "Veo 3.1 Fast — photo to video",
    description: "8s photo-to-video clip with native audio from a still photo.",
    estimatedCredits: 66,
    estimatedSeconds: 120,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["720p", "1080p", "4k"], "720p"),
      enumField("duration", "Clip length", ["8s"], "8s"),
      enumField("aspectRatio", "Aspect ratio", ["Auto", "16:9", "9:16"], "Auto"),
    ],
  }),
  photoToVideo({
    id: "photo-to-video.wan27",
    modelType: "wan-2.7",
    label: "Wan 2.7 — make video from photos",
    description: "First and last photo frames into a 5–15s clip.",
    estimatedCredits: 88,
    estimatedSeconds: 80,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["720p", "1080p"], "720p"),
      enumField("duration", "Clip length", ["5s", "10s", "15s"], "5s"),
      MOTION,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.kling25turbo",
    modelType: "kling-v2.5-turbo",
    label: "Kling 2.5 Turbo — photo to video",
    description: "Animate one photo into a 5s or 10s video.",
    estimatedCredits: 50,
    estimatedSeconds: 70,
    endImageSupported: false,
    fields: [
      enumField("duration", "Clip length", ["5s", "10s"], "5s"),
      MOTION,
      CAMERA,
    ],
  }),
  photoToVideo({
    id: "photo-to-video.minimax-h3",
    modelType: "minimax-h3",
    label: "MiniMax H3 — photo to video",
    description: "Photo to video up to 15s at 768p or 2K, with optional end frame.",
    estimatedCredits: 36,
    estimatedSeconds: 80,
    endImageSupported: true,
    fields: [
      enumField("resolution", "Output resolution", ["768p", "2K"], "768p"),
      enumField(
        "duration",
        "Clip length",
        ["4s", "5s", "6s", "7s", "8s", "9s", "10s", "11s", "12s", "13s", "14s", "15s"],
        "5s"
      ),
    ],
  }),
];

export function listCapabilities(feature?: string): Capability[] {
  if (!feature || feature === "video" || feature === "photo_to_video" || feature === "photo-to-video") {
    return CAPABILITIES;
  }
  return [];
}

export function getCapability(id: string): Capability | undefined {
  return CAPABILITIES.find((item) => item.id === id || item.modelType === id);
}

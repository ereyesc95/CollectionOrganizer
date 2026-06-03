import { useEffect, useState } from "react";

export function useMediaDimensions(
  src: string | null | undefined,
  kind: "image" | "video" = "image"
): { width: number; height: number } | null {
  const [dims, setDims] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    if (!src) {
      setDims(null);
      return;
    }
    let cancelled = false;

    if (kind === "video") {
      const video = document.createElement("video");
      video.preload = "metadata";
      const onMeta = () => {
        if (cancelled) return;
        if (video.videoWidth && video.videoHeight) {
          setDims({ width: video.videoWidth, height: video.videoHeight });
        }
        video.removeAttribute("src");
        video.load();
      };
      video.addEventListener("loadedmetadata", onMeta, { once: true });
      video.src = src;
      return () => {
        cancelled = true;
        video.removeEventListener("loadedmetadata", onMeta);
        video.removeAttribute("src");
      };
    }

    const img = new Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth && img.naturalHeight) {
        setDims({ width: img.naturalWidth, height: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (!cancelled) setDims(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, kind]);

  return dims;
}

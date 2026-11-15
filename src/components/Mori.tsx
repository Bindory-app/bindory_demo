import moriAsset from "@/assets/mori-hd.png.asset.json";
import { cn } from "@/lib/utils";
/** Always shows Mori whole (object-contain, never cropped). */
export function Mori({ className, alt = "Mori, your collector companion" }: { className?: string; alt?: string }) {
  return <img src={moriAsset.url} alt={alt} className={cn("object-contain", className)} />;
}

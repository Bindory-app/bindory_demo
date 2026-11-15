import { cn } from "@/lib/utils";
/** Always shows Mori whole (object-contain, never cropped). */
export function Mori({
  className,
  alt = "Mori, your collector companion",
}: {
  className?: string;
  alt?: string;
}) {
  return <img src="/mori-hd.png" alt={alt} className={cn("object-contain", className)} />;
}

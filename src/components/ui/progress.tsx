import { Progress as ProgressPrimitive } from "@base-ui/react/progress"

import { cn } from "@/lib/utils"

function Progress({
  className,
  ...props
}: ProgressPrimitive.Root.Props) {
  return <ProgressPrimitive.Root data-slot="progress" className={className} {...props} />
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      data-slot="progress-track"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/15", className)}
      {...props}
    />
  )
}

function ProgressIndicator({ className, ...props }: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn(
        "h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary",
        "bg-[length:200%_100%] transition-[width] duration-300 ease-out",
        "data-[indeterminate]:w-full data-[indeterminate]:animate-[progress-shimmer_1.4s_ease-in-out_infinite]",
        className,
      )}
      {...props}
    />
  )
}

export { Progress, ProgressTrack, ProgressIndicator }

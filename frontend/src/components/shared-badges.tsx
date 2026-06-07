import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { companyColor, initials, matchTone } from "@/lib/data"

export function CompanyAvatar({
  name,
  size = "default",
}: {
  name: string
  size?: "sm" | "default" | "lg"
}) {
  const sizeClass =
    size === "sm" ? "size-8 text-xs" : size === "lg" ? "size-12 text-base" : "size-10 text-sm"
  return (
    <Avatar className={sizeClass}>
      <AvatarFallback
        className="font-semibold text-white"
        style={{ backgroundColor: companyColor(name) }}
      >
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

export function MatchBadge({ score }: { score: number }) {
  const tone = matchTone(score)
  const toneClass = {
    success: "bg-success/15 text-success border-success/30",
    warning: "bg-warning/15 text-warning border-warning/30",
    danger: "bg-danger/15 text-danger border-danger/30",
  }[tone]
  return (
    <Badge variant="outline" className={cn("font-semibold tabular-nums", toneClass)}>
      {score}% match
    </Badge>
  )
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <Badge variant="outline" className="border-border bg-muted/50 text-muted-foreground font-normal">
      {platform}
    </Badge>
  )
}

import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";

export const HISTORY_RANGES = ["1h", "24h", "7d", "30d"] as const;
export type HistoryRange = (typeof HISTORY_RANGES)[number];

export class HistoryQueryDto {
  @ApiPropertyOptional({ enum: HISTORY_RANGES, default: "24h" })
  @IsOptional()
  @IsIn(HISTORY_RANGES)
  range: HistoryRange = "24h";
}

export function rangeToMs(range: HistoryRange): number {
  switch (range) {
    case "1h":
      return 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
  }
}

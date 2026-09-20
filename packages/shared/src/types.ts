export type StationId = "language" | "year" | "built" | "broke" | "advice";

export interface Station {
  id: StationId;
  order: number;
  title: string;
  prompt: string;
  hint: string;
  kind: "choice" | "year" | "text";
  maxLength?: number;
}

export interface StationState {
  id: StationId;
  open: boolean;
  openedAt: string | null;
}

export interface Participant {
  id: string;
  seq: number;
  token: string;
  answers: Partial<Record<StationId, string>>;
  createdAt: string;
}

/** Compact record for the wall snapshot. Short keys on purpose: 4000 of these travel over the wire. */
export interface WallCard {
  /** sequence number, defines the cell */
  s: number;
  /** language id */
  l?: string;
  /** year */
  y?: number;
  /** stations completed (0..5) */
  p: number;
}

export interface WallSnapshot {
  count: number;
  cards: WallCard[];
  stations: StationState[];
  generatedAt: string;
}

export interface CardDetail {
  seq: number;
  language?: string;
  year?: number;
  built?: string;
  broke?: string;
  advice?: string;
}

export interface PublicState {
  stations: StationState[];
  count: number;
}

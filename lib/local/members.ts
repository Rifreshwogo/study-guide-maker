/** The local team members, for status tracking. */

export type MemberId = "notes-reader" | "researcher" | "librarian" | "writer" | "checker";

export const MEMBERS: { id: MemberId; role: string }[] = [
  { id: "notes-reader", role: "Notes Reader" },
  { id: "researcher", role: "Researcher" },
  { id: "librarian", role: "Librarian" },
  { id: "writer", role: "Writer" },
  { id: "checker", role: "Checker" },
];

export interface MemberStatus {
  id: MemberId;
  state: "idle" | "working";
  task: string | null;
  since: number | null;
  lastSeconds: number | null;
}

export interface TeamEvent {
  at: number;
  member: MemberId | "team";
  text: string;
}

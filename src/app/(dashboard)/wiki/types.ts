export interface Frontmatter {
  title?: string;
  date?: string;
  tags?: string[];
  [key: string]: any;
}

export interface NoteData {
  content: string;
  frontmatter: Frontmatter;
  modified: string;
  size: number;
}

export interface SearchResult {
  path: string;
  title: string;
  preview: string;
}

export interface BacklinkResult {
  path: string;
  title: string;
}

export interface WikiStats {
  totalNotes: number;
  lastSync: string | null;
  modifiedToday: number;
  topLinked: string[];
}



export interface SyncStatus {
  status: "green" | "yellow" | "red";
  lastSync: string | null;
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export type TreeFileNode = FileNode & {
  modified?: string;
  expanded?: boolean;
  type: "file" | "directory";
};
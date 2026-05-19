/**
 * Wiki utility functions
 */

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isModifiedToday(isoString: string): boolean {
  const date = new Date(isoString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

export interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

export interface TreeFileNode extends FileNode {
  modified?: string;
  expanded?: boolean;
}

export function processTreeWithModified(
  files: FileNode[],
  allNotes: Map<string, { modified: string }>
): TreeFileNode[] {
  return files.map((file) => {
    const note = allNotes.get(file.path);
    const processed: TreeFileNode = {
      ...file,
      modified: note?.modified,
      expanded: false,
    };

    if (file.children) {
      processed.children = processTreeWithModified(file.children, allNotes);
    }

    return processed;
  });
}
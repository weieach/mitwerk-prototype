import { galleryBranchPaint } from '../iteration-gallery/model.ts';
import { galleryTokens } from '../iteration-gallery/tokens.ts';
import { palerAccent } from '../version-tree/tokens.ts';

/** Bookmarks use the same subdued route accents in theater and the 3D album. */
export function annotationBookmarkColor(branch: string | null | undefined, branches: string[]) {
  return !branch || branch === 'main' ? galleryTokens.annotations.mainColor : palerAccent(galleryBranchPaint(branch, branches));
}

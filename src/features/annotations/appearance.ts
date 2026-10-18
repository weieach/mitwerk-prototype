import { galleryBranchPaint } from '../iteration-gallery/model.ts';
import { galleryTokens } from '../iteration-gallery/tokens.ts';
import { palerAccent } from '../version-tree/tokens.ts';

/** Bookmarks use the same subdued route accents in theater and the 3D album. Canvases pass `resolveColor` for a concrete value. */
export function annotationBookmarkColor(branch: string | null | undefined, branches: string[], resolve = (color: string) => color) {
  return !branch || branch === 'main' ? galleryTokens.annotations.mainColor : palerAccent(resolve(galleryBranchPaint(branch, branches)));
}

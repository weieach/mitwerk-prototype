import test from 'node:test';
import assert from 'node:assert/strict';
import { galleryRenderRatio } from '../src/features/iteration-gallery/render-quality.ts';

test('gallery quality follows panel width and display density',()=>{
 assert.equal(galleryRenderRatio(400,700,1),1);
 assert.equal(galleryRenderRatio(400,700,2),2);
 assert.equal(galleryRenderRatio(1100,800,2),2.5);
 assert.equal(galleryRenderRatio(1600,800,2),3);
 assert.equal(galleryRenderRatio(1600,900,1),1.5);
});
test('large or high-density displays stay within pixel and hardware limits',()=>{
 const width=3840,height=2160;
 const ratio=galleryRenderRatio(width,height,4);
 assert.ok(width*height*ratio*ratio<=12_000_001);
 assert.equal(galleryRenderRatio(1600,900,4,2048),2048/1600);
 assert.equal(galleryRenderRatio(0,0,2),1);
 assert.equal(galleryRenderRatio(400,700,NaN),1);
});

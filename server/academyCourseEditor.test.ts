import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AcademyCourseChapter, AcademyCourseCompletionRequirement } from '../src/types/academy.ts';
import { removeChapterMaterialReference, removeCourseChapter, updateCourseChapterTitle } from '../src/lib/academyCourseEditor.ts';
const chapter=(id:string,ids:string[]):AcademyCourseChapter=>({id,title:id,required:false,order:0,materialReferences:ids.map((materialId,order)=>({materialId,materialVersionId:materialId+'__v1',required:true,order}))});
const requirements:AcademyCourseCompletionRequirement[]=[{id:'chapter-req',type:'required_chapter',targetId:'chapter-a',required:true},{id:'material-a-req',type:'required_material',targetId:'material-a',required:true},{id:'material-b-req',type:'required_material',targetId:'material-b',required:true}];
test('removing a material keeps its completion requirement while another chapter still references it',()=>{const result=removeChapterMaterialReference([chapter('chapter-a',['material-a','material-b']),chapter('chapter-b',['material-a'])],requirements,'chapter-a','material-a');assert.deepEqual(result.chapters[0].materialReferences.map(x=>x.materialId),['material-b']);assert.ok(result.requirements.some(x=>x.id==='material-a-req'));});
test('removing the last material reference removes only its orphaned completion requirement',()=>{const result=removeChapterMaterialReference([chapter('chapter-a',['material-a','material-b'])],requirements,'chapter-a','material-a');assert.ok(!result.requirements.some(x=>x.id==='material-a-req'));assert.ok(result.requirements.some(x=>x.id==='material-b-req'));assert.ok(result.requirements.some(x=>x.type==='required_chapter'));});
test('removing a chapter removes its own requirement and only material requirements no longer referenced elsewhere',()=>{const result=removeCourseChapter([chapter('chapter-a',['material-a','material-b']),chapter('chapter-b',['material-a'])],requirements,'chapter-a');assert.deepEqual(result.chapters.map(x=>x.order),[0]);assert.ok(!result.requirements.some(x=>x.id==='chapter-req'));assert.ok(!result.requirements.some(x=>x.id==='material-b-req'));assert.ok(result.requirements.some(x=>x.id==='material-a-req'));});

test('renaming a chapter keeps its generated completion label in sync', () => {
  const source = [chapter('chapter-a', [])];
  source[0].title = 'Einführung';
  const result = updateCourseChapterTitle(source, requirements, 'chapter-a', 'Grundlagen');
  assert.equal(result.chapters[0].title, 'Grundlagen');
  assert.equal(result.requirements.find(item => item.id === 'chapter-req')?.description, 'Kapitel abgeschlossen: Grundlagen');
});

test('renaming a chapter preserves a custom completion description', () => {
  const source = [chapter('chapter-a', [])];
  source[0].title = 'Einführung';
  const custom = requirements.map(item => item.id === 'chapter-req' ? { ...item, description: 'Individuelle Nachweisanweisung' } : item);
  const result = updateCourseChapterTitle(source, custom, 'chapter-a', 'Grundlagen');
  assert.equal(result.requirements.find(item => item.id === 'chapter-req')?.description, 'Individuelle Nachweisanweisung');
});

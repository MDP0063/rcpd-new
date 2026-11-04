import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isRenderDeployHook, isSafeHttpUrl, isSafePdfDataUrl, limitText } from './validate.ts';

test('PDF-Daten: nur base64-PDF oder leer', () => {
  assert.ok(isSafePdfDataUrl(''));
  assert.ok(isSafePdfDataUrl('data:application/pdf;base64,JVBERi0xLjQK'));
  assert.ok(isSafePdfDataUrl('data:application/pdf;base64,JVBERi0xLjQ='));
  assert.ok(!isSafePdfDataUrl('javascript:alert(1)'));
  assert.ok(!isSafePdfDataUrl('data:text/html;base64,PHNjcmlwdD4='));
  assert.ok(!isSafePdfDataUrl('data:application/pdf;base64,AAAA"><script>'));
  assert.ok(!isSafePdfDataUrl('https://example.com/a.pdf'));
});

test('Adressen: nur http und https', () => {
  assert.ok(isSafeHttpUrl(''));
  assert.ok(isSafeHttpUrl('https://example.com/pfad?x=1'));
  assert.ok(isSafeHttpUrl('http://example.com'));
  assert.ok(!isSafeHttpUrl('javascript:alert(1)'));
  assert.ok(!isSafeHttpUrl('JaVaScRiPt:alert(1)'));
  assert.ok(!isSafeHttpUrl('data:text/html,<b>x</b>'));
  assert.ok(!isSafeHttpUrl('//example.com'));
  assert.ok(!isSafeHttpUrl('kein link'));
  assert.ok(!isSafeHttpUrl(`https://example.com/${'a'.repeat(600)}`));
});

test('Deploy-Hook: nur Render-Adresse oder leer', () => {
  assert.ok(isRenderDeployHook(''));
  assert.ok(isRenderDeployHook('https://api.render.com/deploy/srv-abc?key=def'));
  assert.ok(!isRenderDeployHook('https://evil.example/deploy/srv-abc'));
  assert.ok(!isRenderDeployHook('http://api.render.com/deploy/srv-abc'));
});

test('Text wird gekürzt', () => {
  assert.equal(limitText('abcdef', 3), 'abc');
  assert.equal(limitText(undefined, 3), '');
  assert.equal(limitText(12345, 3), '123');
});

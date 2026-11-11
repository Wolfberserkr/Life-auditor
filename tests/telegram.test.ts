import { assertEquals } from 'jsr:@std/assert@1.0.13';
import { chunk, sanitizeHtml, stripTags } from '../supabase/functions/_shared/telegram.ts';

Deno.test('sanitizeHtml keeps Telegram tags and escapes everything else', () => {
  assertEquals(sanitizeHtml('<b>Today</b> 5 < 7 & <script>x</script>'), '<b>Today</b> 5 &lt; 7 &amp; &lt;script&gt;x&lt;/script&gt;');
  assertEquals(sanitizeHtml('<a href="https://example.com/a?b=1">link</a>'), '<a href="https://example.com/a?b=1">link</a>');
  assertEquals(sanitizeHtml('<a href="javascript:alert(1)">x').includes('<a'), false);
  assertEquals(sanitizeHtml('Fish &amp; chips'), 'Fish &amp; chips');
});

Deno.test('stripTags gives readable plain text', () => {
  assertEquals(stripTags('<b>Hi</b> 1 &lt; 2 &amp; 3'), 'Hi 1 < 2 & 3');
});

Deno.test('chunk splits long text under the limit', () => {
  const para = 'x'.repeat(1000);
  const parts = chunk(Array(10).fill(para).join('\n\n'), 3900);
  assertEquals(parts.every((p) => p.length <= 3900), true);
  assertEquals(parts.join('\n\n').replace(/\n/g, '').length, 10_000);
});

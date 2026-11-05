from pathlib import Path
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw
import pdfplumber, json

root=Path(__file__).resolve().parents[1]
reader=PdfReader(root/'output/pdf/kontur-supabase-plan.pdf')
assert len(reader.pages)==16, f'Unexpected page count: {len(reader.pages)}'
texts=[page.extract_text() for page in reader.pages]
assert all(len(text)>500 for text in texts), 'Orphaned/empty page'
assert all('\ufffd' not in text and '\x00' not in text for text in texts), 'Invalid extracted glyphs'
assert sum(0x400<=ord(char)<=0x4ff for text in texts for char in text)>5000, 'Cyrillic text missing'
with pdfplumber.open(root/'output/pdf/kontur-supabase-plan.pdf') as pdf:
    for number,page in enumerate(pdf.pages,1):
        words=page.extract_words()
        bad=[word for word in words if word['x0']<39 or word['x1']>558 or word['top']<15 or word['bottom']>823]
        assert not bad, f'Text out of bounds on page {number}: {bad[:2]}'
for start,end in [(1,8),(9,16)]:
    sheet=Image.new('RGB',(1000,750),'#dce2eb')
    draw=ImageDraw.Draw(sheet)
    for i,page in enumerate(range(start,end+1)):
        image=Image.open(root/f'tmp/pdfs/kontur-{page:02d}.png').convert('RGB')
        image.thumbnail((232,330))
        x=(i%4)*250+9; y=(i//4)*375+22
        sheet.paste(image,(x,y)); draw.text((x,y-16),f'Page {page}',fill='#303c50')
    sheet.save(root/f'tmp/pdfs/contact-{start}-{end}.png')
print(json.dumps({'pages':len(reader.pages),'text_and_bounds':'passed','characters':sum(map(len,texts))}))

import base64
import html
import re
from io import BytesIO
from pathlib import Path
from pypdf import PdfReader


def pdf_text_to_html(text: str, page_number: int) -> str:
    sanitized = html.escape((text or '').replace('\x00', ' '))
    paragraphs = []
    for chunk in re.split(r'\n\s*\n', sanitized):
        chunk = chunk.strip()
        if not chunk:
            continue
        paragraphs.append(f"<p>{chunk.replace('\\n', '<br />')}</p>")
    if not paragraphs:
        paragraphs = ['<p class="text-gray-500">本页为空或未识别到文本</p>']
    body = ''.join(paragraphs)
    return f'<article class="pdf-source-page" data-origin-page="{page_number}">{body}</article>'


def extract_pdf_pages(file_storage) -> list[str]:
    raw_bytes = file_storage.read()
    if not raw_bytes:
        raise ValueError('PDF 文件内容为空')
    reader = PdfReader(BytesIO(raw_bytes))
    if getattr(reader, 'is_encrypted', False):
        reader.decrypt('')
    pages_html: list[str] = []
    for idx, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ''
        except Exception:
            text = ''
        pages_html.append(pdf_text_to_html(text, idx))
    if not pages_html:
        raise ValueError('无法从 PDF 中提取任何页面')
    return pages_html


def save_base64_images(html_content: str, book_id: str, page_index: int) -> str:
    """
    将 html_content 中的 data:image/...;base64,... 图片提取为文件，
    存放到 backend/src/{book_id}/{page_index}/，并替换 src 为文件路径。
    """
    storage_root = Path(__file__).resolve().parent.parent / 'src'
    pattern = re.compile(r'<img([^>]+)src="data:image/([^;]+);base64,([A-Za-z0-9+/=]+)"([^>]*)>', re.IGNORECASE)
    counter = 1

    def replace(match: re.Match) -> str:
        nonlocal counter
        attrs_before = match.group(1) or ''
        mime = (match.group(2) or '').lower()
        data_b64 = match.group(3) or ''
        attrs_after = match.group(4) or ''

        ext_map = {
            'jpeg': 'jpg',
            'jpg': 'jpg',
            'png': 'png',
            'gif': 'gif',
            'webp': 'webp',
            'bmp': 'bmp',
        }
        ext = ext_map.get(mime.split('/')[-1], 'png')

        dir_path = storage_root / book_id / str(page_index)
        dir_path.mkdir(parents=True, exist_ok=True)
        filename = f'img_{counter}.{ext}'
        counter += 1
        try:
            (dir_path / filename).write_bytes(base64.b64decode(data_b64))
        except Exception:
            return match.group(0)

        rel_path = f"/src/{book_id}/{page_index}/{filename}"
        img_tag = f'<img{attrs_before}src="{rel_path}"{attrs_after}>'
        return f'<div class="pdf-image-wrapper" style="text-align:center;">{img_tag}</div>'

    return pattern.sub(replace, html_content or '')


def rewrite_src_to_absolute(html_content: str, base_url: str) -> str:
    """
    将 src="/src/..." 或 src="src/..." 重写为带 host 的绝对地址，避免前端 404。
    """
    if not html_content:
        return html_content
    base = base_url.rstrip('/')
    pattern_relative = re.compile(r'src=[\'"]/?src/([^\'"]+)[\'"]', flags=re.IGNORECASE)
    pattern_absolute = re.compile(r'src=[\'"]https?://[^\'"]+/src/([^\'"]+)[\'"]', flags=re.IGNORECASE)
    rewritten = pattern_absolute.sub(lambda m: f'src="{base}/src/{m.group(1)}"', html_content)
    return pattern_relative.sub(lambda m: f'src="{base}/src/{m.group(1)}"', rewritten)
